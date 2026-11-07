"""Guided launch against a stateful fixture of Vercel, Render, Neon and Cloudinary; no real provider is contacted."""
import json
import uuid

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.main import app
from app.models.application import Application
from app.models.audit import AuditEvent
from app.models.entities import Architecture
from app.services.hosting import monitoring, providers
from app.services.launch.plan import build_plan

DB_URI = "postgresql://owner:dbsecret_SENSITIVE@ep-new-123-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
CLOUD_SECRET = "cloudsecret_SENSITIVE"
EVIDENCE = {
    "repositories": [{"full_name": "learner/shop-web", "branch": "main"}, {"full_name": "learner/shop-api", "branch": "main"}],
    "files": [{"path": "learner/shop-web/package.json", "dependencies": ["react", "vite", "axios"]},
              {"path": "learner/shop-api/backend/requirements.txt", "dependencies": ["fastapi", "uvicorn", "asyncpg", "cloudinary"]}],
    "modules": [{"path": "learner/shop-web/src/api.ts", "language": "JavaScript / TypeScript", "imports": [], "environment_keys": [{"name": "VITE_API_URL", "line": 2}]},
                {"path": "learner/shop-api/backend/app/main.py", "language": "Python", "imports": ["fastapi"],
                 "environment_keys": [{"name": "DATABASE_URL", "line": 3}, {"name": "CLOUDINARY_URL", "line": 4}]}],
    "components": [], "commit": "abc", "source_type": "GITHUB",
}


def test_plan_detects_parts_commands_and_variables():
    plan = build_plan(EVIDENCE)
    by_role = {p["role"]: p for p in plan["parts"]}
    assert [p["role"] for p in plan["parts"]] == ["database", "backend", "frontend", "media"]
    assert by_role["frontend"] | {} and by_role["frontend"]["framework"] == "vite" and by_role["frontend"]["root_dir"] is None
    assert by_role["frontend"]["api_url_key"] == "VITE_API_URL" and by_role["frontend"]["provider"] == "VERCEL"
    backend = by_role["backend"]
    assert backend["root_dir"] == "backend" and backend["runtime"] == "python" and backend["provider"] == "RENDER"
    assert backend["start_command"] == "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    assert backend["database_url_key"] == "DATABASE_URL"
    assert build_plan(None) == {"parts": [], "analyzed": False, "repositories": [], "scope": plan["scope"]}


def provider_world(calls):
    world = {"neon": [], "render": [], "vercel": [], "env": {}, "neon_timeout_once": False, "render_env_echo_500": False}

    def respond(request: httpx.Request):
        calls.append(request)
        host, path, method = request.url.host, request.url.path, request.method
        body = json.loads(request.content) if request.content and request.headers.get("content-type", "").startswith("application/json") else {}
        if host == "api.vercel.com":
            if path == "/v2/user": return httpx.Response(200, json={"user": {"id": "u1", "username": "learner"}})
            if path == "/v9/projects": return httpx.Response(200, json={"projects": world["vercel"]})
            if path.startswith("/v9/projects/") and path.count("/") == 3 and method == "GET":
                wanted = path.rsplit("/", 1)[1]
                project = next((p for p in world["vercel"] if wanted in (p["id"], p["name"])), None)
                return httpx.Response(200, json=project) if project else httpx.Response(404, json={"error": {"message": "not found"}})
            if path == "/v11/projects" and method == "POST":
                project = {"id": "prj_new", "name": body["name"], "framework": body.get("framework"), "rootDirectory": body.get("rootDirectory"),
                           "link": {"type": "github", "org": body["gitRepository"]["repo"].split("/")[0], "repo": body["gitRepository"]["repo"].split("/")[1], "productionBranch": "main"},
                           "targets": {"production": {"id": "dpl_1", "readyState": "READY", "url": "shop-web.vercel.app"}}}
                world["vercel"].append(project)
                return httpx.Response(200, json=project)
            if path == "/v13/deployments" and method == "POST": return httpx.Response(200, json={"id": "dpl_x", "readyState": "QUEUED"})
            if path == "/v6/deployments": return httpx.Response(200, json={"deployments": [{"uid": "dpl_1", "readyState": "READY", "target": "production", "url": "shop-web.vercel.app"}]})
            if path.endswith("/domains"): return httpx.Response(200, json={"domains": []})
            if path.endswith("/env") and method == "GET": return httpx.Response(200, json={"envs": []})
            if path.endswith("/env") and method == "POST":
                world["env"][("vercel", body["key"])] = body["value"]; return httpx.Response(201, json={})
        if host == "api.render.com":
            if path == "/v1/owners": return httpx.Response(200, json=[{"owner": {"id": "tea_1", "name": "learner"}}])
            if path == "/v1/services" and method == "GET":
                wanted = request.url.params.get("name")
                return httpx.Response(200, json=[{"service": s} for s in world["render"] if not wanted or s["name"] == wanted])
            if path == "/v1/services" and method == "POST":
                assert body["serviceDetails"]["plan"] == "free" and body["ownerId"] == "tea_1"
                service = {"id": "srv_new", "name": body["name"], "type": "web_service", "suspended": "not_suspended", "repo": body["repo"],
                           "branch": body["branch"], "rootDir": body.get("rootDir"), "serviceDetails": {"url": "https://shop-api.onrender.com", "region": body["serviceDetails"]["region"]},
                           "_start": body["serviceDetails"]["envSpecificDetails"]["startCommand"]}
                world["render"].append(service)
                return httpx.Response(201, json={"service": service, "deployId": "dep_1"})
            if path == "/v1/services/srv_new/deploys" and method == "GET": return httpx.Response(200, json=[{"deploy": {"id": "dep_1", "status": "live"}}])
            if path == "/v1/services/srv_new/deploys" and method == "POST": return httpx.Response(201, json={"id": "dep_2"})
            if path == "/v1/services/srv_new/env-vars": return httpx.Response(200, json=[])
            if path == "/v1/services/srv_new/custom-domains": return httpx.Response(200, json=[])
            if path.startswith("/v1/services/srv_new/env-vars/") and method == "PUT" and world["render_env_echo_500"]:
                return httpx.Response(500, json={"message": f"could not save value {body['value']}"})
            if path.startswith("/v1/services/srv_new/env-vars/") and method == "PUT":
                world["env"][("render", path.rsplit("/", 1)[1])] = body["value"]; return httpx.Response(200, json={})
        if host == "console.neon.tech":
            if path == "/api/v2/projects" and method == "GET": return httpx.Response(200, json={"projects": world["neon"]})
            if path == "/api/v2/users/me": return httpx.Response(200, json={"email": "learner@example.test"})
            if path == "/api/v2/projects" and method == "POST":
                project = {"id": "proj_new", "name": body["project"]["name"], "region_id": body["project"]["region_id"], "pg_version": 17}
                world["neon"].append(project)
                if world["neon_timeout_once"]:
                    world["neon_timeout_once"] = False
                    raise httpx.ReadTimeout("simulated: created, but the answer never arrived", request=request)
                return httpx.Response(201, json={"project": project, "connection_uris": [{"connection_uri": DB_URI}]})
            if path == "/api/v2/projects/proj_new/branches": return httpx.Response(200, json={"branches": [{"id": "br_1", "name": "main", "default": True}]})
            if path == "/api/v2/projects/proj_new/endpoints": return httpx.Response(200, json={"endpoints": [{"id": "ep-new-123", "branch_id": "br_1", "current_state": "idle", "host": "ep-new-123.ap-southeast-1.aws.neon.tech"}]})
            if path == "/api/v2/projects/proj_new/branches/br_1/databases": return httpx.Response(200, json={"databases": [{"name": "neondb", "owner_name": "neondb_owner"}]})
            if path == "/api/v2/projects/proj_new/connection_uri": return httpx.Response(200, json={"uri": DB_URI})
        if host == "api.cloudinary.com":
            if path.endswith("/usage"): return httpx.Response(200, json={"plan": "Free", "credits": {"used_percent": 2}})
            if path.endswith("/upload_presets"): return httpx.Response(200, json={"presets": []})
            if path.endswith("/folders"): return httpx.Response(200, json={"folders": []})
        raise AssertionError(f"Unexpected provider call {method} {host}{path}")
    return world, respond


@pytest_asyncio.fixture
async def launch(monkeypatch):
    calls = []
    world, respond = provider_world(calls)
    monkeypatch.setattr(providers, "client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(respond)))
    monkeypatch.setattr(monitoring, "client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(200))))

    async def public(url):
        return url.startswith("https://")
    monkeypatch.setattr(monitoring, "public_https", public)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        account = (await client.post("/api/v1/auth/register", json={"email": f"learner-{uuid.uuid4().hex}@example.com", "password": "TestPassword123!",
                                                                     "full_name": "New Learner", "organization_name": "Learner shop"})).json()
        headers = {"Authorization": f"Bearer {account['access_token']}", "X-Organization-ID": account["organization_id"]}
        async with AsyncSessionLocal() as db:
            asset = Application(organization_id=account["organization_id"], name="My Shop", slug=f"shop-{uuid.uuid4().hex[:6]}")
            db.add(asset); await db.flush()
            db.add(Architecture(application_id=asset.id, organization_id=account["organization_id"], version="v1",
                                spec_json={"format": "repository-draft-v1", "graph": {"nodes": [], "edges": []}, "evidence": EVIDENCE}))
            await db.commit()
            app_id = asset.id
        yield client, headers, app_id, world, calls


def leaks(text):
    return [s for s in ("dbsecret_SENSITIVE", CLOUD_SECRET) if s in text]


@pytest.mark.asyncio
async def test_guided_launch_creates_free_resources_and_wires_them(launch):
    client, headers, app_id, world, calls = launch
    plan = (await client.get(f"/api/v1/launch/{app_id}", headers=headers)).json()
    assert plan["step"] == "accounts" and [a["provider"] for a in plan["accounts"]] == ["CLOUDINARY", "NEON", "RENDER", "VERCEL"]
    for body in ({"provider": "VERCEL", "label": "Vercel", "credentials": {"token": "vercel_tok_1234"}},
                 {"provider": "RENDER", "label": "Render", "credentials": {"api_key": "rnd_key_12345"}},
                 {"provider": "NEON", "label": "Neon", "credentials": {"api_key": "neon_key_12345"}},
                 {"provider": "CLOUDINARY", "label": "Cloudinary", "credentials": {"cloud_name": "shopcloud", "api_key": "999", "api_secret": CLOUD_SECRET}}):
        assert (await client.post("/api/v1/hosting/connections", headers=headers, json=body)).status_code == 200
    plan = (await client.get(f"/api/v1/launch/{app_id}", headers=headers)).json()
    assert plan["step"] == "create"
    parts = {p["role"]: p for p in plan["parts"]}

    before = len(calls)
    fp = {role: part["fingerprint"] for role, part in parts.items()}
    refused = await client.post(f"/api/v1/launch/{app_id}/parts/{parts['database']['id']}", headers=headers, json={"name": "my-shop-db", "fingerprint": fp["database"]})
    assert refused.status_code == 428 and len(calls) == before

    created = await client.post(f"/api/v1/launch/{app_id}/parts/{parts['database']['id']}", headers=headers, json={"name": "my-shop-db", "confirm": True, "fingerprint": fp["database"]})
    assert created.status_code == 200, created.text
    assert not leaks(created.text)
    backend = await client.post(f"/api/v1/launch/{app_id}/parts/{parts['backend']['id']}", headers=headers,
                                json={"name": "shop-api", "confirm": True, "region": "singapore", "fingerprint": fp["backend"]})
    assert backend.status_code == 200, backend.text
    assert world["render"][0]["rootDir"] == "backend" and world["render"][0]["_start"].startswith("uvicorn app.main:app")
    frontend = await client.post(f"/api/v1/launch/{app_id}/parts/{parts['frontend']['id']}", headers=headers, json={"name": "shop-web", "confirm": True, "fingerprint": fp["frontend"]})
    assert frontend.status_code == 200, frontend.text
    again = await client.post(f"/api/v1/launch/{app_id}/parts/{parts['frontend']['id']}", headers=headers, json={"name": "shop-web", "confirm": True, "fingerprint": fp["frontend"]})
    assert again.status_code == 409, "a part that is already running is not created twice"

    plan = (await client.get(f"/api/v1/launch/{app_id}", headers=headers)).json()
    live = {p["role"]: p["live"] for p in plan["parts"]}
    assert live["database"]["name"] == "my-shop-db" and live["backend"]["name"] == "shop-api" and live["frontend"]["name"] == "shop-web"
    assert live["media"]["name"] == "shopcloud" and plan["step"] == "live"

    wired = await client.post(f"/api/v1/launch/{app_id}/connect", headers=headers, json={"confirm": True})
    assert wired.status_code == 200, wired.text
    assert world["env"][("render", "DATABASE_URL")] == DB_URI
    assert world["env"][("render", "CLOUDINARY_URL")] == f"cloudinary://999:{CLOUD_SECRET}@shopcloud"
    assert world["env"][("vercel", "VITE_API_URL")] == "https://shop-api.onrender.com"
    assert not leaks(wired.text) and not leaks(json.dumps((await client.get(f"/api/v1/launch/{app_id}", headers=headers)).json()))
    bad = await client.post(f"/api/v1/launch/{app_id}/connect", headers=headers, json={"confirm": True, "api_url": "https://evil.example.com"})
    assert bad.status_code == 422
    async with AsyncSessionLocal() as db:
        events = (await db.execute(select(AuditEvent).where(AuditEvent.organization_id == headers["X-Organization-ID"],
                                                            AuditEvent.action.in_(("LAUNCH_PART_CREATED", "LAUNCH_PARTS_CONNECTED"))))).scalars().all()
        assert len(events) == 4 and not leaks(json.dumps([e.details for e in events]))


@pytest.mark.asyncio
async def test_launch_is_tenant_scoped(launch):
    client, headers, app_id, world, calls = launch
    other = (await client.post("/api/v1/auth/register", json={"email": f"other-{uuid.uuid4().hex}@example.com", "password": "TestPassword123!",
                                                               "full_name": "Other", "organization_name": "Other biz"})).json()
    outsider = {"Authorization": f"Bearer {other['access_token']}", "X-Organization-ID": other["organization_id"]}
    assert (await client.get(f"/api/v1/launch/{app_id}", headers=outsider)).status_code == 404
    assert (await client.post(f"/api/v1/launch/{app_id}/connect", headers=outsider, json={"confirm": True})).status_code == 404


async def connect_accounts(client, headers, app_id):
    bodies = [{"provider": "VERCEL", "label": "Vercel", "credentials": {"token": "vercel_tok_1234"}},
              {"provider": "RENDER", "label": "Render", "credentials": {"api_key": "rnd_key_12345"}},
              {"provider": "NEON", "label": "Neon", "credentials": {"api_key": "neon_key_12345"}},
              {"provider": "CLOUDINARY", "label": "Cloudinary", "credentials": {"cloud_name": "shopcloud", "api_key": "999", "api_secret": CLOUD_SECRET}}]
    for body in bodies:
        assert (await client.post("/api/v1/hosting/connections", headers=headers, json=body)).status_code == 200
    plan = (await client.get(f"/api/v1/launch/{app_id}", headers=headers)).json()
    return {p["role"]: p for p in plan["parts"]}


@pytest.mark.asyncio
async def test_timeout_after_create_is_reconciled_never_duplicated(launch):
    client, headers, app_id, world, calls = launch
    parts = await connect_accounts(client, headers, app_id)
    url = f"/api/v1/launch/{app_id}/parts/{parts['database']['id']}"
    body = {"name": "my-shop-db", "confirm": True, "fingerprint": parts["database"]["fingerprint"]}
    world["neon_timeout_once"] = True
    unsure = await client.post(url, headers=headers, json=body)
    assert unsure.status_code == 202 and unsure.json()["status"] == "AMBIGUOUS", unsure.text
    assert len(world["neon"]) == 1, "the provider did create it"
    retried = await client.post(url, headers=headers, json=body)
    assert retried.status_code in (200, 409), retried.text
    posts = [c for c in calls if c.url.host == "console.neon.tech" and c.method == "POST" and c.url.path == "/api/v2/projects"]
    assert len(posts) == 1 and len(world["neon"]) == 1, "retry must reconcile, not create a second database"
    plan = (await client.get(f"/api/v1/launch/{app_id}", headers=headers)).json()
    database = next(p for p in plan["parts"] if p["role"] == "database")
    assert database["live"] and database["step"]["status"] == "CREATED"


@pytest.mark.asyncio
async def test_check_endpoint_resolves_unconfirmed_step(launch):
    client, headers, app_id, world, calls = launch
    parts = await connect_accounts(client, headers, app_id)
    world["neon_timeout_once"] = True
    await client.post(f"/api/v1/launch/{app_id}/parts/{parts['database']['id']}", headers=headers,
                      json={"name": "my-shop-db", "confirm": True, "fingerprint": parts["database"]["fingerprint"]})
    checked = await client.post(f"/api/v1/launch/{app_id}/parts/{parts['database']['id']}/check", headers=headers)
    assert checked.status_code == 200 and checked.json()["status"] == "CREATED", checked.text
    assert (await client.post(f"/api/v1/launch/{app_id}/parts/{parts['database']['id']}/check", headers=headers)).status_code == 409


@pytest.mark.asyncio
async def test_blockers_name_clash_and_stale_plan_never_reach_provider(launch):
    client, headers, app_id, world, calls = launch
    parts = await connect_accounts(client, headers, app_id)
    backend = parts["backend"]
    assert backend["blockers"] == []
    url = f"/api/v1/launch/{app_id}/parts/{backend['id']}"
    base = {"name": "shop-api", "confirm": True, "fingerprint": backend["fingerprint"]}
    creates = lambda: len([c for c in calls if c.method == "POST" and c.url.path == "/v1/services"])
    no_port = await client.post(url, headers=headers, json={**base, "start_command": "uvicorn app.main:app --port 8000"})
    assert no_port.status_code == 409 and "$PORT" in no_port.json()["detail"]
    stale = await client.post(url, headers=headers, json={**base, "fingerprint": "0" * 64})
    assert stale.status_code == 409 and "changed since you reviewed" in stale.json()["detail"]
    world["render"].append({"id": "srv_existing", "name": "shop-api", "type": "web_service", "suspended": "not_suspended",
                            "repo": "https://github.com/someone/else", "serviceDetails": {}})
    clash = await client.post(url, headers=headers, json=base)
    assert clash.status_code == 409 and "already has something named shop-api" in clash.json()["detail"]
    assert creates() == 0 and world["render"][-1]["id"] == "srv_existing", "existing resources are never adopted or changed"


@pytest.mark.asyncio
async def test_provider_error_echoing_a_secret_is_redacted(launch):
    client, headers, app_id, world, calls = launch
    parts = await connect_accounts(client, headers, app_id)
    for role, name in (("database", "my-shop-db"), ("backend", "shop-api"), ("frontend", "shop-web")):
        response = await client.post(f"/api/v1/launch/{app_id}/parts/{parts[role]['id']}", headers=headers,
                                     json={"name": name, "confirm": True, "fingerprint": parts[role]["fingerprint"]})
        assert response.status_code == 200, response.text
    world["render_env_echo_500"] = True
    failed = await client.post(f"/api/v1/launch/{app_id}/connect", headers=headers, json={"confirm": True})
    assert failed.status_code == 424, failed.text
    assert "dbsecret_SENSITIVE" not in failed.text and CLOUD_SECRET not in failed.text and "[hidden]" in failed.text


@pytest.mark.asyncio
async def test_create_already_in_progress_is_refused_without_provider_call(launch):
    from datetime import datetime, timezone
    from app.models.launch import LaunchStep
    client, headers, app_id, world, calls = launch
    parts = await connect_accounts(client, headers, app_id)
    database = parts["database"]
    async with AsyncSessionLocal() as db:
        db.add(LaunchStep(organization_id=headers["X-Organization-ID"], application_id=app_id, part_id=database["id"], role="database",
                          provider="NEON", resource_name="my-shop-db", fingerprint=database["fingerprint"], status="CREATING",
                          attempt_started_at=datetime.now(timezone.utc), created_by="someone"))
        await db.commit()
    before = len(calls)
    busy = await client.post(f"/api/v1/launch/{app_id}/parts/{database['id']}", headers=headers,
                             json={"name": "my-shop-db", "confirm": True, "fingerprint": database["fingerprint"]})
    assert busy.status_code == 409 and "being created right now" in busy.json()["detail"]
    assert not [c for c in calls[before:] if c.method == "POST"]
