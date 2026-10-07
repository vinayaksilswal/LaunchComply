"""Phase 7 Framework-Neutral Compliance Engine and Canonical Control Models."""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class FrameworkVersion(BaseModel):
    __tablename__ = "framework_versions"

    code = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    version = Column(String(50), default="1.0", nullable=False)
    effective_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    retired_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, DEPRECATED, DRAFT
    description = Column(Text, nullable=True)

    mappings = relationship("ControlFrameworkMapping", back_populates="framework_version", cascade="all, delete-orphan")


class CanonicalControl(BaseModel):
    __tablename__ = "canonical_controls"

    control_code = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=False)
    guidance = Column(Text, nullable=True)
    default_implementation_type = Column(String(50), default="HYBRID", nullable=False)  # AUTOMATED, MANUAL, HYBRID
    default_frequency = Column(String(50), default="QUARTERLY", nullable=False)  # CONTINUOUS, DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL, PER_RELEASE

    mappings = relationship("ControlFrameworkMapping", back_populates="canonical_control", cascade="all, delete-orphan")
    implementations = relationship("ControlImplementation", back_populates="canonical_control", cascade="all, delete-orphan")


class ControlFrameworkMapping(BaseModel):
    __tablename__ = "control_framework_mappings"

    canonical_control_id = Column(String(36), ForeignKey("canonical_controls.id", ondelete="CASCADE"), nullable=False, index=True)
    framework_version_id = Column(String(36), ForeignKey("framework_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_code = Column(String(100), nullable=False, index=True)  # e.g., A.9.4.2, CC6.1, DPDP-SEC-08
    requirement_title = Column(String(255), nullable=False)
    mapping_notes = Column(Text, nullable=True)

    canonical_control = relationship("CanonicalControl", back_populates="mappings")
    framework_version = relationship("FrameworkVersion", back_populates="mappings")


class ControlImplementation(BaseModel):
    __tablename__ = "control_implementations"

    organization_id = Column(String(36), nullable=False, index=True)
    control_id = Column(String(36), ForeignKey("canonical_controls.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="NOT_STARTED", nullable=False, index=True)  # NOT_STARTED, IN_PROGRESS, IMPLEMENTED, EFFECTIVE, PARTIAL, INEFFECTIVE, NOT_APPLICABLE, NEEDS_REVIEW, STALE_EVIDENCE
    owner = Column(String(255), nullable=False)
    implementation_description = Column(Text, nullable=False)
    applicable = Column(Boolean, default=True, nullable=False)
    applicability_reason = Column(Text, nullable=True)
    implementation_type = Column(String(50), default="HYBRID", nullable=False)  # AUTOMATED, MANUAL, HYBRID
    frequency = Column(String(50), default="QUARTERLY", nullable=False)
    maturity = Column(String(50), default="DEFINED", nullable=False)  # INITIAL, REPEATABLE, DEFINED, MANAGED, OPTIMIZING
    last_reviewed_at = Column(DateTime, nullable=True)
    next_review_at = Column(DateTime, nullable=True)
    effective_from = Column(DateTime, nullable=True)

    canonical_control = relationship("CanonicalControl", back_populates="implementations")
    evidence_mappings = relationship("ControlEvidenceMapping", back_populates="implementation", cascade="all, delete-orphan")
    tests = relationship("ControlTest", back_populates="implementation", cascade="all, delete-orphan")
    exceptions = relationship("ControlException", back_populates="implementation", cascade="all, delete-orphan")


class ControlEvidenceMapping(BaseModel):
    __tablename__ = "control_evidence_mappings"

    organization_id = Column(String(36), nullable=False, index=True)
    control_implementation_id = Column(String(36), ForeignKey("control_implementations.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_id = Column(String(255), nullable=False, index=True)
    evidence_source = Column(String(100), nullable=False)  # AWS_INFRASTRUCTURE, RELEASE_PIPELINE, BACKUP_DRILL, SECURITY_FINDING, VAPT_REPORT, DR_DRILL, POLICY_DOCUMENT, MANUAL_UPLOAD
    title = Column(String(255), nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    collected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    valid_until = Column(DateTime, nullable=False)
    quality_state = Column(String(50), default="VERIFIED_AUTOMATED", nullable=False, index=True)  # VERIFIED_AUTOMATED, VERIFIED_MANUAL, UNREVIEWED, REJECTED, EXPIRED, MISSING
    confidence = Column(String(50), default="HIGH", nullable=False)  # HIGH, MEDIUM, LOW
    owner = Column(String(255), nullable=False)
    reviewer = Column(String(255), nullable=True)
    rejection_reason = Column(Text, nullable=True)

    implementation = relationship("ControlImplementation", back_populates="evidence_mappings")


class ControlOperatingPeriod(BaseModel):
    __tablename__ = "control_operating_periods"

    organization_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    framework = Column(String(50), default="SOC2", nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)  # ACTIVE, CONCLUDED, AUDITED
    coverage_summary_json = Column(JSON, default=dict, nullable=False)

    tests = relationship("ControlTest", back_populates="operating_period")


class ControlTest(BaseModel):
    __tablename__ = "control_tests"

    organization_id = Column(String(36), nullable=False, index=True)
    control_implementation_id = Column(String(36), ForeignKey("control_implementations.id", ondelete="CASCADE"), nullable=False, index=True)
    operating_period_id = Column(String(36), ForeignKey("control_operating_periods.id", ondelete="SET NULL"), nullable=True, index=True)
    tested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    performed_by = Column(String(255), nullable=False)
    method = Column(String(50), default="AUTOMATED_EVALUATION", nullable=False)  # INSPECTION, OBSERVATION, INQUIRY, RE_PERFORMANCE, AUTOMATED_EVALUATION
    sample_size = Column(Integer, default=1, nullable=False)
    result = Column(String(50), default="PASS", nullable=False, index=True)  # PASS, FAIL, PARTIAL, NOT_TESTED
    exceptions_found = Column(Integer, default=0, nullable=False)
    observations = Column(Text, nullable=True)
    evidence_ref = Column(String(255), nullable=True)

    implementation = relationship("ControlImplementation", back_populates="tests")
    operating_period = relationship("ControlOperatingPeriod", back_populates="tests")


class ControlException(BaseModel):
    __tablename__ = "control_exceptions"

    organization_id = Column(String(36), nullable=False, index=True)
    control_implementation_id = Column(String(36), ForeignKey("control_implementations.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    impact = Column(String(50), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    affected_period = Column(String(100), nullable=False)
    remediation = Column(Text, nullable=False)
    owner = Column(String(255), nullable=False)
    status = Column(String(50), default="OPEN", nullable=False, index=True)  # OPEN, IN_PROGRESS, RESOLVED, ACCEPTED
    resolved_at = Column(DateTime, nullable=True)

    implementation = relationship("ControlImplementation", back_populates="exceptions")
