"""Isolated contract tests with explicit GitHub HTTP fixtures; no provider claims."""
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlsplit
import httpx
import pytest
import pytest_asyncio
from sqlalchemy import select, func
from app.main import app
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.source_control import SourceControlOAuthState, SourceControlConnection, Repository
from app.models.application import Application, Environment
from app.services.source_control import github_app

@pytest_asyncio.fixture
async def github_setup(monkeypatch):
    for name, value in {"GITHUB_APP_ID": "123456", "GITHUB_APP_SLUG": "launchcomply-test", "GITHUB_CLIENT_ID": "Iv1.test",
        "GITHUB_CLIENT_SECRET": "test-secret-not-for-production", "GITHUB_CALLBACK_URL": "https://app.example.test/onboarding/github/callback",
        "BACKEND_CORS_ORIGINS": ["https://app.example.test"], "ENVIRONMENT": "production", "DEMO_MODE": False}.items():
        monkeypatch.setattr(settings, name, value)
    calls = []
    def response(request):
        calls.append(request)
        if request.url.path == "/login/oauth/access_token": return httpx.Response(200, json={"access_token": "ghu_fixture_sensitive"})
        if request.url.path == "/user": return httpx.Response(200, json={"id": 99, "login": "github-fixture-user"})
        if request.url.path == "/user/installations": return httpx.Response(200, json={"installations": [{"id": 88, "app_id": 123456, "account": {"id": 77, "login": "fixture-org"}}]})
        if request.url.path == "/user/installations/88/repositories": return httpx.Response(200, json={"repositories": [{"id": 66, "name": "fixture-app", "full_name": "fixture-org/fixture-app", "owner": {"login": "fixture-org"}, "default_branch": "trunk", "private": True, "language": "Python", "archived": False}]})
        raise AssertionError(f"Unexpected GitHub path: {request.url.path}")
    monkeypatch.setattr(github_app.github_app_client, "client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(response)))
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        account = (await client.post("/api/v1/auth/register", json={"email": f"gh-{uuid.uuid4().hex}@example.com", "password": "TestPassword123!", "full_name": "GitHub Test Owner", "organization_name": "GitHub Test Business"})).json()
        headers = {"Authorization": f"Bearer {account['access_token']}", "X-Organization-ID": account["organization_id"]}
        yield client, headers, account, calls

async def start(client, headers):
    result = await client.post("/api/v1/source-control/github/authorize", headers=headers)
    assert result.status_code == 200
    query = parse_qs(urlsplit(result.json()["authorization_url"]).query)
    assert query["code_challenge_method"] == ["S256"]
    assert "test-secret" not in result.text
    return query["state"][0]

async def finish(client, headers, state):
    return await client.post("/api/v1/source-control/github/complete", headers=headers, json={"state": state, "code": "fixture-code"})

@pytest.mark.asyncio
async def test_verified_metadata_persisted_and_state_is_single_use(github_setup):
    client, headers, account, calls = github_setup
    state = await start(client, headers)
    async with AsyncSessionLocal() as db:
        pending = (await db.execute(select(SourceControlOAuthState).where(SourceControlOAuthState.state_hash == github_app.state_hash(state)))).scalar_one()
        assert pending.state_hash != state
        assert "code_challenge" not in pending.verifier_encrypted
    connected = await finish(client, headers, state)
    assert connected.json()["status"] == "CONNECTED"
    connections = await client.get("/api/v1/source-control/connections", headers=headers)
    assert connections.json()[0]["provider_account_name"] == "fixture-org"
    assert "ghu_fixture_sensitive" not in connections.text + connected.text
    repos = (await client.get("/api/v1/source-control/repositories", headers=headers)).json()
    assert repos[0]["full_name"] == "fixture-org/fixture-app"
    assert repos[0]["default_branch"] == "trunk"
    assert len(calls) == 4
    assert (await finish(client, headers, state)).status_code == 400
    assert len(calls) == 4

@pytest.mark.asyncio
async def test_expired_state_cannot_contact_provider(github_setup):
    client, headers, account, calls = github_setup
    state = await start(client, headers)
    async with AsyncSessionLocal() as db:
        pending = (await db.execute(select(SourceControlOAuthState).where(SourceControlOAuthState.state_hash == github_app.state_hash(state)))).scalar_one()
        pending.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        await db.commit()
    assert (await finish(client, headers, state)).status_code == 400
    assert calls == []

@pytest.mark.asyncio
async def test_state_is_bound_to_current_user_and_tenant(github_setup):
    client, headers, account, calls = github_setup
    state = await start(client, headers)
    other = (await client.post("/api/v1/auth/register", json={"email": f"other-{uuid.uuid4().hex}@example.com", "password": "TestPassword123!", "full_name": "Other Test Owner", "organization_name": "Other Test Business"})).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}", "X-Organization-ID": other["organization_id"]}
    assert (await finish(client, other_headers, state)).status_code == 400
    assert (await finish(client, headers | {"X-Organization-ID": other["organization_id"]}, state)).status_code == 403
    assert calls == []
    assert (await finish(client, headers, state)).status_code == 200

@pytest.mark.asyncio
async def test_provider_failure_does_not_create_connection_or_leak_credentials(github_setup, monkeypatch):
    client, headers, account, calls = github_setup
    state = await start(client, headers)
    monkeypatch.setattr(github_app.github_app_client, "client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(500, text="internal secret"))))
    result = await finish(client, headers, state)
    assert result.status_code == 502
    assert "secret" not in result.text
    assert (await client.get("/api/v1/source-control/connections", headers=headers)).json() == []

@pytest.mark.asyncio
async def test_no_installation_requires_explicit_github_install(github_setup, monkeypatch):
    client, headers, account, calls = github_setup
    async def no_installation(code, verifier): return []
    monkeypatch.setattr(github_app.github_app_client, "authorized_installations", no_installation)
    result = await finish(client, headers, await start(client, headers))
    assert result.json() == {"status": "INSTALLATION_REQUIRED", "installation_url": "https://github.com/apps/launchcomply-test/installations/new"}
    assert (await client.get("/api/v1/source-control/connections", headers=headers)).json() == []

@pytest.mark.asyncio
async def test_workspace_links_owned_repo_atomically_and_retries_are_idempotent(github_setup):
    client, headers, account, calls = github_setup
    await finish(client, headers, await start(client, headers))
    repo = (await client.get("/api/v1/source-control/repositories", headers=headers)).json()[0]
    payload = {"name": "Real Test Workspace", "repository_id": repo["id"], "request_id": str(uuid.uuid4())}
    first = await client.post("/api/v1/onboarding/workspace", json=payload, headers=headers)
    assert first.status_code == 200
    second = await client.post("/api/v1/onboarding/workspace", json=payload, headers=headers)
    assert second.json()["id"] == first.json()["id"]
    assert (await client.post("/api/v1/onboarding/workspace", json=payload | {"name": "Changed"}, headers=headers)).status_code == 409
    async with AsyncSessionLocal() as db:
        workspace = await db.get(Application, first.json()["id"])
        assert workspace.production_readiness_score == "UNKNOWN"
        assert workspace.framework_frontend == "Not analyzed"
        assert (await db.execute(select(func.count()).select_from(Environment).where(Environment.application_id == workspace.id))).scalar_one() == 0
    summary = (await client.get("/api/v1/dashboard/workspace-summary", headers=headers)).json()
    assert summary["application_count"] == summary["connection_count"] == summary["repository_count"] == 1

@pytest.mark.asyncio
async def test_workspace_rejects_repository_owned_by_other_business(github_setup):
    client, headers, account, calls = github_setup
    await finish(client, headers, await start(client, headers))
    repo = (await client.get("/api/v1/source-control/repositories", headers=headers)).json()[0]
    other = (await client.post("/api/v1/auth/register", json={"email": f"isolation-{uuid.uuid4().hex}@example.com", "password": "TestPassword123!", "full_name": "Other Owner", "organization_name": "Other Business"})).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}", "X-Organization-ID": other["organization_id"]}
    result = await client.post("/api/v1/onboarding/workspace", headers=other_headers, json={"name": "Unauthorized", "repository_id": repo["id"], "request_id": str(uuid.uuid4())})
    assert result.status_code == 404
    summary = (await client.get("/api/v1/dashboard/workspace-summary", headers=other_headers)).json()
    assert summary["application_count"] == summary["repository_count"] == summary["connection_count"] == 0
    assert (await client.get("/api/v1/dashboard/workspace-summary", headers=headers | {"X-Organization-ID": other["organization_id"]})).status_code == 403

@pytest.mark.asyncio
async def test_hosted_dashboard_does_not_invent_readiness_budget_or_tasks(github_setup):
    client, headers, account, calls = github_setup
    overview = (await client.get("/api/v1/dashboard/overview", headers=headers)).json()
    assert overview["production_readiness"] == "Not assessed"
    assert overview["aws_monthly_estimate"] == "Not connected"
    assert overview["compliance_scores"] == []
    assert overview["critical_findings"] == 0
    assert overview["domain_verified"] is False
    assert (await client.get("/api/v1/architecture/", headers=headers)).json() == {"status": "NOT_ANALYZED", "nodes": [], "edges": []}
    assert (await client.get("/api/v1/architecture/export-package", headers=headers)).status_code == 503
    assert (await client.post("/api/v1/applications/analyze", headers=headers, json={})).status_code == 503
    assert (await client.get("/api/v1/dashboard/my-actions", headers=headers)).json()["actions"] == []
