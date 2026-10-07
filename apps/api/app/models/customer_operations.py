"""Phase 15 Customer Operating Period, Stage History, Outcome Tracking and Interview Models."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class CustomerStage(str, enum.Enum):
    PROSPECT = "PROSPECT"
    QUALIFIED = "QUALIFIED"
    DEMO = "DEMO"
    PILOT_APPROVED = "PILOT_APPROVED"
    ACCOUNT_CREATED = "ACCOUNT_CREATED"
    REPO_CONNECTED = "REPO_CONNECTED"
    ARCHITECTURE_APPROVED = "ARCHITECTURE_APPROVED"
    AWS_ONBOARDING = "AWS_ONBOARDING"
    DEPLOYMENT_IN_PROGRESS = "DEPLOYMENT_IN_PROGRESS"
    DEPLOYMENT_LIVE = "DEPLOYMENT_LIVE"
    SECURITY_BASELINE = "SECURITY_BASELINE"
    VALUE_VALIDATED = "VALUE_VALIDATED"
    COMMERCIAL_COMMITMENT = "COMMERCIAL_COMMITMENT"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAYMENT_RECONCILED = "PAYMENT_RECONCILED"
    PAID_RETAINED = "PAID_RETAINED"
    AT_RISK = "AT_RISK"
    CHURNED = "CHURNED"


class InterviewType(str, enum.Enum):
    DISCOVERY = "DISCOVERY"
    ONBOARDING = "ONBOARDING"
    VALUE_VALIDATION = "VALUE_VALIDATION"
    CONVERSION = "CONVERSION"
    CHURN = "CHURN"


class OutcomeStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    ACHIEVED = "ACHIEVED"
    BLOCKED = "BLOCKED"
    AT_RISK = "AT_RISK"


class ProductWedge(str, enum.Enum):
    AWS_PRODUCTION_DEPLOYMENT = "AWS_PRODUCTION_DEPLOYMENT"
    SECURITY_VAPT = "SECURITY_VAPT"
    ISO27001_READINESS = "ISO27001_READINESS"
    SOC2_READINESS = "SOC2_READINESS"
    CONTINUOUS_ASSURANCE = "CONTINUOUS_ASSURANCE"
    INTEGRATED_DEPLOY_COMPLY = "INTEGRATED_DEPLOY_COMPLY"


class PaymentReadinessState(str, enum.Enum):
    AWAITING_CREDENTIALS = "AWAITING_CREDENTIALS"
    CONFIGURED = "CONFIGURED"
    TEST_VERIFIED = "TEST_VERIFIED"
    LIVE_TEST_REQUIRED = "LIVE_TEST_REQUIRED"
    LIVE_VERIFIED = "LIVE_VERIFIED"
    DEGRADED = "DEGRADED"
    DISABLED = "DISABLED"


class PilotDecision(str, enum.Enum):
    CONVERT = "CONVERT"
    EXTEND = "EXTEND"
    CLOSE_LOST = "CLOSE_LOST"


class CustomerStageHistory(BaseModel):
    """Historical progression through canonical customer stages (§7)."""
    __tablename__ = "customer_stage_history"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    stage = Column(String(50), nullable=False, index=True)
    entered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    exited_at = Column(DateTime, nullable=True)
    duration_days = Column(Float, nullable=True)
    blocker = Column(String(255), nullable=True)
    internal_owner = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)


class CustomerInterview(BaseModel):
    """Structured empirical customer interviews (§45-53). No AI fabrication."""
    __tablename__ = "customer_interviews"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    interview_type = Column(String(50), nullable=False, index=True)
    interview_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    participants = Column(String(255), nullable=False)
    key_problem = Column(Text, nullable=False)
    value_driver = Column(Text, nullable=False)
    blocker = Column(Text, nullable=True)
    quote = Column(Text, nullable=True)
    permission_to_use_quote = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)
    created_by = Column(String(255), default="Founder / CS Lead", nullable=False)


class FirstPaymentEvent(BaseModel):
    """Formal audit record of first production payment realization (§10, §93, §95)."""
    __tablename__ = "first_payment_events"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(String(36), ForeignKey("commercial_invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_id = Column(String(36), ForeignKey("commercial_payments.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String(50), nullable=False)  # STRIPE, RAZORPAY, BANK_TRANSFER
    currency = Column(String(10), default="INR", nullable=False)
    amount = Column(Float, nullable=False)
    reconciled_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    verified_by = Column(String(255), nullable=False)
    provider_reference = Column(String(150), nullable=False)
    is_mrr = Column(Boolean, default=False, nullable=False)


class CustomerDeploymentApproval(BaseModel):
    """Customer-authorized production deployment approval (§6, §7)."""
    __tablename__ = "customer_deployment_approvals"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(String(36), nullable=False, index=True)
    environment = Column(String(50), default="production", nullable=False)
    release_version = Column(String(50), nullable=False)
    architecture_version = Column(String(50), default="v1.0.0", nullable=False)
    infrastructure_plan_id = Column(String(100), nullable=False)
    plan_checksum = Column(String(64), nullable=False)
    estimated_monthly_cost = Column(String(50), default="₹55,000", nullable=False)
    approved_by_customer = Column(String(255), nullable=False)
    customer_contact_email = Column(String(255), nullable=False)
    customer_role = Column(String(100), default="CTO", nullable=False)
    approved_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    scope = Column(String(100), default="CUSTOMER_PRODUCTION", nullable=False)
    status = Column(String(50), default="APPROVED", nullable=False)  # APPROVED, REJECTED, REVOKED
    delete_confirmation_granted = Column(Boolean, default=False, nullable=False)  # Delete protection (§12)
    notes = Column(Text, nullable=True)


class CustomerDeliveryMilestone(BaseModel):
    """Repeatable delivery milestone tracking for the First-10 customer loop (§102, §103)."""
    __tablename__ = "customer_delivery_milestones"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    milestone_key = Column(String(100), nullable=False, index=True)  # REPOSITORY, ARCHITECTURE, AWS_CONNECTION, INFRASTRUCTURE_PLAN, DEPLOYMENT_APPROVAL, PROVISIONING, APPLICATION_RELEASE, DOMAIN_TLS, MONITORING_ALERTING, BACKUP_VERIFICATION, SECURITY_BASELINE, COMPLIANCE_EVIDENCE, CUSTOMER_ACCEPTANCE, COMMERCIAL_RECONCILIATION
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="NOT_STARTED", nullable=False)  # NOT_STARTED, IN_PROGRESS, BLOCKED, COMPLETED
    evidence_level = Column(String(50), default="NOT_STARTED", nullable=False)  # NOT_STARTED, CONFIGURED, SIMULATED, TEST_VERIFIED, CUSTOMER_VERIFIED, PRODUCTION_VERIFIED
    owner_role = Column(String(100), default="Technical Lead", nullable=False)
    owner_name = Column(String(255), default="DevOps Architect", nullable=False)
    blocker_type = Column(String(50), nullable=True)  # TECHNICAL, CUSTOMER_APPROVAL, SECURITY_REVIEW, PROCUREMENT, COMMERCIAL, PAYMENT
    blocker_description = Column(Text, nullable=True)
    blocker_days = Column(Float, default=0.0, nullable=False)
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    evidence_notes = Column(Text, nullable=True)

