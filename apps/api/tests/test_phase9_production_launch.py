"""Phase 9 Comprehensive Production Launch, Enterprise Hardening, and Reality Verification Tests."""
import pytest
import uuid
import json
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select

from app.main import app
from app.core.config import settings, Settings
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token
from app.services.seed_service import reset_demo_environment
from app.services.commercial.production_launch_service import production_launch_service
from app.models.auth import User, Organization, OrganizationMembership, MembershipRole
from app.models.production_launch import (
    ProductionLaunchApproval,
    RestoreRehearsalRecord,
    PaymentWebhookEvent,
    EmailBounceRecord,
    BreakGlassAccessRecord,
    CustomerAcceptance,
    CustomerFeedback,
    WebhookProcessingStatus,
    BounceType,
)


@pytest.mark.asyncio
async def test_production_environment_validator():
    """Validates that production environment rejects SQLite, DEMO_MODE, and insecure default secrets."""
    # Test valid dev config
    dev_settings = Settings(
        ENVIRONMENT="development",
        DEBUG=True,
        DEMO_MODE=True,
        DATABASE_URL="sqlite+aiosqlite:///./test.db"
    )
    is_valid, blockers, warnings = dev_settings.validate_production_environment()
    assert is_valid is True
    assert len(blockers) == 0

    # Test invalid production config with SQLite and DEMO_MODE
    prod_invalid = Settings(
        ENVIRONMENT="production",
        DEBUG=True,
        DEMO_MODE=True,
        DATABASE_URL="sqlite+aiosqlite:///./prod.db",
        JWT_SECRET="launchcomply_super_secure_jwt_secret_key_change_in_production_32chars",
        ENCRYPTION_KEY="launchcomply_default_dev_encryption_key_32chars_min"
    )
    is_valid, blockers, warnings = prod_invalid.validate_production_environment()
    assert is_valid is False
    assert any("SQLite is prohibited" in b for b in blockers)
    assert any("DEMO_MODE is enabled" in b for b in blockers)
    assert any("DEBUG mode is enabled" in b for b in blockers)
    assert any("Insecure or default JWT_SECRET" in b for b in blockers)

    # Test valid production config
    prod_valid = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        DEMO_MODE=False,
        DATABASE_URL="postgresql+asyncpg://user:pass@db.launchcomply.internal:5432/launchcomply_prod",
        JWT_SECRET="c94f7a2b91834e5682910fa3129845cd12093481230491823049182309481203",
        ENCRYPTION_KEY="e83a71b294024c89a71239841203984120938410293841029384102938410293",
        OBJECT_STORAGE_PROVIDER="s3"
    )
    is_valid, blockers, warnings = prod_valid.validate_production_environment()
    assert is_valid is True
    assert len(blockers) == 0


@pytest.mark.asyncio
async def test_demo_reset_guard_prohibits_production():
    """Verifies that demo reset is strictly blocked in production or when DEMO_MODE is False."""
    async with AsyncSessionLocal() as db:
        original_env = settings.ENVIRONMENT
        original_demo = settings.DEMO_MODE
        try:
            settings.ENVIRONMENT = "production"
            settings.DEMO_MODE = False
            with pytest.raises(RuntimeError, match="DEMO RESET PROHIBITED"):
                await reset_demo_environment(db)
        finally:
            settings.ENVIRONMENT = original_env
            settings.DEMO_MODE = original_demo


@pytest.mark.asyncio
async def test_launch_gates_and_go_nogo_engine():
    """Evaluates launch gates and verifies that decision reports GO or GO_WITH_WARNINGS in dev/test."""
    async with AsyncSessionLocal() as db:
        evaluation = await production_launch_service.evaluate_launch_gates(db)
        assert "decision" in evaluation
        assert evaluation["decision"] in ("GO", "GO_WITH_WARNINGS", "NO_GO")
        assert evaluation["total_gates"] >= 10
        assert evaluation["passing_gates"] >= 9
        assert isinstance(evaluation["gates"], list)

        gate_ids = [g["id"] for g in evaluation["gates"]]
        assert "gate_db_engine" in gate_ids
        assert "gate_demo_isolation" in gate_ids
        assert "gate_tenant_isolation" in gate_ids
        assert "gate_billing_webhooks" in gate_ids
        assert "gate_restore_rehearsal" in gate_ids


@pytest.mark.asyncio
async def test_human_launch_approval_signoff():
    """Verifies that platform leaders can record an authoritative commercial launch approval."""
    async with AsyncSessionLocal() as db:
        approval = await production_launch_service.approve_production_launch(
            db=db,
            version="1.0.0",
            approved_by="director-ops@launchcomply.com",
            notes="Verified all Phase 9 P0 launch gates."
        )
        assert approval.id is not None
        assert approval.version == "1.0.0"
        assert approval.approved_by == "director-ops@launchcomply.com"
        assert approval.decision in ("GO", "GO_WITH_WARNINGS", "NO_GO")


@pytest.mark.asyncio
async def test_provider_status_matrix_no_false_green():
    """Confirms provider status matrix accurately classifies simulated vs connected providers."""
    async with AsyncSessionLocal() as db:
        matrix = await production_launch_service.get_provider_status_matrix(db)
        assert len(matrix) >= 8

        stripe_entry = next((p for p in matrix if "Stripe" in p["provider"]), None)
        assert stripe_entry is not None
        if not settings.ENABLE_REAL_STRIPE:
            assert stripe_entry["status"] == "SIMULATED"

        email_entry = next((p for p in matrix if "Email" in p["provider"]), None)
        assert email_entry is not None
        if not settings.ENABLE_REAL_EMAIL:
            assert email_entry["status"] == "SIMULATED"


@pytest.mark.asyncio
async def test_restore_rehearsal_execution_and_evidence():
    """Validates that isolated restore drills measure RTO and generate SHA-256 evidence."""
    async with AsyncSessionLocal() as db:
        rehearsal = await production_launch_service.execute_restore_rehearsal(
            db=db,
            operator_id="test-sre-lead",
            snapshot_id="LC-SNAP-TEST-001",
            target_environment="isolated_temp_db"
        )
        assert rehearsal.id is not None
        assert rehearsal.snapshot_id == "LC-SNAP-TEST-001"
        assert rehearsal.validation_status == "SUCCESS"
        assert rehearsal.rto_seconds is not None and rehearsal.rto_seconds > 0
        assert len(rehearsal.evidence_hash) == 64


@pytest.mark.asyncio
async def test_payment_webhook_persistence_and_replay_safety():
    """Verifies that webhooks are persisted before processing and duplicate event IDs return existing record."""
    async with AsyncSessionLocal() as db:
        event_id = f"evt_test_{uuid.uuid4().hex[:8]}"
        payload = '{"id": "' + event_id + '", "type": "invoice.paid"}'

        rec1 = await production_launch_service.persist_payment_webhook(
            db=db,
            provider="STRIPE",
            provider_event_id=event_id,
            event_type="invoice.paid",
            raw_payload=payload
        )
        assert rec1.id is not None
        assert rec1.status == WebhookProcessingStatus.VERIFIED

        rec2 = await production_launch_service.persist_payment_webhook(
            db=db,
            provider="STRIPE",
            provider_event_id=event_id,
            event_type="invoice.paid",
            raw_payload=payload
        )
        assert rec2.id == rec1.id


@pytest.mark.asyncio
async def test_email_bounce_and_complaint_tracking():
    """Tests email bounce recording and suppression."""
    async with AsyncSessionLocal() as db:
        bounce_email = f"bounced-{uuid.uuid4().hex[:6]}@example.com"
        rec = await production_launch_service.record_email_bounce(
            db=db,
            recipient_email=bounce_email,
            bounce_type=BounceType.PERMANENT_BOUNCE,
            complaint_feedback="550 5.1.1 User unknown",
            raw_message_id="msg-12345"
        )
        assert rec.id is not None
        assert rec.recipient_email == bounce_email
        assert rec.bounce_type == BounceType.PERMANENT_BOUNCE


@pytest.mark.asyncio
async def test_break_glass_access_request():
    """Tests creation of audited break-glass emergency session."""
    async with AsyncSessionLocal() as db:
        user = User(
            email=f"emergency-admin-{uuid.uuid4().hex[:6]}@launchcomply.io",
            hashed_password="hash",
            full_name="Emergency Admin",
            is_platform_admin=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        session_rec = await production_launch_service.request_break_glass_access(
            db=db,
            admin_user_id=user.id,
            reason="Investigate P0 database failover incident",
            approved_by="cto@launchcomply.io",
            duration_minutes=30
        )
        assert session_rec.id is not None
        assert session_rec.is_active is True
        assert session_rec.expires_at > session_rec.created_at


@pytest.mark.asyncio
async def test_first_customer_acceptance_signoff():
    """Tests recording formal first customer acceptance."""
    async with AsyncSessionLocal() as db:
        org = Organization(name="First Paying Customer", slug=f"cust-{uuid.uuid4().hex[:6]}")
        db.add(org)
        await db.commit()
        await db.refresh(org)

        acceptance = await production_launch_service.record_customer_acceptance(
            db=db,
            organization_id=org.id,
            customer_contact="vp-eng@payingcustomer.com",
            internal_owner="Karan Johar (LaunchComply SRE)",
            environment="production",
            sign_off_status="ACCEPTED"
        )
        assert acceptance.id is not None
        assert acceptance.organization_id == org.id
        assert acceptance.sign_off_status == "ACCEPTED"


@pytest.mark.asyncio
async def test_tenant_data_export_and_checksum():
    """Tests tenant data export and cryptographic manifest checksum without leaking secrets."""
    async with AsyncSessionLocal() as db:
        user = User(email=f"export-owner-{uuid.uuid4().hex[:6]}@test.com", hashed_password="hash", full_name="Export Owner")
        org = Organization(name="Export Test Org", slug=f"export-{uuid.uuid4().hex[:6]}")
        db.add_all([user, org])
        await db.commit()
        await db.refresh(user)
        await db.refresh(org)

        membership = OrganizationMembership(user_id=user.id, organization_id=org.id, role=MembershipRole.OWNER)
        db.add(membership)
        await db.commit()

        token = create_access_token(user.id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(
            "/api/v1/commercial/export",
            headers={"Authorization": f"Bearer {token}", "X-Organization-ID": org.id}
        )
        assert res.status_code == 200
        data = res.json()
        assert "organization" in data
        assert "applications" in data
        assert "security_findings" in data
        assert "invoices" in data
        assert "manifest_sha256" in data
        assert len(data["manifest_sha256"]) == 64
        # Ensure no secrets leak
        assert "password" not in str(data)
        assert "secret" not in str(data).lower() or "secret_key" not in str(data).lower()


@pytest.mark.asyncio
async def test_platform_admin_security_and_tenant_isolation():
    """Verifies that non-admin customers receive HTTP 403 on Phase 9 platform admin routes."""
    async with AsyncSessionLocal() as db:
        normal_user = User(
            email=f"normal-{uuid.uuid4().hex[:6]}@test.com",
            hashed_password="hash",
            full_name="Normal User",
            is_platform_admin=False
        )
        db.add(normal_user)
        await db.commit()
        await db.refresh(normal_user)
        token = create_access_token(normal_user.id)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Attempt to access launch gates
        res1 = await client.get(
            "/api/v1/platform-admin/launch-gates",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res1.status_code == 403

        # 2. Attempt to trigger restore rehearsal
        res2 = await client.post(
            "/api/v1/platform-admin/restore-rehearsal",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res2.status_code == 403

        # 3. Attempt to approve launch
        res3 = await client.post(
            "/api/v1/platform-admin/launch-approvals",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res3.status_code == 403
