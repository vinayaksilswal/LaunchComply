import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "HEALTHY"

@pytest.mark.asyncio
async def test_demo_user_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/auth/login", json={
            "email": "demo@launchcomply.io",
            "password": "Password123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" == "access_token" in data
        assert data["email"] == "demo@launchcomply.io"
        assert data["organization_name"] == "AcmeCloud SaaS"

@pytest.mark.asyncio
async def test_multi_tenant_isolation_negative_test():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Register Tenant Alpha
        res_a = await ac.post("/api/v1/auth/register", json={
            "email": "owner_alpha@example.com",
            "password": "SecurePassword999!",
            "full_name": "Alpha Owner",
            "organization_name": "Alpha Enterprises"
        })
        assert res_a.status_code == 200
        token_a = res_a.json()["access_token"]
        org_a_id = res_a.json()["organization_id"]

        # 2. Register Tenant Beta
        res_b = await ac.post("/api/v1/auth/register", json={
            "email": "owner_beta@example.com",
            "password": "SecurePassword888!",
            "full_name": "Beta Owner",
            "organization_name": "Beta Corp"
        })
        assert res_b.status_code == 200
        token_b = res_b.json()["access_token"]
        org_b_id = res_b.json()["organization_id"]

        # 3. Tenant Alpha creates an application
        create_res = await ac.post(
            "/api/v1/applications/",
            headers={"Authorization": f"Bearer {token_a}"},
            json={
                "name": "Alpha Confidential Payroll",
                "framework_frontend": "Next.js",
                "framework_backend": "FastAPI",
                "database_engine": "PostgreSQL"
            }
        )
        assert create_res.status_code == 200
        app_a_id = create_res.json()["id"]

        # 4. Tenant Beta queries applications
        beta_apps_res = await ac.post(
            "/api/v1/applications/",
            headers={"Authorization": f"Bearer {token_b}"},
            json={
                "name": "Beta Public App",
                "framework_frontend": "React",
                "framework_backend": "Express",
                "database_engine": "PostgreSQL"
            }
        )
        assert beta_apps_res.status_code == 200

        # Query Tenant Beta's list
        list_beta_res = await ac.get(
            "/api/v1/applications/",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert list_beta_res.status_code == 200
        beta_apps = list_beta_res.json()
        
        # Verify Tenant Beta CANNOT see Tenant Alpha's app
        alpha_app_in_beta_list = any(a["id"] == app_a_id for a in beta_apps)
        assert not alpha_app_in_beta_list, "CRITICAL SECURITY FAILURE: Cross-tenant data leak detected!"

        # Verify Tenant Beta cannot forge X-Organization-Id header to access Tenant Alpha
        forged_res = await ac.get(
            "/api/v1/applications/",
            headers={
                "Authorization": f"Bearer {token_b}",
                "X-Organization-Id": org_a_id
            }
        )
        # Even if forged header is passed, membership check must deny access or return empty for unassociated org
        # In our implementation get_current_membership checks OrganizationMembership.user_id == current_user.id
        # and if not a member, raises 403 or falls back to own org.
        if forged_res.status_code == 200:
            assert not any(a["id"] == app_a_id for a in forged_res.json()), "Cross-tenant leak via header forgery!"
