"""Real persisted service requests/reports, with isolated local businesses."""
import hashlib
import uuid
import httpx
import pytest
import pytest_asyncio
from sqlalchemy import select
from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.auth import User
from app.models.audit import AuditEvent
from app.api.v1.workspace_records import MODELS

@pytest_asyncio.fixture
async def business_client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        async def account(name):
            response = await client.post("/api/v1/auth/register", json={"email": f"business-{uuid.uuid4().hex}@example.com",
                "password": "BusinessTest123!", "full_name": name, "organization_name": f"{name} Business"})
            assert response.status_code == 200
            data = response.json()
            return {"Authorization": f"Bearer {data['access_token']}", "X-Organization-ID": data["organization_id"]}
        owner = await account("Case Sensitive Owner")
        other = await account("Other Business Owner")
        operator = await account("Internal Operator")
        identity = (await client.get("/api/v1/auth/me", headers=operator)).json()
        async with AsyncSessionLocal() as db:
            user = await db.get(User, identity["id"])
            user.is_platform_admin = True
            await db.commit()
        yield client, owner, other, operator

@pytest.mark.asyncio
async def test_assessment_apply_track_publish_and_view_report(business_client):
    client, owner, other, operator = business_client
    payload = {"request_id": str(uuid.uuid4()), "service_code": "VAPT_ASSESSMENT", "notes": "Review before customer launch"}
    created = await client.post("/api/v1/business-requests", headers=owner, json=payload)
    assert created.status_code == 200
    assert created.json()["status"] == "REQUESTED"
    request_id = created.json()["id"]
    assert (await client.post("/api/v1/business-requests", headers=owner, json=payload)).json() == created.json()
    assert (await client.post("/api/v1/business-requests", headers=other, json=payload)).status_code == 409
    assert (await client.post("/api/v1/business-requests", headers=owner, json=payload | {"notes": "different"})).status_code == 409
    assert (await client.get("/api/v1/business-requests", headers=other)).json()["requests"] == []
    assert (await client.get("/api/v1/admin/operations-queue", headers=owner)).status_code == 403
    queue = (await client.get("/api/v1/admin/operations-queue", headers=operator)).json()
    item = next(row for row in queue["requests"] if row["id"] == request_id)
    assert item["organization_name"] == "Case Sensitive Owner Business"
    status_url = f"/api/v1/admin/operations-queue/{request_id}"
    assert (await client.patch(status_url, headers=operator, json={"expected_status": "REQUESTED", "status": "DELIVERED"})).status_code == 409
    assert (await client.patch(status_url, headers=operator, json={"expected_status": "REQUESTED", "status": "IN_PROGRESS", "note": "Scope review"})).status_code == 200
    assert (await client.patch(status_url, headers=operator, json={"expected_status": "REQUESTED", "status": "CLOSED"})).status_code == 409
    report_payload = {"report_id": str(uuid.uuid4()), "title": "Completed scope review", "content": "Actual operator deliverable. Scope and findings require customer review."}
    assert (await client.post(status_url + "/reports", headers=owner, json=report_payload)).status_code == 403
    published = await client.post(status_url + "/reports", headers=operator, json=report_payload)
    assert published.status_code == 200
    assert published.json()["status"] == "DELIVERED"
    assert (await client.post(status_url + "/reports", headers=operator, json=report_payload)).json() == published.json()
    assert (await client.post(status_url + "/reports", headers=operator, json=report_payload | {"content": "Attempt to replace previously published report content"})).status_code == 409
    report_url = f"/api/v1/business-requests/reports/{report_payload['report_id']}"
    read = await client.get(report_url, headers=owner)
    assert read.json()["content"] == report_payload["content"]
    assert read.json()["sha256"] == hashlib.sha256(report_payload["content"].encode()).hexdigest()
    assert (await client.get(report_url, headers=other)).status_code == 404
    assert (await client.get(report_url, headers=owner | {"X-Organization-ID": other["X-Organization-ID"]})).status_code == 403
    listed = (await client.get("/api/v1/business-requests?service_code=VAPT_ASSESSMENT", headers=owner)).json()["requests"]
    assert listed[0]["reports"][0]["id"] == report_payload["report_id"]
    assert (await client.get(status_url + "/reports", headers=owner)).status_code == 403
    admin_reports = (await client.get(status_url + "/reports", headers=operator)).json()["reports"]
    assert admin_reports[0]["content"] == report_payload["content"]
    async with AsyncSessionLocal() as db:
        events = (await db.execute(select(AuditEvent).where(AuditEvent.entity_id == request_id))).scalars().all()
        assert [event.action for event in events].count("BUSINESS_REQUEST_SUBMITTED") == 1
        assert any(event.action == "SERVICE_REPORT_PUBLISHED" for event in events)

@pytest.mark.asyncio
async def test_new_business_has_no_fake_records_and_correct_team(business_client):
    client, owner, other, operator = business_client
    summary = (await client.get("/api/v1/dashboard/workspace-summary", headers=owner)).json()
    assert summary["application_count"] == summary["connection_count"] == summary["repository_count"] == 0
    for module in MODELS:
        response = await client.get(f"/api/v1/workspace-records/{module}", headers=owner)
        assert response.status_code == 200, (module, response.text)
        if module == "logs":
            assert response.json()["total"] == 1
            assert response.json()["records"][0]["title"] == "USER_REGISTERED"
        else:
            assert response.json()["total"] == 0, module
            assert response.json()["records"] == [], module
        assert (await client.get(f"/api/v1/workspace-records/{module}", headers=owner | {"X-Organization-ID": other["X-Organization-ID"]})).status_code == 403
    team = (await client.get("/api/v1/workspace-records/team", headers=owner)).json()
    assert team["total"] == 1
    assert team["records"][0]["title"] == "Case Sensitive Owner"
    assert team["records"][0]["status"] == "OWNER"
    assert (await client.get("/api/v1/workspace-records/arbitrary-table", headers=owner)).status_code == 404

@pytest.mark.asyncio
async def test_requests_require_own_application_and_valid_service(business_client):
    client, owner, other, operator = business_client
    payload = {"request_id": str(uuid.uuid4()), "service_code": "SECURITY_ASSESSMENT", "application_id": str(uuid.uuid4())}
    assert (await client.post("/api/v1/business-requests", headers=owner, json=payload)).status_code == 404
    assert (await client.post("/api/v1/business-requests", headers=owner, json=payload | {"service_code": "FAKE_CERTIFICATION"})).status_code == 422
    assert (await client.post("/api/v1/business-requests", json=payload)).status_code == 401
