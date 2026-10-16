"""Version activity cutover: real API/database, explicit offline provider doubles."""
import copy
import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from sqlalchemy import delete, select
from fastapi import HTTPException

from app.core.database import AsyncSessionLocal
from app.models import Architecture, ArchitectureVersionActivity, OrganizationMembership, MembershipRole
from app.services.architecture import workspace as service, knowledge
from app.services.architecture.version_activity import ACTIVITY_KEYS
from test_github_authorization import github_setup
from test_architecture_workspace import linked_app, analysis_provider
from test_architecture_source_invalidation import stored_versions


@pytest_asyncio.fixture
async def activity_design(github_setup, monkeypatch):
    client, headers, _, _ = github_setup
    asset = await linked_app(github_setup)
    analysis_provider(monkeypatch)
    path = f"/api/v1/architecture/workspace/{asset}"
    original = (await client.post(path + "/analyze", headers=headers)).json()
    planned = await client.post(path + "/requirements", headers=headers, json={"expected_id": original["id"],
        "region": "ap-south-1", "availability": "MULTI_AZ", "peak_requests_per_minute": 500, "concurrent_users": 100})
    assert planned.status_code == 200, planned.text
    return client, headers, asset, path, planned.json()


def proposal_reply(monkeypatch, original):
    proposed = copy.deepcopy(original["graph"])
    proposed["nodes"][0]["label"] = "Reviewed public entry"

    async def respond(*args):
        return {"graph": proposed, "message": "Review this one label change.", "questions": []}

    monkeypatch.setattr(service, "refine", respond)
    return {"expected_id": original["id"], "message": "Rename the selected entry.",
        "edit_scope": {"mode": "EDIT", "node_ids": [proposed["nodes"][0]["id"]]}}


@pytest.mark.asyncio
@pytest.mark.parametrize("decision", ["apply", "discard-proposal"])
async def test_activity_and_review_do_not_rewrite_saved_snapshots(activity_design, monkeypatch, decision):
    client, headers, asset, path, original = activity_design
    before = await stored_versions(asset)
    approved = await client.post(path + "/approve-design", headers=headers, json={"expected_id": original["id"]})
    assert approved.status_code == 200, approved.text
    assert approved.json()["design_approval"]["architecture_id"] == original["id"]

    async def lookup(graph):
        return {"graph_fingerprint": knowledge.fingerprint(graph), "checked_at": datetime.now(timezone.utc).isoformat(), "results": []}

    monkeypatch.setattr(knowledge, "lookup", lookup)
    assert (await client.post(path + "/references", headers=headers, json={"expected_id": original["id"]})).status_code == 200
    chat = await client.post(path + "/chat", headers=headers, json=proposal_reply(monkeypatch, original))
    assert chat.status_code == 200, chat.text
    pending = chat.json()
    assert await stored_versions(asset) == before
    # Activity survives a separate request/session and is visible in history too.
    loaded = (await client.get(path, headers=headers)).json()["architecture"]
    assert loaded["proposal"] == pending["proposal"] and len(loaded["messages"]) == 2
    historical = (await client.get(path + "/versions/" + original["id"], headers=headers)).json()
    assert historical["design_approval"] == approved.json()["design_approval"]
    decided = await client.post(path + "/" + decision, headers=headers,
        json={"expected_id": original["id"], "proposal_id": pending["proposal"]["id"]})
    assert decided.status_code == 200, decided.text
    assert decided.json()["proposal"] is None
    assert decided.json()["messages"][-1]["proposal_status"] == ("APPLIED" if decision == "apply" else "DISCARDED")
    after = await stored_versions(asset)
    assert {row[0]: row for row in after if row[0] != decided.json()["id"]} == {row[0]: row for row in before if row[0] != decided.json()["id"]}
    if decision == "apply":
        assert decided.json()["id"] != original["id"]
        assert not decided.json().get("design_approval")
        prep = (await client.get(f"/api/v1/deployments/preparation/{asset}", headers=headers)).json()
        assert not next(c for c in prep["checks"] if c["id"] == "approval")["complete"]
    else:
        assert after == before
    async with AsyncSessionLocal() as db:
        snapshots = (await db.execute(select(Architecture).where(Architecture.application_id == asset))).scalars().all()
        assert all(not (set(item.spec_json) & ACTIVITY_KEYS) for item in snapshots)


@pytest.mark.asyncio
async def test_ai_failure_records_retry_state_without_modifying_version(activity_design, monkeypatch):
    client, headers, asset, path, original = activity_design
    before = await stored_versions(asset)

    async def unavailable(*args):
        raise HTTPException(503, {"code": "ARCHITECTURE_AI_UNAVAILABLE"})

    monkeypatch.setattr(service, "refine", unavailable)
    response = await client.post(path + "/chat", headers=headers, json={"expected_id": original["id"], "message": "Review this design."})
    assert response.status_code == 503
    current = (await client.get(path, headers=headers)).json()["architecture"]
    assert current["ai_request"]["status"] == "FAILED" and current["last_ai_failure"]["request_id"]
    assert current["graph"] == original["graph"] and current["proposal"] is None
    assert await stored_versions(asset) == before


@pytest.mark.asyncio
async def test_legacy_embedded_activity_is_readable_and_first_write_preserves_json(activity_design, monkeypatch):
    client, headers, asset, path, original = activity_design
    async with AsyncSessionLocal() as db:
        await db.execute(delete(ArchitectureVersionActivity).where(ArchitectureVersionActivity.architecture_id == original["id"]))
        arch = await db.get(Architecture, original["id"])
        arch.spec_json = {**arch.spec_json, "messages": [{"role": "assistant", "content": "Legacy explanation"}]}
        await db.commit()
    before = await stored_versions(asset)
    assert (await client.get(path, headers=headers)).json()["architecture"]["messages"][0]["content"] == "Legacy explanation"
    assert (await client.post(path + "/approve-design", headers=headers, json={"expected_id": original["id"]})).status_code == 200
    current = (await client.get(path, headers=headers)).json()["architecture"]
    assert current["design_approval"] and current["messages"][0]["content"] == "Legacy explanation"
    assert await stored_versions(asset) == before


@pytest.mark.asyncio
@pytest.mark.parametrize("change", ["edit", "revoke"])
async def test_reference_response_rechecks_current_design_and_access(activity_design, monkeypatch, change):
    client, headers, asset, path, original = activity_design
    before = await stored_versions(asset)

    async def delayed_lookup(graph):
        if change == "edit":
            edited = await client.post(path + "/save", headers=headers, json={"expected_id": original["id"], "graph": graph})
            assert edited.status_code == 200, edited.text
        else:
            async with AsyncSessionLocal() as db:
                member = (await db.execute(select(OrganizationMembership).where(OrganizationMembership.organization_id == headers["X-Organization-ID"]))).scalar_one()
                member.role = MembershipRole.VIEWER
                await db.commit()
        return {"graph_fingerprint": knowledge.fingerprint(graph), "checked_at": datetime.now(timezone.utc).isoformat()}

    monkeypatch.setattr(knowledge, "lookup", delayed_lookup)
    response = await client.post(path + "/references", headers=headers, json={"expected_id": original["id"]})
    assert response.status_code == (409 if change == "edit" else 403), response.text
    current = (await client.get(path, headers=headers)).json()["architecture"]
    assert not current.get("aws_references")
    after = {row[0]: row for row in await stored_versions(asset)}
    assert all(after[row[0]] == row for row in before)


@pytest.mark.asyncio
async def test_activity_endpoints_enforce_tenant_and_editor_roles(activity_design):
    client, headers, asset, path, original = activity_design
    before = await stored_versions(asset)
    other = (await client.post("/api/v1/auth/register", json={"email": f"activity-{uuid.uuid4().hex}@example.com",
        "password": "TestPassword123!", "full_name": "Other owner", "organization_name": "Other activity business"})).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}", "X-Organization-ID": other["organization_id"]}
    for action, extra in (("approve-design", {}), ("references", {}), ("chat", {"message": "Review this design"}),
                          ("apply", {"proposal_id": "missing"}), ("discard-proposal", {"proposal_id": "missing"})):
        response = await client.post(path + "/" + action, headers=other_headers, json={"expected_id": original["id"], **extra})
        assert response.status_code == 404, response.text
    assert (await client.get(path + "/versions/" + original["id"], headers=other_headers)).status_code == 404
    async with AsyncSessionLocal() as db:
        member = (await db.execute(select(OrganizationMembership).where(OrganizationMembership.organization_id == headers["X-Organization-ID"]))).scalar_one()
        member.role = MembershipRole.VIEWER
        await db.commit()
    for action in ("approve-design", "references", "chat", "apply", "discard-proposal"):
        response = await client.post(path + "/" + action, headers=headers,
            json={"expected_id": original["id"], "message": "Review", "proposal_id": "missing"})
        assert response.status_code == 403, response.text
    assert await stored_versions(asset) == before
