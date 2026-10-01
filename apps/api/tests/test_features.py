import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_dashboard_overview():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login demo user
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "demo@launchcomply.io",
            "password": "Password123!"
        })
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        
        # Get dashboard overview
        res = await ac.get("/api/v1/dashboard/overview", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["application_status"] == "HEALTHY"
        assert data["production_readiness"] == "84%"
        assert data["security_posture"] == "81%"
        assert data["compliance_readiness"] == "67%"
        assert data["critical_findings"] >= 1
        assert len(data["compliance_scores"]) >= 3
        assert "CloudFront" in data["infrastructure"]

@pytest.mark.asyncio
async def test_architecture_and_export():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "demo@launchcomply.io",
            "password": "Password123!"
        })
        token = login_res.json()["access_token"]

        arch_res = await ac.get("/api/v1/architecture/", headers={"Authorization": f"Bearer {token}"})
        assert arch_res.status_code == 200
        arch_data = arch_res.json()
        assert "nodes" in arch_data["topology"] or "nodes" in arch_data
        
        export_res = await ac.get("/api/v1/architecture/export-package", headers={"Authorization": f"Bearer {token}"})
        assert export_res.status_code == 200
        export_data = export_res.json()
        assert export_data["status"] == "READY_FOR_DOWNLOAD"
        assert len(export_data["manifest"]) > 0

@pytest.mark.asyncio
async def test_security_findings_and_ai_fix():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "demo@launchcomply.io",
            "password": "Password123!"
        })
        token = login_res.json()["access_token"]

        findings_res = await ac.get("/api/v1/security/findings", headers={"Authorization": f"Bearer {token}"})
        assert findings_res.status_code == 200
        findings = findings_res.json()
        assert len(findings) > 0
        finding_id = findings[0]["id"]

        fix_res = await ac.post(f"/api/v1/security/findings/{finding_id}/fix-with-ai", headers={"Authorization": f"Bearer {token}"})
        assert fix_res.status_code == 200
        fix_data = fix_res.json()
        assert fix_data["requires_human_approval"] is True
        assert "proposed_patch" in fix_data

@pytest.mark.asyncio
async def test_stack_analysis():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/v1/applications/analyze", json={
            "frontend_hint": "Next.js 15",
            "backend_hint": "FastAPI",
            "database_hint": "PostgreSQL 16"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["container_ready"] is True
        assert len(data["suggested_aws_architecture"]) > 5
