"""Phase 11 Continuous Assurance Automation, Evidence Authenticity, Live Threat Canvas, Partner White-Label & Auditor Workpapers."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class AuditBotSchedule(str, enum.Enum):
    HOURLY = "HOURLY"
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    ON_RELEASE = "ON_RELEASE"
    ON_CHANGE = "ON_CHANGE"
    MANUAL = "MANUAL"


class AuditBotStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ENABLED = "ENABLED"
    RUNNING = "RUNNING"
    PASS = "PASS"
    PARTIAL = "PARTIAL"
    FAIL = "FAIL"
    ERROR = "ERROR"
    DISABLED = "DISABLED"


class EvidenceAuthenticityStatus(str, enum.Enum):
    VERIFIED_SOURCE = "VERIFIED_SOURCE"
    SIGNED_SOURCE = "SIGNED_SOURCE"
    API_COLLECTED = "API_COLLECTED"
    MANUAL_UPLOAD = "MANUAL_UPLOAD"
    UNVERIFIED = "UNVERIFIED"
    REJECTED = "REJECTED"


class EvidenceFreshnessStatus(str, enum.Enum):
    CURRENT = "CURRENT"
    EXPIRING = "EXPIRING"
    STALE = "STALE"
    MISSING = "MISSING"
    INVALID = "INVALID"


class ContinuousControlStatus(str, enum.Enum):
    PASS = "PASS"
    PARTIAL = "PARTIAL"
    FAIL = "FAIL"
    STALE = "STALE"
    ERROR = "ERROR"
    NOT_MONITORED = "NOT_MONITORED"


class CustomDomainTlsStatus(str, enum.Enum):
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    VERIFIED = "VERIFIED"
    CERTIFICATE_PENDING = "CERTIFICATE_PENDING"
    ACTIVE = "ACTIVE"
    ERROR = "ERROR"
    SUSPENDED = "SUSPENDED"


class AuditorReviewStatus(str, enum.Enum):
    NOT_REVIEWED = "NOT_REVIEWED"
    IN_REVIEW = "IN_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    NEEDS_MORE_INFO = "NEEDS_MORE_INFO"


# ==========================================
# 1. CONTINUOUS AUDIT BOTS
# ==========================================

class AuditBot(BaseModel):
    """Autonomous continuous assurance bot verifying cloud, security, and repo controls."""
    __tablename__ = "audit_bots"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    bot_code = Column(String(100), nullable=False, index=True)  # e.g., BOT_AWS_RDS_ENCRYPTION
    name = Column(String(255), nullable=False)
    category = Column(String(100), default="AWS", nullable=False)  # AWS, GITHUB, RELEASE, SECURITY, DR, IDENTITY
    target_control_code = Column(String(100), nullable=False, index=True)  # e.g., LC-CR-001
    schedule = Column(Enum(AuditBotSchedule), default=AuditBotSchedule.DAILY, nullable=False)
    status = Column(Enum(AuditBotStatus), default=AuditBotStatus.ENABLED, nullable=False)
    last_run_at = Column(DateTime, nullable=True)
    last_status = Column(String(50), nullable=True)
    execution_config_json = Column(Text, default="{}", nullable=False)


class AuditBotRun(BaseModel):
    """Execution telemetry record for an audit bot inspection."""
    __tablename__ = "audit_bot_runs"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    bot_id = Column(String(36), ForeignKey("audit_bots.id", ondelete="CASCADE"), nullable=False, index=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="PASS", nullable=False)  # PASS, PARTIAL, FAIL, ERROR
    findings_count = Column(Integer, default=0, nullable=False)
    raw_output_hash = Column(String(64), nullable=True)
    summary = Column(Text, default="", nullable=False)
    records_scanned = Column(Integer, default=0, nullable=False)


class AuditBotObservation(BaseModel):
    """Specific technical resource observation gathered by an audit bot."""
    __tablename__ = "audit_bot_observations"

    run_id = Column(String(36), ForeignKey("audit_bot_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_id = Column(String(255), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False)
    check_name = Column(String(255), nullable=False)
    is_compliant = Column(Boolean, default=True, nullable=False)
    observed_state_json = Column(Text, default="{}", nullable=False)
    remediation_hint = Column(Text, nullable=True)


# ==========================================
# 2. EVIDENCE PIPELINE & AUTHENTICITY
# ==========================================

class EvidenceObservation(BaseModel):
    """Normalized evidence record with cryptographic authenticity hashes and freshness tags."""
    __tablename__ = "evidence_observations"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_code = Column(String(100), nullable=False, index=True)  # e.g., EVD-OBS-2026-001
    source_provider = Column(String(100), nullable=False, index=True)  # AWS, GITHUB, OKTA, DATADOG, JIRA
    external_resource_id = Column(String(255), nullable=False, index=True)
    collector_version = Column(String(50), default="1.0", nullable=False)
    collected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    valid_until = Column(DateTime, nullable=False)
    control_code = Column(String(100), nullable=False, index=True)
    raw_payload_hash = Column(String(64), nullable=False)
    normalized_payload_hash = Column(String(64), nullable=False)
    authenticity_status = Column(Enum(EvidenceAuthenticityStatus), default=EvidenceAuthenticityStatus.API_COLLECTED, nullable=False)
    freshness_status = Column(Enum(EvidenceFreshnessStatus), default=EvidenceFreshnessStatus.CURRENT, nullable=False)
    normalized_data_json = Column(Text, default="{}", nullable=False)
    provenance_metadata_json = Column(Text, default="{}", nullable=False)


class EvidenceIntegrityChain(BaseModel):
    """Tamper-evident sequential hash chain linking successive evidence observations."""
    __tablename__ = "evidence_integrity_chains"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_observation_id = Column(String(36), ForeignKey("evidence_observations.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence_number = Column(Integer, nullable=False, index=True)
    previous_hash = Column(String(64), nullable=False)
    current_hash = Column(String(64), nullable=False)
    chained_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class EvidenceFreshnessPolicy(BaseModel):
    """Retention and max age configuration governing evidence obsolescence."""
    __tablename__ = "evidence_freshness_policies"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_class = Column(String(100), nullable=False, index=True)  # CLOUD_CONFIG, BACKUP_HEALTH, VAPT_REPORT, ACCESS_REVIEW, POLICY
    max_age_hours = Column(Integer, default=24, nullable=False)
    warning_threshold_hours = Column(Integer, default=12, nullable=False)


# ==========================================
# 3. CONTINUOUS CONTROL MONITORING
# ==========================================

class ContinuousControlMonitor(BaseModel):
    """Real-time monitoring health state of a canonical control based on live evidence."""
    __tablename__ = "continuous_control_monitors"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    control_code = Column(String(100), nullable=False, index=True)
    current_status = Column(Enum(ContinuousControlStatus), default=ContinuousControlStatus.PASS, nullable=False, index=True)
    last_evaluated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    next_evaluation_at = Column(DateTime, nullable=True)
    status_reason = Column(Text, nullable=False)
    evidence_used_json = Column(Text, default="[]", nullable=False)
    evidence_missing_json = Column(Text, default="[]", nullable=False)
    operating_evidence_count = Column(Integer, default=0, nullable=False)
    total_evaluations_count = Column(Integer, default=0, nullable=False)


class ControlEvaluationHistory(BaseModel):
    """Immutable audit trail of status transitions for continuous controls."""
    __tablename__ = "control_evaluation_histories"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    control_code = Column(String(100), nullable=False, index=True)
    evaluated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    previous_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    reason = Column(Text, nullable=False)
    trigger_event = Column(String(100), default="BOT_RUN", nullable=False)  # BOT_RUN, EVIDENCE_REFRESH, ARCHITECTURE_CHANGE, MANUAL
    evidence_observation_id = Column(String(36), nullable=True)


class AssuranceAutomationPolicy(BaseModel):
    """Rules defining automated actions when control failures or stale evidence occur."""
    __tablename__ = "assurance_automation_policies"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    event_trigger = Column(String(100), nullable=False)  # CONTROL_FAIL, BACKUP_STALE, VAPT_EXPIRED, EXCEPTION_PROLONGED
    action_type = Column(String(100), nullable=False)  # CREATE_ALERT, CREATE_TASK, CREATE_RISK, MARK_STALE
    is_enabled = Column(Boolean, default=True, nullable=False)
    threshold_minutes = Column(Integer, default=15, nullable=False)


# ==========================================
# 4. PARTNER WHITE-LABEL & CUSTOM DOMAINS
# ==========================================

class PartnerCustomDomain(BaseModel):
    """Custom vanity domain configured by an MSP partner with DNS verification and TLS status."""
    __tablename__ = "partner_custom_domains"

    partner_id = Column(String(36), ForeignKey("partner_organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    domain_name = Column(String(255), unique=True, nullable=False, index=True)  # e.g., compliance.secureops.com
    dns_verification_token = Column(String(100), nullable=False)
    cname_target = Column(String(255), default="cname.launchcomply.com", nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verified_at = Column(DateTime, nullable=True)
    tls_status = Column(Enum(CustomDomainTlsStatus), default=CustomDomainTlsStatus.PENDING_VERIFICATION, nullable=False)
    certificate_arn = Column(String(255), nullable=True)


class PartnerEmailBranding(BaseModel):
    """Branded email template configuration for managed-service partner notifications."""
    __tablename__ = "partner_email_brandings"

    partner_id = Column(String(36), ForeignKey("partner_organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    from_name = Column(String(255), nullable=False)
    reply_to = Column(String(255), nullable=False)
    custom_domain = Column(String(255), nullable=True)
    dkim_status = Column(String(50), default="UNVERIFIED", nullable=False)


# ==========================================
# 5. AUDITOR COLLABORATION & WORKPAPERS
# ==========================================

class AuditorWorkpaper(BaseModel):
    """Independent auditor assessment document tracking control examination and sample evidence."""
    __tablename__ = "auditor_workpapers"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    grant_id = Column(String(36), ForeignKey("auditor_access_grants.id", ondelete="CASCADE"), nullable=False, index=True)
    workpaper_number = Column(String(50), nullable=False, index=True)  # e.g., WP-2026-SOC2-CC6.1
    framework = Column(String(50), default="SOC2", nullable=False)
    control_code = Column(String(100), nullable=False, index=True)
    auditor_email = Column(String(255), nullable=False)
    review_status = Column(Enum(AuditorReviewStatus), default=AuditorReviewStatus.NOT_REVIEWED, nullable=False, index=True)
    sampling_notes = Column(Text, nullable=True)  # e.g., Sampled 25 deployment approvals from 90-day period
    findings_notes = Column(Text, nullable=True)
    evidence_references_json = Column(Text, default="[]", nullable=False)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)


class EvidenceReviewThread(BaseModel):
    """Discussion thread between external auditor and compliance team regarding specific evidence."""
    __tablename__ = "auditor_evidence_review_threads"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    workpaper_id = Column(String(36), ForeignKey("auditor_workpapers.id", ondelete="CASCADE"), nullable=False, index=True)
    author_email = Column(String(255), nullable=False)
    author_role = Column(String(50), default="AUDITOR", nullable=False)  # AUDITOR, AUDITEE, COMPLIANCE_MANAGER
    message = Column(Text, nullable=False)
    evidence_reference = Column(String(100), nullable=True)
