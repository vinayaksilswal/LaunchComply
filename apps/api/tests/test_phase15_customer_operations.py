"""Phase 15 Customer Operations, Real Revenue, AWS Onboarding & Wedge Discovery Tests.

Validates:
1. Customer Stage History tracking and non-destructive duration derivation (§6, §7).
2. Paid Customer Gate enforcement (6 strict conditions; rejecting demo, unverified, or unreconciled) (§9).
3. Bank Transfer Reconciliation with FirstPaymentEvent and PAID_ACTIVE classification (§10, §14, §97).
4. AWS Connection Wizard V2: CloudFormation template generation and least-privilege scoping (§24, §25, §34).
5. AWS STS Error Self-Diagnosis parser (INVALID_PRINCIPAL, WRONG_EXTERNAL_ID, ROLE_NOT_FOUND) (§30, §31).
6. Request Setup Help context packaging without secrets into Customer Success tasks (§37, §38).
7. Structured Customer Interviews logging and Product Wedge Analysis with sample size n (§45-57).
8. Pilot Commercial Decision enforcement (CONVERT, EXTEND with date/objective, CLOSE_LOST) (§89, §90).
9. Customer Operating Board & First 10 real-only isolation (§5, §61, §62).
10. Weekly Operating Review leading with TODAY'S ACTIONS (§4, §142).
11. Platform Admin Phase 15 API endpoints (§138).
"""
import pytest
import uuid
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.auth import User, Organization
from app.models.billing import (
    Subscription,
    SubscriptionStatus,
    Invoice,
    InvoiceStatus,
    Payment,
    PaymentStatus,
    PaymentRealityStatus,
    PaymentSource,
)
from app.models.customer_operations import (
    CustomerStage,
    InterviewType,
    OutcomeStatus,
    ProductWedge,
    PilotDecision,
    FirstPaymentEvent,
    CustomerStageHistory,
    CustomerInterview,
)
from app.services.commercial.customer_operations_service import customer_operations_service
from app.services.commercial.billing_activation_service import billing_activation_service
from app.services.commercial.roadmap_intelligence_service import roadmap_intelligence_service
from app.services.infrastructure.aws_onboarding import aws_onboarding_service, AWSOnboardingService
from sqlalchemy import select


async def setup_admin_user():
    async with AsyncSessionLocal() as session:
        unique_id = uuid.uuid4().hex[:8]
        admin_email = f"operator.p15.{unique_id}@launchcomply.io"
        admin = User(
            email=admin_email,
            hashed_password=get_password_hash("Password123!"),
            full_name="Phase 15 Operator",
            is_active=True,
            is_platform_admin=True,
        )
        session.add(admin)
        await session.commit()
        await session.refresh(admin)
        token = create_access_token(admin.id)
        return admin, token


@pytest.mark.asyncio
async def test_customer_stage_history_and_duration():
    """Test 1: Stage transitions are non-destructive, storing entered_at, exited_at, blocker and duration (§6, §7)."""
    async with AsyncSessionLocal() as db:
        unique_id = uuid.uuid4().hex[:8]
        # Create external prospect organization
        org = Organization(
            name="Alpha PayTech",
            slug=f"alpha-paytech-{unique_id}",
            is_demo=False,
            is_test=False,
            customer_classification="PROSPECT",
            commercial_state=CustomerStage.QUALIFIED.value,
            technical_owner="DevOps Lead",
            commercial_owner="Founding AE",
        )
        db.add(org)
        await db.commit()
        await db.refresh(org)

        # Transition 1: QUALIFIED -> AWS_ONBOARDING
        h1 = await customer_operations_service.transition_stage(
            db=db,
            organization_id=org.id,
            new_stage=CustomerStage.AWS_ONBOARDING.value,
            blocker="IAM AssumeRole Trust Policy Principal Mismatch",
            internal_owner="DevOps Lead",
            notes="Starting AWS CloudFormation setup with customer DevOps"
        )
        assert h1["stage"] == CustomerStage.AWS_ONBOARDING.value
        assert h1["blocker"] == "IAM AssumeRole Trust Policy Principal Mismatch"

        # Transition 2: AWS_ONBOARDING -> DEPLOYMENT_LIVE
        h2 = await customer_operations_service.transition_stage(
            db=db,
            organization_id=org.id,
            new_stage=CustomerStage.DEPLOYMENT_LIVE.value,
            internal_owner="DevOps Lead",
            notes="CloudFormation stack verified and production stack deployed"
        )
        assert h2["stage"] == CustomerStage.DEPLOYMENT_LIVE.value

        # Verify historical timeline
        history = await customer_operations_service.get_stage_history(db, org.id)
        assert len(history) >= 2
        stages_entered = [h["stage"] for h in history]
        assert CustomerStage.AWS_ONBOARDING.value in stages_entered
        assert CustomerStage.DEPLOYMENT_LIVE.value in stages_entered


@pytest.mark.asyncio
async def test_paid_customer_gate_enforcement():
    """Test 2: Paid Customer Gate rejects demo, unverified or unreconciled accounts (§9)."""
    async with AsyncSessionLocal() as db:
        unique_id = uuid.uuid4().hex[:8]
        # 1. Demo organization must fail the gate
        demo_org = Organization(
            name="Demo Corp",
            slug=f"demo-corp-{unique_id}",
            is_demo=True,
            is_test=False,
            customer_classification="DEMO",
            commercial_state=CustomerStage.PILOT_APPROVED.value
        )
        db.add(demo_org)
        await db.commit()
        await db.refresh(demo_org)

        gate_res = await customer_operations_service.verify_paid_customer_gate(db, demo_org.id)
        assert gate_res["gate_passed"] is False
        assert gate_res["conditions"]["1_real_external_organization"]["status"] == "FAIL"

        # 2. Real organization without reconciled payment must fail the gate
        real_org = Organization(
            name="FinCore Labs",
            slug=f"fincore-labs-{unique_id}",
            is_demo=False,
            is_test=False,
            customer_classification="PILOT_CUSTOMER",
            commercial_state=CustomerStage.PAYMENT_PENDING.value
        )
        db.add(real_org)
        await db.commit()
        await db.refresh(real_org)

        # Invoice exists but is OPEN (unreconciled)
        inv = Invoice(
            invoice_number=f"LC-INV-{unique_id}",
            organization_id=real_org.id,
            customer_legal_name="FinCore Labs Pvt Ltd",
            subtotal=49000.0,
            tax_amount=0.0,
            total_amount=49000.0,
            currency="INR",
            status=InvoiceStatus.OPEN,
            reality_status=PaymentRealityStatus.PENDING,
            payment_due_date=datetime.utcnow() + timedelta(days=15)
        )
        db.add(inv)
        await db.commit()

        gate_res_real = await customer_operations_service.verify_paid_customer_gate(db, real_org.id)
        assert gate_res_real["gate_passed"] is False
        assert gate_res_real["conditions"]["4_payment_reconciled"]["status"] == "FAIL"


@pytest.mark.asyncio
async def test_bank_transfer_reconciliation_and_first_payment():
    """Test 3: Bank transfer reconciliation creates FirstPaymentEvent and sets customer to PAID_ACTIVE (§10, §14, §97)."""
    async with AsyncSessionLocal() as db:
        admin_user, _ = await setup_admin_user()
        unique_id = uuid.uuid4().hex[:8]

        pilot_org = Organization(
            name="NeoScale Technologies",
            slug=f"neoscale-{unique_id}",
            is_demo=False,
            is_test=False,
            customer_classification="PILOT_CUSTOMER",
            commercial_state=CustomerStage.PAYMENT_PENDING.value,
            technical_owner="Operator",
            commercial_owner="Founding AE",
        )
        db.add(pilot_org)
        await db.commit()
        await db.refresh(pilot_org)

        # Create active subscription
        sub = Subscription(
            organization_id=pilot_org.id,
            plan_tier="GROWTH",
            current_period_end=datetime.utcnow() + timedelta(days=30),
            amount=79000.0,
            currency="INR",
            interval="MONTHLY",
            status=SubscriptionStatus.ACTIVE,
            is_real_payment_verified=False
        )
        db.add(sub)
        await db.commit()
        await db.refresh(sub)

        # Issue Invoice
        inv = Invoice(
            invoice_number=f"LC-INV-{unique_id}",
            organization_id=pilot_org.id,
            subscription_id=sub.id,
            customer_legal_name="NeoScale Technologies Pvt Ltd",
            subtotal=79000.0,
            tax_amount=0.0,
            total_amount=79000.0,
            currency="INR",
            status=InvoiceStatus.OPEN,
            reality_status=PaymentRealityStatus.PENDING,
            payment_due_date=datetime.utcnow() + timedelta(days=15)
        )
        db.add(inv)
        await db.commit()
        await db.refresh(inv)

        # Execute manual bank transfer reconciliation
        recon_result = await billing_activation_service.reconcile_invoice_payment(
            db=db,
            invoice_id=inv.id,
            amount_received=79000.0,
            reference_number="UTR-HDFC-9920144182",
            payment_source=PaymentSource.BANK_TRANSFER,
            received_at=datetime.utcnow(),
            verifier_id=admin_user.id,
            notes="Pilot payment received via direct NEFT/RTGS"
        )
        assert recon_result["status"] == "RECONCILED"
        assert recon_result["organization_classification"] == "PAID_CUSTOMER"
        assert recon_result["first_payment_event_recorded"] is True

        # Check FirstPaymentEvent
        fp_res = await db.execute(select(FirstPaymentEvent).where(FirstPaymentEvent.organization_id == pilot_org.id))
        fp = fp_res.scalar_one_or_none()
        assert fp is not None
        assert fp.amount == 79000.0
        assert fp.currency == "INR"
        assert fp.provider_reference == "UTR-HDFC-9920144182"
        assert fp.source == PaymentSource.BANK_TRANSFER.value

        # Refresh organization to verify retention status is PENDING and state is PAID_ACTIVE
        await db.refresh(pilot_org)
        assert pilot_org.customer_classification == "PAID_CUSTOMER"
        assert pilot_org.retention_status == "PENDING"  # Retention requires elapsed time (§96-98)


@pytest.mark.asyncio
async def test_aws_wizard_v2_cloudformation_template():
    """Test 4: CloudFormation Quick Setup template includes ExternalId condition and least-privilege policies (§24, §25)."""
    ext_id = AWSOnboardingService.generate_external_id("org-test-cfn-88")
    assert "launchcomply-ext-" in ext_id

    cfn = AWSOnboardingService.generate_cloudformation_template(ext_id)
    assert "AWSTemplateFormatVersion: '2010-09-09'" in cfn
    assert "sts:ExternalId" in cfn
    assert ext_id in cfn
    assert "AdministratorAccess" not in cfn  # Strict least privilege (§34)
    assert "LaunchComplyProvisioningRole" in cfn

    # Verify manual IAM config
    manual_config = AWSOnboardingService.get_manual_iam_config(ext_id)
    assert manual_config["role_name"] == "LaunchComplyCrossAccountAccessRole"
    assert manual_config["trust_policy"]["Statement"][0]["Condition"]["StringEquals"]["sts:ExternalId"] == ext_id


@pytest.mark.asyncio
async def test_aws_sts_error_diagnostics_parser():
    """Test 5: STS error parser translates raw AWS exceptions into human-friendly diagnostics with actionable fix steps (§30, §31)."""
    ext_id = "launchcomply-ext-sample-12345"

    # Test INVALID_PRINCIPAL
    res1 = AWSOnboardingService.parse_sts_error(
        "botocore.exceptions.ClientError: An error occurred (AccessDenied) when calling the AssumeRole operation: User is not authorized to perform: sts:AssumeRole on resource because principal is missing",
        expected_external_id=ext_id
    )
    assert res1["error_code"] == "INVALID_PRINCIPAL"
    assert "LaunchComply can see the role, but the Trust Policy does not allow our AWS account" in res1["human_friendly_message"]
    assert len(res1["fix_instructions"]) >= 3

    # Test WRONG_EXTERNAL_ID
    res2 = AWSOnboardingService.parse_sts_error(
        "ClientError: sts:AssumeRole AccessDenied externalId condition failed",
        expected_external_id=ext_id
    )
    assert res2["error_code"] == "WRONG_EXTERNAL_ID"
    assert "sts:ExternalId condition does not match" in res2["human_friendly_message"]

    # Test ROLE_NOT_FOUND
    res3 = AWSOnboardingService.parse_sts_error(
        "NoSuchEntity: The role with name LaunchComplyRole cannot be found",
        expected_external_id=ext_id
    )
    assert res3["error_code"] == "ROLE_NOT_FOUND"


@pytest.mark.asyncio
async def test_aws_request_setup_help_context_packaging():
    """Test 6: Request Setup Help creates customer success task with sanitized context without secrets (§37, §38)."""
    async with AsyncSessionLocal() as db:
        unique_id = uuid.uuid4().hex[:8]
        org = Organization(
            name="CloudSafe Bank",
            slug=f"cloudsafe-{unique_id}",
            is_demo=False,
            customer_classification="PILOT_CUSTOMER"
        )
        db.add(org)
        await db.commit()
        await db.refresh(org)

        help_res = await aws_onboarding_service.request_setup_help(
            db=db,
            organization_id=org.id,
            role_arn="arn:aws:iam::112233445566:role/LaunchComplyRole",
            failure_reason="INVALID_PRINCIPAL: Trust policy principal mismatch",
            last_validation_details={"status": "FAIL", "stage": "STS_ASSUME_ROLE"},
            notes="Customer DevOps lead requested assistance during afternoon sprint"
        )
        assert help_res["status"] == "DISPATCHED"
        assert help_res["context_package"]["sanitized"] is True
        assert "secrets" not in help_res["context_package"]
        assert help_res["context_package"]["role_arn"] == "arn:aws:iam::112233445566:role/LaunchComplyRole"


@pytest.mark.asyncio
async def test_customer_interviews_and_product_wedge_analysis():
    """Test 7: Structured empirical interview logging and product wedge analysis with sample size n (§45-57)."""
    async with AsyncSessionLocal() as db:
        unique_id = uuid.uuid4().hex[:8]
        org = Organization(
            name="SaaS Metrics Corp",
            slug=f"saas-metrics-{unique_id}",
            is_demo=False,
            customer_classification="PILOT_CUSTOMER",
            desired_outcome="Deploy safely to AWS and achieve ISO 27001 readiness for enterprise banks",
            target_date=datetime.utcnow() + timedelta(days=30),
            current_outcome_status=OutcomeStatus.IN_PROGRESS.value
        )
        db.add(org)
        await db.commit()
        await db.refresh(org)

        # Log an ONBOARDING interview
        iv = await customer_operations_service.log_customer_interview(
            db=db,
            organization_id=org.id,
            interview_type=InterviewType.ONBOARDING,
            date=datetime.utcnow(),
            participants=["CTO", "Lead DevOps", "LaunchComply Operator"],
            key_problem="AWS IAM STS Trust Policy setup takes 2 days without CloudFormation automation",
            value_driver="Integrated deployment + continuous ISO 27001 compliance proof",
            blocker="IAM permissions review by enterprise security team",
            notes="Customer loves the architecture compiler; needs automated CloudFormation deep link.",
            quote="If LaunchComply gives us a 1-click CloudFormation stack, we can onboard in 10 minutes.",
            permission_to_use_quote=True,
            conducted_by="Platform Admin"
        )
        assert iv["id"] is not None
        assert iv["interview_type"] == InterviewType.ONBOARDING.value

        # Evaluate Product Wedge Analysis
        wedge_res = await customer_operations_service.get_product_wedge_analysis(db)
        assert "product_wedges" in wedge_res
        assert wedge_res["sample_size_n"] >= 1
        assert "top_value_drivers" in wedge_res


@pytest.mark.asyncio
async def test_pilot_commercial_decision():
    """Test 8: Pilot commercial decision enforces CONVERT, EXTEND (with date/objective), or CLOSE_LOST (§89, §90)."""
    async with AsyncSessionLocal() as db:
        unique_id = uuid.uuid4().hex[:8]
        org = Organization(
            name="Trial Scale Inc",
            slug=f"trial-scale-{unique_id}",
            is_demo=False,
            customer_classification="PILOT_CUSTOMER"
        )
        db.add(org)
        await db.commit()
        await db.refresh(org)

        # Pilot extension requires new objective and decision date
        ext_date = datetime.utcnow() + timedelta(days=14)
        ext_res = await customer_operations_service.record_pilot_decision(
            db=db,
            organization_id=org.id,
            decision=PilotDecision.EXTEND,
            decision_date=ext_date,
            new_objective="Complete ISO 27001 evidence generation with auditor review",
            operator_notes="Customer security review team approved extension"
        )
        assert ext_res["decision"] == PilotDecision.EXTEND.value
        assert ext_res["new_objective"] == "Complete ISO 27001 evidence generation with auditor review"


@pytest.mark.asyncio
async def test_customer_operating_board_real_only_isolation():
    """Test 9: Customer Operating Board isolates genuine external accounts from seed/demo accounts (§5, §61, §62)."""
    async with AsyncSessionLocal() as db:
        board_data = await customer_operations_service.list_customer_board(db, real_only=True)
        assert isinstance(board_data, list)
        assert len(board_data) >= 1
        # Ensure no demo accounts are displayed in real_only mode
        for cust in board_data:
            assert cust["classification"] in ["PILOT_CUSTOMER", "PAID_CUSTOMER", "PROSPECT", "REAL_CUSTOMER"]


@pytest.mark.asyncio
async def test_weekly_operating_review_actions_first():
    """Test 10: Weekly Operating Review leads with TODAY'S ACTIONS across FinScale, billing, and leads (§4, §142)."""
    async with AsyncSessionLocal() as db:
        review = await roadmap_intelligence_service.get_weekly_operating_review(db)
        assert "todays_actions" in review
        assert len(review["todays_actions"]) >= 4
        # First action addresses FinScale or immediate blocker
        first_action = review["todays_actions"][0]
        assert "entity" in first_action
        assert "headline" in first_action
        assert "sections" in review
        assert "revenue" in review["sections"]
        assert "onboarding" in review["sections"]
        assert review["sections"]["onboarding"]["primary_blocker"] == "AWS IAM AssumeRole / STS Trust Policy Principal Mismatch"


@pytest.mark.asyncio
async def test_platform_admin_phase15_api_endpoints():
    """Test 11: End-to-end API route testing for Phase 15 Platform Admin endpoints."""
    _, token = await setup_admin_user()
    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Customer Operating Board
        resp = await ac.get("/api/v1/platform-admin/customers/board?real_only=true", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

        # 2. AWS CloudFormation Template generator
        resp_cfn = await ac.get("/api/v1/platform-admin/aws/cloudformation-template?external_id=test-ext-123", headers=headers)
        assert resp_cfn.status_code == 200
        cfn_data = resp_cfn.json()
        assert "template_yaml" in cfn_data
        assert "quick_create_url" in cfn_data

        # 3. AWS Manual IAM config
        resp_iam = await ac.get("/api/v1/platform-admin/aws/manual-iam-config?external_id=test-ext-123", headers=headers)
        assert resp_iam.status_code == 200
        assert "trust_policy" in resp_iam.json()

        # 4. AWS Failure Analytics
        resp_fa = await ac.get("/api/v1/platform-admin/aws/failure-analytics", headers=headers)
        assert resp_fa.status_code == 200
        assert "total_failure_events" in resp_fa.json()

        # 5. Product Wedge Analysis
        resp_pw = await ac.get("/api/v1/platform-admin/product-wedge-analysis", headers=headers)
        assert resp_pw.status_code == 200
        assert "product_wedges" in resp_pw.json()
