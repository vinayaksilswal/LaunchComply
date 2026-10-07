"""Phase 12: Product Quality, API Wiring, Action Center & Tenant Isolation Tests."""
from datetime import datetime, timedelta
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token
from app.models.auth import User, Organization, OrganizationMembership, MembershipRole
from app.models.application import Application, Environment
from app.models.entities import SecurityFinding
from app.models.compliance_operations import ComplianceTask


@pytest.mark.asyncio
async def test_my_actions_unified_action_center():
    """Phase 12: Verify GET /api/v1/dashboard/my-actions returns unified actionable tasks."""
    async with AsyncSessionLocal() as db:
        # 1. Create tenant and user
        org = Organization(name="Action Test Org", slug="action-test-org")
        db.add(org)
        await db.flush()

        user = User(email="action_user@example.com", full_name="Action Lead", hashed_password="hashed_test_password")
        db.add(user)
        await db.flush()

        membership = OrganizationMembership(
            user_id=user.id,
            organization_id=org.id,
            role=MembershipRole.ADMIN
        )
        db.add(membership)

        app_obj = Application(
            organization_id=org.id,
            name="Action Test App",
            slug="action-test-app",
            repo_url="https://github.com/action/test-app"
        )
        db.add(app_obj)
        await db.flush()

        # 2. Add an open critical security finding
        finding = SecurityFinding(
            organization_id=org.id,
            application_id=app_obj.id,
            title="Unencrypted S3 Bucket Ingress",
            severity="CRITICAL",
            status="OPEN",
            cvss_score="9.0",
            category="Storage Security",
            description="S3 bucket allows unauthenticated public read.",
            affected_asset="s3://customer-raw-data"
        )
        db.add(finding)

        # 3. Add a compliance task
        task = ComplianceTask(
            organization_id=org.id,
            title="Approve ISMS Access Policy",
            category="POLICY",
            source_type="MANUAL",
            owner="Compliance Lead",
            priority="HIGH",
            due_date=datetime.utcnow() + timedelta(days=7),
            status="OPEN"
        )
        db.add(task)
        await db.commit()

        # 4. Query my-actions
        token = create_access_token(user.id)
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Organization-Id": org.id
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/dashboard/my-actions", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert "actions" in data
            assert data["total_count"] >= 2
            assert any("Unencrypted S3 Bucket Ingress" in a["title"] for a in data["actions"])
            assert any("Approve ISMS Access Policy" in a["title"] for a in data["actions"])


@pytest.mark.asyncio
async def test_my_actions_tenant_isolation():
    """Phase 12: Verify my-actions strictly isolates tenant tasks without cross-tenant leakage."""
    async with AsyncSessionLocal() as db:
        # Org A
        org_a = Organization(name="P12 Tenant Alpha", slug="p12-tenant-alpha")
        db.add(org_a)
        await db.flush()
        user_a = User(email="alpha12@example.com", full_name="Alpha User", hashed_password="pw_alpha_123")
        db.add(user_a)
        await db.flush()
        db.add(OrganizationMembership(user_id=user_a.id, organization_id=org_a.id, role=MembershipRole.ADMIN))

        app_a = Application(organization_id=org_a.id, name="App Alpha 12", slug="app-alpha-12")
        db.add(app_a)
        await db.flush()

        finding_a = SecurityFinding(
            organization_id=org_a.id,
            application_id=app_a.id,
            title="Confidential Alpha Finding",
            severity="CRITICAL",
            status="OPEN",
            description="Confidential Alpha finding details."
        )
        db.add(finding_a)

        # Org B
        org_b = Organization(name="P12 Tenant Beta", slug="p12-tenant-beta")
        db.add(org_b)
        await db.flush()
        user_b = User(email="beta12@example.com", full_name="Beta User", hashed_password="pw_beta_123")
        db.add(user_b)
        await db.flush()
        db.add(OrganizationMembership(user_id=user_b.id, organization_id=org_b.id, role=MembershipRole.ADMIN))

        await db.commit()

        # Org B queries my-actions
        token_b = create_access_token(user_b.id)
        headers_b = {
            "Authorization": f"Bearer {token_b}",
            "X-Organization-Id": org_b.id
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response_b = await client.get("/api/v1/dashboard/my-actions", headers=headers_b)
            assert response_b.status_code == 200
            data_b = response_b.json()

            # Verify Org B NEVER sees Org A's confidential finding
            for action in data_b["actions"]:
                assert "Confidential Alpha Finding" not in action["title"]
                assert "Tenant Alpha" not in action["description"]


@pytest.mark.asyncio
async def test_health_and_root_contract():
    """Phase 12: Verify platform root and health contracts."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp_root = await client.get("/")
        assert resp_root.status_code == 200
        root_data = resp_root.json()
        assert root_data["status"] == "ONLINE"
        assert root_data["tagline"] == "From Localhost to Real Business."

        resp_health = await client.get("/health")
        assert resp_health.status_code == 200
        health_data = resp_health.json()
        assert health_data["status"] == "HEALTHY"
        assert health_data["database"] == "CONNECTED"


@pytest.mark.asyncio
async def test_public_assurance_summary_contract():
    """Phase 12: Verify public assurance summary API response."""
    async with AsyncSessionLocal() as db:
        org = Organization(name="Public Assurance Org", slug="pub-assure-org")
        db.add(org)
        await db.commit()

    headers = {"X-Organization-Id": org.id}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/public/v1/assurance/summary", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "monitored_controls_count" in data
        assert "pass_count" in data
        assert "fail_count" in data


@pytest.mark.asyncio
async def test_providers_matrix_endpoint():
    """Phase 12: Verify platform-admin providers matrix exposes all cloud & SaaS providers."""
    async with AsyncSessionLocal() as db:
        # Create platform admin user with is_platform_admin=True
        org = Organization(name="Admin HQ", slug="admin-hq")
        db.add(org)
        await db.flush()

        admin_user = User(
            email="superadmin@launchcomply.io",
            full_name="Platform Admin",
            hashed_password="pw_super_admin",
            is_platform_admin=True
        )
        db.add(admin_user)
        await db.flush()

        membership = OrganizationMembership(
            user_id=admin_user.id,
            organization_id=org.id,
            role=MembershipRole.OWNER
        )
        db.add(membership)
        await db.commit()

        token = create_access_token(admin_user.id)
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Organization-Id": org.id
        }
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.get("/api/v1/platform-admin/providers-matrix", headers=headers)
            assert resp.status_code == 200
            providers = resp.json()
            assert len(providers) >= 4
            provider_names = [p["provider"] for p in providers]
            assert any("PostgreSQL" in p or "AWS" in p or "Database" in p for p in provider_names)
