"""Phase 8 Commercial SaaS FastAPI Router (Catalog, Billing, Invoices, Usage, Invitations, Support, CRM)."""
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime, timezone, timedelta
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.permissions import get_current_membership, get_current_user, require_permission
from app.core.audit import log_audit_event
from app.models.auth import User, OrganizationMembership
from app.models.billing import BillingProviderType
from app.models.support import TicketCategory, TicketPriority
from app.models.connectors import ConnectorType
from app.core.config import settings
from app.schemas.commercial import (
    CheckoutRequest,
    PlanChangeRequest,
    UsageRecordRequest,
    InviteMemberRequest,
    AcceptInviteRequest,
    EmailVerifyRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    TicketCreateRequest,
    TicketMessageRequest,
    LeadCreateRequest,
    ServiceQuoteRequest,
    AuditorCommentRequest,
    ConnectorSyncRequest,
    DemoRequestSchema,
    CancellationFeedbackRequest,
)
from app.services.commercial.catalog_entitlements_service import catalog_entitlements_service
from app.services.commercial.subscription_service import subscription_service
from app.services.commercial.usage_service import usage_service
from app.services.commercial.invoice_service import invoice_service
from app.services.commercial.onboarding_invitation_service import onboarding_invitation_service
from app.services.commercial.support_service import support_service
from app.services.commercial.crm_services_service import crm_services_service
from app.services.commercial.connectors_auditor_service import connectors_auditor_service
from app.services.commercial.customer_success_analytics_service import customer_success_analytics_service


router = APIRouter(prefix="/commercial", tags=["Commercial SaaS"])


# ============================================================================
# 1. Product Catalog & Public Plans
# ============================================================================

@router.get("/plans")
async def list_plans(db: AsyncSession = Depends(get_db)):
    """Public catalog of subscription plans and entitlements."""
    return await catalog_entitlements_service.list_plans(db)


# ============================================================================
# 2. Billing & Subscriptions
# ============================================================================

@router.get("/subscription")
async def get_subscription(
    membership: OrganizationMembership = Depends(require_permission("billing.read")),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves active subscription, plan tier, and trial dates for the organization."""
    return await subscription_service.get_or_create_subscription(db, membership.organization_id)


@router.post("/checkout")
async def create_checkout(
    payload: CheckoutRequest,
    membership: OrganizationMembership = Depends(require_permission("billing.manage")),
    db: AsyncSession = Depends(get_db)
):
    """Initiates tokenized billing provider checkout session."""
    # Price Mismatch Blocker (§14)
    from app.services.commercial.pricing_catalog_service import pricing_catalog_service
    is_valid, error_msg = await pricing_catalog_service.validate_checkout_price_mapping(
        db=db,
        plan_tier=payload.plan_tier,
        currency=payload.currency,
        interval="MONTHLY",
        provider=payload.provider
    )
    if not is_valid and (settings.ENABLE_REAL_STRIPE or settings.ENABLE_REAL_RAZORPAY):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Price Mismatch Blocker: {error_msg} Live activation blocked."
        )

    provider_enum = BillingProviderType.RAZORPAY if payload.provider.upper() == "RAZORPAY" else BillingProviderType.STRIPE
    session_data = await subscription_service.initiate_checkout(
        db=db,
        organization_id=membership.organization_id,
        target_tier=payload.plan_tier,
        currency=payload.currency,
        provider_type=provider_enum
    )
    actor_email = getattr(membership.user, "email", "billing@launchcomply.io") if membership.user else "billing@launchcomply.io"
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="CHECKOUT_INITIATED",
        entity_type="subscription",
        entity_id=membership.organization_id,
        details={"plan_tier": payload.plan_tier, "provider": payload.provider}
    )
    return session_data


@router.post("/change-plan")
async def change_plan(
    payload: PlanChangeRequest,
    membership: OrganizationMembership = Depends(require_permission("billing.manage")),
    db: AsyncSession = Depends(get_db)
):
    """Changes plan tier with safety verification against resource overages."""
    try:
        res = await subscription_service.change_plan(db, membership.organization_id, payload.target_tier)
        actor_email = getattr(membership.user, "email", "billing@launchcomply.io") if membership.user else "billing@launchcomply.io"
        await log_audit_event(
            db=db,
            organization_id=membership.organization_id,
            actor_id=membership.user_id,
            actor_email=actor_email,
            action="PLAN_CHANGED",
            entity_type="subscription",
            entity_id=membership.organization_id,
            details={"new_tier": payload.target_tier}
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cancel")
async def cancel_subscription(
    immediate: bool = False,
    membership: OrganizationMembership = Depends(require_permission("billing.manage")),
    db: AsyncSession = Depends(get_db)
):
    """Cancels subscription. Customer production and AWS resources are never deleted automatically."""
    res = await subscription_service.cancel_subscription(db, membership.organization_id, immediate=immediate)
    actor_email = getattr(membership.user, "email", "billing@launchcomply.io") if membership.user else "billing@launchcomply.io"
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="SUBSCRIPTION_CANCELLED",
        entity_type="subscription",
        entity_id=membership.organization_id,
        details={"immediate": immediate}
    )
    return res


@router.get("/invoices")
async def list_invoices(
    membership: OrganizationMembership = Depends(require_permission("billing.read")),
    db: AsyncSession = Depends(get_db)
):
    """Lists historical tax invoices."""
    return await invoice_service.list_invoices(db, membership.organization_id)


@router.get("/gst-preview")
async def get_gst_preview(
    membership: OrganizationMembership = Depends(require_permission("billing.read")),
    db: AsyncSession = Depends(get_db)
):
    """Read-only GSTR-1 format invoice tax breakdown preview."""
    return await invoice_service.get_gst_reconciliation_preview(db, membership.organization_id)


# ============================================================================
# 3. Webhooks (Stripe & Razorpay)
# ============================================================================

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db)
):
    """Handles verified Stripe billing webhooks."""
    payload = await request.body()
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET
    try:
        return await subscription_service.process_webhook(
            db=db,
            provider_type=BillingProviderType.STRIPE,
            raw_payload=payload,
            signature_header=stripe_signature or "",
            webhook_secret=webhook_secret
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhooks/razorpay")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None, alias="X-Razorpay-Signature"),
    db: AsyncSession = Depends(get_db)
):
    """Handles verified Razorpay billing webhooks."""
    payload = await request.body()
    webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
    try:
        return await subscription_service.process_webhook(
            db=db,
            provider_type=BillingProviderType.RAZORPAY,
            raw_payload=payload,
            signature_header=x_razorpay_signature or "",
            webhook_secret=webhook_secret
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# 4. Usage Metering
# ============================================================================

@router.get("/usage")
async def get_usage(
    membership: OrganizationMembership = Depends(require_permission("usage.read")),
    db: AsyncSession = Depends(get_db)
):
    """Returns current monthly metered usage aggregate."""
    return await usage_service.get_current_usage(db, membership.organization_id)


@router.post("/usage/record")
async def record_usage(
    payload: UsageRecordRequest,
    membership: OrganizationMembership = Depends(require_permission("usage.read")),
    db: AsyncSession = Depends(get_db)
):
    """Records idempotent usage event."""
    try:
        return await usage_service.record_usage_event(
            db=db,
            organization_id=membership.organization_id,
            metric_key=payload.metric_key,
            quantity=payload.quantity,
            idempotency_key=payload.idempotency_key,
            source=payload.source
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# 5. Team Invitations & User Onboarding
# ============================================================================

@router.post("/invitations")
async def invite_member(
    payload: InviteMemberRequest,
    membership: OrganizationMembership = Depends(require_permission("team.invite")),
    db: AsyncSession = Depends(get_db)
):
    """Sends cryptographically hashed one-time team invitation."""
    inv = await onboarding_invitation_service.create_invitation(
        db=db,
        organization_id=membership.organization_id,
        email=payload.email,
        role=payload.role,
        invited_by_user_id=membership.user_id
    )
    actor_email = getattr(membership.user, "email", "team@launchcomply.io") if membership.user else "team@launchcomply.io"
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="INVITATION_SENT",
        entity_type="invitation",
        entity_id=inv["invitation_id"],
        details={"email": payload.email, "role": payload.role.value}
    )
    return inv


@router.post("/invitations/accept")
async def accept_invitation(
    payload: AcceptInviteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Binds authenticated user to inviting organization via invitation token."""
    try:
        res = await onboarding_invitation_service.accept_invitation(db, payload.token, current_user)
        await log_audit_event(
            db=db,
            organization_id=res["organization_id"],
            actor_id=current_user.id,
            actor_email=current_user.email,
            action="INVITATION_ACCEPTED",
            entity_type="organization_membership",
            entity_id=res["organization_id"],
            details={"role": res["role"]}
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/verify-email")
async def verify_email(
    payload: EmailVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """Confirms account email verification."""
    success = await onboarding_invitation_service.verify_email_token(db, payload.token)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired email verification token.")
    return {"status": "SUCCESS", "message": "Email address verified successfully."}


@router.post("/auth/request-password-reset")
async def request_password_reset(
    payload: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """Fail closed until a trusted reset-email delivery path is implemented."""
    # Never return a recovery token to the unauthenticated requesting caller.
    # The current service generates tokens but has no email dispatch. A uniform
    # failure avoids account enumeration and claiming instructions were sent.
    raise HTTPException(
        status_code=503,
        detail="Password reset email delivery is unavailable. Contact support.",
    )


@router.post("/auth/reset-password")
async def reset_password(
    payload: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """Applies new password using valid reset token."""
    success = await onboarding_invitation_service.reset_password_with_token(db, payload.token, payload.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token.")
    return {"status": "SUCCESS", "message": "Password updated successfully. You may now log in."}


@router.get("/onboarding")
async def get_onboarding(
    membership: OrganizationMembership = Depends(require_permission("organization.settings.manage")),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves onboarding progress and activation milestones."""
    return await onboarding_invitation_service.get_or_create_onboarding_state(db, membership.organization_id)


# ============================================================================
# 6. Support Ticketing & CRM
# ============================================================================

@router.get("/support/tickets")
async def list_support_tickets(
    membership: OrganizationMembership = Depends(require_permission("support.read")),
    db: AsyncSession = Depends(get_db)
):
    """Lists customer support tickets for this organization."""
    return await support_service.list_tickets(db, organization_id=membership.organization_id)


@router.post("/support/tickets")
async def create_support_ticket(
    payload: TicketCreateRequest,
    membership: OrganizationMembership = Depends(require_permission("support.create")),
    db: AsyncSession = Depends(get_db)
):
    """Creates a new support ticket with SLA countdown."""
    user = membership.user
    ticket = await support_service.create_ticket(
        db=db,
        organization_id=membership.organization_id,
        user_id=membership.user_id,
        user_email=getattr(user, "email", "customer@launchcomply.io") if user else "customer@launchcomply.io",
        user_name=getattr(user, "full_name", "Customer User") if user else "Customer User",
        title=payload.title,
        category=payload.category,
        priority=payload.priority,
        initial_message=payload.message
    )
    actor_email = getattr(user, "email", "customer@launchcomply.io") if user else "customer@launchcomply.io"
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="SUPPORT_TICKET_CREATED",
        entity_type="support_ticket",
        entity_id=ticket.id,
        details={"ticket_number": ticket.ticket_number, "priority": ticket.priority.value}
    )
    return ticket


@router.post("/support/tickets/{id}/messages")
async def add_support_message(
    id: str,
    payload: TicketMessageRequest,
    membership: OrganizationMembership = Depends(require_permission("support.create")),
    db: AsyncSession = Depends(get_db)
):
    """Replies to an existing support ticket."""
    user = membership.user
    return await support_service.add_message(
        db=db,
        ticket_id=id,
        sender_id=membership.user_id,
        sender_email=getattr(user, "email", "customer@launchcomply.io") if user else "customer@launchcomply.io",
        sender_name=getattr(user, "full_name", "Customer User") if user else "Customer User",
        content=payload.content,
        is_internal=False
    )


@router.post("/crm/leads")
async def create_crm_lead(
    payload: LeadCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Public lead capture endpoint for website demo and consultation requests."""
    await check_inquiry_capacity(db, str(payload.email).lower())
    lead = await crm_services_service.create_lead(
        db=db,
        name=payload.name,
        email=payload.email,
        company=payload.company,
        phone=payload.phone,
        source=payload.source,
        notes=payload.notes,
        estimated_value=payload.estimated_value
    )
    return {"status": "SUCCESS", "lead_id": lead.id, "message": "Request saved in the operations inbox."}


async def check_inquiry_capacity(db, email):
    from app.models.crm import Lead
    email = str(email).strip().lower()
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    recent = [Lead.created_at >= since]
    count = (await db.execute(select(func.count()).select_from(Lead).where(*recent, Lead.email == email))).scalar_one()
    total = (await db.execute(select(func.count()).select_from(Lead).where(*recent))).scalar_one()
    if count >= 3 or total >= 200:
        raise HTTPException(429, "The consultation inbox is receiving too many requests. Please try again later.", headers={"Retry-After": "3600"})


class ConsultationRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    request_id: UUID
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr = Field(max_length=255)
    company: str = Field(min_length=2, max_length=160)
    interest: Literal["ARCHITECTURE", "DEPLOYMENT", "SECURITY", "COMPLIANCE", "CLOUD_OPERATIONS"]
    message: str = Field(min_length=10, max_length=1000)
    contact_permission: Literal[True]
    website: str = Field(default="", max_length=255)
    source_page: Literal["CONTACT", "AGENCIES"] = "CONTACT"
    business_type: Literal["UNSPECIFIED", "AGENCY", "FOUNDER", "TEAM"] = "UNSPECIFIED"
    timeline: Literal["UNSPECIFIED", "WITHIN_30_DAYS", "WITHIN_60_DAYS", "LATER", "EXPLORING"] = "UNSPECIFIED"
    aws_status: Literal["UNSPECIFIED", "EXISTING_ACCOUNT", "NO_ACCOUNT", "UNDECIDED"] = "UNSPECIFIED"


@router.post("/consultations", status_code=201)
async def request_consultation(payload: ConsultationRequest, db: AsyncSession = Depends(get_db)):
    """Save an inquiry, not an engagement, assessment, payment or email delivery."""
    from app.models.crm import Lead, LeadStatus
    # The extra website field is never visible to human visitors.
    if payload.website:
        return {"status": "SAVED", "reference": str(payload.request_id)}
    email = str(payload.email).lower()
    notes = f"Interest: {payload.interest}\nPermission to contact about this inquiry: recorded\n{payload.message}"
    qualification = []
    if payload.source_page != "CONTACT": qualification.append(f"Source page: {payload.source_page}")
    for label, value in (("Business type", payload.business_type), ("Timeline", payload.timeline), ("AWS account", payload.aws_status)):
        if value != "UNSPECIFIED": qualification.append(f"{label}: {value}")
    if qualification: notes += "\n\n" + "\n".join(qualification)
    async def existing_result():
        existing = await db.get(Lead, str(payload.request_id))
        if not existing:
            return None
        if (existing.source, existing.name, existing.email, existing.company, existing.notes) != (
                "WEBSITE_CONSULTATION", payload.name, email, payload.company, notes):
            raise HTTPException(409, "This request reference has already been used. Refresh the form before submitting a different inquiry.")
        return {"status": "SAVED", "reference": existing.id}
    result = await existing_result()
    if result:
        return result
    await check_inquiry_capacity(db, email)
    lead = Lead(id=str(payload.request_id), name=payload.name, email=email, company=payload.company,
        source="WEBSITE_CONSULTATION", status=LeadStatus.NEW, estimated_value=0, notes=notes)
    db.add(lead)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        result = await existing_result()
        if result:
            return result
        raise
    return {"status": "SAVED", "reference": lead.id}


@router.post("/services/quotes")
async def create_service_quote(
    payload: ServiceQuoteRequest,
    membership: OrganizationMembership = Depends(require_permission("billing.manage")),
    db: AsyncSession = Depends(get_db)
):
    """Creates a commercial quote for professional advisory services."""
    quote = await crm_services_service.create_service_quote(
        db=db,
        organization_id=membership.organization_id,
        service_name=payload.service_name,
        scope_description=payload.scope_description,
        deliverables_description=payload.deliverables_description,
        subtotal=payload.subtotal,
        tax_amount=payload.tax_amount,
        currency=payload.currency
    )
    actor_email = getattr(membership.user, "email", "billing@launchcomply.io") if membership.user else "billing@launchcomply.io"
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="SERVICE_QUOTE_SENT",
        entity_type="service_quote",
        entity_id=quote.id,
        details={"quote_number": quote.quote_number, "total_amount": quote.total_amount}
    )
    return quote


@router.post("/services/quotes/{id}/accept")
async def accept_service_quote(
    id: str,
    membership: OrganizationMembership = Depends(require_permission("billing.manage")),
    db: AsyncSession = Depends(get_db)
):
    """Accepts a commercial quote and generates a ServiceOrder."""
    try:
        order = await crm_services_service.accept_service_quote(db, id, membership.organization_id)
        actor_email = getattr(membership.user, "email", "billing@launchcomply.io") if membership.user else "billing@launchcomply.io"
        await log_audit_event(
            db=db,
            organization_id=membership.organization_id,
            actor_id=membership.user_id,
            actor_email=actor_email,
            action="SERVICE_ORDER_CREATED",
            entity_type="service_order",
            entity_id=order.id,
            details={"order_number": order.order_number, "service_name": order.service_name}
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# 7. Connectors & Auditor Collaboration
# ============================================================================

@router.post("/connectors/sync")
async def sync_evidence_connector(
    payload: ConnectorSyncRequest,
    membership: OrganizationMembership = Depends(require_permission("compliance.control.manage")),
    db: AsyncSession = Depends(get_db)
):
    """Executes read-only automated evidence sync."""
    return await connectors_auditor_service.sync_connector(db, membership.organization_id, payload.connector_type)


@router.post("/auditor/comments")
async def add_auditor_comment(
    payload: AuditorCommentRequest,
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db)
):
    """Auditor submits collaborative evidence review feedback or acceptance."""
    user = membership.user
    author_name = getattr(user, "full_name", "Auditor") if user else "External Auditor"
    return await connectors_auditor_service.add_auditor_comment(
        db=db,
        organization_id=membership.organization_id,
        evidence_request_id=payload.evidence_request_id,
        evidence_id=payload.evidence_id,
        author_id=membership.user_id,
        author_name=author_name,
        comment=payload.comment,
        action=payload.action
    )


@router.get("/auditor/comments")
async def list_auditor_comments(
    evidence_request_id: Optional[str] = None,
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db)
):
    """Lists collaborative evidence comments."""
    return await connectors_auditor_service.list_auditor_comments(
        db, membership.organization_id, evidence_request_id=evidence_request_id
    )


# ============================================================================
# Phase 9: Tenant Data Export & Customer Feedback
# ============================================================================

from app.services.commercial.production_launch_service import production_launch_service


@router.get("/export")
async def export_organization_data(
    membership: OrganizationMembership = Depends(require_permission("billing.manage")),
    db: AsyncSession = Depends(get_db)
):
    """Generates an export of the organization's configuration, apps, security findings, and invoices."""
    export_payload = await production_launch_service.export_tenant_data(db, membership.organization_id)
    actor_email = getattr(membership.user, "email", "owner@launchcomply.io") if membership.user else "owner@launchcomply.io"
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="TENANT_DATA_EXPORTED",
        entity_type="organization",
        entity_id=membership.organization_id,
        details={"manifest_sha256": export_payload.get("manifest_sha256")}
    )
    return export_payload


@router.post("/feedback")
async def submit_feedback(
    category: str = "ONBOARDING",
    rating: Optional[int] = 5,
    comment: str = "",
    membership: OrganizationMembership = Depends(require_permission("billing.read")),
    db: AsyncSession = Depends(get_db)
):
    """Submits customer feedback for product improvements."""
    from app.models.production_launch import CustomerFeedback
    feedback = CustomerFeedback(
        organization_id=membership.organization_id,
        user_id=membership.user_id,
        category=category,
        rating=rating,
        comment=comment,
        release_version="1.0.0"
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback


# ============================================================================
# Phase 13: Demo Requests, Standardized Proposals, Cancellation Feedback
# ============================================================================

@router.post("/crm/demo-request")
async def create_qualified_demo_request(
    payload: DemoRequestSchema,
    db: AsyncSession = Depends(get_db)
):
    """Public lead capture for Book Demo and sales consultation requests (§42-44)."""
    await check_inquiry_capacity(db, str(payload.email))
    return await crm_services_service.create_demo_request(
        db=db,
        name=payload.name,
        email=payload.email,
        company=payload.company,
        phone=payload.phone,
        source=payload.source,
        use_case=payload.use_case,
        company_size=payload.company_size,
        cloud_provider=payload.cloud_provider,
        current_deployment=payload.current_deployment,
        desired_compliance=payload.desired_compliance,
        notes=payload.notes
    )


@router.get("/services/proposal-templates")
async def list_proposal_templates():
    """Standardized professional service proposal templates (§50, §51)."""
    return crm_services_service.get_proposal_templates()


@router.post("/feedback/cancellation")
async def submit_cancellation_feedback(
    payload: CancellationFeedbackRequest,
    membership: OrganizationMembership = Depends(require_permission("billing.manage")),
    db: AsyncSession = Depends(get_db)
):
    """Captures structured cancellation feedback for churn prevention (§70)."""
    from app.models.production_launch import CustomerFeedback
    structured_comment = f"Reason: {payload.reason} | Feedback: {payload.feedback}"
    if payload.competitor_name:
        structured_comment += f" | Competitor: {payload.competitor_name}"

    feedback = CustomerFeedback(
        organization_id=membership.organization_id,
        user_id=membership.user_id,
        category="CANCELLATION",
        rating=1,
        comment=structured_comment,
        release_version="1.0.0",
        status="NEW"
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return {
        "status": "RECORDED",
        "feedback_id": feedback.id,
        "message": "Cancellation feedback logged. We appreciate your transparency."
    }

