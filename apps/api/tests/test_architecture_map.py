from datetime import datetime, timedelta
import pytest
from app.core.database import AsyncSessionLocal
from app.models.application import Application
from app.models.entities import Architecture
from test_business_workspace import business_client


@pytest.mark.asyncio
async def test_map_uses_latest_owned_design_without_claiming_live_health(business_client):
    client, owner, other, _ = business_client
    org = owner["X-Organization-ID"]
    async with AsyncSessionLocal() as db:
        asset = Application(organization_id=org, name="Mapped business", slug="mapped")
        empty = Application(organization_id=org, name="Unmapped business", slug="unmapped")
        hidden = Application(organization_id=other["X-Organization-ID"], name="Other tenant", slug="other")
        db.add_all([asset, empty, hidden]); await db.flush()
        spec = {"format": "repository-draft-v1", "requirements": {"region": "ap-south-1", "availability": "MULTI_REGION", "secondary_region": "ap-south-2"},
                "graph": {"nodes": [{"id": "api"}], "edges": []}, "resource_configurations": {"subnet": {"resource_type": "AWS::EC2::Subnet", "properties": {"availability_zone": "ap-south-1a"}}}}
        db.add_all([Architecture(application_id=asset.id, organization_id=org, version="v1", spec_json={**spec, "requirements": {"region": "us-east-1"}}, created_at=datetime.utcnow()-timedelta(days=1)),
                    Architecture(application_id=asset.id, organization_id=org, version="v2", spec_json=spec),
                    Architecture(application_id=asset.id, organization_id=org, version="legacy", spec_json={"fake": "LIVE"}, created_at=datetime.utcnow()+timedelta(days=1))])
        await db.commit()
    response = await client.get("/api/v1/dashboard/architecture-map", headers=owner)
    assert response.status_code == 200
    data = response.json(); assert len(data["items"]) == 2
    mapped = next(a for a in data["items"] if a["name"] == "Mapped business")
    assert mapped["version"] == "v2" and mapped["region"] == "ap-south-1"
    assert mapped["secondary_region"] == "ap-south-2"
    assert mapped["availability_zones"] == ["ap-south-1a"]
    assert mapped["runtime_status"] == "NOT_VERIFIED"
    assert next(a for a in data["items"] if a["name"] == "Unmapped business")["region"] is None
    assert data["next_offset"] is None
    assert (await client.get("/api/v1/dashboard/architecture-map", headers=owner | {"X-Organization-ID": other["X-Organization-ID"]})).status_code == 403
    assert (await client.get("/api/v1/dashboard/architecture-map?offset=-1", headers=owner)).status_code == 422
