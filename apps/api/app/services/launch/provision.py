"""Create launch resources on the customer's own provider accounts and wire them.

Every call here is made only after explicit owner/admin confirmation in the API
layer. Resources are created on free plans. Secret values (database URLs,
Cloudinary credentials) move server-side from one provider to another and are
never returned to the browser, logged or stored by LaunchComply.
"""
from __future__ import annotations

from urllib.parse import quote

from app.services.hosting import providers as _providers
from app.services.hosting.providers import Cloudinary, Neon, ProviderError, Render, Vercel, call

VERCEL, RENDER, NEON = Vercel(), Render(), Neon()


def client():
    # Looked up at call time so the shared factory (and test transports) apply.
    return _providers.client()
RENDER_REGIONS = ("singapore", "oregon", "ohio", "virginia", "frankfurt")
NEON_REGIONS = ("aws-ap-southeast-1", "aws-us-east-1", "aws-us-east-2", "aws-us-west-2", "aws-eu-central-1", "aws-eu-west-2", "aws-ap-southeast-2", "aws-sa-east-1")


async def create_vercel_project(cred: dict, part: dict, name: str) -> dict:
    owner, repo = part["repo"].split("/", 1)
    async with client() as http:
        body = {"name": name, "gitRepository": {"type": "github", "repo": part["repo"]}}
        if part.get("framework"):
            body["framework"] = part["framework"]
        if part.get("root_dir"):
            body["rootDirectory"] = part["root_dir"]
        project = await call(http, "VERCEL", "POST", f"{VERCEL.base}/v11/projects", headers=VERCEL.headers(cred),
                             params=VERCEL.query(cred), json=body)
        try:
            deployment = await call(http, "VERCEL", "POST", f"{VERCEL.base}/v13/deployments", headers=VERCEL.headers(cred),
                params=VERCEL.query(cred), json={"name": name, "project": project["id"], "target": "production",
                    "gitSource": {"type": "github", "org": owner, "repo": repo, "ref": part.get("branch") or "main"}})
        except ProviderError as exc:
            # The project exists now; report the deploy problem instead of treating creation as failed.
            return {"resource_id": project["id"], "message": f"Vercel project {name} created, but its first deployment did not start: {exc.message} "
                    "Push a commit or use Redeploy in Current hosting.", "warning": True}
    return {"resource_id": project["id"], "message": f"Vercel project {name} created and the first deployment started.",
            "deployment_id": deployment.get("id")}


async def create_render_service(cred: dict, owner_id: str, part: dict, name: str, region: str,
                                build_command: str | None, start_command: str | None) -> dict:
    if region not in RENDER_REGIONS:
        raise ProviderError("Choose a supported Render region.", 422)
    details: dict = {"plan": "free", "region": region, "runtime": part.get("runtime") or "python"}
    if details["runtime"] == "docker":
        details["envSpecificDetails"] = {"dockerfilePath": "./Dockerfile", "dockerContext": "."}
    else:
        if not build_command or not start_command:
            raise ProviderError("Enter the build and start commands for your backend.", 422)
        details["envSpecificDetails"] = {"buildCommand": build_command, "startCommand": start_command}
    body = {"type": "web_service", "name": name, "ownerId": owner_id, "repo": f"https://github.com/{part['repo']}",
            "branch": part.get("branch") or "main", "autoDeploy": "yes", "serviceDetails": details}
    if part.get("root_dir"):
        body["rootDir"] = part["root_dir"]
    async with client() as http:
        result = await call(http, "RENDER", "POST", f"{RENDER.base}/services", headers=RENDER.headers(cred), json=body)
    service = (result or {}).get("service") or result or {}
    return {"resource_id": service.get("id"), "message": f"Render service {name} created on the free plan. The first build is running.",
            "url": (service.get("serviceDetails") or {}).get("url")}


async def create_neon_project(cred: dict, name: str, region: str) -> dict:
    if region not in NEON_REGIONS:
        raise ProviderError("Choose a supported Neon region.", 422)
    project = {"name": name, "region_id": region}
    if cred.get("org_id"):
        project["org_id"] = cred["org_id"]
    async with client() as http:
        result = await call(http, "NEON", "POST", f"{NEON.base}/projects", headers=NEON.headers(cred), json={"project": project})
    # The response includes a connection string with a password; it is deliberately dropped here.
    return {"resource_id": (result.get("project") or {}).get("id"), "message": f"Neon database {name} created."}


async def neon_connection_uri(cred: dict, project_id: str) -> str:
    async with client() as http:
        branches = (await call(http, "NEON", "GET", f"{NEON.base}/projects/{quote(project_id, safe='')}/branches", headers=NEON.headers(cred))).get("branches") or []
        branch = next((b for b in branches if b.get("default") or b.get("primary")), branches[0] if branches else None)
        if not branch:
            raise ProviderError("The Neon project has no branch yet. Try again in a minute.", 409)
        databases = (await call(http, "NEON", "GET", f"{NEON.base}/projects/{quote(project_id, safe='')}/branches/{quote(branch['id'], safe='')}/databases",
                                headers=NEON.headers(cred))).get("databases") or []
        if not databases:
            raise ProviderError("The Neon project has no database yet. Try again in a minute.", 409)
        database = databases[0]
        result = await call(http, "NEON", "GET", f"{NEON.base}/projects/{quote(project_id, safe='')}/connection_uri", headers=NEON.headers(cred),
            params={"branch_id": branch["id"], "database_name": database["name"], "role_name": database["owner_name"], "pooled": "true"})
    uri = result.get("uri")
    if not uri:
        raise ProviderError("Neon did not return a connection string.", 424)
    return uri


async def set_render_env(cred: dict, service_id: str, values: dict[str, str], deploy: bool = True) -> None:
    async with client() as http:
        for key, value in values.items():
            await call(http, "RENDER", "PUT", f"{RENDER.base}/services/{quote(service_id, safe='')}/env-vars/{quote(key, safe='')}",
                       headers=RENDER.headers(cred), json={"value": value})
        if deploy:
            await call(http, "RENDER", "POST", f"{RENDER.base}/services/{quote(service_id, safe='')}/deploys",
                       headers=RENDER.headers(cred), json={"clearCache": "do_not_clear"})


async def set_vercel_env_and_redeploy(cred: dict, project: dict, key: str, value: str) -> None:
    async with client() as http:
        await call(http, "VERCEL", "POST", f"{VERCEL.base}/v10/projects/{quote(project['id'], safe='')}/env", headers=VERCEL.headers(cred),
                   params=VERCEL.query(cred, upsert="true"), json={"key": key, "value": value, "type": "plain", "target": ["production", "preview"]})
        current = next((d for d in project.get("deployments") or [] if d["target"] == "production" and d["state"] == "READY"), None) \
            or next((d for d in project.get("deployments") or [] if d["target"] == "production"), None)
        if current:
            await call(http, "VERCEL", "POST", f"{VERCEL.base}/v13/deployments", headers=VERCEL.headers(cred), params=VERCEL.query(cred, forceNew="1"),
                       json={"name": project["name"], "deploymentId": current["id"], "target": "production"})


def cloudinary_env(cred: dict, env_keys: list[str]) -> dict[str, str]:
    """Cloudinary settings in the variable names the backend code actually reads."""
    keys = set(env_keys)
    if not keys & {"CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"} or "CLOUDINARY_URL" in keys:
        return {"CLOUDINARY_URL": f"cloudinary://{cred['api_key']}:{cred['api_secret']}@{cred['cloud_name']}"}
    return {k: v for k, v in {"CLOUDINARY_CLOUD_NAME": cred["cloud_name"], "CLOUDINARY_API_KEY": cred["api_key"],
                              "CLOUDINARY_API_SECRET": cred["api_secret"]}.items() if k in keys}


async def find_by_name(provider: str, cred: dict, owner_id: str, name: str) -> str | None:
    """Provider ID of a resource with exactly this name in the account, or None."""
    async with client() as http:
        if provider == "VERCEL":
            try:
                project = await call(http, "VERCEL", "GET", f"{VERCEL.base}/v9/projects/{quote(name, safe='')}",
                                     headers=VERCEL.headers(cred), params=VERCEL.query(cred))
            except ProviderError as exc:
                if exc.status == 404:
                    return None
                raise
            return project.get("id") if project.get("name") == name else None
        if provider == "RENDER":
            rows = await call(http, "RENDER", "GET", f"{RENDER.base}/services", headers=RENDER.headers(cred),
                              params={"name": name, "ownerId": owner_id, "limit": 20})
            return next(((r.get("service") or r).get("id") for r in rows or [] if (r.get("service") or r).get("name") == name), None)
        if provider == "NEON":
            params = {"limit": 400, "search": name, **({"org_id": cred["org_id"]} if cred.get("org_id") else {})}
            projects = (await call(http, "NEON", "GET", f"{NEON.base}/projects", headers=NEON.headers(cred), params=params)).get("projects") or []
            return next((p.get("id") for p in projects if p.get("name") == name), None)
    return None


def redact(text: str, secrets: list[str]) -> str:
    """Remove secret values a provider might echo back in an error message."""
    for secret in sorted({s for s in secrets if s and len(s) >= 6}, key=len, reverse=True):
        text = text.replace(secret, "[hidden]")
    return text


__all__ = ["find_by_name", "redact", "create_vercel_project", "create_render_service", "create_neon_project", "neon_connection_uri", "set_render_env",
           "set_vercel_env_and_redeploy", "cloudinary_env", "RENDER_REGIONS", "NEON_REGIONS", "Cloudinary"]
