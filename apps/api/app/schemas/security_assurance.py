"""Phase 6 Security Assurance, Authorized VAPT, DR, & Auditor Trust Portal Pydantic Schemas."""
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# -------------------------------------------------------------
# Scopes & Assets
# -------------------------------------------------------------

class SecurityAssetCreate(BaseModel):
    asset_type: str = Field(..., description="API_ENDPOINT, DOMAIN, IP_RANGE, SQS_QUEUE, S3_BUCKET, REPOSITORY")
    identifier: str = Field(..., description="Target URL, CIDR, ARN, or repo path")
    criticality: str = Field(default="MEDIUM", description="LOW, MEDIUM, HIGH, CRITICAL")
    is_verified: bool = False
    verification_method: Optional[str] = None
    meta_info: Optional[Dict[str, Any]] = None


class SecurityAssetResponse(BaseModel):
    id: str
    organization_id: str
    scope_id: str
    asset_type: str
    identifier: str
    criticality: str
    is_verified: bool
    verification_method: Optional[str]
    meta_info: Optional[Dict[str, Any]]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SecurityAssessmentScopeCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    application_id: Optional[str] = None
    environment_id: Optional[str] = None
    rules_of_engagement: Optional[Dict[str, Any]] = None
    assets: Optional[List[SecurityAssetCreate]] = None


class SecurityAuthorizationResponse(BaseModel):
    id: str
    scope_id: str
    authorized_by_name: str
    authorized_by_title: str
    authorized_by_email: str
    accepted_terms: bool
    authorization_hash: str
    authorized_at: datetime
    valid_until: datetime

    model_config = ConfigDict(from_attributes=True)


class SecurityAssessmentScopeResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    description: Optional[str]
    application_id: Optional[str]
    environment_id: Optional[str]
    status: str
    rules_of_engagement: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    assets: List[SecurityAssetResponse] = []
    authorizations: List[SecurityAuthorizationResponse] = []

    model_config = ConfigDict(from_attributes=True)


class AuthorizeScopeRequest(BaseModel):
    authorizer_name: str
    authorizer_title: str
    authorizer_email: str
    valid_days: int = 90
    terms_confirmed: bool = True


class SecurityExclusionCreate(BaseModel):
    pattern: str = Field(..., description="Regex, CIDR or URL path to strictly exclude from testing")
    reason: str
    approved_by: str


class SecurityExclusionResponse(BaseModel):
    id: str
    scope_id: str
    pattern: str
    reason: str
    approved_by: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Security Assessments
# -------------------------------------------------------------

class TriggerAssessmentRequest(BaseModel):
    scope_id: str
    assessment_type: str = Field(..., description="SAST, SCA, SECRET, CONTAINER, DAST, TLS, CLOUD_CONFIG, FULL_ASSESSMENT")
    target_environment: str = Field(default="STAGING", description="DEVELOPMENT, STAGING, PRODUCTION")
    scan_configuration: Optional[Dict[str, Any]] = None


class SecurityAssessmentResponse(BaseModel):
    id: str
    organization_id: str
    scope_id: str
    assessment_type: str
    status: str
    target_environment: str
    scan_configuration: Optional[Dict[str, Any]]
    execution_summary: Optional[Dict[str, Any]]
    findings_count_critical: int
    findings_count_high: int
    findings_count_medium: int
    findings_count_low: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Findings, SLA & Retests
# -------------------------------------------------------------

class SecurityFindingResponse(BaseModel):
    id: str
    organization_id: str
    assessment_id: Optional[str]
    finding_type: str
    title: str
    description: str
    severity: str
    status: str
    remediation_guidance: Optional[str]
    fingerprint: Optional[str]
    cwe_id: Optional[str]
    cve_id: Optional[str]
    cvss_score: Optional[float]
    affected_component: Optional[str]
    file_path: Optional[str]
    line_number: Optional[int]
    evidence_payload: Optional[Dict[str, Any]]
    sla_due_date: Optional[datetime]
    sla_breached: bool
    retest_status: str
    last_retested_at: Optional[datetime]
    regression_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AcceptRiskRequest(BaseModel):
    reason: str
    justification_details: str
    duration_days: int = Field(default=30, ge=1, le=180)


class SecurityRiskAcceptanceResponse(BaseModel):
    id: str
    finding_id: str
    reason: str
    justification_details: str
    expires_at: datetime
    accepted_by: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RetestFindingResponse(BaseModel):
    finding_id: str
    status: str
    retest_status: str
    retest_result: str
    retested_at: datetime


# -------------------------------------------------------------
# AI Remediation
# -------------------------------------------------------------

class GenerateRemediationRequest(BaseModel):
    target_repo_branch: str = "main"


class RemediationPullRequestResponse(BaseModel):
    id: str
    finding_id: str
    organization_id: str
    status: str
    patch_diff: str
    explanation: str
    verification_steps: Optional[str]
    target_repo: Optional[str]
    target_branch: Optional[str]
    pr_number: Optional[int]
    pr_url: Optional[str]
    human_approved: bool
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewRemediationRequest(BaseModel):
    approved: bool
    notes: Optional[str] = None


# -------------------------------------------------------------
# VAPT Engagements
# -------------------------------------------------------------

class VAPTEngagementCreate(BaseModel):
    application_id: Optional[str] = None
    environment_id: Optional[str] = None
    name: str = Field(..., max_length=255)
    engagement_type: str = Field(default="EXTERNAL_BLACK_BOX", description="EXTERNAL_BLACK_BOX, GREY_BOX, WHITE_BOX, API_SECURITY")
    start_date: datetime
    end_date: datetime
    lead_tester: str
    lead_tester_email: str
    methodology: Optional[str] = "OWASP Web Security Testing Guide (WSTG v4.2) + PTES"


class VAPTEngagementResponse(BaseModel):
    id: str
    organization_id: str
    application_id: Optional[str]
    environment_id: Optional[str]
    name: str
    engagement_type: str
    status: str
    start_date: datetime
    end_date: datetime
    lead_tester: str
    methodology: Optional[str]
    report_hash: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Multi-Region Disaster Recovery
# -------------------------------------------------------------

class DisasterRecoveryPlanCreate(BaseModel):
    application_id: Optional[str] = None
    environment_id: Optional[str] = None
    name: str = Field(..., max_length=255)
    strategy: str = Field(default="WARM_STANDBY", description="BACKUP_RESTORE, PILOT_LIGHT, WARM_STANDBY, ACTIVE_ACTIVE")
    primary_region: str = "us-east-1"
    dr_region: str = "us-west-2"
    target_rto_seconds: int = 1800
    target_rpo_seconds: int = 900
    replication_config: Optional[Dict[str, Any]] = None
    failover_dns_record: Optional[str] = None


class DisasterRecoveryPlanResponse(BaseModel):
    id: str
    organization_id: str
    application_id: Optional[str]
    environment_id: Optional[str]
    name: str
    strategy: str
    primary_region: str
    dr_region: str
    target_rto_seconds: int
    target_rpo_seconds: int
    replication_config: Optional[Dict[str, Any]]
    failover_dns_record: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TriggerDRDrillRequest(BaseModel):
    drill_type: str = Field(default="ISOLATED_FAILOVER_SIMULATION", description="ISOLATED_FAILOVER_SIMULATION, DATA_INTEGRITY_CHECK, REPLICA_HEALTH_AUDIT")
    notes: Optional[str] = None


class DisasterRecoveryDrillResponse(BaseModel):
    id: str
    plan_id: str
    organization_id: str
    status: str
    drill_type: str
    executed_by: str
    measured_rto_seconds: Optional[int]
    measured_rpo_seconds: Optional[int]
    dns_failover_verified: bool
    data_integrity_verified: bool
    rto_sla_met: bool
    rpo_sla_met: bool
    steps_log: Optional[List[Dict[str, Any]]]
    started_at: datetime
    completed_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Auditor Portal
# -------------------------------------------------------------

class AuditorAccessGrantCreate(BaseModel):
    auditor_name: str
    auditor_email: str
    auditing_firm: str
    scope_description: str
    duration_days: int = Field(default=14, ge=1, le=90)
    allowed_frameworks: Optional[List[str]] = ["SOC2_TYPE_II", "ISO27001", "HIPAA", "PCI_DSS"]
    nda_signed: bool = True
    nda_reference: Optional[str] = None


class AuditorAccessGrantResponse(BaseModel):
    id: str
    organization_id: str
    auditor_name: str
    auditor_email: str
    auditing_firm: str
    scope_description: str
    expires_at: Optional[datetime]
    allowed_frameworks: Optional[List[str]]
    nda_signed: bool
    nda_reference: Optional[str]
    is_active: bool
    last_accessed_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditorAccessGrantWithTokenResponse(AuditorAccessGrantResponse):
    raw_access_token: str


class AuditorEvidenceRequestCreate(BaseModel):
    title: str
    description: str
    framework_control: Optional[str] = None


class AuditorEvidenceRequestResponse(BaseModel):
    id: str
    organization_id: str
    grant_id: str
    title: str
    description: str
    framework_control: Optional[str]
    status: str
    response_notes: Optional[str]
    evidence_file_id: Optional[str]
    fulfilled_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FulfillEvidenceRequest(BaseModel):
    response_notes: str
    evidence_file_id: Optional[str] = None


# -------------------------------------------------------------
# Trust Center & Questionnaires
# -------------------------------------------------------------

class TrustCenterProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    is_public: Optional[bool] = None
    security_email: Optional[str] = None
    overview_summary: Optional[str] = None
    security_highlights: Optional[List[str]] = None
    certifications_in_progress: Optional[List[str]] = None
    subprocessors: Optional[List[Dict[str, Any]]] = None
    require_nda_for_reports: Optional[bool] = None


class TrustCenterProfileResponse(BaseModel):
    id: str
    organization_id: str
    company_name: str
    slug: str
    is_public: bool
    security_email: Optional[str]
    overview_summary: Optional[str]
    security_highlights: Optional[List[str]]
    certifications_in_progress: Optional[List[str]]
    subprocessors: Optional[List[Dict[str, Any]]]
    require_nda_for_reports: bool
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SecurityQuestionnaireCreate(BaseModel):
    title: Optional[str] = None
    framework_type: str = Field(..., description="CAIQ_LITE, SIG_LITE, CUSTOM")
    answers: Optional[Dict[str, Any]] = None


class SecurityQuestionnaireResponse(BaseModel):
    id: str
    organization_id: str
    title: str
    framework_type: str
    questions_data: Optional[List[Dict[str, Any]]]
    answers: Optional[Dict[str, Any]]
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
