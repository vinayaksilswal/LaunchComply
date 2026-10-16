"""Actual tenant-scoped read/export contract, native-write gate and preservation."""
import copy
import json
import uuid
from pathlib import Path

import pytest
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models import Architecture, OrganizationMembership, MembershipRole
from app.services.architecture.design_adapter import to_legacy, read_design
from app.services.architecture.design_spec import Design
from scripts.generate_design_contract import typescript
from test_architecture_activity import activity_design
from test_github_authorization import github_setup
from test_architecture_source_invalidation import stored_versions


@pytest.mark.asyncio
async def test_canonical_reads_round_trip_without_changing_saved_history(activity_design):
    client, headers, asset, workspace, original = activity_design
    path = f"/api/v1/architecture/designs/{asset}"
    before = await stored_versions(asset)
    result = await client.get(path, headers=headers, params={"expected_id": original["id"]})
    assert result.status_code == 200, result.text
    exported = result.json()
    assert exported["read_only"] and not exported["native_writes_enabled"]
    assert exported["fingerprints"]["artifact_status"] == "INPUT_IDENTITY_ONLY"
    assert exported["design"]["source_snapshot_ids"] == []  # Never invent persisted source snapshots.
    design = read_design(exported["design"], revision_id=original["id"], organization_id=headers["X-Organization-ID"], application_id=asset)
    assert to_legacy(design)["graph"] == original["graph"]
    assert to_legacy(design)["requirements"] == original["requirements"]
    moved = copy.deepcopy(original["graph"])
    moved["nodes"][0].update(x=321, y=654, label="Renamed for display")
    saved = await client.post(workspace + "/save", headers=headers, json={"expected_id": original["id"], "graph": moved})
    assert saved.status_code == 200, saved.text
    current = await client.get(path, headers=headers, params={"expected_id": saved.json()["id"]})
    assert current.status_code == 200, current.text
    assert current.json()["fingerprints"]["semantic_hash"] == exported["fingerprints"]["semantic_hash"]
    assert current.json()["fingerprints"]["artifact_input_hash"] == exported["fingerprints"]["artifact_input_hash"]
    assert current.json()["fingerprints"]["layout_hash"] != exported["fingerprints"]["layout_hash"]
    stale = await client.get(path, headers=headers, params={"expected_id": original["id"]})
    assert stale.status_code == 409 and stale.json()["detail"]["code"] == "DESIGN_CHANGED"
    historic = await client.get(path, headers=headers, params={"version_id": original["id"]})
    assert historic.status_code == 200 and not historic.json()["eligibility"]["is_current"]
    assert historic.json()["design"] == exported["design"]
    after = {row[0]: row for row in await stored_versions(asset)}
    assert all(after[row[0]] == row for row in before)
    schema = await client.get("/api/v1/architecture/designs/schema", headers=headers)
    assert schema.status_code == 200 and schema.json()["schema"] == Design.model_json_schema()
    assert not schema.json()["writes_enabled"]


@pytest.mark.asyncio
async def test_design_reads_enforce_tenants_and_native_writes_remain_closed(activity_design):
    client, headers, asset, workspace, original = activity_design
    path = f"/api/v1/architecture/designs/{asset}"
    before = await stored_versions(asset)
    response = await client.post(path, headers=headers, json={"format": "launchcomply-design", "schema_version": 999, "raw_key": "CANARY_NOT_PARSED"})
    assert response.status_code == 409 and response.json()["detail"]["code"] == "CANONICAL_WRITES_DISABLED"
    assert "CANARY_NOT_PARSED" not in response.text
    other = (await client.post("/api/v1/auth/register", json={"email": f"canonical-{uuid.uuid4().hex}@example.com",
        "password": "TestPassword123!", "full_name": "Other owner", "organization_name": "Other canonical business"})).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}", "X-Organization-ID": other["organization_id"]}
    assert (await client.get(path, headers=other_headers)).status_code == 404
    assert (await client.get(path, headers=other_headers, params={"version_id": original["id"]})).status_code == 404
    assert (await client.post(path, headers=other_headers, json={})).status_code == 404
    assert (await client.get(path)).status_code == 401
    async with AsyncSessionLocal() as db:
        membership = (await db.execute(select(OrganizationMembership).where(OrganizationMembership.organization_id == headers["X-Organization-ID"]))).scalar_one()
        membership.role = MembershipRole.VIEWER
        await db.commit()
    assert (await client.get(path, headers=headers)).status_code == 200
    assert (await client.post(path, headers=headers, json={})).status_code == 403
    assert await stored_versions(asset) == before


@pytest.mark.asyncio
async def test_unsupported_version_never_falls_back_to_a_lossy_conversion(activity_design):
    client, headers, asset, workspace, original = activity_design
    async with AsyncSessionLocal() as db:
        record = Architecture(application_id=asset, organization_id=headers["X-Organization-ID"], name="Future fixture", version="future",
            spec_json={"format": "launchcomply-design", "schema_version": 99, "unknown": "CANARY_NOT_RETURNED"})
        db.add(record); await db.commit(); identifier = record.id
    before = await stored_versions(asset)
    path = f"/api/v1/architecture/designs/{asset}"
    for params in ({}, {"version_id": identifier}):
        response = await client.get(path, headers=headers, params=params)
        assert response.status_code == 409 and response.json()["detail"]["code"] == "DESIGN_FORMAT_UNSUPPORTED"
        assert "CANARY_NOT_RETURNED" not in response.text
    assert (await client.get(path, headers=headers, params={"version_id": original["id"]})).status_code == 200
    assert await stored_versions(asset) == before


def test_shared_schema_and_typescript_contract_are_current():
    root = Path(__file__).resolve().parents[3]
    schema = json.loads((root / "fixtures/architecture/design-v2.schema.json").read_text(encoding="utf-8"))
    assert schema == Design.model_json_schema()
    assert (root / "apps/web/src/components/architecture/canonical-types.ts").read_text(encoding="utf-8") == typescript(schema)
