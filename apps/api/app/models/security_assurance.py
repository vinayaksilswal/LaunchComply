"""Phase 6 Enterprise Security Assurance, VAPT Automation, Multi-Region DR, Auditor Portal, and Trust Center Models."""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Float, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class SecurityAssessmentScope(BaseModel):
    __tablename__ = "security_assessment_scopes"

    organization_id = Column(String(36), nullable=False, index=True)
    application_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    assessment_type = Column(String(50), default="FULL_AUTOMATED", nullable=False)  # STATIC, DAST, API, FULL_AUTOMATED, PROFESSIONAL_VAPT
    status = Column(String(50), default="DRAFT", nullable=False, index=True)  # DRAFT, AWAITING_AUTHORIZATION, AUTHORIZED, ACTIVE, EXPIRED, REVOKED
    requested_by = Column(String(255), nullable=False)
    approved_by = Column(String(255), nullable=True)
    authorized_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    testing_start = Column(DateTime, nullable=True)
    testing_end = Column(DateTime, nullable=True)
    rules_of_engagement = Column(Text, nullable=True)

    assets = relationship("SecurityAsset", back_populates="scope", cascade="all, delete-orphan")
    authorizations = relationship("SecurityAuthorization", back_populates="scope", cascade="all, delete-orphan")
    exclusions = relationship("SecurityExclusion", back_populates="scope", cascade="all, delete-orphan")
    assessments = relationship("SecurityAssessment", back_populates="scope", cascade="all, delete-orphan")


class SecurityAsset(BaseModel):
    __tablename__ = "security_assets"

    organization_id = Column(String(36), nullable=False, index=True)
    scope_id = Column(String(36), ForeignKey("security_assessment_scopes.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_type = Column(String(50), nullable=False)  # DOMAIN, SUBDOMAIN, URL, API, IP, AWS_RESOURCE, CONTAINER_IMAGE, REPOSITORY
    asset_value = Column(String(500), nullable=False)
    ownership_status = Column(String(50), default="VERIFIED", nullable=False)  # VERIFIED, PENDING_VERIFICATION, UNVERIFIED
    verification_method = Column(String(50), default="DNS_TXT", nullable=False)  # DNS_TXT, ROUTE53_NATIVE, WELL_KNOWN_TOKEN, AWS_CONNECTED_ACCOUNT, GITHUB_APP_AUTHENTICATED
    verified_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    in_scope = Column(Boolean, default=True, nullable=False)
    notes = Column(String(500), nullable=True)

    scope = relationship("SecurityAssessmentScope", back_populates="assets")


class SecurityAuthorization(BaseModel):
    __tablename__ = "security_authorizations"

    organization_id = Column(String(36), nullable=False, index=True)
    scope_id = Column(String(36), ForeignKey("security_assessment_scopes.id", ondelete="CASCADE"), nullable=False, index=True)
    authorized_by = Column(String(255), nullable=False)
    authorized_role = Column(String(50), nullable=False)
    authorization_text = Column(Text, nullable=False)
    accepted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    source_ip = Column(String(50), default="127.0.0.1", nullable=False)
    expires_at = Column(DateTime, nullable=False)

    scope = relationship("SecurityAssessmentScope", back_populates="authorizations")


class SecurityExclusion(BaseModel):
    __tablename__ = "security_exclusions"

    scope_id = Column(String(36), ForeignKey("security_assessment_scopes.id", ondelete="CASCADE"), nullable=False, index=True)
    asset = Column(String(500), nullable=False)
    reason = Column(String(1000), nullable=False)

    scope = relationship("SecurityAssessmentScope", back_populates="exclusions")


class SecurityAssessment(BaseModel):
    __tablename__ = "security_assessments"

    organization_id = Column(String(36), nullable=False, index=True)
    application_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    scope_id = Column(String(36), ForeignKey("security_assessment_scopes.id", ondelete="SET NULL"), nullable=True, index=True)
    assessment_type = Column(String(50), default="FULL_AUTOMATED", nullable=False)  # STATIC, DEPENDENCY, SECRETS, CONTAINER, CLOUD, PASSIVE_DAST, SAFE_ACTIVE_DAST, API, FULL_AUTOMATED, PROFESSIONAL_VAPT
    status = Column(String(50), default="QUEUED", nullable=False, index=True)  # DRAFT, AUTHORIZED, QUEUED, RUNNING, PAUSED, COMPLETED, FAILED, CANCELLED
    triggered_by = Column(String(255), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    summary_json = Column(JSON, default=dict, nullable=False)
    findings_count = Column(Integer, default=0, nullable=False)
    report_hash = Column(String(64), nullable=True)

    scope = relationship("SecurityAssessmentScope", back_populates="assessments")


class SecurityRiskAcceptance(BaseModel):
    __tablename__ = "security_risk_acceptances"

    organization_id = Column(String(36), nullable=False, index=True)
    finding_id = Column(String(36), nullable=False, index=True)
    justification = Column(Text, nullable=False)
    compensating_control = Column(Text, nullable=False)
    accepted_by = Column(String(255), nullable=False)
    approved_by = Column(String(255), nullable=False)
    accepted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)  # ACTIVE, EXPIRED, REVOKED


class RemediationPullRequest(BaseModel):
    __tablename__ = "remediation_pull_requests"

    organization_id = Column(String(36), nullable=False, index=True)
    finding_id = Column(String(36), nullable=False, index=True)
    repository_id = Column(String(36), nullable=True)
    branch = Column(String(100), nullable=False)
    commit_sha = Column(String(64), nullable=False)
    pr_url = Column(String(500), nullable=False)
    status = Column(String(50), default="OPEN", nullable=False, index=True)  # OPEN, MERGED, CLOSED
    created_by = Column(String(255), nullable=False)
    ai_generated = Column(Boolean, default=True, nullable=False)
    approved_by = Column(String(255), nullable=True)


class DisasterRecoveryPlan(BaseModel):
    __tablename__ = "disaster_recovery_plans"

    organization_id = Column(String(36), nullable=False, index=True)
    application_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    primary_region = Column(String(50), default="ap-south-1", nullable=False)
    secondary_region = Column(String(50), default="ap-southeast-1", nullable=False)
    strategy = Column(String(50), default="WARM_STANDBY", nullable=False)  # BACKUP_AND_RESTORE, PILOT_LIGHT, WARM_STANDBY, ACTIVE_PASSIVE
    target_rpo_minutes = Column(Integer, default=15, nullable=False)
    target_rto_minutes = Column(Integer, default=30, nullable=False)
    status = Column(String(50), default="HEALTHY", nullable=False, index=True)  # HEALTHY, DEGRADED, DRILL_PENDING
    last_tested_at = Column(DateTime, nullable=True)
    replication_status = Column(String(50), default="SYNCHRONIZED", nullable=False)

    drills = relationship("DisasterRecoveryDrill", back_populates="plan", cascade="all, delete-orphan")


class DisasterRecoveryDrill(BaseModel):
    __tablename__ = "disaster_recovery_drills"

    organization_id = Column(String(36), nullable=False, index=True)
    dr_plan_id = Column(String(36), ForeignKey("disaster_recovery_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="PENDING", nullable=False, index=True)  # PENDING, RUNNING, COMPLETED, FAILED
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    observed_rto_seconds = Column(Float, nullable=True)
    observed_rpo_minutes = Column(Float, nullable=True)
    evidence_id = Column(String(36), nullable=True)
    notes = Column(Text, nullable=True)
    temp_resource_ids_json = Column(JSON, default=list, nullable=False)

    plan = relationship("DisasterRecoveryPlan", back_populates="drills")


class AuditorAccessGrant(BaseModel):
    __tablename__ = "auditor_access_grants"

    organization_id = Column(String(36), nullable=False, index=True)
    auditor_email = Column(String(255), nullable=False, index=True)
    auditor_name = Column(String(255), nullable=False)
    framework = Column(String(50), default="SOC2", nullable=False)  # SOC2, ISO27001, DPDP
    scope_json = Column(JSON, default=dict, nullable=False)  # Allowed frameworks, evidence categories, date ranges
    valid_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    valid_until = Column(DateTime, nullable=False)
    created_by = Column(String(255), nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)  # ACTIVE, EXPIRED, REVOKED

    requests = relationship("AuditorEvidenceRequest", back_populates="grant", cascade="all, delete-orphan")


class AuditorEvidenceRequest(BaseModel):
    __tablename__ = "auditor_evidence_requests"

    organization_id = Column(String(36), nullable=False, index=True)
    grant_id = Column(String(36), ForeignKey("auditor_access_grants.id", ondelete="CASCADE"), nullable=False, index=True)
    control_id = Column(String(100), nullable=False)
    request_title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="REQUESTED", nullable=False, index=True)  # REQUESTED, IN_REVIEW, PROVIDED, ACCEPTED, NEEDS_MORE_INFO, CLOSED
    requested_by = Column(String(255), nullable=False)
    provided_evidence_id = Column(String(255), nullable=True)
    response_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    grant = relationship("AuditorAccessGrant", back_populates="requests")


class TrustCenterProfile(BaseModel):
    __tablename__ = "trust_center_profiles"

    organization_id = Column(String(36), unique=True, nullable=False, index=True)
    public_enabled = Column(Boolean, default=True, nullable=False)
    company_name = Column(String(255), nullable=False)
    security_contact_email = Column(String(255), nullable=False)
    overview_markdown = Column(Text, nullable=True)
    encryption_summary = Column(String(500), nullable=True)
    backup_summary = Column(String(500), nullable=True)
    compliance_status_json = Column(JSON, default=dict, nullable=False)
    nda_required_documents_json = Column(JSON, default=list, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SecurityQuestionnaire(BaseModel):
    __tablename__ = "security_questionnaires"

    organization_id = Column(String(36), nullable=False, index=True)
    framework = Column(String(50), default="CUSTOM", nullable=False)  # SIG_LITE, CAIQ, SOC2, CUSTOM
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    evidence_reference = Column(String(255), nullable=True)
    owner = Column(String(255), nullable=False)
    last_reviewed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(50), default="APPROVED", nullable=False)  # DRAFT, APPROVED, ARCHIVED
