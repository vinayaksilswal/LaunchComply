"""Phase 7 Compliance Operating System Pydantic Schemas."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class CanonicalControlSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    control_code: str
    title: str
    category: str
    description: str
    guidance: Optional[str] = None
    default_implementation_type: str
    default_frequency: str


class ControlImplementationUpdate(BaseModel):
    status: Optional[str] = None
    owner: Optional[str] = None
    implementation_description: Optional[str] = None
    applicable: Optional[bool] = None
    applicability_reason: Optional[str] = None
    implementation_type: Optional[str] = None
    frequency: Optional[str] = None
    maturity: Optional[str] = None


class ControlImplementationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    control_id: str
    status: str
    owner: str
    implementation_description: str
    applicable: bool
    applicability_reason: Optional[str] = None
    implementation_type: str
    frequency: str
    maturity: str
    last_reviewed_at: Optional[datetime] = None
    next_review_at: Optional[datetime] = None


class FrameworkReadinessResponse(BaseModel):
    framework_code: str
    framework_name: str
    readiness_percentage: float
    readiness_display: str
    total_controls: int
    applicable_controls: int
    implemented_controls: int
    effective_controls: int
    stale_controls: int
    open_exceptions: int
    category_breakdown: Dict[str, Any]
    status: str
    certification_statement: str


class RiskCreate(BaseModel):
    risk_id: str
    title: str
    category: str = "TECHNICAL"
    asset: str
    threat: str
    vulnerability: str
    likelihood: int = Field(ge=1, le=5)
    impact: int = Field(ge=1, le=5)
    owner: str
    existing_controls: Optional[str] = None
    residual_likelihood: Optional[int] = Field(default=None, ge=1, le=5)
    residual_impact: Optional[int] = Field(default=None, ge=1, le=5)
    treatment: str = "MITIGATE"
    source_type: str = "MANUAL"
    source_id: Optional[str] = None


class RiskAcceptanceRequest(BaseModel):
    justification: str
    approver: str
    expires_days: int = 90


class RiskTreatmentCreate(BaseModel):
    action: str
    owner: str
    due_date: datetime
    linked_control_code: Optional[str] = None
    linked_task_id: Optional[str] = None


class RiskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    risk_id: str
    title: str
    category: str
    asset: str
    threat: str
    vulnerability: str
    likelihood: int
    impact: int
    inherent_score: int
    existing_controls: Optional[str] = None
    residual_likelihood: int
    residual_impact: int
    residual_score: int
    owner: str
    treatment: str
    treatment_justification: Optional[str] = None
    treatment_approver: Optional[str] = None
    treatment_expires_at: Optional[datetime] = None
    review_date: datetime
    status: str
    source_type: str
    source_id: Optional[str] = None



class ISMSScopeUpdate(BaseModel):
    business_units: Optional[str] = None
    products: Optional[str] = None
    applications: Optional[str] = None
    aws_accounts: Optional[str] = None
    locations: Optional[str] = None
    people_groups: Optional[str] = None
    systems: Optional[str] = None
    data_categories: Optional[str] = None
    excluded_areas: Optional[str] = None
    scope_statement: Optional[str] = None


class SoAApprovalRequest(BaseModel):
    approver: str


class PolicyCreate(BaseModel):
    title: str
    slug: str
    category: str = "SECURITY"
    description: str
    content_markdown: str


class PrivacyRequestCreate(BaseModel):
    request_type: str = "ACCESS"
    data_principal_name: str
    data_principal_email: str
    sla_days: int = 30


class PrivacyRequestStatusUpdate(BaseModel):
    status: str
    response_notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class AuditPackageGenerateRequest(BaseModel):
    title: str
    framework: str = "SOC2"
    evaluation_period: str = "Last 90 Days"


class ExternalAssuranceRecordCreate(BaseModel):
    assurance_type: str
    framework: str
    issuer_auditor: str
    document_reference: str
    expires_at: datetime
