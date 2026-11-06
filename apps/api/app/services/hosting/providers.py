"""Provider API clients for Vercel, Render, Neon and Cloudinary.

Each provider normalizes its resources into one shape so the UI, monitoring and
action catalog can treat them uniformly. Environment variable *values* are never
returned or stored: only key names are kept, and values are reduced in memory to
the hostname they point at so cross-provider links can be matched, then dropped.
"""
from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote, urlparse

import httpx


# 424 (Failed Dependency): the provider, not LaunchComply, failed or refused. The
# web client hides 5xx details, so provider problems must stay in the 4xx range.
PROVIDER_FAILED = 424


class ProviderError(Exception):
    def __init__(self, message: str, status: int = PROVIDER_FAILED):
        super().__init__(message)
        self.message, self.status = message, status


def client() -> httpx.AsyncClient:
    """Factory kept module-level so tests can substitute a mock transport."""
    return httpx.AsyncClient(timeout=httpx.Timeout(20.0), follow_redirects=False)


LABELS = {"VERCEL": "Vercel", "RENDER": "Render", "NEON": "Neon", "CLOUDINARY": "Cloudinary"}


async def call(http: httpx.AsyncClient, provider: str, method: str, url: str, **kwargs) -> Any:
    name = LABELS[provider]
    try:
        response = await http.request(method, url, **kwargs)
    except httpx.TimeoutException:
        raise ProviderError(f"{name} did not respond in time. Nothing was changed by LaunchComply.", PROVIDER_FAILED) from None
    except httpx.HTTPError:
        raise ProviderError(f"Could not reach {name}.", PROVIDER_FAILED) from None
    if response.status_code in (401, 403):
        raise ProviderError(f"{name} rejected the credential or it lacks permission for this request.", 400)
    if response.status_code == 404:
        raise ProviderError(f"{name} could not find that resource.", 404)
    if response.status_code == 429:
        raise ProviderError(f"{name} rate-limited the request. Try again shortly.", 429)
    if response.status_code >= 400:
        detail = ""
        try:
            body = response.json()
            error = body.get("error") if isinstance(body, dict) else None
            detail = (error.get("message") if isinstance(error, dict) else error) or body.get("message") or ""
        except (ValueError, AttributeError):
            pass
        raise ProviderError(f"{name} refused the request ({response.status_code}). {str(detail)[:200]}".strip(), PROVIDER_FAILED)
    if not response.content:
        return {}
    try:
        return response.json()
    except ValueError:
        raise ProviderError(f"{name} returned an unreadable response.", PROVIDER_FAILED) from None


HOST = re.compile(r"^(?=.{1,253}$)[a-z0-9-]+(\.[a-z0-9-]+)+$")


def normalize_host(host: str | None) -> str | None:
    if not host:
        return None
    host = host.lower().rstrip(".")
    first, _, rest = host.partition(".")
    if first.endswith("-pooler") and rest:  # Neon pooled endpoint host
        host = first[: -len("-pooler")] + "." + rest
    return host


def host_of(value: Any) -> str | None:
    """Reduce an env value to a hostname without retaining credentials or paths."""
    if not isinstance(value, str) or not value or len(value) > 4096:
        return None
    value = value.strip()
    if "://" in value:
        try:
            return normalize_host(urlparse(value).hostname)
        except ValueError:
            return None
    candidate = value.lower().split("/")[0].split(":")[0]
    return normalize_host(candidate) if HOST.match(candidate) else None


def cloudinary_token(key: str, value: Any) -> str | None:
    if "CLOUDINARY" not in key.upper() or not isinstance(value, str):
        return None
    value = value.strip()
    if value.startswith("cloudinary://"):
        try:
            name = urlparse(value).hostname
        except ValueError:
            return None
        return f"cloudinary:{name.lower()}" if name else None
    return f"cloudinary:{value.lower()}" if re.fullmatch(r"[A-Za-z0-9_-]{2,100}", value) else None


def env_hosts(pairs) -> dict[str, str]:
    found = {}
    for key, value in pairs:
        token = cloudinary_token(key, value) or host_of(value)
        if token:
            found[key] = token
    return found


def repo_identity(raw: str | None) -> tuple[str | None, str | None]:
    """Return ("owner/name", web URL) from a repo URL or an "owner/name" string."""
    if not raw:
        return None, None
    value = raw.strip().removesuffix(".git").rstrip("/")
    if "://" in value:
        parsed = urlparse(value)
        path = parsed.path.strip("/")
        return (path or None), (f"https://{parsed.hostname}/{path}" if path and parsed.hostname else None)
    return value, (f"https://github.com/{value}" if value.count("/") == 1 else None)


def iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1000, tz=timezone.utc).isoformat()
    return str(value)


async def bounded_gather(items, worker, limit: int = 4):
    gate = asyncio.Semaphore(limit)

    async def run(item):
        async with gate:
            return await worker(item)

    return await asyncio.gather(*(run(item) for item in items))


# ---------------------------------------------------------------- action catalog

@dataclass(frozen=True)
class Action:
    name: str
    label: str
    risk: str  # LOW | MEDIUM | HIGH (HIGH requires typing the resource name)
    kinds: tuple[str, ...]
    description: str
    params: dict[str, str] = field(default_factory=dict)  # name -> validator id
    billing: bool = False

    def public(self) -> dict:
        return {"name": self.name, "label": self.label, "risk": self.risk, "kinds": list(self.kinds),
                "description": self.description, "params": dict(self.params), "may_change_bill": self.billing}


ENV_KEY = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,127}$")
ID = re.compile(r"^[A-Za-z0-9_.:\-]{1,120}$")
DOMAIN = re.compile(r"^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")
NAME = re.compile(r"^[A-Za-z0-9_\-]{1,100}$")
BRANCH = re.compile(r"^[A-Za-z0-9_\-./]{1,100}$")
FOLDER = re.compile(r"^[A-Za-z0-9_\- ]+(/[A-Za-z0-9_\- ]+)*$")
TARGETS = {"production", "preview", "development"}
COMPUTE_UNITS = {0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16}


def check(kind: str, value: Any, required: bool):
    if value is None or value == "":
        if required:
            raise ProviderError("A required action field is missing.", 422)
        return None
    if kind == "env_key":
        if not isinstance(value, str) or not ENV_KEY.match(value):
            raise ProviderError("Environment variable names use letters, digits and underscores.", 422)
    elif kind == "secret":
        if not isinstance(value, str) or len(value) > 32768:
            raise ProviderError("Environment variable value must be text up to 32 KB.", 422)
    elif kind == "id":
        if not isinstance(value, str) or not ID.match(value):
            raise ProviderError("Invalid provider identifier.", 422)
    elif kind == "domain":
        if not isinstance(value, str) or not DOMAIN.match(value.lower()):
            raise ProviderError("Enter a valid domain such as app.example.com.", 422)
        value = value.lower()
    elif kind == "targets":
        if not isinstance(value, list) or not value or not set(value) <= TARGETS:
            raise ProviderError("Targets must be production, preview and/or development.", 422)
    elif kind == "instances":
        if not isinstance(value, int) or isinstance(value, bool) or not 1 <= value <= 10:
            raise ProviderError("Instance count must be between 1 and 10.", 422)
    elif kind == "cu":
        if not isinstance(value, (int, float)) or isinstance(value, bool) or float(value) not in COMPUTE_UNITS:
            raise ProviderError("Compute units must be a Neon size such as 0.25, 0.5, 1, 2 or 4.", 422)
    elif kind == "suspend":
        if not isinstance(value, int) or isinstance(value, bool) or not (value == -1 or 0 <= value <= 604800):
            raise ProviderError("Suspend timeout is -1 (never), 0 (default) or up to 604800 seconds.", 422)
    elif kind == "name":
        if not isinstance(value, str) or not NAME.match(value):
            raise ProviderError("Names use letters, digits, '-' and '_'.", 422)
    elif kind == "branch":
        if not isinstance(value, str) or not BRANCH.match(value):
            raise ProviderError("Branch names use letters, digits, '-', '_', '.' and '/'.", 422)
    elif kind == "folder":
        if not isinstance(value, str) or ".." in value or not FOLDER.match(value):
            raise ProviderError("Folder paths use letters, digits, spaces, '-' and '_' separated by '/'.", 422)
    elif kind == "bool":
        if not isinstance(value, bool):
            raise ProviderError("Expected true or false.", 422)
    return value


def validate(action: Action, params: dict) -> dict:
    unknown = set(params) - set(action.params)
    if unknown:
        raise ProviderError("This action does not accept: " + ", ".join(sorted(unknown)), 422)
    clean = {}
    for name, spec in action.params.items():
        optional = spec.endswith("?")
        value = check(spec.rstrip("?"), params.get(name), not optional)
        if value is not None:
            clean[name] = value
    return clean


def resource_child(resource: dict, collection: str, child_id: str) -> dict:
    for child in resource.get(collection) or []:
        if child.get("id") == child_id:
            return child
    raise ProviderError("That item is not part of this resource. Refresh and try again.", 409)


# ---------------------------------------------------------------- Vercel

class Vercel:
    key = "VERCEL"
    base = "https://api.vercel.com"
    actions = {a.name: a for a in (
        Action("redeploy", "Redeploy production", "LOW", ("frontend",), "Rebuild the current production deployment."),
        Action("rollback", "Roll back production", "HIGH", ("frontend",), "Point production at an earlier ready deployment.",
               {"deployment_id": "id"}),
        Action("set_env", "Set environment variable", "MEDIUM", ("frontend",),
               "Create or replace an encrypted variable. Redeploy for it to take effect.",
               {"key": "env_key", "value": "secret", "targets": "targets?"}),
        Action("delete_env", "Delete environment variable", "HIGH", ("frontend",), "Remove every entry with this name.",
               {"key": "env_key"}),
        Action("add_domain", "Add domain", "MEDIUM", ("frontend",), "Attach a domain. DNS must point at Vercel.", {"domain": "domain"}),
        Action("remove_domain", "Remove domain", "HIGH", ("frontend",), "Detach a domain from this project.", {"domain": "domain"}),
    )}

    def headers(self, cred):
        return {"Authorization": f"Bearer {cred['token']}"}

    def query(self, cred, **extra):
        values = {k: v for k, v in extra.items() if v is not None}
        if cred.get("team_id"):
            values["teamId"] = cred["team_id"]
        return values

    async def get(self, http, cred, path, **params):
        return await call(http, self.key, "GET", self.base + path, headers=self.headers(cred), params=self.query(cred, **params))

    async def verify(self, http, cred):
        if cred.get("team_id"):
            team = await call(http, self.key, "GET", f"{self.base}/v2/teams/{quote(cred['team_id'], safe='')}", headers=self.headers(cred))
            return {"account_ref": team.get("id") or cred["team_id"], "account_name": team.get("name") or team.get("slug")}
        user = (await self.get(http, cred, "/v2/user")).get("user") or {}
        return {"account_ref": user.get("id") or "", "account_name": user.get("username") or user.get("name")}

    async def inventory(self, http, cred):
        projects = (await self.get(http, cred, "/v9/projects", limit=50)).get("projects") or []

        async def one(project):
            pid = project["id"]
            deployments, domains, envs = await asyncio.gather(
                self.get(http, cred, "/v6/deployments", projectId=pid, limit=10),
                self.get(http, cred, f"/v9/projects/{pid}/domains"),
                self.get(http, cred, f"/v9/projects/{pid}/env"),
            )
            items = []
            for d in deployments.get("deployments") or []:
                meta = d.get("meta") or {}
                items.append({"id": d.get("uid") or d.get("id"), "state": d.get("readyState") or d.get("state") or "UNKNOWN",
                    "target": d.get("target") or "preview", "created_at": iso(d.get("created") or d.get("createdAt")),
                    "url": f"https://{d['url']}" if d.get("url") else None, "commit": (meta.get("githubCommitSha") or "")[:12],
                    "message": (meta.get("githubCommitMessage") or "")[:140], "branch": meta.get("githubCommitRef")})
            production = next((d for d in items if d["target"] == "production"), None)
            current = (project.get("targets") or {}).get("production") or {}
            if not production and current.get("id"):
                production = {"id": current["id"], "state": current.get("readyState") or "UNKNOWN", "target": "production",
                    "created_at": iso(current.get("createdAt")), "url": f"https://{current['url']}" if current.get("url") else None,
                    "commit": ((current.get("meta") or {}).get("githubCommitSha") or "")[:12],
                    "message": ((current.get("meta") or {}).get("githubCommitMessage") or "")[:140], "branch": (current.get("meta") or {}).get("githubCommitRef")}
                items.append(production)
            names = [d["name"] for d in domains.get("domains") or [] if d.get("name")]
            env_list = envs.get("envs") or []
            # Status follows the deployment currently serving production; a newer
            # build or failure is reported in the detail without hiding the live site.
            serving = current.get("readyState") if current.get("id") else None
            newest = (production or {}).get("state", "UNKNOWN")
            building = newest in ("BUILDING", "QUEUED", "INITIALIZING")
            live = serving == "READY" or (serving is None and any(d["target"] == "production" and d["state"] == "READY" for d in items))
            if live:
                status = "DEGRADED" if newest == "ERROR" else "HEALTHY"
                detail = "Production live" + (" · new deployment building" if building else "") + \
                    (" · latest deployment failed" if newest == "ERROR" else "")
            else:
                state = serving or newest
                status = {"ERROR": "FAILED", "CANCELED": "DEGRADED", "BUILDING": "DEPLOYING", "QUEUED": "DEPLOYING",
                          "INITIALIZING": "DEPLOYING"}.get(state, "UNKNOWN")
                detail = f"Production deployment {state.lower()}" if state != "UNKNOWN" else "No production deployment found"
            link = project.get("link") or {}
            repo = "/".join(x for x in (link.get("org"), link.get("repo")) if x) or link.get("repo")
            repo_name, repo_url = repo_identity(repo)
            if link.get("type") and link["type"] != "github":
                repo_url = None
            urls = [f"https://{n}" for n in names] or ([production["url"]] if production and production.get("url") else [])
            return {"id": pid, "provider": self.key, "kind": "frontend", "name": project.get("name"),
                "framework": project.get("framework"), "status": status, "status_detail": detail,
                "urls": urls, "domains": names, "hosts": sorted({h for h in (host_of(u) for u in urls) if h}),
                "repo": repo_name, "repo_url": repo_url, "root_dir": project.get("rootDirectory") or None,
                # Static assets are served from Vercel's global edge; server code runs in this region.
                "branch": link.get("productionBranch"), "region": project.get("serverlessFunctionRegion") or None,
                "deployments": items, "env_keys": sorted({e["key"] for e in env_list if e.get("key")}),
                "_env_hosts": env_hosts((e.get("key", ""), e.get("value")) for e in env_list if e.get("type") == "plain"),
                "dashboard_url": None}

        return await bounded_gather(projects[:50], one)

    async def execute(self, http, cred, action, resource, params):
        pid, h = resource["id"], self.headers(cred)
        if action == "redeploy":
            current = next((d for d in resource["deployments"] if d["target"] == "production" and d["state"] == "READY"), None) \
                or next((d for d in resource["deployments"] if d["target"] == "production"), None)
            if not current:
                raise ProviderError("No production deployment to redeploy yet.", 409)
            result = await call(http, self.key, "POST", f"{self.base}/v13/deployments", headers=h, params=self.query(cred, forceNew="1"),
                json={"name": resource["name"], "deploymentId": current["id"], "target": "production"})
            return {"message": "Production redeploy started.", "deployment_id": result.get("id"), "state": result.get("readyState")}
        if action == "rollback":
            target = resource_child(resource, "deployments", params["deployment_id"])
            if target["target"] != "production" or target["state"] != "READY":
                raise ProviderError("Roll back only to a ready production deployment.", 409)
            await call(http, self.key, "POST", f"{self.base}/v9/projects/{pid}/rollback/{quote(target['id'], safe='')}", headers=h, params=self.query(cred))
            return {"message": "Production now points at the selected deployment."}
        if action == "set_env":
            await call(http, self.key, "POST", f"{self.base}/v10/projects/{pid}/env", headers=h, params=self.query(cred, upsert="true"),
                json={"key": params["key"], "value": params["value"], "type": "encrypted", "target": params.get("targets") or ["production", "preview"]})
            return {"message": f"{params['key']} saved. Redeploy production to apply it."}
        if action == "delete_env":
            envs = (await self.get(http, cred, f"/v9/projects/{pid}/env")).get("envs") or []
            matches = [e for e in envs if e.get("key") == params["key"]]
            if not matches:
                raise ProviderError("That variable no longer exists on Vercel.", 404)
            for entry in matches:
                await call(http, self.key, "DELETE", f"{self.base}/v9/projects/{pid}/env/{quote(entry['id'], safe='')}", headers=h, params=self.query(cred))
            return {"message": f"{params['key']} removed. Redeploy production to apply it."}
        if action == "add_domain":
            await call(http, self.key, "POST", f"{self.base}/v10/projects/{pid}/domains", headers=h, params=self.query(cred), json={"name": params["domain"]})
            return {"message": f"{params['domain']} added. Verify DNS in Vercel if prompted."}
        if action == "remove_domain":
            if params["domain"] not in resource.get("domains", []):
                raise ProviderError("That domain is not attached to this project.", 409)
            await call(http, self.key, "DELETE", f"{self.base}/v9/projects/{pid}/domains/{quote(params['domain'], safe='')}", headers=h, params=self.query(cred))
            return {"message": f"{params['domain']} removed."}
        raise ProviderError("Unsupported action.", 422)


# ---------------------------------------------------------------- Render

RENDER_KINDS = {"web_service": "web_service", "private_service": "private_service", "background_worker": "worker",
                "cron_job": "cron", "static_site": "static_site"}


class Render:
    key = "RENDER"
    base = "https://api.render.com/v1"
    services = ("web_service", "private_service", "worker", "cron", "static_site")
    actions = {a.name: a for a in (
        Action("deploy", "Deploy latest commit", "LOW", services, "Build and deploy the latest commit of the linked branch."),
        Action("deploy_clear_cache", "Clear cache and deploy", "LOW", services, "Rebuild from scratch, then deploy."),
        Action("restart", "Restart", "LOW", ("web_service", "private_service", "worker"), "Restart running instances without rebuilding."),
        Action("rollback", "Roll back", "HIGH", services, "Redeploy an earlier successful deploy.", {"deploy_id": "id"}),
        Action("suspend", "Suspend service", "HIGH", services, "Stop the service. It stops serving traffic until resumed."),
        Action("resume", "Resume service", "LOW", services, "Start a suspended service."),
        Action("scale", "Scale instances", "MEDIUM", ("web_service", "private_service", "worker"),
               "Set a fixed instance count (1–10).", {"num_instances": "instances"}, billing=True),
        Action("set_env", "Set environment variable", "MEDIUM", services,
               "Create or replace a variable. Render applies it on the next deploy.", {"key": "env_key", "value": "secret"}),
        Action("delete_env", "Delete environment variable", "HIGH", services, "Remove the variable.", {"key": "env_key"}),
    )}

    def headers(self, cred):
        return {"Authorization": f"Bearer {cred['api_key']}", "Accept": "application/json"}

    async def verify(self, http, cred):
        owners = await call(http, self.key, "GET", f"{self.base}/owners", headers=self.headers(cred), params={"limit": 20})
        owners = [o.get("owner") or o for o in owners or []]
        if cred.get("owner_id"):
            owner = next((o for o in owners if o.get("id") == cred["owner_id"]), None)
            if not owner:
                raise ProviderError("That Render workspace is not available to this API key.", 400)
        elif owners:
            owner = owners[0]
        else:
            raise ProviderError("This Render API key has no workspace.", 400)
        return {"account_ref": owner.get("id") or "", "account_name": owner.get("name") or owner.get("email")}

    async def inventory(self, http, cred, owner_id: str):
        rows = await call(http, self.key, "GET", f"{self.base}/services", headers=self.headers(cred), params={"limit": 50, "ownerId": owner_id})
        services = [r.get("service") or r for r in rows or []]

        async def one(service):
            sid, kind = service["id"], RENDER_KINDS.get(service.get("type"), "web_service")
            deploy_rows, env_rows, domain_rows = await asyncio.gather(
                call(http, self.key, "GET", f"{self.base}/services/{sid}/deploys", headers=self.headers(cred), params={"limit": 10}),
                call(http, self.key, "GET", f"{self.base}/services/{sid}/env-vars", headers=self.headers(cred), params={"limit": 100}),
                call(http, self.key, "GET", f"{self.base}/services/{sid}/custom-domains", headers=self.headers(cred), params={"limit": 20})
                if kind in ("web_service", "static_site") else asyncio.sleep(0, result=[]),
            )
            deploys = []
            for row in deploy_rows or []:
                d = row.get("deploy") or row
                commit = d.get("commit") or {}
                deploys.append({"id": d.get("id"), "state": d.get("status") or "unknown", "target": "production",
                    "created_at": d.get("createdAt"), "finished_at": d.get("finishedAt"), "url": None,
                    "commit": (commit.get("id") or "")[:12], "message": (commit.get("message") or "")[:140], "branch": service.get("branch")})
            envs = [(r.get("envVar") or r).get("key", "") for r in env_rows or []]
            pairs = [((r.get("envVar") or r).get("key", ""), (r.get("envVar") or r).get("value")) for r in env_rows or []]
            details = service.get("serviceDetails") or {}
            domains = [(r.get("customDomain") or r).get("name") for r in domain_rows or [] if (r.get("customDomain") or r).get("name")]
            urls = [details["url"]] if details.get("url") else []
            urls += [f"https://{d}" for d in domains]
            latest = deploys[0]["state"] if deploys else "none"
            live = any(d["state"] == "live" for d in deploys)
            in_progress = latest.endswith("in_progress") or latest in ("created", "queued")
            if service.get("suspended") == "suspended":
                status, detail = "SUSPENDED", "Suspended"
            elif live:
                status = "DEGRADED" if latest.endswith("failed") else "HEALTHY"
                detail = "Live" + (" · new deploy in progress" if in_progress else "") + \
                    (f" · latest deploy {latest.replace('_', ' ')}" if latest.endswith("failed") else "")
            else:
                status = "FAILED" if latest.endswith("failed") else "DEPLOYING" if in_progress else "UNKNOWN"
                detail = f"Latest deploy {latest.replace('_', ' ')}" if deploys else "No deploys found"
            repo_name, repo_url = repo_identity(service.get("repo"))
            return {"id": sid, "provider": self.key, "kind": kind, "name": service.get("name"),
                "framework": details.get("runtime") or details.get("env"), "status": status, "status_detail": detail,
                "urls": urls, "domains": domains, "hosts": sorted({h for h in (host_of(u) for u in urls) if h}),
                "repo": repo_name, "repo_url": repo_url, "root_dir": service.get("rootDir") or None, "branch": service.get("branch"),
                "region": details.get("region"), "plan": details.get("plan"), "instances": details.get("numInstances"),
                "health_check_path": details.get("healthCheckPath") or None,
                "deployments": deploys, "env_keys": sorted({k for k in envs if k}), "_env_hosts": env_hosts(pairs),
                "dashboard_url": service.get("dashboardUrl")}

        return await bounded_gather(services[:50], one)

    async def execute(self, http, cred, action, resource, params):
        sid, h = resource["id"], self.headers(cred)
        url = f"{self.base}/services/{sid}"
        if action in ("deploy", "deploy_clear_cache"):
            result = await call(http, self.key, "POST", f"{url}/deploys", headers=h,
                json={"clearCache": "clear" if action == "deploy_clear_cache" else "do_not_clear"})
            return {"message": "Deploy started.", "deployment_id": (result or {}).get("id")}
        if action == "restart":
            await call(http, self.key, "POST", f"{url}/restart", headers=h)
            return {"message": "Restart requested."}
        if action == "rollback":
            target = resource_child(resource, "deployments", params["deploy_id"])
            if target["state"] not in ("live", "deactivated"):
                raise ProviderError("Roll back only to a deploy that went live.", 409)
            await call(http, self.key, "POST", f"{url}/rollback", headers=h, json={"deployId": target["id"]})
            return {"message": "Rollback started."}
        if action == "suspend":
            await call(http, self.key, "POST", f"{url}/suspend", headers=h)
            return {"message": "Service suspended."}
        if action == "resume":
            await call(http, self.key, "POST", f"{url}/resume", headers=h)
            return {"message": "Service resuming."}
        if action == "scale":
            await call(http, self.key, "POST", f"{url}/scale", headers=h, json={"numInstances": params["num_instances"]})
            return {"message": f"Scaling to {params['num_instances']} instance(s)."}
        if action == "set_env":
            await call(http, self.key, "PUT", f"{url}/env-vars/{quote(params['key'], safe='')}", headers=h, json={"value": params["value"]})
            return {"message": f"{params['key']} saved. Deploy to apply it."}
        if action == "delete_env":
            if params["key"] not in resource.get("env_keys", []):
                raise ProviderError("That variable is not set on this service.", 409)
            await call(http, self.key, "DELETE", f"{url}/env-vars/{quote(params['key'], safe='')}", headers=h)
            return {"message": f"{params['key']} removed. Deploy to apply it."}
        raise ProviderError("Unsupported action.", 422)


# ---------------------------------------------------------------- Neon

class Neon:
    key = "NEON"
    base = "https://console.neon.tech/api/v2"
    actions = {a.name: a for a in (
        Action("start_endpoint", "Start compute", "LOW", ("database",), "Wake a suspended compute endpoint.", {"endpoint_id": "id"}),
        Action("restart_endpoint", "Restart compute", "MEDIUM", ("database",), "Restart the compute. Open connections drop.", {"endpoint_id": "id"}),
        Action("suspend_endpoint", "Suspend compute", "MEDIUM", ("database",), "Suspend the compute now. Next query wakes it.", {"endpoint_id": "id"}),
        Action("set_autoscaling", "Set autoscaling", "MEDIUM", ("database",), "Change compute size limits and scale-to-zero delay.",
               {"endpoint_id": "id", "min_cu": "cu", "max_cu": "cu", "suspend_timeout_seconds": "suspend?"}, billing=True),
        Action("create_branch", "Create branch", "MEDIUM", ("database",), "Copy-on-write branch with its own read-write compute.",
               {"name": "branch", "parent_id": "id?"}, billing=True),
        Action("delete_branch", "Delete branch", "HIGH", ("database",), "Permanently delete a non-default branch and its data.",
               {"branch_id": "id"}),
    )}

    def headers(self, cred):
        return {"Authorization": f"Bearer {cred['api_key']}", "Accept": "application/json"}

    def scope(self, cred):
        return {"org_id": cred["org_id"]} if cred.get("org_id") else {}

    async def verify(self, http, cred):
        try:
            await call(http, self.key, "GET", f"{self.base}/projects", headers=self.headers(cred), params={"limit": 1, **self.scope(cred)})
        except ProviderError as exc:
            if cred.get("org_id") or "org_id" not in exc.message:
                raise
            # Accounts inside a Neon organization must name it; use it when there is exactly one.
            orgs = (await call(http, self.key, "GET", f"{self.base}/users/me/organizations", headers=self.headers(cred))).get("organizations") or []
            if len(orgs) != 1:
                names = ", ".join(f"{o.get('name')} ({o.get('id')})" for o in orgs[:10]) or "none found"
                raise ProviderError(f"This Neon key can see several organizations. Enter the Organization ID: {names}.", 422) from None
            cred["org_id"] = orgs[0]["id"]
            await call(http, self.key, "GET", f"{self.base}/projects", headers=self.headers(cred), params={"limit": 1, **self.scope(cred)})
            return {"account_ref": cred["org_id"], "account_name": orgs[0].get("name") or cred["org_id"]}
        name = cred.get("org_id")
        if not name:
            try:
                me = await call(http, self.key, "GET", f"{self.base}/users/me", headers=self.headers(cred))
                name = me.get("email") or me.get("name")
            except ProviderError:
                name = None
        return {"account_ref": cred.get("org_id") or "personal", "account_name": name}

    async def inventory(self, http, cred):
        projects = (await call(http, self.key, "GET", f"{self.base}/projects", headers=self.headers(cred),
                               params={"limit": 50, **self.scope(cred)})).get("projects") or []

        async def one(project):
            pid = project["id"]
            branches, endpoints = await asyncio.gather(
                call(http, self.key, "GET", f"{self.base}/projects/{pid}/branches", headers=self.headers(cred)),
                call(http, self.key, "GET", f"{self.base}/projects/{pid}/endpoints", headers=self.headers(cred)),
            )
            computes = [{"id": e.get("id"), "branch_id": e.get("branch_id"), "type": e.get("type"), "state": e.get("current_state"),
                "host": e.get("host"), "min_cu": e.get("autoscaling_limit_min_cu"), "max_cu": e.get("autoscaling_limit_max_cu"),
                "suspend_timeout_seconds": e.get("suspend_timeout_seconds"), "disabled": bool(e.get("disabled"))}
                for e in endpoints.get("endpoints") or []]
            branch_items = [{"id": b.get("id"), "name": b.get("name"), "default": bool(b.get("default") or b.get("primary")),
                "state": b.get("current_state"), "logical_size": b.get("logical_size"), "created_at": b.get("created_at"),
                "parent_id": b.get("parent_id")} for b in branches.get("branches") or []]
            disabled = [c for c in computes if c["disabled"]]
            active = sum(1 for c in computes if c["state"] == "active")
            return {"id": pid, "provider": self.key, "kind": "database", "name": project.get("name"),
                "framework": f"PostgreSQL {project.get('pg_version')}" if project.get("pg_version") else "PostgreSQL",
                "status": "DEGRADED" if disabled else "HEALTHY",
                "status_detail": f"{active} active, {len(computes) - active} idle compute" if not disabled else "A compute endpoint is disabled",
                "urls": [], "domains": [], "hosts": sorted({normalize_host(c["host"]) for c in computes if c["host"]}),
                "repo": None, "branch": None, "region": project.get("region_id"),
                "metrics": {"storage_bytes": project.get("synthetic_storage_size"), "compute_seconds": project.get("compute_time_seconds"),
                            "active_seconds": project.get("active_time_seconds"), "transfer_bytes": project.get("data_transfer_bytes")},
                "branches": branch_items, "endpoints": computes, "deployments": [], "env_keys": [], "_env_hosts": {},
                "dashboard_url": f"https://console.neon.tech/app/projects/{pid}"}

        return await bounded_gather(projects[:50], one)

    async def execute(self, http, cred, action, resource, params):
        pid, h = resource["id"], self.headers(cred)
        base = f"{self.base}/projects/{pid}"
        if action in ("start_endpoint", "restart_endpoint", "suspend_endpoint"):
            endpoint = resource_child(resource, "endpoints", params["endpoint_id"])
            verb = action.split("_")[0]
            await call(http, self.key, "POST", f"{base}/endpoints/{quote(endpoint['id'], safe='')}/{verb}", headers=h)
            return {"message": f"Compute {verb} requested."}
        if action == "set_autoscaling":
            endpoint = resource_child(resource, "endpoints", params["endpoint_id"])
            if params["min_cu"] > params["max_cu"]:
                raise ProviderError("Minimum compute cannot exceed maximum.", 422)
            body = {"autoscaling_limit_min_cu": params["min_cu"], "autoscaling_limit_max_cu": params["max_cu"]}
            if "suspend_timeout_seconds" in params:
                body["suspend_timeout_seconds"] = params["suspend_timeout_seconds"]
            await call(http, self.key, "PATCH", f"{base}/endpoints/{quote(endpoint['id'], safe='')}", headers=h, json={"endpoint": body})
            return {"message": "Autoscaling updated."}
        if action == "create_branch":
            parent = params.get("parent_id")
            if parent:
                resource_child(resource, "branches", parent)
            branch = {"name": params["name"], **({"parent_id": parent} if parent else {})}
            result = await call(http, self.key, "POST", f"{base}/branches", headers=h, json={"branch": branch, "endpoints": [{"type": "read_write"}]})
            return {"message": f"Branch {params['name']} created.", "branch_id": ((result or {}).get("branch") or {}).get("id")}
        if action == "delete_branch":
            branch = resource_child(resource, "branches", params["branch_id"])
            if branch["default"]:
                raise ProviderError("The default branch cannot be deleted from LaunchComply.", 409)
            await call(http, self.key, "DELETE", f"{base}/branches/{quote(branch['id'], safe='')}", headers=h)
            return {"message": f"Branch {branch['name']} deleted."}
        raise ProviderError("Unsupported action.", 422)


# ---------------------------------------------------------------- Cloudinary

class Cloudinary:
    key = "CLOUDINARY"
    actions = {a.name: a for a in (
        Action("create_folder", "Create folder", "LOW", ("media",), "Create an asset folder.", {"path": "folder"}),
        Action("set_upload_preset", "Save upload preset", "MEDIUM", ("media",), "Create or update an upload preset.",
               {"name": "name", "unsigned": "bool", "folder": "folder?"}),
        Action("delete_upload_preset", "Delete upload preset", "HIGH", ("media",), "Uploads using this preset will fail.",
               {"name": "name"}),
    )}

    def base(self, cred):
        return f"https://api.cloudinary.com/v1_1/{quote(cred['cloud_name'], safe='')}"

    def auth(self, cred):
        return httpx.BasicAuth(cred["api_key"], cred["api_secret"])

    async def verify(self, http, cred):
        usage = await call(http, self.key, "GET", f"{self.base(cred)}/usage", auth=self.auth(cred))
        return {"account_ref": cred["cloud_name"], "account_name": f"{cred['cloud_name']} ({usage.get('plan') or 'plan unknown'})"}

    async def inventory(self, http, cred):
        usage, presets, folders = await asyncio.gather(
            call(http, self.key, "GET", f"{self.base(cred)}/usage", auth=self.auth(cred)),
            call(http, self.key, "GET", f"{self.base(cred)}/upload_presets", auth=self.auth(cred), params={"max_results": 50}),
            call(http, self.key, "GET", f"{self.base(cred)}/folders", auth=self.auth(cred)),
        )
        meters = {}
        for name in ("credits", "storage", "bandwidth", "transformations", "objects", "impressions"):
            item = usage.get(name)
            if isinstance(item, dict):
                meters[name] = {"usage": item.get("usage"), "limit": item.get("limit"), "used_percent": item.get("used_percent")}
        peak = max([m["used_percent"] or 0 for m in meters.values()] or [0])
        status = "FAILED" if peak >= 100 else "DEGRADED" if peak >= 80 else "HEALTHY"
        cloud = cred["cloud_name"]
        return [{"id": cloud, "provider": self.key, "kind": "media", "name": cloud, "framework": f"Cloudinary {usage.get('plan') or ''}".strip(),
            "status": status, "status_detail": f"Peak plan usage {peak:.0f}%", "urls": [], "domains": [],
            "hosts": [f"cloudinary:{cloud.lower()}"], "repo": None, "branch": None, "region": None,
            "metrics": {"plan": usage.get("plan"), "meters": meters, "last_updated": usage.get("last_updated"),
                        "requests": usage.get("requests"), "resources": usage.get("resources")},
            "presets": [{"id": p.get("name"), "name": p.get("name"), "unsigned": bool(p.get("unsigned")),
                         "folder": (p.get("settings") or {}).get("folder")} for p in presets.get("presets") or []],
            "folders": [{"id": f.get("path"), "name": f.get("name"), "path": f.get("path")} for f in folders.get("folders") or []],
            "deployments": [], "env_keys": [], "_env_hosts": {}, "dashboard_url": "https://console.cloudinary.com/"}]

    async def execute(self, http, cred, action, resource, params):
        base, auth = self.base(cred), self.auth(cred)
        if action == "create_folder":
            await call(http, self.key, "POST", f"{base}/folders/{quote(params['path'], safe='/')}", auth=auth)
            return {"message": f"Folder {params['path']} created."}
        if action == "set_upload_preset":
            data = {"unsigned": "true" if params["unsigned"] else "false"}
            if params.get("folder"):
                data["folder"] = params["folder"]
            exists = any(p["name"] == params["name"] for p in resource.get("presets", []))
            if exists:
                await call(http, self.key, "PUT", f"{base}/upload_presets/{quote(params['name'], safe='')}", auth=auth, data=data)
            else:
                await call(http, self.key, "POST", f"{base}/upload_presets", auth=auth, data={"name": params["name"], **data})
            return {"message": f"Upload preset {params['name']} {'updated' if exists else 'created'}."}
        if action == "delete_upload_preset":
            resource_child(resource, "presets", params["name"])
            await call(http, self.key, "DELETE", f"{base}/upload_presets/{quote(params['name'], safe='')}", auth=auth)
            return {"message": f"Upload preset {params['name']} deleted."}
        raise ProviderError("Unsupported action.", 422)


PROVIDERS = {"VERCEL": Vercel(), "RENDER": Render(), "NEON": Neon(), "CLOUDINARY": Cloudinary()}

# Credential fields each provider accepts; "secret" fields are required and never echoed.
CREDENTIAL_FIELDS = {
    "VERCEL": {"token": "secret", "team_id": "optional"},
    "RENDER": {"api_key": "secret", "owner_id": "optional"},
    "NEON": {"api_key": "secret", "org_id": "optional"},
    "CLOUDINARY": {"cloud_name": "required", "api_key": "required", "api_secret": "secret"},
}


async def verify(provider: str, credential: dict) -> dict:
    async with client() as http:
        return await PROVIDERS[provider].verify(http, credential)


async def inventory(provider: str, credential: dict, account_ref: str) -> list[dict]:
    async with client() as http:
        if provider == "RENDER":
            return await PROVIDERS[provider].inventory(http, credential, account_ref)
        return await PROVIDERS[provider].inventory(http, credential)


async def execute(provider: str, credential: dict, action: str, resource: dict, params: dict) -> dict:
    async with client() as http:
        return await PROVIDERS[provider].execute(http, credential, action, resource, params)
