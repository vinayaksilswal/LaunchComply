"""Cross-provider links, HTTP health probes and alerts for hosted resources.

Probes only contact public HTTPS URLs that the providers themselves reported for
the customer's resources, and refuse hosts that resolve to private addresses.
Results are point-in-time checks, not uptime history.
"""
from __future__ import annotations

import asyncio
import ipaddress
import re
import socket
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx

from app.services.hosting.providers import bounded_gather

HISTORY_LIMIT = 48
SLOW_MS = 3000
API_KEY_NAMES = re.compile(r"(API|BACKEND|SERVER)_?(BASE_)?(URL|ORIGIN|HOST)", re.I)
DB_KEY_NAMES = re.compile(r"(DATABASE|POSTGRES|PG|DB)_?(URL|URI|HOST)", re.I)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def link_resources(resources: list[dict]) -> None:
    """Attach ``links`` to each resource and drop the transient ``_env_hosts``.

    Exact links come from an env var value whose host equals another resource's
    host. When no value is readable, a name-only link is added only if there is
    exactly one candidate target, and it is labelled as inferred.
    """
    index = {}
    for resource in resources:
        for host in resource.get("hosts") or []:
            index.setdefault(host, resource)
    apis = [r for r in resources if r["kind"] in ("web_service", "private_service")]
    databases = [r for r in resources if r["kind"] == "database"]
    media = [r for r in resources if r["kind"] == "media"]
    for resource in resources:
        links, seen = [], set()
        for key, host in sorted((resource.pop("_env_hosts", None) or {}).items()):
            target = index.get(host)
            if target and target is not resource and target["id"] not in seen:
                seen.add(target["id"])
                links.append({"provider": target["provider"], "resource_id": target["id"], "via": key, "evidence": "ENV_HOST_MATCH"})
        for key in resource.get("env_keys") or []:
            candidates = apis if API_KEY_NAMES.search(key) and resource["kind"] in ("frontend", "static_site") else \
                databases if DB_KEY_NAMES.search(key) else media if "CLOUDINARY" in key.upper() else []
            if len(candidates) == 1 and candidates[0] is not resource and candidates[0]["id"] not in seen:
                seen.add(candidates[0]["id"])
                links.append({"provider": candidates[0]["provider"], "resource_id": candidates[0]["id"], "via": key, "evidence": "ENV_NAME_ONLY"})
        resource["links"] = links


async def public_https(url: str) -> bool:
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    if parsed.scheme != "https" or not parsed.hostname or parsed.port not in (None, 443):
        return False
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)
    except OSError:
        return False
    return bool(infos) and all(ipaddress.ip_address(info[4][0]).is_global for info in infos)


def probe_targets(resource: dict) -> list[str]:
    urls = list(dict.fromkeys(resource.get("urls") or []))[:2]
    path = resource.get("health_check_path")
    if path and path.startswith("/") and urls:
        urls = [urls[0].rstrip("/") + path] + urls[1:]
    return urls


def client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=httpx.Timeout(10.0), follow_redirects=True, max_redirects=3,
                             headers={"User-Agent": "LaunchComply-HealthCheck/1.0"})


async def probe(http: httpx.AsyncClient, url: str) -> dict:
    result = {"url": url, "checked_at": now(), "ok": False, "status_code": None, "latency_ms": None, "error": None}
    if not await public_https(url):
        result["error"] = "Skipped: not a public HTTPS address."
        return result
    started = time.perf_counter()
    try:
        response = await http.get(url)
        result["status_code"] = response.status_code
        result["ok"] = response.status_code < 500
    except httpx.TimeoutException:
        result["error"] = "Timed out after 10s."
    except httpx.HTTPError as exc:
        result["error"] = type(exc).__name__
    result["latency_ms"] = round((time.perf_counter() - started) * 1000)
    return result


async def check(resources: list[dict]) -> list[dict]:
    targets = [(r, url) for r in resources for url in probe_targets(r)]
    async with client() as http:
        results = await bounded_gather(targets, lambda item: probe(http, item[1]), limit=6)
    for (resource, _), result in zip(targets, results):
        result["resource_id"], result["provider"] = resource["id"], resource["provider"]
    return results


def alerts(resources: list[dict], probes: list[dict]) -> list[dict]:
    found = []

    def add(severity, resource, message):
        found.append({"severity": severity, "provider": resource["provider"], "resource_id": resource["id"],
                      "resource": resource["name"], "message": message})

    by_id = {r["id"]: r for r in resources}
    for resource in resources:
        if resource["status"] == "FAILED":
            add("critical", resource, resource.get("status_detail") or "Failed")
        elif resource["status"] == "SUSPENDED":
            add("warning", resource, "Suspended: not serving traffic")
        elif resource["status"] == "DEGRADED":
            add("warning", resource, resource.get("status_detail") or "Degraded")
        if resource["kind"] in ("frontend", "web_service", "static_site") and not resource.get("urls"):
            add("info", resource, "No public URL to health-check")
    for result in probes:
        resource = by_id.get(result["resource_id"])
        if not resource or (result["error"] or "").startswith("Skipped"):
            continue
        if not result["ok"]:
            add("critical", resource, f"{result['url']} " + (f"returned {result['status_code']}" if result["status_code"] else f"unreachable ({result['error']})"))
        elif result["latency_ms"] and result["latency_ms"] > SLOW_MS:
            add("warning", resource, f"{result['url']} slow: {result['latency_ms']} ms")
    order = {"critical": 0, "warning": 1, "info": 2}
    return sorted(found, key=lambda a: order[a["severity"]])


def health_record(previous: dict | None, resources: list[dict], probes: list[dict]) -> dict:
    found = alerts(resources, probes)
    checked = now()
    point = {"checked_at": checked, "probes_ok": sum(1 for p in probes if p["ok"]),
             "probes_failed": sum(1 for p in probes if not p["ok"] and not (p["error"] or "").startswith("Skipped")),
             "critical": sum(1 for a in found if a["severity"] == "critical"),
             "latency_ms": {p["resource_id"]: p["latency_ms"] for p in probes if p["ok"]}}
    history = ((previous or {}).get("history") or [])[-(HISTORY_LIMIT - 1):] + [point]
    return {"checked_at": checked, "probes": probes, "alerts": found, "history": history}


def _root(path: str | None) -> str:
    return (path or "").strip().strip("/").lower()


def group_projects(resources: list[dict], applications: list[dict]) -> list[dict]:
    """Group resources by GitHub repository and match LaunchComply applications.

    Databases and media have no repository; they join every project whose
    resources link to them. ``applications`` items are
    ``{"id", "name", "repos": [{"full_name", "root_path"}]}``. An application
    with a root path only claims resources deployed from that folder, so one
    monorepo can hold several applications.
    """
    by_id = {r["id"]: r for r in resources}
    keys = {r["id"]: ({r["repo"].lower()} if r.get("repo") else set()) for r in resources}
    for resource in resources:
        for link in resource.get("links") or []:
            target = by_id.get(link["resource_id"])
            if target and not target.get("repo"):
                keys[target["id"]] |= keys[resource["id"]]
    projects: dict[str, dict] = {}
    for resource in resources:
        resource_keys = sorted(keys[resource["id"]]) or ["unassigned"]
        resource["project_keys"] = resource_keys
        resource["application_ids"] = []
        for key in resource_keys:
            project = projects.setdefault(key, {"key": key, "repo": None, "repo_url": None, "resource_ids": [], "applications": []})
            project["resource_ids"].append(resource["id"])
            if resource.get("repo") and resource["repo"].lower() == key:
                project["repo"] = project["repo"] or resource["repo"]
                project["repo_url"] = project["repo_url"] or resource.get("repo_url")
    for app in applications:
        for repo in app.get("repos") or []:
            key = (repo.get("full_name") or "").lower()
            project = projects.get(key)
            if not project:
                continue
            if not any(a["id"] == app["id"] for a in project["applications"]):
                project["applications"].append({"id": app["id"], "name": app["name"]})
            root = _root(repo.get("root_path"))
            for resource_id in project["resource_ids"]:
                resource = by_id[resource_id]
                own = resource.get("repo") and resource["repo"].lower() == key
                folder = _root(resource.get("root_dir"))
                if (not own or not root or folder == root or folder.startswith(root + "/")) and app["id"] not in resource["application_ids"]:
                    resource["application_ids"].append(app["id"])
    for project in projects.values():
        names = [a["name"] for a in project["applications"]]
        project["name"] = names[0] if len(names) == 1 else (project["repo"] or project["key"]).split("/")[-1] \
            if project["key"] != "unassigned" else "Not linked to a repository"
    return sorted(projects.values(), key=lambda p: (p["key"] == "unassigned", p["name"].lower()))
