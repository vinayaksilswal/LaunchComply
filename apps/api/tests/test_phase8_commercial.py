"""Phase 8 Commercial SaaS Operating System Test Suite.
Validates Catalog, Entitlements, Metering Idempotency, Billing Webhooks,
Invoices & GST, Invitations, Support SLAs, Connectors, Launch Readiness,
Platform Admin Isolation, and Tenant Isolation.
"""
import pytest
import hmac
import hashlib
import time
import json
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.auth import User, Organization, OrganizationMembership, MembershipRole
from app.models.billing import (
    Subscription,
    SubscriptionStatus,
    Invoice,
    BillingProviderType,
    OrganizationProfile,
)
from app.models.commercial import (
    Plan,
    PlanTier,
    OrganizationEntitlement,
    ValueType,
    EntitlementSource,
)
from app.models.application import Application
from app.models.connectors import ConnectorType, AuditorCommentAction
from app.services.commercial.catalog_entitlements_service import catalog_entitlements_service
from app.services.commercial.usage_service import usage_service
from app.services.commercial.subscription_service import subscription_service
from app.services.commercial.invoice_service import invoice_service
from app.services.commercial.onboarding_invitation_service import onboarding_invitation_service
from app.services.commercial.support_service import support_service
from app.services.commercial.crm_services_service import crm_services_service
from app.services.commercial.connectors_auditor_service import connectors_auditor_service
from app.services.commercial.launch_readiness_service import launch_readiness_service


@pytest.mark.asyncio
async def test_plan_catalog_and_entitlements():
    """Validates public plan catalog and backend entitlement enforcement."""
    async with AsyncSessionLocal() as db:
        await catalog_entitlements_service.ensure_catalog(db)

        plans = await catalog_entitlements_service.list_plans(db)
        tiers = [p["tier"] for p in plans]
        assert "STARTER" in tiers
        assert "GROWTH" in tiers
        assert "BUSINESS" in tiers
        assert "ENTERPRISE" in tiers

        # Create test organization
        test_org = Organization(name="Entitlement Test Org", slug="entitlement-test-org", tier="starter")
        db.add(test_org)
        await db.commit()

        # Check starter plan limits: audit_portal is False, applications.max is 1
        sub = await subscription_service.get_or_create_subscription(db, test_org.id, plan_tier="STARTER")
        sub.status = SubscriptionStatus.ACTIVE
        await db.commit()

        portal_check = await catalog_entitlements_service.check_entitlement(db, test_org.id, "audit_portal.enabled")
        assert portal_check["allowed"] is False

        app_check = await catalog_entitlements_service.check_entitlement(db, test_org.id, "applications.max", current_count=0)
        assert app_check["allowed"] is True

        app_check_full = await catalog_entitlements_service.check_entitlement(db, test_org.id, "applications.max", current_count=1)
        assert app_check_full["allowed"] is False

        # Add custom enterprise override
        ov = OrganizationEntitlement(
            organization_id=test_org.id,
            feature_key="audit_portal.enabled",
            value_type=ValueType.BOOLEAN,
            boolean_value=True,
            source=EntitlementSource.ENTERPRISE_OVERRIDE,
            effective_from=datetime.utcnow() - timedelta(days=1)
        )
        db.add(ov)
        await db.commit()

        portal_check_after = await catalog_entitlements_service.check_entitlement(db, test_org.id, "audit_portal.enabled")
        assert portal_check_after["allowed"] is True
        assert portal_check_after["source"] == "ORGANIZATION_OVERRIDE"


@pytest.mark.asyncio
async def test_usage_metering_idempotency_and_no_negative():
    """Validates metered usage ingestion, duplicate key rejection, and monthly aggregation."""
    async with AsyncSessionLocal() as db:
        await usage_service.ensure_metric_definitions(db)

        org = Organization(name="Usage Meter Test Org", slug="usage-meter-test-org")
        db.add(org)
        await db.commit()

        # 1. Negative usage must be rejected
        with pytest.raises(ValueError):
            await usage_service.record_usage_event(
                db=db,
                organization_id=org.id,
                metric_key="build_minutes",
                quantity=-10.0,
                idempotency_key="key_negative_1"
            )

        # 2. Record initial event
        res1 = await usage_service.record_usage_event(
            db=db,
            organization_id=org.id,
            metric_key="build_minutes",
            quantity=15.0,
            idempotency_key="key_build_001"
        )
        assert res1["status"] == "RECORDED"

        # 3. Duplicate event with same key must return DUPLICATE without double counting
        res2 = await usage_service.record_usage_event(
            db=db,
            organization_id=org.id,
            metric_key="build_minutes",
            quantity=15.0,
            idempotency_key="key_build_001"
        )
        assert res2["status"] == "DUPLICATE_IDEMPOTENT_IGNORED"

        # 4. Check monthly aggregate
        usage = await usage_service.get_current_usage(db, org.id)
        assert usage["metrics"]["build_minutes"] == 15.0


@pytest.mark.asyncio
async def test_subscription_checkout_and_webhook_activation():
    """Validates tokenized checkout session and signature-verified webhook activation."""
    async with AsyncSessionLocal() as db:
        await catalog_entitlements_service.ensure_catalog(db)

        org = Organization(name="Checkout Test Org", slug="checkout-test-org")
        db.add(org)
        await db.commit()

        # Checkout
        checkout = await subscription_service.initiate_checkout(
            db=db,
            organization_id=org.id,
            target_tier="GROWTH",
            currency="INR",
            provider_type=BillingProviderType.STRIPE
        )
        assert "checkout_url" in checkout
        assert checkout["plan_tier"] == "GROWTH"

        # Invalid webhook signature must fail
        fake_payload = json.dumps({"type": "checkout.session.completed", "metadata": {"organization_id": org.id, "target_tier": "GROWTH"}}).encode()
        with pytest.raises(ValueError):
            await subscription_service.process_webhook(
                db=db,
                provider_type=BillingProviderType.STRIPE,
                raw_payload=fake_payload,
                signature_header="t=12345,v1=invalid_signature",
                webhook_secret="whsec_secret"
            )

        # Valid signed webhook activates subscription
        secret = "whsec_test_secret_for_launchcomply"
        ts = int(time.time())
        signed_bytes = f"{ts}.".encode("utf-8") + fake_payload
        valid_v1 = hmac.new(secret.encode("utf-8"), signed_bytes, hashlib.sha256).hexdigest()
        valid_header = f"t={ts},v1={valid_v1}"

        webhook_res = await subscription_service.process_webhook(
            db=db,
            provider_type=BillingProviderType.STRIPE,
            raw_payload=fake_payload,
            signature_header=valid_header,
            webhook_secret=secret
        )
        assert webhook_res["action"] == "SUBSCRIPTION_ACTIVATED"

        sub = await subscription_service.get_or_create_subscription(db, org.id)
        assert sub.status == SubscriptionStatus.ACTIVE
        assert sub.plan_tier == "GROWTH"


@pytest.mark.asyncio
async def test_plan_upgrade_and_downgrade_resource_protection():
    """Validates plan upgrade and ensures downgrade is blocked if resources exceed new tier limit."""
    async with AsyncSessionLocal() as db:
        org = Organization(name="Downgrade Guard Org", slug="downgrade-guard-org")
        db.add(org)
        await db.commit()

        # Start with BUSINESS plan
        sub = await subscription_service.get_or_create_subscription(db, org.id, plan_tier="BUSINESS")
        sub.status = SubscriptionStatus.ACTIVE
        await db.commit()

        # Add 3 applications
        for i in range(3):
            app_item = Application(organization_id=org.id, name=f"App {i}", slug=f"app-{i}-{org.id[:6]}")
            db.add(app_item)
        await db.commit()

        # Attempt to downgrade to STARTER (limit: 1 app) -> MUST be blocked
        with pytest.raises(ValueError) as exc:
            await subscription_service.change_plan(db, org.id, target_tier="STARTER")
        assert "Cannot downgrade to STARTER" in str(exc.value)

        # Upgrade to ENTERPRISE -> succeeds
        upg = await subscription_service.change_plan(db, org.id, target_tier="ENTERPRISE")
        assert upg["new_tier"] == "ENTERPRISE"


@pytest.mark.asyncio
async def test_subscription_cancellation_and_grace_period():
    """Validates cancellation safety (no resource deletion) and payment failure grace period."""
    async with AsyncSessionLocal() as db:
        org = Organization(name="Cancel Safety Org", slug="cancel-safety-org")
        db.add(org)
        await db.commit()

        sub = await subscription_service.get_or_create_subscription(db, org.id, plan_tier="GROWTH")
        sub.status = SubscriptionStatus.ACTIVE
        await db.commit()

        # Cancel at period end
        cancel_res = await subscription_service.cancel_subscription(db, org.id, immediate=False)
        assert cancel_res["status"] == "CANCEL_AT_PERIOD_END"
        assert "untouched and safe" in cancel_res["safety_guarantee"]

        # Payment failure webhook triggers PAST_DUE + 14-day GRACE_PERIOD
        secret = "whsec_test_secret_for_launchcomply"
        fail_payload = json.dumps({"type": "invoice.payment_failed", "metadata": {"organization_id": org.id}}).encode()
        ts = int(time.time())
        v1_sig = hmac.new(secret.encode("utf-8"), f"{ts}.".encode("utf-8") + fail_payload, hashlib.sha256).hexdigest()

        fail_res = await subscription_service.process_webhook(
            db=db,
            provider_type=BillingProviderType.STRIPE,
            raw_payload=fail_payload,
            signature_header=f"t={ts},v1={v1_sig}",
            webhook_secret=secret
        )
        assert fail_res["action"] == "PAYMENT_FAILED_GRACE_PERIOD_STARTED"
        await db.refresh(sub)
        assert sub.status == SubscriptionStatus.PAST_DUE
        assert sub.grace_period_end is not None


@pytest.mark.asyncio
async def test_sequential_invoicing_and_gst_reconciliation():
    """Validates sequential invoice numbering, intra/inter-state GST breakdown, and GSTR-1 preview."""
    async with AsyncSessionLocal() as db:
        org = Organization(name="Invoice Test Org", slug="invoice-test-org")
        db.add(org)
        await db.commit()

        # Create Karnataka organization profile (Intra-state: 9% CGST + 9% SGST)
        prof = OrganizationProfile(
            organization_id=org.id,
            legal_name="Invoice Test Technologies Pvt Ltd",
            country="IN",
            state="Karnataka",
            gstin="29TEST0000A1Z1",
            billing_email="billing@invoicetest.com"
        )
        db.add(prof)
        await db.commit()

        inv = await invoice_service.generate_invoice(
            db=db,
            organization_id=org.id,
            subscription_id=None,
            line_items=[{"description": "LaunchComply Growth Tier", "quantity": 1, "unit_price": 20000.00}]
        )
        assert inv.invoice_number.startswith(f"LC-INV-{datetime.utcnow().year}-")
        assert inv.subtotal == 20000.00
        assert inv.tax_amount == 3600.00  # 18% of 20000
        assert inv.total_amount == 23600.00

        breakdown = json.loads(inv.tax_breakdown_json)
        assert breakdown["type"] == "INTRA_STATE"
        assert breakdown["cgst_amount"] == 1800.00
        assert breakdown["sgst_amount"] == 1800.00

        # GSTR-1 preview
        gst_preview = await invoice_service.get_gst_reconciliation_preview(db, org.id)
        assert gst_preview["summary"]["total_invoices_count"] >= 1
        assert "READ-ONLY GSTR-1 COMPATIBLE PREVIEW" in gst_preview["statutory_notice"]


@pytest.mark.asyncio
async def test_team_invitations_lifecycle():
    """Validates cryptographically secure invitation creation, acceptance, and role binding."""
    async with AsyncSessionLocal() as db:
        org = Organization(name="Invite Test Org", slug="invite-test-org")
        user = User(
            email="invited.dev@launchcomply.io",
            hashed_password=get_password_hash("Password123!"),
            full_name="Invited Developer",
            is_active=True
        )
        db.add(org)
        db.add(user)
        await db.commit()

        # Create invite
        invite_data = await onboarding_invitation_service.create_invitation(
            db=db,
            organization_id=org.id,
            email="invited.dev@launchcomply.io",
            role=MembershipRole.DEVELOPER
        )
        raw_token = invite_data["invite_token"]

        # Accept invite
        accept_res = await onboarding_invitation_service.accept_invitation(db, raw_token, user)
        assert accept_res["status"] == "ACCEPTED"
        assert accept_res["role"] == "DEVELOPER"

        # Reusing token must fail
        with pytest.raises(ValueError):
            await onboarding_invitation_service.accept_invitation(db, raw_token, user)


@pytest.mark.asyncio
async def test_email_verification_and_password_reset():
    """Validates one-time email verification and password reset workflows."""
    async with AsyncSessionLocal() as db:
        user = User(
            email="verify.test@launchcomply.io",
            hashed_password=get_password_hash("OldPassword123!"),
            full_name="Verification User",
            is_active=True,
            email_verified=False
        )
        db.add(user)
        await db.commit()

        # Email verification
        token = await onboarding_invitation_service.request_email_verification(db, user)
        confirmed = await onboarding_invitation_service.verify_email_token(db, token)
        assert confirmed is True
        await db.refresh(user)
        assert user.email_verified is True

        # Password reset
        reset_token = await onboarding_invitation_service.request_password_reset(db, user.email)
        assert reset_token is not None
        reset_ok = await onboarding_invitation_service.reset_password_with_token(db, reset_token, "NewSecurePassword456!")
        assert reset_ok is True


@pytest.mark.asyncio
async def test_support_ticket_and_sla_timers():
    """Validates support ticket generation with plan-based SLA response targets."""
    async with AsyncSessionLocal() as db:
        org = Organization(name="SLA Support Org", slug="sla-support-org")
        user = User(
            email="support.client@launchcomply.io",
            hashed_password=get_password_hash("Password123!"),
            full_name="Support Client",
            is_active=True
        )
        db.add(org)
        db.add(user)
        await db.commit()

        # Organization on BUSINESS plan
        sub = await subscription_service.get_or_create_subscription(db, org.id, plan_tier="BUSINESS")
        sub.status = SubscriptionStatus.ACTIVE
        await db.commit()

        from app.models.support import TicketCategory, TicketPriority
        ticket = await support_service.create_ticket(
            db=db,
            organization_id=org.id,
            user_id=user.id,
            user_email=user.email,
            user_name=user.full_name,
            title="Database Latency in ap-south-1",
            category=TicketCategory.AWS,
            priority=TicketPriority.HIGH,
            initial_message="Observing 500ms p95 latency on RDS PostgreSQL cluster."
        )
        assert ticket.ticket_number.startswith(f"LC-TCK-{datetime.utcnow().year}-")
        assert ticket.sla_response_due_at is not None

        # Agent reply
        reply = await support_service.add_message(
            db=db,
            ticket_id=ticket.id,
            sender_id=None,
            sender_email="support@launchcomply.io",
            sender_name="LaunchComply Support Engineer",
            content="We inspected the CloudWatch RDS CPU telemetry; query optimization recommended.",
            is_internal=True
        )
        assert reply.is_internal is True
        await db.refresh(ticket)
        assert ticket.first_responded_at is not None


@pytest.mark.asyncio
async def test_crm_lead_and_service_quote_to_order():
    """Validates CRM lead capture, quote generation, and acceptance to active ServiceOrder."""
    async with AsyncSessionLocal() as db:
        org = Organization(name="CRM Client Org", slug="crm-client-org")
        db.add(org)
        await db.commit()

        # Lead capture
        lead = await crm_services_service.create_lead(
            db=db,
            name="Vikram Sethi",
            email="vikram@fintechsecure.com",
            company="FinTech Secure",
            notes="Requires ISO 27001 implementation support.",
            estimated_value=250000.00
        )
        assert lead.id is not None

        # Quote generation
        quote = await crm_services_service.create_service_quote(
            db=db,
            organization_id=org.id,
            service_name="ISO 27001:2022 Lead Implementation Package",
            scope_description="ISMS scope drafting, risk assessment, Statement of Applicability, internal audit.",
            deliverables_description="ISMS manual, 14 policies, SoA v1.0, internal audit report.",
            subtotal=200000.00,
            tax_amount=36000.00
        )
        assert quote.total_amount == 236000.00

        # Customer accepts quote
        order = await crm_services_service.accept_service_quote(db, quote.id, org.id)
        assert order.status.value == "CREATED"
        assert order.total_amount == 236000.00


@pytest.mark.asyncio
async def test_connectors_and_auditor_comments():
    """Validates external evidence sync simulation and threaded auditor comments."""
    async with AsyncSessionLocal() as db:
        org = Organization(name="Auditor Collab Org", slug="auditor-collab-org")
        db.add(org)
        await db.commit()

        # Sync GitHub connector
        sync_res = await connectors_auditor_service.sync_connector(db, org.id, ConnectorType.GITHUB_ENTERPRISE)
        assert sync_res["status"] == "CONNECTED"
        assert sync_res["items_collected"] > 0

        # Auditor submits comment & accepts evidence
        comment = await connectors_auditor_service.add_auditor_comment(
            db=db,
            organization_id=org.id,
            evidence_request_id="REQ-Q3-01",
            evidence_id="EVID-AWS-KMS-01",
            author_id=None,
            author_name="KPMG Lead Auditor",
            comment="RDS encryption at-rest verified; key rotation interval validated.",
            action=AuditorCommentAction.ACCEPT_EVIDENCE
        )
        assert comment.action == AuditorCommentAction.ACCEPT_EVIDENCE

        comments = await connectors_auditor_service.list_auditor_comments(db, org.id, "REQ-Q3-01")
        assert len(comments) == 1


@pytest.mark.asyncio
async def test_launch_readiness_checklist():
    """Validates the 12-point commercial launch blocker assessment."""
    async with AsyncSessionLocal() as db:
        readiness = await launch_readiness_service.evaluate_launch_readiness(db)
        assert readiness["readiness_state"] in ["COMMERCIAL_READY", "READY_WITH_WARNINGS"]
        assert readiness["passed_checks"] == readiness["total_checks"]
        assert readiness["score_percentage"] == 100.0


@pytest.mark.asyncio
async def test_platform_admin_isolation_and_cross_tenant_billing_negative():
    """Negative tests: normal users cannot access platform admin, and Tenant A cannot view Tenant B's billing."""
    async with AsyncSessionLocal() as db:
        # Create normal user
        normal_user = User(
            email="regular.user@client.io",
            hashed_password=get_password_hash("Password123!"),
            full_name="Regular Customer",
            is_active=True,
            is_platform_admin=False
        )
        # Create platform admin user
        admin_user = User(
            email="platform.superadmin@launchcomply.io",
            hashed_password=get_password_hash("Password123!"),
            full_name="Platform Superadmin",
            is_active=True,
            is_platform_admin=True
        )
        org_a = Organization(name="Tenant Alpha", slug="tenant-alpha")
        org_b = Organization(name="Tenant Beta", slug="tenant-beta")
        db.add_all([normal_user, admin_user, org_a, org_b])
        await db.commit()

        # Memberships
        mem_a = OrganizationMembership(user_id=normal_user.id, organization_id=org_a.id, role=MembershipRole.OWNER, is_active=True)
        db.add(mem_a)
        await db.commit()

        # Invoices for Org B
        inv_b = await invoice_service.generate_invoice(
            db=db,
            organization_id=org_b.id,
            subscription_id=None,
            line_items=[{"description": "Beta Confidential Subscription", "quantity": 1, "unit_price": 50000.00}]
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            normal_token = create_access_token(normal_user.id)
            admin_token = create_access_token(admin_user.id)

            # 1. Normal user MUST NOT be allowed into /api/v1/platform-admin/overview (HTTP 403)
            res_admin_denied = await ac.get(
                "/api/v1/platform-admin/overview",
                headers={"Authorization": f"Bearer {normal_token}"}
            )
            assert res_admin_denied.status_code == 403

            # 2. Platform admin CAN access /api/v1/platform-admin/overview (HTTP 200)
            res_admin_ok = await ac.get(
                "/api/v1/platform-admin/overview",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert res_admin_ok.status_code == 200

            # 3. Tenant A user querying invoices only sees Org A invoices, NEVER Org B invoices
            res_invoices = await ac.get(
                "/api/v1/commercial/invoices",
                headers={"Authorization": f"Bearer {normal_token}", "X-Organization-Id": org_a.id}
            )
            assert res_invoices.status_code == 200
            invoices_data = res_invoices.json()
            assert not any(i["invoice_number"] == inv_b.invoice_number for i in invoices_data)
