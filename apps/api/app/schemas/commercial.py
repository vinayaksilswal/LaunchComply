"""Phase 8 Commercial Schemas for Billing, Support, CRM, Invitations, and Platform Admin."""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, EmailStr

from app.models.auth import MembershipRole
from app.models.support import TicketCategory, TicketPriority, TicketStatus
from app.models.connectors import AuditorCommentAction, ConnectorType


class CheckoutRequest(BaseModel):
    plan_tier: str = Field(..., description="Target plan tier (e.g. STARTER, GROWTH, BUSINESS, ENTERPRISE)")
    currency: str = Field(default="INR", description="Currency (INR or USD)")
    provider: str = Field(default="STRIPE", description="Gateway provider (STRIPE or RAZORPAY)")


class PlanChangeRequest(BaseModel):
    target_tier: str = Field(..., description="Target plan tier")


class UsageRecordRequest(BaseModel):
    metric_key: str = Field(..., description="Metric key e.g. applications, build_minutes, security_scans")
    quantity: float = Field(default=1.0, ge=0.0, description="Usage amount")
    idempotency_key: str = Field(..., description="Unique client idempotency key")
    source: str = Field(default="internal_engine")


class InviteMemberRequest(BaseModel):
    email: str = Field(..., description="Recipient email address")
    role: MembershipRole = Field(default=MembershipRole.DEVELOPER, description="Assigned organization role")


class AcceptInviteRequest(BaseModel):
    token: str = Field(..., description="Raw invitation token")


class EmailVerifyRequest(BaseModel):
    token: str = Field(..., description="Raw email verification token")


class PasswordResetRequest(BaseModel):
    email: str = Field(..., description="Account email address")


class PasswordResetConfirm(BaseModel):
    token: str = Field(..., description="Raw password reset token")
    new_password: str = Field(..., min_length=8, description="New account password")


class TicketCreateRequest(BaseModel):
    title: str = Field(..., description="Brief summary of the issue")
    category: TicketCategory = Field(default=TicketCategory.DEPLOYMENT)
    priority: TicketPriority = Field(default=TicketPriority.NORMAL)
    message: str = Field(..., description="Detailed description of the issue")


class TicketMessageRequest(BaseModel):
    content: str = Field(..., description="Reply content")


class LeadCreateRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr = Field(max_length=255)
    company: Optional[str] = Field(default=None, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=50)
    source: str = Field(default="WEBSITE", max_length=100)
    notes: Optional[str] = Field(default=None, max_length=1000)
    estimated_value: float = Field(default=0.0, ge=0, le=100_000_000, allow_inf_nan=False)


class ServiceQuoteRequest(BaseModel):
    service_name: str
    scope_description: str
    deliverables_description: str
    subtotal: float
    tax_amount: float = 0.0
    currency: str = "INR"


class AuditorCommentRequest(BaseModel):
    evidence_request_id: Optional[str] = None
    evidence_id: Optional[str] = None
    comment: str
    action: AuditorCommentAction = AuditorCommentAction.COMMENT


class ConnectorSyncRequest(BaseModel):
    connector_type: ConnectorType


class DemoRequestSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=120, description="Prospect full name")
    email: EmailStr = Field(max_length=255, description="Work email address")
    company: str = Field(min_length=2, max_length=160, description="Company name")
    phone: Optional[str] = Field(default=None, max_length=50)
    source: str = Field(default="BOOK_DEMO", max_length=100, description="Lead source channel")
    use_case: Optional[str] = Field(default=None, max_length=500, description="Primary use case or challenge")
    company_size: Optional[str] = Field(default=None, max_length=100, description="Team / employee count")
    cloud_provider: Optional[str] = Field(default=None, max_length=100, description="Current or target cloud provider")
    current_deployment: Optional[str] = Field(default=None, max_length=500)
    desired_compliance: Optional[str] = Field(default=None, max_length=200, description="Target framework")
    notes: Optional[str] = Field(default=None, max_length=1000)


class CancellationFeedbackRequest(BaseModel):
    reason: str = Field(..., description="Structured reason")
    feedback: Optional[str] = Field(default="", description="Additional unstructured comment")
    competitor_name: Optional[str] = None


class InvoiceReconcileRequest(BaseModel):
    bank_reference: str = Field(..., description="Bank transaction reference e.g. UTR or Wire Ref")
    amount: float = Field(..., description="Amount reconciled")
    payment_source: str = Field(default="BANK_TRANSFER", description="Payment source e.g. BANK_TRANSFER or MANUAL_INVOICE")
    notes: Optional[str] = Field(default=None, description="Reconciliation verification notes")


class ManualAssistanceCreateRequest(BaseModel):
    organization_id: str
    task_name: str
    category: str = Field(default="AWS", description="AWS, DNS, DEPLOYMENT, SECURITY, VAPT, COMPLIANCE, BILLING, TRAINING")
    duration_minutes: int = Field(default=30, ge=1)
    operator: str
    resolution_notes: Optional[str] = None
    is_automation_candidate: bool = False


class RoadmapCandidateRequest(BaseModel):
    problem: str
    source_type: str
    source_id: str
    revenue_or_retention_impact: str
    organization_id: Optional[str] = None
    priority: str = "MEDIUM"
    workaround: Optional[str] = None


class RoadmapDecisionRequest(BaseModel):
    roadmap_status: str


class ExperimentCreateRequest(BaseModel):
    name: str
    hypothesis: str
    metric: str
    audience: str = "ALL_TRAFFIC"
    variant: str = "A_CONTROL"


class ExperimentUpdateRequest(BaseModel):
    status: str
    result_payload: Optional[Dict[str, Any]] = None


class ProviderAcceptanceTestRequest(BaseModel):
    provider: str


# ============================================================================
# Phase 15: Customer Operations, Interviews, Pilot Decisions & AWS Onboarding
# ============================================================================

class StageTransitionRequest(BaseModel):
    stage: str
    blocker: Optional[str] = None
    internal_owner: Optional[str] = None
    notes: Optional[str] = None
    next_action: Optional[str] = None
    next_action_due: Optional[datetime] = None


class CustomerInterviewRequest(BaseModel):
    interview_type: str = Field(..., description="DISCOVERY, ONBOARDING, VALUE_VALIDATION, CONVERSION, CHURN")
    participants: str = Field(..., description="Names and roles of participants")
    key_problem: str = Field(..., description="What are they trying to launch/solve?")
    value_driver: str = Field(..., description="Which result mattered most?")
    blocker: Optional[str] = None
    quote: Optional[str] = None
    permission_to_use_quote: bool = False
    notes: Optional[str] = None


class PilotDecisionRequest(BaseModel):
    decision: str = Field(..., description="CONVERT, EXTEND, CLOSE_LOST")
    reason: str
    new_objective: Optional[str] = None
    new_decision_date: Optional[datetime] = None


class AWSVerifyConnectionRequest(BaseModel):
    role_arn: str
    external_id: str
    region: str = "ap-south-1"
    simulate_error: Optional[str] = None


class AWSRequestHelpRequest(BaseModel):
    organization_id: str
    account_id: str
    role_arn: str
    failure_reason: str


class PaidCustomerConversionRequest(BaseModel):
    notes: Optional[str] = None


# Phase 16: AWS Self-Service Onboarding Automation Schemas (§1-§155)
class AWSOptionsRequest(BaseModel):
    organization_id: Optional[str] = None
    setup_method: str = "CLOUDFORMATION"  # CLOUDFORMATION, MANUAL, EXISTING_ROLE
    region: str = "ap-south-1"


class AWSObservedStackRequest(BaseModel):
    stack_name: str
    region: str = "ap-south-1"
    simulated_status: Optional[str] = None


class AWSTrustDiffRequest(BaseModel):
    actual_policy: Any
    external_id: str
    role_arn: Optional[str] = None


class AWSResourceDiscoveryRequest(BaseModel):
    account_id: str
    role_arn: str
    region: str = "ap-south-1"


class AWSDisconnectRequest(BaseModel):
    cloud_account_id: str
    reason: Optional[str] = "Customer requested disconnection"


class AWSExternalIdRotateRequest(BaseModel):
    organization_id: str
    cloud_account_id: Optional[str] = None


# ============================================================================
# Phase 17: Production Delivery, Customer Acceptance & Payment Reconciliation
# ============================================================================

class CustomerDeploymentApprovalRequest(BaseModel):
    organization_id: str
    application_id: str
    environment: str = "production"
    release_version: str = "v1.0.0"
    architecture_version: str = "v1.0.0"
    infrastructure_plan_id: str
    plan_checksum: str
    estimated_monthly_cost: str = "₹55,000"
    approved_by_customer: str
    customer_contact_email: str
    customer_role: str = "CTO"
    delete_confirmation_granted: bool = False
    notes: Optional[str] = None


class DeploymentPlanValidateRequest(BaseModel):
    plan_id: str
    resources_to_create: List[str] = []
    resources_to_update: List[str] = []
    resources_to_delete: List[str] = []
    delete_confirmation_granted: bool = False
    policy_violations: Optional[List[str]] = None


class ProductionApplyRequest(BaseModel):
    organization_id: str
    application_id: str
    environment: str = "production"
    plan_id: str
    approval_id: str
    deployment_mode: str = "CUSTOMER_PRODUCTION"
    simulate_failure: bool = False


class ReleaseHealthVerifyRequest(BaseModel):
    image_tag: str
    critical_vulnerabilities: int = 0
    container_healthy: bool = True
    alb_target_healthy: bool = True
    endpoint_healthy: bool = True


class DomainTlsVerifyRequest(BaseModel):
    domain_name: str
    dns_status: str = "VERIFIED"
    acm_status: str = "ISSUED"
    endpoint_https_reachable: bool = True


class CustomerAcceptanceSubmitRequest(BaseModel):
    organization_id: str
    application_id: str
    customer_contact: str
    internal_owner: str = "Commercial Lead"
    technical_accepted: bool = True
    security_accepted: bool = True
    outcome_accepted: bool = True
    commercial_accepted: bool = True
    open_items: Optional[List[Dict[str, Any]]] = None


class BankReconciliationRequest(BaseModel):
    invoice_number: str
    utr_number: str
    received_amount: float
    currency: str = "INR"
    finance_verifier: str = "Finance Controller"
    notes: Optional[str] = None


class ValueInterviewRequest(BaseModel):
    organization_id: str
    participants: str
    reduce_deployment_effort: str
    aws_onboarding_easier: str
    security_evidence_useful: str
    iso_readiness_valuable: str
    continue_using_platform: str
    buy_saas_subscription: str
    missing_features: str
    quote: Optional[str] = None


