"""Provider contract fixtures validate provenance, graph versions and tenant boundaries."""
import base64
import json
import uuid
import httpx
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from pydantic import ValidationError
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.auth import OrganizationMembership, MembershipRole
from app.services.architecture import workspace as service
from test_github_authorization import github_setup, start, finish

async def linked_app(setup):
    client, headers, account, calls = setup
    await finish(client, headers, await start(client, headers))
    repo = (await client.get("/api/v1/source-control/repositories", headers=headers)).json()[0]
    created = await client.post("/api/v1/onboarding/workspace", headers=headers,
        json={"name": "Code Evidence App", "repository_id": repo["id"], "request_id": str(uuid.uuid4())})
    assert created.status_code == 200
    return created.json()["id"]

def analysis_provider(monkeypatch, truncated=False):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
    monkeypatch.setattr(settings, "GITHUB_APP_PRIVATE_KEY", pem)
    requests = []
    raw = json.dumps({"dependencies": {"next": "15", "fastapi": "1", "pg": "8", "redis": "5"},
        "scripts": {"ignored_secret": "SENSITIVE_MANIFEST_VALUE"}})
    def respond(request):
        requests.append(request)
        if request.url.path.endswith("/access_tokens"):
            assert json.loads(request.content) == {"repository_ids": [66], "permissions": {"contents": "read"}}
            return httpx.Response(201, json={"token": "fixture-installation-token"})
        if request.url.path == "/repositories/66/commits/trunk":
            return httpx.Response(200, json={"sha": "a" * 40})
        if request.url.path == "/repositories/66/git/trees/" + "a" * 40:
            return httpx.Response(200, json={"truncated": truncated, "tree": [
                {"type": "blob", "path": "apps/web/package.json", "sha": "b" * 40, "size": len(raw)},
                {"type": "blob", "path": ".env.production", "sha": "c" * 40, "size": 40}]})
        if request.url.path == "/repositories/66/git/blobs/" + "b" * 40:
            return httpx.Response(200, json={"encoding": "base64", "content": base64.b64encode(raw.encode()).decode()})
        raise AssertionError(request.url.path)
    monkeypatch.setattr(service, "http_client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(respond)))
    return requests

@pytest.mark.asyncio
async def test_repository_analysis_is_scoped_and_persists_only_dependency_evidence(github_setup, monkeypatch):
    client, headers, account, calls = github_setup
    app_id = await linked_app(github_setup)
    analysis_calls = analysis_provider(monkeypatch)
    url = f"/api/v1/architecture/workspace/{app_id}"
    before = (await client.get(url, headers=headers)).json()
    assert before["architecture"] is None
    detail = await client.get(f"/api/v1/applications/{app_id}/workspace", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["repository"]["branch"] == "trunk"
    result = await client.post(url + "/analyze", headers=headers)
    assert result.status_code == 200, result.text
    arch = result.json()
    assert arch["evidence"]["commit"] == "a" * 40
    assert arch["deployment_status"] == "NOT_DEPLOYED"
    assert arch["evidence"]["files"][0]["dependencies"] == ["fastapi", "next", "pg", "redis"]
    assert {node["id"] for node in arch["graph"]["nodes"]} == {"edge", "web", "api", "postgres", "redis"}
    assert "SENSITIVE_MANIFEST_VALUE" not in result.text
    assert ".env.production" not in result.text
    assert len(analysis_calls) == 4
    changed = json.loads(json.dumps(arch["graph"]))
    changed["nodes"][0]["label"] = "Reviewed ingress draft"
    saved = await client.post(url + "/save", headers=headers, json={"expected_id": arch["id"], "graph": changed})
    assert saved.status_code == 200
    assert saved.json()["version"] == "v2"
    assert saved.json()["evidence"] == arch["evidence"]
    assert (await client.post(url + "/save", headers=headers, json={"expected_id": arch["id"], "graph": changed})).status_code == 409
    other = (await client.post("/api/v1/auth/register", json={"email": f"arch-{uuid.uuid4().hex}@example.com",
        "password": "BusinessTest123!", "full_name": "Other Owner", "organization_name": "Other Business"})).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}", "X-Organization-ID": other["organization_id"]}
    assert (await client.get(url, headers=other_headers)).status_code == 404
    assert (await client.post(url + "/analyze", headers=other_headers)).status_code == 404

@pytest.mark.asyncio
async def test_ai_proposal_requires_explicit_apply_and_invalid_provider_response_changes_nothing(github_setup, monkeypatch):
    client, headers, account, calls = github_setup
    app_id = await linked_app(github_setup)
    analysis_provider(monkeypatch)
    url = f"/api/v1/architecture/workspace/{app_id}"
    arch = (await client.post(url + "/analyze", headers=headers)).json()
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "fixture-ai-key")
    monkeypatch.setattr(settings, "ENABLE_AI_COPILOT", True)
    proposed = json.loads(json.dumps(arch["graph"]))
    proposed["nodes"][0]["label"] = "AI proposed entry point"
    def respond(request):
        assert str(request.url) == "https://api.openai.com/v1/responses"
        data = json.loads(request.content)
        assert data["store"] is False
        assert data["text"]["format"]["strict"] is True
        assert "SENSITIVE_MANIFEST_VALUE" not in str(data)
        return httpx.Response(200, json={"status": "completed", "output": [{"content": [
            {"type": "output_text", "text": json.dumps({"message": "Here is a proposal to review. Nothing is deployed.", "graph": proposed})}]}]})
    monkeypatch.setattr(service, "http_client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(respond)))
    chat = await client.post(url + "/chat", headers=headers, json={"expected_id": arch["id"], "message": "Refine the entry point"})
    assert chat.status_code == 200, chat.text
    assert chat.json()["graph"] == arch["graph"]
    assert chat.json()["proposal"]["graph"] == proposed
    assert (await client.post(url + "/apply", headers=headers, json={"expected_id": arch["id"], "proposal_id": "wrong"})).status_code == 409
    applied = await client.post(url + "/apply", headers=headers, json={"expected_id": arch["id"], "proposal_id": chat.json()["proposal"]["id"]})
    assert applied.status_code == 200
    assert applied.json()["graph"] == proposed
    assert applied.json()["proposal"] is None
    # Remove cooldown from the local fixture to test provider contract failure separately.
    from app.models.entities import Architecture
    async with AsyncSessionLocal() as db:
        record = await db.get(Architecture, applied.json()["id"])
        record.spec_json = {key: value for key, value in record.spec_json.items() if key != "last_ai_at"}
        await db.commit()
    malformed = {"message": "bad graph", "graph": {"nodes": proposed["nodes"], "edges": [{"source": "not-a-node", "target": "edge", "label": "invalid"}]}}
    monkeypatch.setattr(service, "http_client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(lambda req:
        httpx.Response(200, json={"status": "completed", "output": [{"content": [{"type": "output_text", "text": json.dumps(malformed)}]}]}))))
    failure = await client.post(url + "/chat", headers=headers, json={"expected_id": applied.json()["id"], "message": "Try another design"})
    assert failure.status_code == 502
    current = (await client.get(url, headers=headers)).json()["architecture"]
    assert current["graph"] == proposed and current["proposal"] is None

@pytest.mark.asyncio
async def test_analysis_rejects_unconfigured_and_truncated_repository_and_viewer_edit(github_setup, monkeypatch):
    client, headers, account, calls = github_setup
    app_id = await linked_app(github_setup)
    url = f"/api/v1/architecture/workspace/{app_id}"
    monkeypatch.setattr(settings, "GITHUB_APP_PRIVATE_KEY", "")
    assert (await client.post(url + "/analyze", headers=headers)).status_code == 503
    analysis_provider(monkeypatch, truncated=True)
    assert (await client.post(url + "/analyze", headers=headers)).status_code == 422
    assert (await client.get(url, headers=headers)).json()["architecture"] is None
    async with AsyncSessionLocal() as db:
        member = (await db.execute(__import__('sqlalchemy').select(OrganizationMembership).where(OrganizationMembership.organization_id == account["organization_id"]))).scalar_one()
        member.role = MembershipRole.VIEWER
        await db.commit()
    assert (await client.post(url + "/analyze", headers=headers)).status_code == 403
    assert (await client.post("/api/v1/business-requests", headers=headers, json={"request_id": str(uuid.uuid4()), "service_code": "SUPPORT"})).status_code == 403

def test_graph_rejects_duplicate_nodes_and_invalid_endpoints():
    node = {"id": "one", "label": "One", "service": "API", "zone": "APPLICATION", "description": "Draft", "x": 70, "y": 70}
    with pytest.raises(ValidationError): service.Graph(nodes=[node, node], edges=[])
    with pytest.raises(ValidationError): service.Graph(nodes=[node], edges=[{"source": "one", "target": "unknown", "label": "bad"}])
