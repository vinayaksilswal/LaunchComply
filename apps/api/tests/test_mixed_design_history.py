"""Reader rollout against populated v1/v2/future histories; never provision AWS."""
import copy
import uuid
import pytest
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models import Architecture, Application, ArchitectureWorkspaceState
from app.services.architecture.design_adapter import from_legacy
from app.services.architecture.workspace_state import record_head, invalidate_sources
from app.services.architecture.version_activity import write_activity
from test_architecture_activity import activity_design
from test_github_authorization import github_setup
from test_architecture_source_invalidation import stored_versions


async def add_version(asset, original_id, *, future=False, legacy=False):
    async with AsyncSessionLocal() as db:
        base = await db.get(Architecture, original_id)
        app = (await db.execute(select(Application).where(Application.id == asset).with_for_update())).scalar_one()
        identifier = str(uuid.uuid4())
        if legacy:
            spec = copy.deepcopy(base.spec_json)
            spec["revision"] += 2
        else:
            spec = from_legacy(base.spec_json, revision_id=identifier, organization_id=base.organization_id,
                application_id=asset, parent_revision_id=original_id).model_dump(mode="json")
            first = spec["view_state"]["node_order"][0]
            spec["view_state"]["node_positions"][first]["pinned"] = True
            spec["resources_by_id"][first]["label"] = "Canonical network entry"
            spec["extensions"]["customer.notes"] = {"version": 7, "data": {"retain": ["original", "unknown", "metadata"]}}
            if future: spec["schema_version"] = 99
        arch = Architecture(id=identifier, organization_id=base.organization_id, application_id=asset,
            name=base.name, version="v101" if legacy else "v100", status="DRAFT", spec_json=spec)
        db.add(arch)
        await record_head(db, app, arch)
        await db.commit()
        return identifier, copy.deepcopy(spec)


@pytest.mark.asyncio
async def test_native_head_canvas_history_map_and_inspector_agree_without_mutation(activity_design):
    client, headers, asset, path, original = activity_design
    native_id, raw = await add_version(asset, original["id"])
    before = await stored_versions(asset)
    current = await client.get(path, headers=headers)
    assert current.status_code == 200, current.text
    current = current.json()
    draft = current["architecture"]
    assert draft["id"] == native_id and draft["version"] == "v100"
    assert draft["read_only"] and draft["saved_format"] == "launchcomply-design"
    assert draft["graph"]["nodes"][0]["label"] == "Canonical network entry"
    assert not current["capabilities"]["ai_chat"] and not current["capabilities"]["repository_analysis"]
    versions = (await client.get(path + "/versions", headers=headers)).json()["versions"]
    assert versions[0]["id"] == native_id and versions[0]["read_only"] and versions[0]["preview_available"]
    for version in (native_id, original["id"]):
        preview = await client.get(path + "/versions/" + version, headers=headers)
        assert preview.status_code == 200, preview.text
        assert bool(preview.json().get("read_only")) == (version == native_id)
    exported = (await client.get(f"/api/v1/architecture/designs/{asset}", headers=headers)).json()
    assert exported["design"] == raw and exported["eligibility"]["is_current"]
    map_item = next(item for item in (await client.get("/api/v1/dashboard/architecture-map", headers=headers)).json()["items"] if item["id"] == asset)
    assert map_item["version"] == "v100" and map_item["design_status"] == "READ_ONLY"
    assert map_item["components"] == len(raw["resources_by_id"]) and map_item["region"] == "ap-south-1"
    assert map_item["runtime_status"] == "NOT_VERIFIED"
    async with AsyncSessionLocal() as db:
        state = (await db.execute(select(ArchitectureWorkspaceState).where(ArchitectureWorkspaceState.application_id == asset))).scalar_one()
        assert state.head_architecture_id == native_id
        # A stale-source transition must keep the native head, not reconcile back to v1.
        app = (await db.execute(select(Application).where(Application.id == asset).with_for_update())).scalar_one()
        await invalidate_sources(db, app)
        await db.commit()
        assert state.head_architecture_id == native_id
    assert (await client.get(path, headers=headers)).json()["architecture"]["source_changed"]
    assert await stored_versions(asset) == before


@pytest.mark.asyncio
async def test_all_legacy_write_and_approval_paths_reject_native_without_provider_calls(activity_design, monkeypatch):
    client, headers, asset, path, original = activity_design
    native_id, _ = await add_version(asset, original["id"])
    before = await stored_versions(asset)
    def forbidden(*args, **kwargs):
        pytest.fail("A read-only design must never invoke a provider")
    from app.services.architecture import workspace as service, knowledge
    monkeypatch.setattr(service, "refine", forbidden)
    monkeypatch.setattr(service, "inspect_repositories", forbidden)
    monkeypatch.setattr(knowledge, "lookup", forbidden)
    expected = {"expected_id": native_id}
    operations = {
        "save": {**expected, "graph": original["graph"]},
        "requirements": {**expected, "region": "ap-south-1", "availability": "MULTI_AZ", "peak_requests_per_minute": 500, "concurrent_users": 100},
        "environment-connections": {**expected, "bindings": []},
        "resource-configuration": {**expected, "node_id": original["graph"]["nodes"][0]["id"], "configuration": None},
        "cloudformation-export": expected,
        "approve-design": expected, "references": expected,
        "chat": {**expected, "message": "Change just this label"},
        "apply": {**expected, "proposal_id": "untrusted-proposal"},
        "discard-proposal": {**expected, "proposal_id": "untrusted-proposal"},
        "restore": {**expected, "version_id": original["id"]}, "analyze": {},
    }
    for operation, payload in operations.items():
        response = await client.post(path + "/" + operation, headers=headers, json=payload)
        assert response.status_code == 409, (operation, response.text)
        assert response.json()["detail"]["code"] == "CANONICAL_EDITOR_REQUIRED", operation
    assert (await client.post(path + "/initialize", headers=headers)).status_code == 409
    # Neither opaque extension metadata nor activity can authorize the native projection.
    async with AsyncSessionLocal() as db:
        arch = await db.get(Architecture, native_id)
        await write_activity(db, arch, {"design_approval": {"architecture_id": native_id, "version": "v100"}, "proposal": {"graph": original["graph"]}})
        await db.commit()
    draft = (await client.get(path, headers=headers)).json()["architecture"]
    assert not draft.get("design_approval") and draft["proposal"] is None
    prep = (await client.get(f"/api/v1/deployments/preparation/{asset}", headers=headers)).json()
    assert prep["architecture_id"] == native_id and not next(c for c in prep["checks"] if c["id"] == "approval")["complete"]
    assert not prep["automatic_deployment_available"]
    assert await stored_versions(asset) == before


@pytest.mark.asyncio
async def test_native_history_does_not_leak_across_businesses_or_accept_forged_identity(activity_design):
    client, headers, asset, path, original = activity_design
    native_id, _ = await add_version(asset, original["id"])
    other = (await client.post("/api/v1/auth/register", json={"email": f"native-{uuid.uuid4().hex}@example.com",
        "password": "TestPassword123!", "full_name": "Other owner", "organization_name": "Other business"})).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}", "X-Organization-ID": other["organization_id"]}
    before = await stored_versions(asset)
    for route in (path, path + "/versions", path + "/versions/" + native_id, f"/api/v1/architecture/designs/{asset}"):
        assert (await client.get(route, headers=other_headers)).status_code == 404
    assert await stored_versions(asset) == before
    # Corrupt payload identity cannot select another tenant or fall back to v1.
    async with AsyncSessionLocal() as db:
        arch = await db.get(Architecture, native_id)
        arch.spec_json = {**arch.spec_json, "organization_id": other["organization_id"]}
        await db.commit()
    before = await stored_versions(asset)
    response = await client.get(path, headers=headers)
    assert response.status_code == 422 and response.json()["detail"]["code"] == "DESIGN_PROJECTION_UNAVAILABLE"
    assert other["organization_id"] not in response.text
    assert await stored_versions(asset) == before


@pytest.mark.asyncio
async def test_future_head_is_not_silently_replaced_and_history_remains_accessible(activity_design):
    client, headers, asset, path, original = activity_design
    future_id, _ = await add_version(asset, original["id"], future=True)
    before = await stored_versions(asset)
    for route in (path, f"/api/v1/architecture/designs/{asset}"):
        response = await client.get(route, headers=headers)
        assert response.status_code == 409 and response.json()["detail"]["code"] == "DESIGN_FORMAT_UNSUPPORTED"
        assert "unknown" not in response.text
    assert (await client.get(path + "/versions/" + original["id"], headers=headers)).status_code == 200
    item = (await client.get(path + "/versions", headers=headers)).json()["versions"][0]
    assert item["id"] == future_id and not item["preview_available"] and item["read_only"]
    item = next(i for i in (await client.get("/api/v1/dashboard/architecture-map", headers=headers)).json()["items"] if i["id"] == asset)
    assert item["version"] == "v100" and item["design_status"] == "UNSUPPORTED_VERSION" and item["region"] is None
    for action, payload in (("initialize", {}), ("analyze", {}), ("save", {"expected_id": original["id"], "graph": original["graph"]})):
        assert (await client.post(path + "/" + action, headers=headers, json=payload)).status_code == 409
    assert await stored_versions(asset) == before


@pytest.mark.asyncio
async def test_legacy_head_cannot_downconvert_native_history_on_restore(activity_design):
    client, headers, asset, path, original = activity_design
    native_id, _ = await add_version(asset, original["id"])
    legacy_id, _ = await add_version(asset, original["id"], legacy=True)
    before = await stored_versions(asset)
    rejected = await client.post(path + "/restore", headers=headers, json={"expected_id": legacy_id, "version_id": native_id})
    assert rejected.status_code == 409 and rejected.json()["detail"]["code"] == "CANONICAL_EDITOR_REQUIRED"
    assert await stored_versions(asset) == before
    restored = await client.post(path + "/restore", headers=headers, json={"expected_id": legacy_id, "version_id": original["id"]})
    assert restored.status_code == 200, restored.text
    after = {row[0]: row for row in await stored_versions(asset)}
    assert all(after[row[0]] == row for row in before)
    assert restored.json()["id"] not in {original["id"], native_id, legacy_id}
    assert not restored.json().get("design_approval")
