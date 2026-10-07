"""Phase 13 GA Market Launch, Revenue Activation, First 10 Customers & Sales Operations Test Suite."""
import pytest
import json
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.models.auth import User, Organization, OrganizationMembership, MembershipRole
from app.models.billing import Subscription, SubscriptionStatus, Invoice, BillingProviderType
from app.models.application import Application, AppStatus
from app.models.crm import Lead, Opportunity, ServiceQuote, ServiceOrder, LeadStatus, OpportunityStage
from app.models.production_launch import CustomerAcceptance, CustomerFeedback, ProviderPriceMapping
from app.services.commercial.production_launch_service import production_launch_service
from app.services.commercial.pricing_catalog_service import pricing_catalog_service
from app.services.commercial.first_customer_service import first_customer_service
from app.services.commercial.customer_success_analytics_service import customer_success_analytics_service
from app.services.commercial.email_delivery_service import email_delivery_service
from app.services.commercial.crm_services_service import crm_services_service


async def get_or_create_admin_and_customer():
    """Helper to provision test admin and initial customer."""
    async with AsyncSessionLocal() as session:
        # 1. Admin User
        admin_res = await session.execute(select(User).where(User.email == "ga-admin@launchcomply.io"))
        admin_user = admin_res.scalars().first()
        if not admin_user:
            admin_user = User(
                email="ga-admin@launchcomply.io",
                hashed_password=get_password_hash("AdminPass123!"),
                full_name="GA Release Platform Admin",
                is_active=True,
                is_platform_admin=True,
                email_verified=True,
            )
            session.add(admin_user)
            await session.flush()

        # 2. Customer Org
        org_res = await session.execute(select(Organization).where(Organization.slug == "first10-alpha-cust"))
        customer_org = org_res.scalars().first()
        if not customer_org:
            customer_org = Organization(
                name="First10 Alpha Customer Pvt Ltd",
                slug="first10-alpha-cust",
                tier="growth",
                is_active=True,
                is_demo=False,
                aws_monthly_budget="₹60,000"
            )
            session.add(customer_org)
            await session.flush()

            # Membership
            membership = OrganizationMembership(
                user_id=admin_user.id,
                organization_id=customer_org.id,
                role=MembershipRole.OWNER,
                is_active=True,
            )
            session.add(membership)

            # Application
            app_model = Application(
                name="Alpha SaaS Core API",
                slug=f"alpha-api-{customer_org.id[:6]}",
                repo_url="https://github.com/first10/alpha-api",
                organization_id=customer_org.id,
                status=AppStatus.HEALTHY
            )
            session.add(app_model)

            # Subscription
            sub = Subscription(
                organization_id=customer_org.id,
                plan_tier="GROWTH",
                status=SubscriptionStatus.ACTIVE,
                billing_provider=BillingProviderType.RAZORPAY,
                amount=19999.00,
                currency="INR",
                interval="MONTHLY",
                current_period_start=datetime.utcnow(),
                current_period_end=datetime.utcnow() + timedelta(days=30),
            )
            session.add(sub)
            await session.commit()

        token = create_access_token(admin_user.id)
        return admin_user, customer_org, token


@pytest.mark.asyncio
async def test_reality_matrix_and_external_provider_status():
    """Verifies that all 18 external providers are present and none are marked false green (§6–8)."""
    async with AsyncSessionLocal() as session:
        matrix = await production_launch_service.get_provider_status_matrix(session)
        assert len(matrix) >= 18

        provider_names = [p["provider"] for p in matrix]
        assert "PostgreSQL Database Engine" in provider_names
        assert "Stripe Payments & Checkout" in provider_names
        assert "Razorpay Payments & Subscriptions" in provider_names
        assert "AWS SES / Transactional Email" in provider_names
        assert "AWS STS & ECS Deployment Engine" in provider_names
        assert "Security Scanning & VAPT Engine" in provider_names

        # Verify no unconfigured provider is marked LIVE
        for p in matrix:
            if "Stripe" in p["provider"]:
                assert p["status"] in ["SIMULATED", "AWAITING_CREDENTIALS", "CONNECTED"]
            if "Razorpay" in p["provider"]:
                assert p["status"] in ["SIMULATED", "AWAITING_CREDENTIALS", "CONNECTED"]


@pytest.mark.asyncio
async def test_canonical_pricing_catalog_parity():
    """Verifies canonical pricing catalog parity across tiers and frequencies (§11, §12)."""
    catalog = pricing_catalog_service.get_canonical_catalog()
    assert len(catalog) >= 4

    tiers = [p["tier"].value for p in catalog]
    assert "STARTER" in tiers
    assert "GROWTH" in tiers
    assert "BUSINESS" in tiers
    assert "ENTERPRISE" in tiers

    # Starter pricing check
    starter = next(p for p in catalog if p["tier"].value == "STARTER")
    inr_price = next(pr for pr in starter["prices"] if pr["currency"] == "INR" and pr["interval"].value == "MONTHLY")
    assert inr_price["amount"] == 4999.00


@pytest.mark.asyncio
async def test_price_mismatch_blocker():
    """Verifies Price Mismatch Blocker prevents invalid or unmapped checkouts (§14)."""
    async with AsyncSessionLocal() as session:
        # Non-existent tier
        is_valid, err = await pricing_catalog_service.validate_checkout_price_mapping(
            session, plan_tier="HYPER_SCALE_INVALID", currency="INR"
        )
        assert is_valid is False
        assert "does not exist" in err


@pytest.mark.asyncio
async def test_financial_separation_live_test_demo():
    """Verifies that MRR and ARR queries strictly separate LIVE, TEST, and DEMO revenues (§16, §110)."""
    await get_or_create_admin_and_customer()
    async with AsyncSessionLocal() as session:
        # Create a demo org to verify quarantine
        demo_slug = f"demo-org-{int(datetime.utcnow().timestamp())}"
        demo_org = Organization(
            name="Demo Showcase Org",
            slug=demo_slug,
            tier="growth",
            is_active=True,
            is_demo=True
        )
        session.add(demo_org)
        await session.flush()

        demo_sub = Subscription(
            organization_id=demo_org.id,
            plan_tier="GROWTH",
            status=SubscriptionStatus.ACTIVE,
            billing_provider=BillingProviderType.STRIPE,
            amount=19999.00,
            currency="INR",
            interval="MONTHLY",
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30),
        )
        session.add(demo_sub)
        await session.commit()

        rev = await customer_success_analytics_service.get_revenue_dashboard(session)
        assert "summary" in rev
        assert "environment_breakdown" in rev

        # Verify demo MRR is separated
        breakdown = rev["environment_breakdown"]
        assert "live" in breakdown
        assert "test" in breakdown
        assert "demo" in breakdown
        assert breakdown["demo"]["mrr"] >= 19999.00


@pytest.mark.asyncio
async def test_primary_activation_funnel():
    """Verifies primary activation funnel and time-to-value telemetry (§25–29)."""
    await get_or_create_admin_and_customer()
    async with AsyncSessionLocal() as session:
        funnel = await customer_success_analytics_service.get_activation_funnel(session)
        assert funnel["primary_activation_event"] == "FIRST_PRODUCTION_ARCHITECTURE_GENERATED"
        assert funnel["north_star_metric"] == "APPLICATIONS_REACHING_PRODUCTION_READINESS"
        assert len(funnel["steps"]) >= 7

        ttv = await customer_success_analytics_service.get_time_to_value_metrics(session)
        assert "signup_to_architecture_minutes" in ttv
        assert "signup_to_first_deployment_hours" in ttv


@pytest.mark.asyncio
async def test_first_10_customers_program():
    """Verifies First 10 Customer stage tracking and success criteria (§32–36)."""
    admin_user, customer_org, _ = await get_or_create_admin_and_customer()
    async with AsyncSessionLocal() as session:
        customers = await first_customer_service.list_first_customers(session)
        assert len(customers) >= 1

        target_cust = next((c for c in customers if c["id"] == customer_org.id), customers[0])
        assert "stage" in target_cust
        assert "success_criteria" in target_cust

        # Update stage
        updated = await first_customer_service.update_customer_stage(
            db=session,
            organization_id=target_cust["id"],
            stage="SECURITY_BASELINE",
            next_action="Run initial automated VAPT scan",
            internal_owner="Security Lead"
        )
        assert updated["stage"] == "SECURITY_BASELINE"
        assert updated["next_action"] == "Run initial automated VAPT scan"


@pytest.mark.asyncio
async def test_crm_qualified_demo_request():
    """Verifies public demo request creates qualified Lead and active Opportunity (§42–44)."""
    async with AsyncSessionLocal() as session:
        res = await crm_services_service.create_demo_request(
            db=session,
            name="Siddharth Mehta",
            email="siddharth@cloudmatrix.in",
            company="CloudMatrix Technologies",
            source="BOOK_DEMO",
            use_case="AWS Production Deployment & SOC 2",
            company_size="11-50",
            desired_compliance="SOC 2 Readiness"
        )
        assert res["status"] == "SUCCESS"
        assert "lead_id" in res
        assert "opportunity_id" in res

        # Verify in DB
        lead_res = await session.execute(select(Lead).where(Lead.id == res["lead_id"]))
        lead = lead_res.scalars().first()
        assert lead is not None
        assert lead.company == "CloudMatrix Technologies"

        opp_res = await session.execute(select(Opportunity).where(Opportunity.id == res["opportunity_id"]))
        opp = opp_res.scalars().first()
        assert opp is not None
        assert opp.stage == OpportunityStage.NEW


@pytest.mark.asyncio
async def test_standardized_proposal_templates():
    """Verifies all 7 standardized enterprise service proposal templates exist (§50, §51)."""
    templates = crm_services_service.get_proposal_templates()
    assert len(templates) == 7

    template_ids = [t["template_id"] for t in templates]
    assert "SAAS_SUBSCRIPTION" in template_ids
    assert "AWS_DEPLOYMENT" in template_ids
    assert "VAPT" in template_ids
    assert "ISO_27001_READINESS" in template_ids
    assert "SOC_2_READINESS" in template_ids
    assert "MANAGED_COMPLIANCE" in template_ids
    assert "MANAGED_CLOUD" in template_ids

    # Verify structured fields
    for t in templates:
        assert "problem" in t
        assert "scope" in t
        assert "deliverables" in t
        assert "timeline" in t
        assert "price_guidance" in t
        assert "terms" in t


@pytest.mark.asyncio
async def test_transactional_email_delivery_health():
    """Verifies transactional email delivery metrics and domain records (§17–19)."""
    async with AsyncSessionLocal() as session:
        health = await email_delivery_service.get_email_health(session)
        assert "status" in health
        assert "delivery_rate_percent" in health
        assert "domain_health" in health
        assert health["domain_health"]["spf_status"] in ["PASS", "SIMULATED_VALID"]
        assert health["domain_health"]["dkim_status"] in ["PASS", "SIMULATED_VALID"]


@pytest.mark.asyncio
async def test_customer_success_tasks_and_health():
    """Verifies customer success task creation and explainable health evaluations (§62–65)."""
    _, customer_org, _ = await get_or_create_admin_and_customer()
    async with AsyncSessionLocal() as session:
        health = await customer_success_analytics_service.evaluate_customer_health(session, customer_org.id)
        assert health.health_score > 0
        assert health.status.value in ["HEALTHY", "NEEDS_ATTENTION", "AT_RISK"]

        cs_overview = await customer_success_analytics_service.get_customer_success_overview(session)
        assert "healthy_count" in cs_overview
        assert "at_risk_count" in cs_overview


@pytest.mark.asyncio
async def test_cancellation_feedback_flow():
    """Verifies structured cancellation feedback capture (§70)."""
    _, _, token = await get_or_create_admin_and_customer()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/commercial/feedback/cancellation",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "reason": "Missing feature",
                "feedback": "Need multi-region Azure support in addition to AWS.",
                "competitor_name": "None"
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "RECORDED"


@pytest.mark.asyncio
async def test_platform_admin_ga_status_endpoint():
    """Verifies /platform-admin/ga/status consolidates release gates, providers, and reality decision."""
    _, _, token = await get_or_create_admin_and_customer()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(
            "/api/v1/platform-admin/ga/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["release"]["version"] == settings.VERSION
        assert data["release"]["security_scan"] == "UNVERIFIED"
        assert data["release"]["e2e_result"] == "UNVERIFIED"
        assert len(data["providers_matrix"]) >= 18
        assert data["go_no_go_decision"] == "NO_GO"
