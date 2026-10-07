"""Phase 9 Production Launch, Provider Integration, Restore Rehearsals, Break-Glass, and Customer Acceptance Models."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum

from app.models.base import BaseModel


class WebhookProcessingStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"
    VERIFIED = "VERIFIED"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
    IGNORED = "IGNORED"


class BounceType(str, enum.Enum):
    PERMANENT_BOUNCE = "PERMANENT_BOUNCE"
    TRANSIENT_BOUNCE = "TRANSIENT_BOUNCE"
    COMPLAINT = "COMPLAINT"
    SUPPRESSION = "SUPPRESSION"


class LaunchGateCategory(str, enum.Enum):
    INFRASTRUCTURE = "INFRASTRUCTURE"
    SECURITY = "SECURITY"
    BILLING = "BILLING"
    EMAIL = "EMAIL"
    DATA = "DATA"
    SUPPORT = "SUPPORT"
    LEGAL = "LEGAL"
    COMPLIANCE = "COMPLIANCE"
    OPERATIONS = "OPERATIONS"


class LaunchGateSeverity(str, enum.Enum):
    BLOCKER = "BLOCKER"
    REQUIRED = "REQUIRED"
    WARNING = "WARNING"
    INFO = "INFO"


class LaunchGateStatus(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    WAIVED = "WAIVED"


class LaunchDecision(str, enum.Enum):
    GO = "GO"
    GO_WITH_WARNINGS = "GO_WITH_WARNINGS"
    NO_GO = "NO_GO"


class ProviderPriceMapping(BaseModel):
    """Maps internal catalog plans and billing frequencies to external Stripe/Razorpay price IDs."""
    __tablename__ = "production_provider_price_mappings"

    plan_tier = Column(String(50), nullable=False, index=True)  # STARTER, GROWTH, BUSINESS, ENTERPRISE
    billing_period = Column(String(20), default="MONTHLY", nullable=False)  # MONTHLY, ANNUAL
    currency = Column(String(10), default="INR", nullable=False)  # INR, USD
    provider = Column(String(50), nullable=False)  # STRIPE, RAZORPAY
    provider_product_id = Column(String(100), nullable=False)
    provider_price_id = Column(String(100), nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)


class PaymentWebhookEvent(BaseModel):
    """Persisted provider webhooks before business processing for replay safety and audit."""
    __tablename__ = "production_payment_webhook_events"

    provider = Column(String(50), nullable=False, index=True)  # STRIPE, RAZORPAY
    provider_event_id = Column(String(100), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    status = Column(Enum(WebhookProcessingStatus), default=WebhookProcessingStatus.RECEIVED, nullable=False, index=True)
    payload_hash = Column(String(64), nullable=False)
    error_message = Column(Text, nullable=True)
    processed_at = Column(DateTime, nullable=True)


class EmailBounceRecord(BaseModel):
    """Tracks email bounce and complaint suppression to protect deliverability."""
    __tablename__ = "production_email_bounces"

    recipient_email = Column(String(255), unique=True, nullable=False, index=True)
    bounce_type = Column(Enum(BounceType), default=BounceType.PERMANENT_BOUNCE, nullable=False)
    complaint_feedback = Column(Text, nullable=True)
    raw_message_id = Column(String(255), nullable=True)


class RestoreRehearsalRecord(BaseModel):
    """Evidence record for periodic non-destructive database backup restore verification."""
    __tablename__ = "production_restore_rehearsals"

    snapshot_id = Column(String(100), nullable=False)
    target_environment = Column(String(100), default="temporary_isolated_db", nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    rto_seconds = Column(Integer, nullable=True)
    validation_status = Column(String(50), default="IN_PROGRESS", nullable=False)  # SUCCESS, FAILED
    evidence_hash = Column(String(64), nullable=True)
    operator_id = Column(String(36), nullable=False)
    notes = Column(Text, nullable=True)


class BreakGlassAccessRecord(BaseModel):
    """Audited emergency break-glass privileged platform access session."""
    __tablename__ = "production_break_glass_access"

    admin_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    approved_by = Column(String(255), nullable=False)
    session_duration_minutes = Column(Integer, default=60, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    revoked_at = Column(DateTime, nullable=True)


class CustomerFeedback(BaseModel):
    """Post-onboarding customer feedback for continuous platform improvement."""
    __tablename__ = "production_customer_feedback"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    category = Column(String(100), default="ONBOARDING", nullable=False)  # ONBOARDING, DEPLOYMENT, BILLING, SUPPORT, COMPLIANCE
    rating = Column(Integer, nullable=True)  # 1 to 5
    comment = Column(Text, nullable=False)
    release_version = Column(String(50), default="1.0.0", nullable=False)
    status = Column(String(50), default="NEW", nullable=False)  # NEW, REVIEWED, ACTIONED
    source_type = Column(String(50), default="CUSTOMER_FEEDBACK", nullable=True)  # CUSTOMER_FEEDBACK, SUPPORT_TICKET, SALES_OBJECTION, TRIAL_DROPOFF, USAGE_ANALYTICS, PRODUCTION_INCIDENT, SECURITY_REQUIREMENT, COMPLIANCE_REQUIREMENT, REVENUE_OPPORTUNITY, OPERATIONAL_PROBLEM
    source_id = Column(String(100), nullable=True)
    revenue_or_retention_impact = Column(String(255), nullable=True)
    priority = Column(String(20), default="MEDIUM", nullable=True)  # LOW, MEDIUM, HIGH, URGENT
    workaround = Column(Text, nullable=True)
    roadmap_status = Column(String(50), default="DISCOVERED", nullable=True)  # DISCOVERED, VALIDATING, PLANNED, IN_PROGRESS, SHIPPED, DECLINED
    is_demo = Column(Boolean, default=False, nullable=False)


class CustomerAcceptance(BaseModel):
    """Formal sign-off of initial customer acceptance and go-live milestone."""
    __tablename__ = "production_customer_acceptance"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    application_id = Column(String(36), nullable=True)
    environment = Column(String(50), default="production", nullable=False)
    acceptance_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    validated_items_json = Column(Text, default="[]", nullable=False)
    open_items_json = Column(Text, default="[]", nullable=False)
    customer_contact = Column(String(255), nullable=False)
    internal_owner = Column(String(255), nullable=False)
    sign_off_status = Column(String(50), default="PENDING", nullable=False)  # PENDING, ACCEPTED, ACCEPTED_WITH_RESERVATIONS


class ProductionLaunchApproval(BaseModel):
    """Authoritative commercial launch decision record signed off by human platform leaders."""
    __tablename__ = "production_launch_approvals"

    version = Column(String(50), nullable=False, index=True)
    environment = Column(String(50), default="production", nullable=False)
    decision = Column(Enum(LaunchDecision), default=LaunchDecision.NO_GO, nullable=False, index=True)
    blockers_json = Column(Text, default="[]", nullable=False)
    warnings_json = Column(Text, default="[]", nullable=False)
    approved_by = Column(String(255), nullable=False)
    approved_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(Text, nullable=True)
