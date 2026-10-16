"""Reviewed refresh with real persistence and explicit source provider fixtures."""
import copy
import asyncio
import io
import uuid
import zipfile

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models import Architecture, ArchitectureWorkspaceState, OrganizationMembership, MembershipRole
from app.services.architecture import workspace as service
from app.services.architecture.version_activity import ACTIVITY_KEYS, load_activity, write_activity
from app.services.architecture.workspace_state import version_spec
from test_architecture_activity import activity_design
from test_github_authorization import github_setup
from test_architecture_source_invalidation import stored_versions
from test_architecture_workspace import linked_app, analysis_provider


@pytest_asyncio.fixture
async def refresh_design(activity_design, monkeypatch):
    client, headers, asset, path, original = activity_design
    graph = copy.deepcopy(original["graph"])
    graph["nodes"][0].update(label="Keep my public ingress", x=1234, y=678)
    graph["nodes"].extend([
        {"id": "manual_bucket", "label": "Private customer objects", "service": "AWS::S3::Bucket", "zone": "DATA", "description": "Customer decision", "x": 2345, "y": 789},
        {"id": "manual_vpc", "label": "Customer VPC", "service": "AWS::EC2::VPC", "zone": "DATA", "description": "Keep network", "x": 2500, "y": 900}])
    graph["edges"].append({"source": graph["nodes"][0]["id"], "target": "manual_bucket", "label": "Customer connection"})
    graph["edges"].append(copy.deepcopy(graph["edges"][-1]))
    saved = await client.post(path + "/save", headers=headers, json={"expected_id": original["id"], "graph": graph})
    assert saved.status_code == 200, saved.text
    current = saved.json()
    for node, config in (("manual_bucket", {"resource_type": "AWS::S3::Bucket", "properties": {"versioning": True}}),
                         ("manual_vpc", {"resource_type": "AWS::EC2::VPC", "properties": {"cidr": "10.30.0.0/16"}})):
        result = await client.post(path + "/resource-configuration", headers=headers,
            json={"expected_id": current["id"], "node_id": node, "configuration": config})
        assert result.status_code == 200, result.text
        current = result.json()
    api = next(node for node in current["graph"]["nodes"] if node["service"] == "ECS Fargate")
    bound = await client.post(path + "/environment-connections", headers=headers, json={"expected_id": current["id"],
        "bindings": [{"name": "OBJECT_STORAGE", "source": api["id"], "target": "manual_bucket", "protocol": "s3", "execution": "server"}]})
    assert bound.status_code == 200, bound.text
    current = bound.json()
    async def inspect(repos):
        return {**copy.deepcopy(current["evidence"]), "commit": "b" * 64}
    monkeypatch.setattr(service, "inspect_repositories", inspect)
    return client, headers, asset, path, current


@pytest.mark.asyncio
@pytest.mark.parametrize("decision", ["apply", "discard-proposal"])
async def test_refresh_preserves_manual_intent_and_waits_for_review(refresh_design, decision):
    client, headers, asset, path, original = refresh_design
    approved = await client.post(path + "/approve-design", headers=headers, json={"expected_id": original["id"]})
    assert approved.status_code == 200, approved.text
    before = await stored_versions(asset)
    refreshed = await client.post(path + "/analyze", headers=headers)
    assert refreshed.status_code == 200, refreshed.text
    pending = refreshed.json()
    assert pending["id"] == original["id"] and pending["graph"] == original["graph"]
    assert pending["evidence"] == original["evidence"]
    assert pending["proposal"]["kind"] == "SOURCE_REFRESH"
    assert pending["proposal"]["resource_configurations"] == original["resource_configurations"]
    assert pending["proposal"]["evidence"]["environment_connections"] == original["evidence"]["environment_connections"]
    assert pending["proposal"]["graph"] == original["graph"]  # No forced rearrange or replacement.
    assert {"manual_bucket", "manual_vpc"} <= set(pending["proposal"]["retained_node_ids"])
    assert await stored_versions(asset) == before
    # Even an evidence-only proposal requires an explicit decision, and survives reload.
    loaded = (await client.get(path, headers=headers)).json()["architecture"]
    assert loaded["proposal"]["id"] == pending["proposal"]["id"]
    assert (await client.post(path + "/analyze", headers=headers)).status_code == 409
    result = await client.post(path + "/" + decision, headers=headers,
        json={"expected_id": original["id"], "proposal_id": pending["proposal"]["id"]})
    assert result.status_code == 200, result.text
    current = result.json()
    assert current["graph"] == original["graph"] and current["resource_configurations"] == original["resource_configurations"]
    assert current["requirements"] == original["requirements"]
    after = {row[0]: row for row in await stored_versions(asset)}
    assert all(after[row[0]] == row for row in before)
    if decision == "apply":
        assert current["id"] != original["id"] and current["evidence"]["commit"] == "b" * 64
        assert not current.get("design_approval")
    else:
        assert current["id"] == original["id"] and current["evidence"] == original["evidence"]
    historical = (await client.get(path + "/versions/" + original["id"], headers=headers)).json()
    assert historical["design_approval"] == approved.json()["design_approval"]


@pytest.mark.asyncio
@pytest.mark.parametrize("change", ["edit", "unlink", "revoke", "failure", "timeout"])
async def test_analysis_conflicts_and_failures_preserve_saved_work(refresh_design, monkeypatch, change):
    client, headers, asset, path, original = refresh_design
    before = await stored_versions(asset)
    async def delayed(repos):
        if change == "edit":
            response = await client.post(path + "/save", headers=headers, json={"expected_id": original["id"], "graph": original["graph"]})
            assert response.status_code == 200, response.text
        elif change == "unlink":
            response = await client.put(f"/api/v1/applications/{asset}/repositories", headers=headers,
                json={"repository_ids": [], "expected_repository_ids": [r.id for r in repos]})
            assert response.status_code == 200, response.text
        elif change == "revoke":
            async with AsyncSessionLocal() as db:
                member = (await db.execute(select(OrganizationMembership).where(OrganizationMembership.organization_id == headers["X-Organization-ID"]))).scalar_one()
                member.role = MembershipRole.VIEWER
                await db.commit()
        elif change == "timeout":
            raise TimeoutError
        else:
            raise HTTPException(503, "Offline source fixture unavailable")
        return {**original["evidence"], "commit": "b" * 64}
    monkeypatch.setattr(service, "inspect_repositories", delayed)
    response = await client.post(path + "/analyze", headers=headers)
    assert response.status_code == ({"revoke": 403, "failure": 503, "timeout": 504}.get(change, 409)), response.text
    after = {row[0]: row for row in await stored_versions(asset)}
    assert all(after[row[0]] == row for row in before)
    current = (await client.get(path, headers=headers)).json()["architecture"]
    assert current["proposal"] is None and current["resource_configurations"] == original["resource_configurations"]


@pytest.mark.asyncio
async def test_cancelled_analysis_keeps_head_and_allows_retry(refresh_design, monkeypatch):
    client, headers, asset, path, original = refresh_design
    before = await stored_versions(asset)
    started = asyncio.Event()
    async def waiting(repos):
        started.set()
        await asyncio.Event().wait()
    monkeypatch.setattr(service, "inspect_repositories", waiting)
    task = asyncio.create_task(client.post(path + "/analyze", headers=headers))
    await asyncio.wait_for(started.wait(), timeout=5)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert await stored_versions(asset) == before
    async def retry(repos):
        return {**original["evidence"], "commit": "b" * 64}
    monkeypatch.setattr(service, "inspect_repositories", retry)
    response = await client.post(path + "/analyze", headers=headers)
    assert response.status_code == 200 and response.json()["id"] == original["id"], response.text


@pytest.mark.asyncio
async def test_stale_source_proposal_can_be_applied_but_unlink_invalidates_it(refresh_design):
    client, headers, asset, path, original = refresh_design
    repositories = (await client.get(f"/api/v1/applications/{asset}/workspace", headers=headers)).json()["repositories"]
    ids = [repo["id"] for repo in repositories]
    endpoint = f"/api/v1/applications/{asset}/repositories"
    await client.put(endpoint, headers=headers, json={"repository_ids": [], "expected_repository_ids": ids})
    await client.put(endpoint, headers=headers, json={"repository_ids": ids, "expected_repository_ids": []})
    pending = (await client.post(path + "/analyze", headers=headers)).json()
    assert pending["source_changed"] and pending["proposal"]["kind"] == "SOURCE_REFRESH"
    applied = await client.post(path + "/apply", headers=headers,
        json={"expected_id": original["id"], "proposal_id": pending["proposal"]["id"]})
    assert applied.status_code == 200, applied.text
    assert not applied.json()["source_changed"]
    second = (await client.post(path + "/analyze", headers=headers)).json()
    await client.put(endpoint, headers=headers, json={"repository_ids": [], "expected_repository_ids": ids})
    rejected = await client.post(path + "/apply", headers=headers,
        json={"expected_id": applied.json()["id"], "proposal_id": second["proposal"]["id"]})
    assert rejected.status_code == 409, rejected.text


@pytest.mark.asyncio
@pytest.mark.parametrize("tamper", ["placement", "duplicate_edge", "configuration"])
async def test_tampered_source_proposal_cannot_replace_manual_properties(refresh_design, tamper):
    client, headers, asset, path, original = refresh_design
    pending = (await client.post(path + "/analyze", headers=headers)).json()
    async with AsyncSessionLocal() as db:
        arch = await db.get(Architecture, original["id"])
        await load_activity(db, arch)
        spec = copy.deepcopy(version_spec(arch))
        if tamper == "placement":
            spec["proposal"]["graph"]["nodes"][0]["x"] += 1
        elif tamper == "duplicate_edge":
            edges = spec["proposal"]["graph"]["edges"]
            del edges[next(i for i, edge in enumerate(edges) if edge["label"] == "Customer connection")]
        else:
            spec["proposal"]["resource_configurations"]["manual_bucket"]["properties"]["versioning"] = False
        await write_activity(db, arch, spec)
        await db.commit()
    response = await client.post(path + "/apply", headers=headers,
        json={"expected_id": original["id"], "proposal_id": pending["proposal"]["id"]})
    assert response.status_code == 409, response.text


@pytest.mark.asyncio
async def test_new_source_components_are_additions_to_existing_customer_intent(refresh_design, monkeypatch):
    client, headers, asset, path, original = refresh_design
    generated = {"nodes": [{"id": "new_worker", "label": "New source worker", "service": "ECS Fargate", "zone": "APPLICATION", "description": "Candidate", "x": 1234, "y": 678}], "edges": []}
    monkeypatch.setattr(service, "draft_graph", lambda evidence: generated)
    response = await client.post(path + "/analyze", headers=headers)
    assert response.status_code == 200, response.text
    proposal = response.json()["proposal"]
    assert proposal["graph"]["nodes"][:-1] == original["graph"]["nodes"]
    assert proposal["graph"]["edges"] == original["graph"]["edges"]
    added = proposal["graph"]["nodes"][-1]
    assert added["id"] == "new_worker" and (added["x"], added["y"]) != (1234, 678)


@pytest.mark.asyncio
async def test_superseded_analysis_cannot_overwrite_newer_refresh(refresh_design, monkeypatch):
    client, headers, asset, path, original = refresh_design
    newer = None
    async def nested_refresh(repos):
        nonlocal newer
        async def second(repos):
            return {**original["evidence"], "commit": "c" * 64}
        monkeypatch.setattr(service, "inspect_repositories", second)
        newer = await client.post(path + "/analyze", headers=headers)
        assert newer.status_code == 200, newer.text
        return {**original["evidence"], "commit": "b" * 64}
    monkeypatch.setattr(service, "inspect_repositories", nested_refresh)
    response = await client.post(path + "/analyze", headers=headers)
    assert response.status_code == 409, response.text
    current = (await client.get(path, headers=headers)).json()["architecture"]
    assert current["proposal"]["id"] == newer.json()["proposal"]["id"]
    assert current["proposal"]["evidence"]["commit"] == "c" * 64


@pytest.mark.asyncio
async def test_upload_uses_snapshot_activity_boundary(github_setup, monkeypatch):
    client, headers, _, _ = github_setup
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("package.json", '{"dependencies":{"react":"19"}}')
    response = await client.post("/api/v1/onboarding/upload", headers=headers,
        data={"name": "Upload boundary fixture", "request_id": str(uuid.uuid4())},
        files={"file": ("fixture.zip", buffer.getvalue(), "application/zip")})
    assert response.status_code == 200, response.text
    asset = response.json()["id"]
    monkeypatch.setattr(service, "github_available", lambda: False)
    assert (await client.get(f"/api/v1/architecture/workspace/{asset}", headers=headers)).json()["capabilities"]["repository_analysis"]
    async with AsyncSessionLocal() as db:
        arch = (await db.execute(select(Architecture).where(Architecture.application_id == asset))).scalar_one()
        assert not set(arch.spec_json) & ACTIVITY_KEYS
        state = (await db.execute(select(ArchitectureWorkspaceState).where(ArchitectureWorkspaceState.application_id == asset))).scalar_one()
        assert state.head_architecture_id == arch.id and state.analyzed_source_epoch == state.source_epoch


@pytest.mark.asyncio
async def test_first_analysis_of_saved_empty_canvas_is_reviewable(github_setup, monkeypatch):
    client, headers, _, _ = github_setup
    asset = await linked_app(github_setup)
    path = f"/api/v1/architecture/workspace/{asset}"
    original = (await client.post(path + "/initialize", headers=headers)).json()
    async with AsyncSessionLocal() as db:
        arch = await db.get(Architecture, original["id"])
        arch.spec_json = {**arch.spec_json, "extensions": {"customer_setting": "preserve"}}
        await db.commit()
    before = await stored_versions(asset)
    analysis_provider(monkeypatch)
    pending = await client.post(path + "/analyze", headers=headers)
    assert pending.status_code == 200, pending.text
    assert pending.json()["id"] == original["id"] and pending.json()["graph"]["nodes"] == []
    assert pending.json()["proposal"]["graph"]["nodes"]
    assert await stored_versions(asset) == before
    applied = await client.post(path + "/apply", headers=headers,
        json={"expected_id": original["id"], "proposal_id": pending.json()["proposal"]["id"]})
    assert applied.status_code == 200, applied.text
    assert applied.json()["extensions"] == {"customer_setting": "preserve"}
