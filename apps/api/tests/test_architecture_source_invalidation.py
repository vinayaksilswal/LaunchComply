"""Real API/database repository edits; provider fixtures are not live GitHub acceptance."""
import copy

import pytest
from sqlalchemy import select, cast, String

from app.core.database import AsyncSessionLocal
from app.models import Architecture, ArchitectureWorkspaceState, OrganizationMembership, MembershipRole
from test_github_authorization import github_setup
from test_architecture_workspace import linked_app, analysis_provider
from app.services.architecture import workspace as service


async def stored_versions(asset_id):
    async with AsyncSessionLocal() as db:
        return (await db.execute(select(Architecture.id, cast(Architecture.spec_json, String),
            Architecture.created_at, Architecture.updated_at).where(Architecture.application_id == asset_id)
            .order_by(Architecture.id))).all()


@pytest.mark.asyncio
async def test_repository_changes_preserve_history_and_revoke_current_eligibility(github_setup, monkeypatch):
    client, headers, _, _ = github_setup
    asset = await linked_app(github_setup)
    analysis_provider(monkeypatch)
    path = f"/api/v1/architecture/workspace/{asset}"
    design = (await client.post(path + "/analyze", headers=headers)).json()
    graph = copy.deepcopy(design["graph"])
    graph["nodes"].append({"id": "manual_logs", "label": "Retain my logs", "service": "AWS::Logs::LogGroup",
                           "zone": "SUPPORT", "description": "Manual configuration", "x": 1234, "y": 345})
    saved = await client.post(path + "/save", headers=headers, json={"expected_id": design["id"], "graph": graph})
    assert saved.status_code == 200, saved.text
    configured = await client.post(path + "/resource-configuration", headers=headers, json={
        "expected_id": saved.json()["id"], "node_id": "manual_logs",
        "configuration": {"resource_type": "AWS::Logs::LogGroup", "properties": {"retention_days": 90}}})
    assert configured.status_code == 200, configured.text
    planned = await client.post(path + "/requirements", headers=headers, json={"expected_id": configured.json()["id"],
        "region": "ap-south-1", "availability": "MULTI_AZ", "peak_requests_per_minute": 500, "concurrent_users": 100})
    assert planned.status_code == 200, planned.text
    approved = await client.post(path + "/approve-design", headers=headers, json={"expected_id": planned.json()["id"]})
    assert approved.status_code == 200, approved.text
    original = approved.json()
    repo_ids = [r["id"] for r in (await client.get(f"/api/v1/applications/{asset}/workspace", headers=headers)).json()["repositories"]]
    before = await stored_versions(asset)
    endpoint = f"/api/v1/applications/{asset}/repositories"
    removed = await client.put(endpoint, headers=headers, json={"repository_ids": [], "expected_repository_ids": repo_ids})
    assert removed.status_code == 200, removed.text
    assert await stored_versions(asset) == before
    current = (await client.get(path, headers=headers)).json()["architecture"]
    assert current["id"] == original["id"] and current["source_changed"]
    assert current["graph"] == original["graph"]
    assert current["resource_configurations"] == original["resource_configurations"]
    assert not current.get("design_approval") and not current.get("proposal")
    historical = (await client.get(path + "/versions/" + original["id"], headers=headers)).json()
    assert historical["design_approval"] == original["design_approval"]
    assert not historical.get("source_changed")
    for action, payload in (("save", {"graph": graph}), ("approve-design", {})):
        assert (await client.post(path + "/" + action, headers=headers,
            json={"expected_id": original["id"], **payload})).status_code == 409
    prep = await client.get(f"/api/v1/deployments/preparation/{asset}", headers=headers)
    assert prep.status_code == 200, prep.text
    checks = {item["id"]: item["complete"] for item in prep.json()["checks"]}
    assert not checks["source"] and not checks["approval"]
    mapped = (await client.get("/api/v1/dashboard/architecture-map", headers=headers)).json()["items"]
    assert next(item for item in mapped if item["id"] == asset)["source_changed"]
    assert (await client.put(endpoint, headers=headers, json={"repository_ids": repo_ids, "expected_repository_ids": []})).status_code == 200
    assert (await client.get(path, headers=headers)).json()["architecture"]["source_changed"]
    async with AsyncSessionLocal() as db:
        state = (await db.execute(select(ArchitectureWorkspaceState).where(ArchitectureWorkspaceState.application_id == asset))).scalar_one()
        epoch = state.source_epoch
    assert not (await client.put(endpoint, headers=headers, json={"repository_ids": repo_ids, "expected_repository_ids": repo_ids})).json()["changed"]
    assert await stored_versions(asset) == before
    async with AsyncSessionLocal() as db:
        state = (await db.execute(select(ArchitectureWorkspaceState).where(ArchitectureWorkspaceState.application_id == asset))).scalar_one()
        assert state.source_epoch == epoch


@pytest.mark.asyncio
async def test_viewer_cannot_invalidate_workspace(github_setup):
    client, headers, _, _ = github_setup
    asset = await linked_app(github_setup)
    path = f"/api/v1/architecture/workspace/{asset}"
    assert (await client.post(path + "/initialize", headers=headers)).status_code == 200
    before = await stored_versions(asset)
    async with AsyncSessionLocal() as db:
        membership = (await db.execute(select(OrganizationMembership).where(
            OrganizationMembership.organization_id == headers["X-Organization-ID"]))).scalar_one()
        membership.role = MembershipRole.VIEWER
        await db.commit()
    response = await client.put(f"/api/v1/applications/{asset}/repositories", headers=headers,
        json={"repository_ids": [], "expected_repository_ids": []})
    assert response.status_code == 403
    assert await stored_versions(asset) == before


@pytest.mark.asyncio
async def test_source_change_during_ai_response_rejects_late_proposal(github_setup, monkeypatch):
    client, headers, _, _ = github_setup
    asset = await linked_app(github_setup)
    analysis_provider(monkeypatch)
    path = f"/api/v1/architecture/workspace/{asset}"
    design = (await client.post(path + "/analyze", headers=headers)).json()
    repo_ids = [r["id"] for r in (await client.get(f"/api/v1/applications/{asset}/workspace", headers=headers)).json()["repositories"]]
    preserved = []

    async def delayed_response(*args, **kwargs):
        # The AI receipt is already persisted; provider result must not overwrite
        # an intervening repository edit. No live model or GitHub calls are made.
        preserved.extend(await stored_versions(asset))
        removed = await client.put(f"/api/v1/applications/{asset}/repositories", headers=headers,
            json={"repository_ids": [], "expected_repository_ids": repo_ids})
        assert removed.status_code == 200, removed.text
        return {}

    monkeypatch.setattr(service, "refine", delayed_response)
    response = await client.post(path + "/chat", headers=headers,
        json={"expected_id": design["id"], "message": "Review this design"})
    assert response.status_code == 409, response.text
    assert await stored_versions(asset) == preserved
    current = (await client.get(path, headers=headers)).json()["architecture"]
    assert current["source_changed"] and not current.get("proposal")
    assert current["graph"] == design["graph"]
