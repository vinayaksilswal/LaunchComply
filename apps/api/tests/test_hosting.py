"""Hosting provider management with fixture HTTP transports; no real provider is contacted."""
import json
import uuid

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.main import app
from app.models.audit import AuditEvent
from app.models.hosting import HostingProviderConnection
from app.services.hosting import monitoring, providers

VERCEL_TOKEN = "vercel_fixture_token_SENSITIVE"
RENDER_KEY = "rnd_fixture_key_SENSITIVE"
NEON_KEY = "neon_fixture_key_SENSITIVE"
CLOUD_SECRET = "cloud_fixture_secret_SENSITIVE"
DB_PASSWORD = "dbpass_SENSITIVE"
ENV_VALUE = "new_value_SENSITIVE"


def provider_api(calls):
    def respond(request: httpx.Request):
        calls.append(request)
        host, path, method = request.url.host, request.url.path, request.method
        if host == "api.vercel.com":
            if request.headers.get("authorization") != f"Bearer {VERCEL_TOKEN}":
                return httpx.Response(403, json={"error": {"message": "forbidden"}})
            if path == "/v2/user":
                return httpx.Response(200, json={"user": {"id": "user_1", "username": "techinvenso"}})
            if path == "/v9/projects":
                return httpx.Response(200, json={"projects": [{"id": "prj_hrms", "name": "hrms", "framework": "vite",
                                                               "link": {"org": "techinvenso", "repo": "HRMS", "productionBranch": "main"}}]})
            if path == "/v6/deployments":
                return httpx.Response(200, json={"deployments": [
                    {"uid": "dpl_new", "readyState": "READY", "target": "production", "created": 1790000000000, "url": "hrms-new.vercel.app",
                     "meta": {"githubCommitSha": "abc123def4567890", "githubCommitMessage": "Ship payroll"}},
                    {"uid": "dpl_old", "readyState": "READY", "target": "production", "created": 1780000000000, "url": "hrms-old.vercel.app"},
                    {"uid": "dpl_preview", "readyState": "READY", "target": None, "created": 1785000000000, "url": "hrms-pr.vercel.app"}]})
            if path == "/v9/projects/prj_hrms/domains":
                return httpx.Response(200, json={"domains": [{"name": "hrms.techinvenso.com"}]})
            if path == "/v9/projects/prj_hrms/env" and method == "GET":
                return httpx.Response(200, json={"envs": [
                    {"id": "env_1", "key": "VITE_API_URL", "type": "plain", "value": "https://api.techinvenso.com/api/v1", "target": ["production"]},
                    {"id": "env_2", "key": "SESSION_SECRET", "type": "encrypted", "value": "ZW5jcnlwdGVk", "target": ["production"]}]})
            if path == "/v13/deployments" and method == "POST":
                return httpx.Response(200, json={"id": "dpl_redeploy", "readyState": "QUEUED"})
            if path == "/v10/projects/prj_hrms/env" and method == "POST":
                return httpx.Response(201, json={"created": {"key": json.loads(request.content)["key"]}})
            if path.startswith("/v9/projects/prj_hrms/rollback/") and method == "POST":
                return httpx.Response(201)
        if host == "api.render.com":
            if request.headers.get("authorization") != f"Bearer {RENDER_KEY}":
                return httpx.Response(401, json={"message": "unauthorized"})
            if path == "/v1/owners":
                return httpx.Response(200, json=[{"owner": {"id": "tea_1", "name": "Tech Invenso"}}])
            if path == "/v1/services":
                assert request.url.params["ownerId"] == "tea_1"
                return httpx.Response(200, json=[{"service": {"id": "srv_api", "name": "techinvenso-api", "type": "web_service",
                    "suspended": "not_suspended", "repo": "https://github.com/techinvenso/HRMS", "branch": "main",
                    "serviceDetails": {"url": "https://techinvenso-api.onrender.com", "region": "singapore", "plan": "starter",
                                       "numInstances": 1, "healthCheckPath": "/health", "runtime": "docker"}}}])
            if path == "/v1/services/srv_api/deploys" and method == "GET":
                return httpx.Response(200, json=[{"deploy": {"id": "dep_live", "status": "live", "commit": {"id": "fff000", "message": "fix"}}},
                                                 {"deploy": {"id": "dep_failed", "status": "build_failed"}}])
            if path == "/v1/services/srv_api/env-vars":
                return httpx.Response(200, json=[
                    {"envVar": {"key": "DATABASE_URL", "value": f"postgresql://owner:{DB_PASSWORD}@ep-calm-sea-123-pooler.ap-southeast-1.aws.neon.tech/neondb"}},
                    {"envVar": {"key": "CLOUDINARY_URL", "value": f"cloudinary://111:{CLOUD_SECRET}@techinvenso"}}])
            if path == "/v1/services/srv_api/custom-domains":
                return httpx.Response(200, json=[{"customDomain": {"name": "api.techinvenso.com"}}])
            if path == "/v1/services/srv_api/scale" and method == "POST":
                return httpx.Response(202)
        if host == "console.neon.tech":
            if path == "/api/v2/projects":
                return httpx.Response(200, json={"projects": [{"id": "proj_1", "name": "techinvenso-db", "region_id": "aws-ap-southeast-1",
                                                               "pg_version": 16, "synthetic_storage_size": 1024}]})
            if path == "/api/v2/users/me":
                return httpx.Response(200, json={"email": "owner@techinvenso.test"})
            if path == "/api/v2/projects/proj_1/branches" and method == "GET":
                return httpx.Response(200, json={"branches": [{"id": "br_main", "name": "main", "default": True},
                                                              {"id": "br_dev", "name": "dev", "default": False}]})
            if path == "/api/v2/projects/proj_1/endpoints":
                return httpx.Response(200, json={"endpoints": [{"id": "ep-calm-sea-123", "branch_id": "br_main", "type": "read_write",
                    "current_state": "idle", "host": "ep-calm-sea-123.ap-southeast-1.aws.neon.tech",
                    "autoscaling_limit_min_cu": 0.25, "autoscaling_limit_max_cu": 1}]})
        if host == "api.cloudinary.com":
            if path == "/v1_1/techinvenso/usage":
                return httpx.Response(200, json={"plan": "Free", "credits": {"usage": 21, "limit": 25, "used_percent": 84.0}})
            if path == "/v1_1/techinvenso/upload_presets":
                return httpx.Response(200, json={"presets": [{"name": "avatars", "unsigned": True, "settings": {"folder": "avatars"}}]})
            if path == "/v1_1/techinvenso/folders":
                return httpx.Response(200, json={"folders": [{"name": "avatars", "path": "avatars"}]})
        raise AssertionError(f"Unexpected provider call {method} {host}{path}")
    return respond


async def register(client, name):
    account = (await client.post("/api/v1/auth/register", json={"email": f"{name}-{uuid.uuid4().hex}@example.com",
        "password": "TestPassword123!", "full_name": name, "organization_name": f"{name} business"})).json()
    return {"Authorization": f"Bearer {account['access_token']}", "X-Organization-ID": account["organization_id"]}


@pytest_asyncio.fixture
async def hosting(monkeypatch):
    calls, probes = [], []
    monkeypatch.setattr(providers, "client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(provider_api(calls))))

    def probe_site(request):
        probes.append(str(request.url))
        if request.url.host == "hrms.techinvenso.com":
            return httpx.Response(502)
        return httpx.Response(200, json={"status": "HEALTHY"})

    monkeypatch.setattr(monitoring, "client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(probe_site)))

    async def always_public(url):
        return url.startswith("https://")

    monkeypatch.setattr(monitoring, "public_https", always_public)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield client, await register(client, "owner"), calls, probes


async def connect_all(client, headers):
    bodies = [
        {"provider": "VERCEL", "label": "Vercel", "credentials": {"token": VERCEL_TOKEN}},
        {"provider": "RENDER", "label": "Render", "credentials": {"api_key": RENDER_KEY}},
        {"provider": "NEON", "label": "Neon", "credentials": {"api_key": NEON_KEY}},
        {"provider": "CLOUDINARY", "label": "Cloudinary", "credentials": {"cloud_name": "techinvenso", "api_key": "111", "api_secret": CLOUD_SECRET}},
    ]
    out = {}
    for body in bodies:
        response = await client.post("/api/v1/hosting/connections", headers=headers, json=body)
        assert response.status_code == 200, response.text
        out[body["provider"]] = response.json()
    return out


def leaks(text):
    return [s for s in (VERCEL_TOKEN, RENDER_KEY, NEON_KEY, CLOUD_SECRET, DB_PASSWORD, ENV_VALUE) if s in text]


@pytest.mark.asyncio
async def test_connect_stores_only_ciphertext_and_rejects_bad_credentials(hosting):
    client, headers, calls, _ = hosting
    rejected = await client.post("/api/v1/hosting/connections", headers=headers,
                                 json={"provider": "VERCEL", "label": "Bad", "credentials": {"token": "wrong_token_value"}})
    assert rejected.status_code == 400
    connections = await connect_all(client, headers)
    assert connections["VERCEL"]["credential_hint"] == "…TIVE"
    assert connections["RENDER"]["account_ref"] == "tea_1"
    duplicate = await client.post("/api/v1/hosting/connections", headers=headers,
                                  json={"provider": "VERCEL", "label": "Again", "credentials": {"token": VERCEL_TOKEN}})
    assert duplicate.status_code == 409
    unknown = await client.post("/api/v1/hosting/connections", headers=headers,
                                json={"provider": "RENDER", "label": "x", "credentials": {"api_key": RENDER_KEY, "password": "p"}})
    assert unknown.status_code == 422
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(HostingProviderConnection).where(
            HostingProviderConnection.organization_id == headers["X-Organization-ID"]))).scalars().all()
        assert len(rows) == 4
        assert not leaks(json.dumps([[r.credential_encrypted, r.credential_hint, r.account_name] for r in rows]))
    overview = await client.get("/api/v1/hosting/overview", headers=headers)
    assert not leaks(overview.text)


@pytest.mark.asyncio
async def test_refresh_links_providers_probes_and_never_stores_env_values(hosting):
    client, headers, calls, probes = hosting
    await connect_all(client, headers)
    refreshed = await client.post("/api/v1/hosting/refresh", headers=headers)
    assert refreshed.status_code == 200 and refreshed.json()["errors"] == []
    cached = await client.post("/api/v1/hosting/refresh", headers=headers)
    assert cached.json()["refreshed"] is False
    data = (await client.get("/api/v1/hosting/overview", headers=headers)).json()
    by_id = {r["id"]: r for r in data["resources"]}
    assert set(by_id) == {"prj_hrms", "srv_api", "proj_1", "techinvenso"}
    frontend, api = by_id["prj_hrms"], by_id["srv_api"]
    assert frontend["status"] == "HEALTHY" and frontend["env_keys"] == ["SESSION_SECRET", "VITE_API_URL"]
    assert frontend["links"] == [{"provider": "RENDER", "resource_id": "srv_api", "via": "VITE_API_URL", "evidence": "ENV_HOST_MATCH"}]
    assert {(l["resource_id"], l["evidence"]) for l in api["links"]} == {("proj_1", "ENV_HOST_MATCH"), ("techinvenso", "ENV_HOST_MATCH")}
    assert by_id["techinvenso"]["status"] == "DEGRADED"
    assert "https://techinvenso-api.onrender.com/health" in probes
    severities = {(a["resource"], a["severity"]) for a in data["alerts"]}
    assert ("hrms", "critical") in severities and ("techinvenso", "warning") in severities
    assert data["history"] and data["summary"]["HEALTHY"] >= 2
    assert frontend["repo"] == "techinvenso/HRMS" and frontend["repo_url"] == "https://github.com/techinvenso/HRMS"
    assert api["repo"] == "techinvenso/HRMS" and api["status_detail"] == "Live" and api["status"] == "HEALTHY"
    project = next(p for p in data["projects"] if p["key"] == "techinvenso/hrms")
    assert set(project["resource_ids"]) == {"prj_hrms", "srv_api", "proj_1", "techinvenso"}
    assert not leaks(json.dumps(data))
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(HostingProviderConnection).where(
            HostingProviderConnection.organization_id == headers["X-Organization-ID"]))).scalars().all()
        stored = json.dumps([[r.inventory_json, r.health_json] for r in rows])
        assert not leaks(stored) and "_env_hosts" not in stored and "api.techinvenso.com/api/v1" not in stored


@pytest.mark.asyncio
async def test_actions_require_confirmation_validate_scope_and_audit_without_values(hosting):
    client, headers, calls, _ = hosting
    connections = await connect_all(client, headers)
    await client.post("/api/v1/hosting/refresh", headers=headers)
    vercel, render, neon = connections["VERCEL"]["id"], connections["RENDER"]["id"], connections["NEON"]["id"]
    run = lambda cid, body: client.post(f"/api/v1/hosting/connections/{cid}/actions", headers=headers, json=body)

    before = len(calls)
    assert (await run(vercel, {"resource_id": "prj_hrms", "action": "redeploy"})).status_code == 428
    assert (await run(vercel, {"resource_id": "prj_hrms", "action": "rollback", "confirm": True,
                               "params": {"deployment_id": "dpl_old"}})).status_code == 428
    assert (await run(vercel, {"resource_id": "prj_hrms", "action": "rollback", "confirm": True, "confirm_name": "hrms",
                               "params": {"deployment_id": "dpl_preview"}})).status_code == 409
    assert (await run(render, {"resource_id": "srv_api", "action": "scale", "confirm": True,
                               "params": {"num_instances": 50}})).status_code == 422
    assert (await run(render, {"resource_id": "srv_api", "action": "redeploy", "confirm": True})).status_code == 422
    assert (await run(neon, {"resource_id": "proj_1", "action": "delete_branch", "confirm": True, "confirm_name": "techinvenso-db",
                             "params": {"branch_id": "br_main"}})).status_code == 409
    assert len(calls) == before, "rejected actions must not reach the provider"

    redeploy = await run(vercel, {"resource_id": "prj_hrms", "action": "redeploy", "confirm": True})
    assert redeploy.status_code == 200 and redeploy.json()["deployment_id"] == "dpl_redeploy"
    assert json.loads(calls[-1].content)["deploymentId"] == "dpl_new"
    rollback = await run(vercel, {"resource_id": "prj_hrms", "action": "rollback", "confirm": True, "confirm_name": "hrms",
                                  "params": {"deployment_id": "dpl_old"}})
    assert rollback.status_code == 200 and calls[-1].url.path.endswith("/rollback/dpl_old")
    env = await run(vercel, {"resource_id": "prj_hrms", "action": "set_env", "confirm": True,
                             "params": {"key": "VITE_FEATURE", "value": ENV_VALUE, "targets": ["production"]}})
    assert env.status_code == 200 and not leaks(env.text)
    assert json.loads(calls[-1].content)["type"] == "encrypted"
    scale = await run(render, {"resource_id": "srv_api", "action": "scale", "confirm": True, "params": {"num_instances": 2}})
    assert scale.status_code == 200 and json.loads(calls[-1].content) == {"numInstances": 2}

    async with AsyncSessionLocal() as db:
        events = (await db.execute(select(AuditEvent).where(AuditEvent.organization_id == headers["X-Organization-ID"],
                                                            AuditEvent.action == "HOSTING_ACTION"))).scalars().all()
        assert {e.details["action"] for e in events} == {"redeploy", "rollback", "set_env", "scale"}
        assert not leaks(json.dumps([e.details for e in events]))


@pytest.mark.asyncio
async def test_other_business_and_members_cannot_use_connections(hosting):
    client, headers, calls, _ = hosting
    connections = await connect_all(client, headers)
    await client.post("/api/v1/hosting/refresh", headers=headers)
    outsider = await register(client, "outsider")
    assert (await client.get("/api/v1/hosting/overview", headers=outsider)).json()["resources"] == []
    action = await client.post(f"/api/v1/hosting/connections/{connections['RENDER']['id']}/actions", headers=outsider,
                               json={"resource_id": "srv_api", "action": "restart", "confirm": True})
    assert action.status_code == 404
    assert (await client.delete(f"/api/v1/hosting/connections/{connections['RENDER']['id']}", headers=outsider)).status_code == 404
    spoofed = {**outsider, "X-Organization-ID": headers["X-Organization-ID"]}
    assert (await client.get("/api/v1/hosting/overview", headers=spoofed)).status_code == 403


def test_link_resources_name_only_fallback_requires_single_candidate():
    resources = [
        {"id": "f", "provider": "VERCEL", "kind": "frontend", "name": "f", "hosts": [], "env_keys": ["NEXT_PUBLIC_API_URL"], "_env_hosts": {}},
        {"id": "a", "provider": "RENDER", "kind": "web_service", "name": "a", "hosts": ["a.onrender.com"], "env_keys": [], "_env_hosts": {}},
    ]
    monitoring.link_resources(resources)
    assert resources[0]["links"] == [{"provider": "RENDER", "resource_id": "a", "via": "NEXT_PUBLIC_API_URL", "evidence": "ENV_NAME_ONLY"}]
    resources.append({"id": "b", "provider": "RENDER", "kind": "web_service", "name": "b", "hosts": [], "env_keys": [], "_env_hosts": {}})
    for r in resources:
        r["_env_hosts"] = {}
    monitoring.link_resources(resources)
    assert resources[0]["links"] == []


@pytest.mark.asyncio
async def test_probe_refuses_private_and_non_https_targets():
    assert not await monitoring.public_https("http://example.com")
    assert not await monitoring.public_https("https://127.0.0.1/")
    assert not await monitoring.public_https("https://localhost/")
    assert not await monitoring.public_https("https://10.0.0.5:443/")


@pytest.mark.asyncio
async def test_neon_org_is_discovered_and_provider_refusals_stay_visible(monkeypatch):
    def neon(request):
        if request.url.path == "/api/v2/projects":
            if request.url.params.get("org_id") == "org-techinvenso":
                return httpx.Response(200, json={"projects": []})
            return httpx.Response(400, json={"code": "", "message": "org_id is required, you can find it on your organization settings page"})
        if request.url.path == "/api/v2/users/me/organizations":
            return httpx.Response(200, json={"organizations": [{"id": "org-techinvenso", "name": "Tech Invenso"}]})
        raise AssertionError(request.url.path)
    monkeypatch.setattr(providers, "client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(neon)))
    credential = {"api_key": NEON_KEY}
    account = await providers.verify("NEON", credential)
    assert account == {"account_ref": "org-techinvenso", "account_name": "Tech Invenso"}
    assert credential["org_id"] == "org-techinvenso", "discovered org must be sealed with the credential"

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        headers = await register(client, "neon")
        connected = await client.post("/api/v1/hosting/connections", headers=headers,
                                      json={"provider": "NEON", "label": "Database", "credentials": {"api_key": NEON_KEY}})
        assert connected.status_code == 200 and connected.json()["account_ref"] == "org-techinvenso"
        refused = await client.post("/api/v1/hosting/connections", headers=headers,
                                    json={"provider": "NEON", "label": "x", "credentials": {"api_key": NEON_KEY, "org_id": "org-other"}})
        # 4xx so the web client shows the provider's reason instead of a generic outage message.
        assert refused.status_code == 424 and "org_id is required" in refused.json()["detail"]


@pytest.mark.asyncio
async def test_vercel_status_uses_project_production_target_when_not_in_recent_deployments(monkeypatch):
    token = {"token": VERCEL_TOKEN}

    def vercel(request):
        path = request.url.path
        if path == "/v9/projects":
            return httpx.Response(200, json={"projects": [{"id": "prj_v", "name": "vighnaharan",
                "targets": {"production": {"id": "dpl_prod", "readyState": "READY", "url": "vighnaharan.vercel.app", "createdAt": 1770000000000}}}]})
        if path == "/v6/deployments":
            return httpx.Response(200, json={"deployments": [{"uid": "dpl_pr", "readyState": "READY", "target": None}]})
        if path.endswith("/domains"):
            return httpx.Response(200, json={"domains": []})
        if path.endswith("/env"):
            return httpx.Response(200, json={"envs": []})
        raise AssertionError(path)
    monkeypatch.setattr(providers, "client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(vercel)))
    [project] = await providers.inventory("VERCEL", token, "")
    assert project["status"] == "HEALTHY"
    assert project["urls"] == ["https://vighnaharan.vercel.app"]


def test_projects_group_by_repository_and_match_monorepo_applications():
    resources = [
        {"id": "v_hrms", "provider": "VERCEL", "kind": "frontend", "name": "hrms", "repo": "techinvenso/HRMS", "repo_url": "https://github.com/techinvenso/HRMS",
         "root_dir": "hrms", "links": [{"resource_id": "api", "provider": "RENDER", "via": "VITE_API_URL", "evidence": "ENV_HOST_MATCH"}]},
        {"id": "v_erp", "provider": "VERCEL", "kind": "frontend", "name": "erp", "repo": "techinvenso/HRMS", "root_dir": "erp", "links": []},
        {"id": "api", "provider": "RENDER", "kind": "web_service", "name": "api", "repo": "techinvenso/HRMS", "root_dir": "backend",
         "links": [{"resource_id": "db", "provider": "NEON", "via": "DATABASE_URL", "evidence": "ENV_HOST_MATCH"}]},
        {"id": "v_vig", "provider": "VERCEL", "kind": "frontend", "name": "vighnaharan", "repo": "vinayak/vighnaharan", "root_dir": None, "links": []},
        {"id": "db", "provider": "NEON", "kind": "database", "name": "db", "repo": None, "links": []},
        {"id": "media", "provider": "CLOUDINARY", "kind": "media", "name": "media", "repo": None, "links": []},
    ]
    apps = [{"id": "app_hrms", "name": "Techinvenso HRMS", "repos": [{"full_name": "TechInvenso/hrms", "root_path": "/hrms"}]},
            {"id": "app_vig", "name": "Vighnaharan", "repos": [{"full_name": "vinayak/vighnaharan", "root_path": "/"}]}]
    projects = {p["key"]: p for p in monitoring.group_projects(resources, apps)}
    assert set(projects) == {"techinvenso/hrms", "vinayak/vighnaharan", "unassigned"}
    hrms = projects["techinvenso/hrms"]
    assert set(hrms["resource_ids"]) == {"v_hrms", "v_erp", "api", "db"}, "database joins the project of the service using it"
    assert hrms["name"] == "HRMS" and hrms["applications"] == [{"id": "app_hrms", "name": "Techinvenso HRMS"}] and hrms["repo_url"] == "https://github.com/techinvenso/HRMS"
    by_id = {r["id"]: r for r in resources}
    assert by_id["v_hrms"]["application_ids"] == ["app_hrms"]
    assert by_id["v_erp"]["application_ids"] == [] and by_id["api"]["application_ids"] == [], "root path limits monorepo matching"
    assert by_id["v_vig"]["application_ids"] == ["app_vig"] and projects["vinayak/vighnaharan"]["name"] == "vighnaharan"
    assert projects["unassigned"]["resource_ids"] == ["media"]


def test_status_follows_live_deployment_while_new_build_runs():
    from app.services.hosting.providers import repo_identity
    assert repo_identity("https://github.com/techinvenso/HRMS.git") == ("techinvenso/HRMS", "https://github.com/techinvenso/HRMS")
    assert repo_identity("techinvenso/HRMS") == ("techinvenso/HRMS", "https://github.com/techinvenso/HRMS")
    assert repo_identity(None) == (None, None)


def test_unknown_status_becomes_healthy_only_when_site_answers():
    resources = [{"id": "a", "status": "UNKNOWN"}, {"id": "b", "status": "UNKNOWN"}, {"id": "c", "status": "FAILED"}]
    monitoring.apply_probe_status(resources, [{"resource_id": "a", "ok": True}, {"resource_id": "b", "ok": False}, {"resource_id": "c", "ok": True}])
    assert [r["status"] for r in resources] == ["HEALTHY", "UNKNOWN", "FAILED"]


def test_alert_transitions_ignore_noise_and_report_open_and_clear():
    from app.services.hosting.sync import alert_transitions
    down = {"severity": "critical", "kind": "probe", "resource_id": "a", "provider": "VERCEL", "resource": "a", "message": "x"}
    slow = {"severity": "warning", "kind": "slow", "resource_id": "a", "provider": "VERCEL", "resource": "a", "message": "slow"}
    opened, resolved = alert_transitions([], [down, slow])
    assert opened == [down] and resolved == []
    assert alert_transitions([down], [dict(down, message="different wording")]) == ([], [])
    assert alert_transitions([down], []) == ([], [down])


def test_uptime_counts_only_checks_of_that_resource_in_window():
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    point = lambda hours, down: {"checked_at": (now - timedelta(hours=hours)).isoformat(), "checked": ["a", "b"], "down": down}
    history = [point(30, ["a"]), point(3, ["a"]), point(2, []), point(1, ["b"]), point(0.5, [])]
    result = monitoring.uptime(history, "a", now - timedelta(hours=24))
    assert result == {"percent": 75.0, "checks": 4, "timeline": [False, True, True, True]}
    assert monitoring.uptime(history, "zzz", now - timedelta(hours=24))["percent"] is None


@pytest.mark.asyncio
async def test_outage_and_recovery_become_notifications_and_uptime(hosting, monkeypatch):
    from datetime import datetime, timedelta, timezone
    client, headers, calls, _ = hosting
    site_up = {"value": True}

    def probe_site(request):
        if request.url.host == "hrms.techinvenso.com":
            return httpx.Response(200 if site_up["value"] else 503)
        return httpx.Response(200)
    monkeypatch.setattr(monitoring, "client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(probe_site)))
    await connect_all(client, headers)

    async def refresh():
        async with AsyncSessionLocal() as db:
            for row in (await db.execute(select(HostingProviderConnection).where(
                    HostingProviderConnection.organization_id == headers["X-Organization-ID"]))).scalars().all():
                row.last_synced_at = datetime.now(timezone.utc) - timedelta(minutes=10)
            await db.commit()
        result = await client.post("/api/v1/hosting/refresh", headers=headers)
        assert result.status_code == 200 and result.json()["refreshed"], result.text
        return result.json()

    assert (await refresh())["alerts_opened"] == 0, "first check is a baseline, not an alert"
    site_up["value"] = False
    assert (await refresh())["alerts_opened"] >= 1
    site_up["value"] = True
    assert (await refresh())["alerts_resolved"] >= 1

    notes = await client.get("/api/v1/workspace-records/notifications", headers=headers)
    body = notes.json()
    statuses = [r["status"] for r in body["records"] if "hrms" in r["title"]]
    assert statuses[:2] == ["Recovered", "Problem detected"], body
    assert "Visitors cannot open hrms.techinvenso.com" in json.dumps(body)

    hrms = next(r for r in (await client.get("/api/v1/hosting/overview", headers=headers)).json()["resources"] if r["id"] == "prj_hrms")
    assert hrms["uptime_24h"]["checks"] == 3 and hrms["uptime_24h"]["percent"] == pytest.approx(66.67)


@pytest.mark.asyncio
async def test_background_cycle_refreshes_each_business_once(hosting, monkeypatch):
    from app.services.hosting import scheduler, sync
    client, headers, calls, _ = hosting
    await connect_all(client, headers)
    seen = []

    async def fake_refresh(db, organization_id, min_age):
        seen.append((organization_id, min_age))
        return {"refreshed": True}
    monkeypatch.setattr(sync, "refresh_organization", fake_refresh)
    count = await scheduler.run_cycle(300)
    assert (headers["X-Organization-ID"], 270) in seen
    assert len(seen) == len(set(seen)) and count == len(seen)
    monkeypatch.setenv("HOSTING_MONITOR_INTERVAL_SECONDS", "0")
    assert scheduler.interval_seconds() == 0
    monkeypatch.setenv("HOSTING_MONITOR_INTERVAL_SECONDS", "5")
    assert scheduler.interval_seconds() == 60
