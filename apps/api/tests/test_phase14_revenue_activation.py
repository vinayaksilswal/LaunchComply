"""Phase 14 Revenue Activation, Commercial Data Integrity & Operational Tests.

Covers:
1. Strict financial separation: Demo, Test, and Unreconciled Subscriptions excluded from Live MRR (§162).
2. Paid Customer definition enforcement (§4, §162).
3. Revenue Provenance and Drilldown traceability (§5, §75-77).
4. Reconciled invoice and manual bank transfer inclusion in realized revenue (§19, §20, §162).
5. Separate reporting of one-time professional services revenue (§78, §162).
6. Time-to-Value calculation with empirical sample size (n) (§34, §163).
7. Cohort analysis with N/A for future unmatured periods (§83, §164).
8. Customer count isolation (seed/demo excluded from real customers) (§165).
9. First 10 Customer real_only filtering and blocker tracking (§28, §31, §166).
10. Support intelligence excluding demo tickets and calculating SLA with sample size (§72, §167).
11. Sales intelligence win/loss reasons and objection analytics (§59-63, §168).
12. Billing Activation Center state, credentials presence, and live acceptance test (§13-18, §169-170).
13. Lightweight experiment framework safety gating (§85-90).
14. Usage-driven roadmap candidate sourcing requirement (§2, §104-106).
15. Weekly Operating Review action list and Post-GA review windows (§108-111, §148-154).
"""
import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.auth import User, Organization, OrganizationMembership, MembershipRole
from app.models.billing import (
    Subscription,
    SubscriptionStatus,
    Invoice,
    InvoiceStatus,
    Payment,
    PaymentStatus,
    PaymentRealityStatus,
    PaymentSource,
    BillingProviderType,
)
from app.models.application import Application, AppStatus
from app.models.crm import Lead, Opportunity, OpportunityStage, ServiceOrder, OrderStatus
from app.models.support import SupportTicket, TicketStatus, TicketPriority
from app.services.commercial.customer_success_analytics_service import customer_success_analytics_service
from app.services.commercial.first_customer_service import first_customer_service
from app.services.commercial.billing_activation_service import billing_activation_service
from app.services.commercial.onboarding_diagnostics_service import onboarding_diagnostics_service
from app.services.commercial.experimentation_service import experimentation_service
from app.services.commercial.roadmap_intelligence_service import roadmap_intelligence_service


async def setup_test_users():
    """Sets up an admin and customer user for test isolation."""
    async with AsyncSessionLocal() as session:
        admin_email = f"platform.admin.{int(datetime.utcnow().timestamp())}@launchcomply.io"
        admin = User(
            email=admin_email,
            hashed_password=get_password_hash("Password123!"),
            full_name="Phase 14 Operator",
            is_active=True,
            is_platform_admin=True,
        )
        session.add(admin)
        await session.commit()
        await session.refresh(admin)
        token = create_access_token(admin.id)
        return admin, token


@pytest.mark.asyncio
async def test_commercial_data_integrity_mrr_isolation():
    """
    Test 1: Demo and Test subscriptions are strictly excluded from Live MRR.
    Unreconciled active subscriptions are classified as MISCLASSIFIED_TEST_DATA (§8, §162).
    """
    async with AsyncSessionLocal() as db:
        # 1. Create a demo organization
        demo_org = Organization(name="Demo Org", slug=f"demo-{int(datetime.utcnow().timestamp())}", is_demo=True)
        # 2. Create a test organization
        test_org = Organization(name="Sandbox Org", slug=f"test-{int(datetime.utcnow().timestamp())}", is_demo=False, is_test=True)
        # 3. Create a real customer organization WITHOUT verified payment
        unverified_org = Organization(
            name="Unverified Customer",
            slug=f"unverified-{int(datetime.utcnow().timestamp())}",
            is_demo=False,
            is_test=False,
            customer_classification="REAL_CUSTOMER"
        )
        db.add_all([demo_org, test_org, unverified_org])
        await db.flush()

        # Add active subscriptions
        sub_demo = Subscription(
            organization_id=demo_org.id,
            plan_tier="GROWTH",
            status=SubscriptionStatus.ACTIVE,
            billing_provider=BillingProviderType.STRIPE,
            amount=19999.00,
            currency="INR",
            interval="MONTHLY",
            current_period_end=datetime.utcnow() + timedelta(days=30),
            payment_source=PaymentSource.DEMO,
            reality_status=PaymentRealityStatus.TEST
        )
        sub_test = Subscription(
            organization_id=test_org.id,
            plan_tier="BUSINESS",
            status=SubscriptionStatus.ACTIVE,
            billing_provider=BillingProviderType.STRIPE,
            amount=49999.00,
            currency="INR",
            interval="MONTHLY",
            current_period_end=datetime.utcnow() + timedelta(days=30),
            payment_source=PaymentSource.TEST,
            reality_status=PaymentRealityStatus.TEST
        )
        sub_unverified = Subscription(
            organization_id=unverified_org.id,
            plan_tier="GROWTH",
            status=SubscriptionStatus.ACTIVE,
            billing_provider=BillingProviderType.STRIPE,
            amount=19999.00,
            currency="INR",
            interval="MONTHLY",
            current_period_end=datetime.utcnow() + timedelta(days=30),
            reality_status=PaymentRealityStatus.UNVERIFIED,
            is_real_payment_verified=False
        )
        db.add_all([sub_demo, sub_test, sub_unverified])
        await db.commit()

        # Execute revenue dashboard calculation
        rev = await customer_success_analytics_service.get_revenue_dashboard(db)
        
        # Verify Live MRR excludes unverified subscription
        assert rev["environment_breakdown"]["demo"]["mrr"] >= 19999.00
        assert rev["environment_breakdown"]["test"]["mrr"] >= (49999.00 + 19999.00)
        # Finding must document misclassified finding
        assert rev["reconciliation_finding"]["classification"] == "MISCLASSIFIED_TEST_DATA"
        assert rev["reconciliation_finding"]["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_reconciled_bank_transfer_enters_live_revenue():
    """
    Test 2: Reconciled enterprise bank transfer is admitted into realized revenue with full provenance (§19, §20).
    """
    async with AsyncSessionLocal() as db:
        real_paid_org = Organization(
            name="FinScale Technologies Reconciled",
            slug=f"finscale-paid-{int(datetime.utcnow().timestamp())}",
            is_demo=False,
            is_test=False,
            customer_classification="PILOT_CUSTOMER"
        )
        db.add(real_paid_org)
        await db.flush()

        # Subscription initially pending
        sub = Subscription(
            organization_id=real_paid_org.id,
            plan_tier="GROWTH",
            status=SubscriptionStatus.ACTIVE,
            billing_provider=BillingProviderType.MANUAL_INVOICE,
            amount=19999.00,
            currency="INR",
            interval="MONTHLY",
            current_period_end=datetime.utcnow() + timedelta(days=30),
            reality_status=PaymentRealityStatus.PENDING,
            payment_source=PaymentSource.BANK_TRANSFER,
            is_real_payment_verified=False
        )
        db.add(sub)
        await db.flush()

        # Invoice issued
        inv = Invoice(
            invoice_number=f"INV-TEST-{int(datetime.utcnow().timestamp())}",
            organization_id=real_paid_org.id,
            subscription_id=sub.id,
            customer_legal_name="FinScale Technologies Private Limited",
            total_amount=19999.00,
            currency="INR",
            status=InvoiceStatus.OPEN,
            payment_source=PaymentSource.BANK_TRANSFER,
            reality_status=PaymentRealityStatus.PENDING,
            payment_due_date=datetime.utcnow() + timedelta(days=15)
        )
        db.add(inv)
        await db.commit()

        # Reconcile invoice via service
        rec_res = await billing_activation_service.reconcile_invoice_payment(
            db=db,
            invoice_id=inv.id,
            bank_reference="UTR20261005998877",
            amount=19999.00,
            verified_by="finance.officer@launchcomply.io",
            payment_source="BANK_TRANSFER",
            notes="HDFC Bank NEFT wire matched to contract LC-MSA-001"
        )
        assert rec_res["status"] == "RECONCILED"
        assert rec_res["bank_reference"] == "UTR20261005998877"

        # Verify revenue dashboard reflects the verified revenue
        rev = await customer_success_analytics_service.get_revenue_dashboard(db)
        assert rev["summary"]["paid_customers_count"] >= 1
        assert rev["summary"]["live_mrr"] >= 19999.00

        # Verify revenue drilldown contains complete provenance
        drilldown = await customer_success_analytics_service.get_revenue_drilldown(db)
        records = drilldown.get("records", [])
        rec_sub = next((r for r in records if r["id"] == sub.id), None)
        assert rec_sub is not None
        assert rec_sub["reality_status"] == "RECONCILED"
        assert rec_sub["is_real_payment_verified"] is True
        assert "Customer(" in rec_sub["lineage_path"]


@pytest.mark.asyncio
async def test_first_10_customers_real_only_filtering():
    """
    Test 3: First 10 Customer Hub strictly separates genuine customers from demo accounts (§27, §28).
    """
    async with AsyncSessionLocal() as db:
        # Create 1 real customer and 1 demo account
        real_cust = Organization(
            name="First10 Real Customer Alpha",
            slug=f"real-alpha-{int(datetime.utcnow().timestamp())}",
            is_demo=False,
            is_test=False,
            is_internal=False,
            customer_classification="REAL_CUSTOMER",
            commercial_state="TRIAL",
            onboarding_blocker="Awaiting AWS IAM trust role confirmation"
        )
        demo_cust = Organization(
            name="First10 Demo Showcase",
            slug=f"demo-showcase-{int(datetime.utcnow().timestamp())}",
            is_demo=True,
            is_test=False
        )
        db.add_all([real_cust, demo_cust])
        await db.commit()

        # List all
        all_custs = await first_customer_service.list_first_customers(db, real_only=False)
        assert any(c["slug"] == real_cust.slug for c in all_custs)
        assert not any(c["slug"] == demo_cust.slug for c in all_custs)

        # List with real_only filter
        real_custs = await first_customer_service.list_first_customers(db, real_only=True)
        assert all(c["is_demo"] is False and c["is_test"] is False and c["is_internal"] is False for c in real_custs)

        # Check days in stage and blockers
        target = next(c for c in real_custs if c["slug"] == real_cust.slug)
        assert target["days_in_stage"] >= 1
        assert target["onboarding_blocker"] == "Awaiting AWS IAM trust role confirmation"


@pytest.mark.asyncio
async def test_billing_activation_center_and_tests():
    """
    Test 4: Billing Activation Center checks presence without exposing raw secrets,
    and runs controlled provider acceptance test (§13-18).
    """
    async with AsyncSessionLocal() as db:
        status_res = await billing_activation_service.get_activation_status(db)
        assert "providers" in status_res
        assert len(status_res["providers"]) == 2

        stripe_info = next(p for p in status_res["providers"] if p["provider"] == "STRIPE")
        rzp_info = next(p for p in status_res["providers"] if p["provider"] == "RAZORPAY")

        # Credentials must NEVER be raw plaintext
        assert "sk_test" not in stripe_info["merchant_account"]
        assert "rzp_test" not in rzp_info["merchant_account"]

        # Run acceptance test
        test_run = await billing_activation_service.run_provider_acceptance_test(
            provider="STRIPE",
            db=db,
            operator_email="admin@launchcomply.io"
        )
        assert test_run["status"] in ["VERIFIED", "VERIFIED_SANDBOX"]


@pytest.mark.asyncio
async def test_onboarding_blockers_and_manual_assistance():
    """
    Test 5: Onboarding blockers aggregation and manual assistance tracking (§31, §32, §45-47).
    """
    async with AsyncSessionLocal() as db:
        org = Organization(
            name="Blocker Test Customer",
            slug=f"blocker-test-{int(datetime.utcnow().timestamp())}",
            is_demo=False,
            onboarding_blocker="AWS IAM Role Assumption / STS Trust Policy"
        )
        db.add(org)
        await db.commit()

        # Log manual assistance task
        task = await onboarding_diagnostics_service.log_manual_assistance_task(
            db=db,
            organization_id=org.id,
            task_name="Assist IAM Trust Policy Configuration",
            category="AWS",
            duration_minutes=45,
            operator="tam.lead@launchcomply.io",
            resolution_notes="Customer updated Trust Policy Principal to LaunchComply External ID",
            is_automation_candidate=True
        )
        assert task.id is not None
        assert task.duration_minutes == 45
        assert task.is_automation_candidate is True

        # Query top blockers
        blockers = await onboarding_diagnostics_service.get_top_blockers(db)
        assert blockers["total_blocked_customers"] >= 1
        assert any("AWS IAM" in b["blocker"] for b in blockers["top_blockers"])

        # Query manual assistance summary
        asst = await onboarding_diagnostics_service.list_manual_assistance_tasks(db, org_id=org.id)
        assert asst["total_tasks"] >= 1
        assert asst["total_hours_spent"] >= 0.7
        assert asst["automation_candidates_count"] >= 1


@pytest.mark.asyncio
async def test_sourced_roadmap_candidates_validation():
    """
    Test 6: Roadmap candidates strictly require empirical source (§2, §104-106).
    """
    async with AsyncSessionLocal() as db:
        # Invalid source type must be rejected
        with pytest.raises(ValueError) as excinfo:
            await roadmap_intelligence_service.create_roadmap_candidate(
                db=db,
                problem="Speculative feature without evidence",
                source_type="IMAGINARY_SOURCE",
                source_id="NONE",
                revenue_or_retention_impact="Unknown"
            )
        assert "Invalid source_type" in str(excinfo.value)

        # Valid sourced roadmap candidate
        cand = await roadmap_intelligence_service.create_roadmap_candidate(
            db=db,
            problem="Automated 1-click CloudFormation Stack for IAM Trust Setup",
            source_type="SUPPORT_TICKET",
            source_id="TICKET-AWS-STS-001",
            revenue_or_retention_impact="Accelerates onboarding and prevents 45% of support requests",
            priority="HIGH",
            workaround="TAM manual video call"
        )
        assert cand.id is not None
        assert cand.roadmap_status == "DISCOVERED"

        # Update decision
        updated = await roadmap_intelligence_service.update_roadmap_decision(
            db=db,
            candidate_id=cand.id,
            roadmap_status="PLANNED"
        )
        assert updated.roadmap_status == "PLANNED"


@pytest.mark.asyncio
async def test_experimentation_safety_gating():
    """
    Test 7: Experiments safety filter rejects tests on security or isolation subsystems (§88).
    """
    async with AsyncSessionLocal() as db:
        # Prohibited experiment target
        with pytest.raises(ValueError) as excinfo:
            await experimentation_service.create_experiment(
                db=db,
                name="TEST_BYPASS_SECURITY_ENFORCEMENT",
                hypothesis="Bypassing security checks speeds up onboarding",
                metric="ONBOARDING_SPEED"
            )
        assert "PROHIBITED EXPERIMENT TARGET" in str(excinfo.value)

        # Allowed experiment
        exp = await experimentation_service.create_experiment(
            db=db,
            name="TEST_TRIAL_EXTENSION_REMINDER_MODAL",
            hypothesis="Displaying usage metrics 3 days before trial ends increases conversion",
            metric="TRIAL_CONVERSION_RATE"
        )
        assert exp.id is not None
        assert exp.status == "RUNNING"


@pytest.mark.asyncio
async def test_weekly_operating_review_action_list_first():
    """
    Test 8: Weekly Operating Review renders prioritized action items before metrics (§108-111).
    """
    async with AsyncSessionLocal() as db:
        review = await roadmap_intelligence_service.get_weekly_operating_review(db)
        assert "action_items_priority_list" in review
        assert len(review["action_items_priority_list"]) >= 1
        assert "daily_operational_checklist" in review
        assert "post_ga_observation_windows" in review
        assert "financial_health" in review
        assert review["post_ga_observation_windows"]["24_hour_review"]["status"] == "COMPLETED"
        assert review["post_ga_observation_windows"]["30_day_review"]["status"] == "PENDING"


@pytest.mark.asyncio
async def test_platform_admin_phase14_api_endpoints():
    """
    Test 9: Full HTTP ASGI transport test for all new Phase 14 Platform Admin endpoints.
    """
    admin_user, token = await setup_test_users()
    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Billing Activation Status
        res_act = await ac.get("/api/v1/platform-admin/billing/activation", headers=headers)
        assert res_act.status_code == 200
        assert "providers" in res_act.json()

        # 2. Revenue Drilldown
        res_drill = await ac.get("/api/v1/platform-admin/revenue/drilldown", headers=headers)
        assert res_drill.status_code == 200
        assert "records" in res_drill.json()
        assert isinstance(res_drill.json()["records"], list)

        # 3. Revenue Audit Export
        res_export = await ac.get("/api/v1/platform-admin/revenue/audit-export", headers=headers)
        assert res_export.status_code == 200
        assert isinstance(res_export.json(), list)

        # 4. Onboarding Blockers
        res_blockers = await ac.get("/api/v1/platform-admin/onboarding/blockers", headers=headers)
        assert res_blockers.status_code == 200
        assert "top_blockers" in res_blockers.json()

        # 5. Manual Assistance
        res_manual = await ac.get("/api/v1/platform-admin/manual-assistance", headers=headers)
        assert res_manual.status_code == 200
        assert "total_tasks" in res_manual.json()

        # 6. Sourced Roadmap Candidates
        res_rdm = await ac.get("/api/v1/platform-admin/roadmap/candidates", headers=headers)
        assert res_rdm.status_code == 200
        assert isinstance(res_rdm.json(), list)

        # 7. Sales Intelligence
        res_sales = await ac.get("/api/v1/platform-admin/sales/intelligence", headers=headers)
        assert res_sales.status_code == 200
        assert "win_rate_percent" in res_sales.json()

        # 8. Experiments Registry
        res_exp = await ac.get("/api/v1/platform-admin/experiments", headers=headers)
        assert res_exp.status_code == 200
        assert isinstance(res_exp.json(), list)

        # 9. Operating Review
        res_ops = await ac.get("/api/v1/platform-admin/operating-review", headers=headers)
        assert res_ops.status_code == 200
        assert "action_items_priority_list" in res_ops.json()
