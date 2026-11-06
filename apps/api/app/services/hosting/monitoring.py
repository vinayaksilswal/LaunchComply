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
