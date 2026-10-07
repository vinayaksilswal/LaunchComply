"""Phase 7 Internal Audit, CAPA, Management Review, and Audit Package Models."""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class InternalAudit(BaseModel):
    __tablename__ = "internal_audits"

    organization_id = Column(String(36), nullable=False, index=True)
    audit_code = Column(String(50), nullable=False, index=True)  # e.g., IA-2026-Q3
    title = Column(String(255), nullable=False)
    framework = Column(String(100), default="ISO27001_SOC2", nullable=False)
    lead_auditor = Column(String(255), nullable=False)
    audit_team = Column(String(500), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    scope_description = Column(Text, nullable=False)
    status = Column(String(50), default="PLANNED", nullable=False, index=True)  # PLANNED, IN_PROGRESS, FIELDWORK, FINDINGS_REVIEW, REPORT_DRAFT, FINAL, CLOSED
    summary_notes = Column(Text, nullable=True)
    report_hash = Column(String(64), nullable=True)

    findings = relationship("InternalAuditFinding", back_populates="audit", cascade="all, delete-orphan")


class InternalAuditFinding(BaseModel):
    __tablename__ = "internal_audit_findings"

    organization_id = Column(String(36), nullable=False, index=True)
    internal_audit_id = Column(String(36), ForeignKey("internal_audits.id", ondelete="CASCADE"), nullable=False, index=True)
    control_code = Column(String(100), nullable=False)
    severity = Column(String(50), default="MINOR", nullable=False)  # CRITICAL, MAJOR, MINOR, OBSERVATION
    observation = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=False)
    recommendation = Column(Text, nullable=False)
    status = Column(String(50), default="OPEN", nullable=False, index=True)  # OPEN, CAPA_ASSIGNED, RESOLVED, CLOSED
    corrective_action_id = Column(String(36), nullable=True)

    audit = relationship("InternalAudit", back_populates="findings")


class CorrectiveAction(BaseModel):
    __tablename__ = "corrective_actions"

    organization_id = Column(String(36), nullable=False, index=True)
    capa_number = Column(String(50), nullable=False, index=True)  # e.g., CAPA-2026-001
    title = Column(String(255), nullable=False)
    source_type = Column(String(100), default="AUDIT", nullable=False)  # AUDIT, INCIDENT, VAPT, SECURITY_FINDING, RISK, VENDOR_REVIEW, COMPLIANCE_GAP
    source_id = Column(String(255), nullable=True)
    description = Column(Text, nullable=False)
    root_cause_analysis = Column(Text, nullable=False)
    action_plan = Column(Text, nullable=False)
    owner = Column(String(255), nullable=False)
    due_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="OPEN", nullable=False, index=True)  # OPEN, PLANNED, IN_PROGRESS, IMPLEMENTED, VERIFYING, EFFECTIVE, INEFFECTIVE, CLOSED
    implemented_at = Column(DateTime, nullable=True)
    verification_notes = Column(Text, nullable=True)
    verified_by = Column(String(255), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    effectiveness_review = Column(Text, nullable=True)
    effectiveness_reviewer = Column(String(255), nullable=True)
    effectiveness_reviewed_at = Column(DateTime, nullable=True)


class ManagementReview(BaseModel):
    __tablename__ = "management_reviews"

    organization_id = Column(String(36), nullable=False, index=True)
    review_title = Column(String(255), nullable=False)
    review_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    period_covered = Column(String(100), default="Q1 - Q3 2026", nullable=False)
    chairperson = Column(String(255), nullable=False)
    attendees_json = Column(JSON, default=list, nullable=False)
    security_objectives_summary = Column(Text, nullable=False)
    audit_results_summary = Column(Text, nullable=False)
    incident_and_vapt_summary = Column(Text, nullable=False)
    risk_assessment_summary = Column(Text, nullable=False)
    supplier_performance_summary = Column(Text, nullable=False)
    corrective_actions_summary = Column(Text, nullable=False)
    improvement_decisions = Column(Text, nullable=False)
    resource_needs = Column(Text, nullable=False)
    approved_minutes_markdown = Column(Text, nullable=False)
    approved_by = Column(String(255), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="DRAFT", nullable=False)  # DRAFT, COMPLETED, APPROVED


class AuditPackage(BaseModel):
    __tablename__ = "audit_packages"

    organization_id = Column(String(36), nullable=False, index=True)
    package_number = Column(String(50), nullable=False, index=True)  # e.g., PKG-2026-SOC2-Q3
    title = Column(String(255), nullable=False)
    framework = Column(String(100), default="SOC2", nullable=False)
    evaluation_period = Column(String(100), nullable=False)
    manifest_hash = Column(String(64), nullable=False)
    redaction_level = Column(String(100), default="AUDITOR_SAFE_ZERO_KNOWLEDGE", nullable=False)
    total_evidence_items = Column(Integer, default=0, nullable=False)
    total_policies_included = Column(Integer, default=0, nullable=False)
    total_controls_mapped = Column(Integer, default=0, nullable=False)
    generated_by = Column(String(255), nullable=False)
    status = Column(String(50), default="READY", nullable=False, index=True)  # GENERATING, READY, ARCHIVED

    items = relationship("AuditPackageItem", back_populates="package", cascade="all, delete-orphan")


class AuditPackageItem(BaseModel):
    __tablename__ = "audit_package_items"

    organization_id = Column(String(36), nullable=False, index=True)
    package_id = Column(String(36), ForeignKey("audit_packages.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(100), nullable=False)  # POLICY, CONTROL_MAPPING, TECHNICAL_EVIDENCE, VAPT_REPORT, DR_DRILL, RISK_REGISTER, INTERNAL_AUDIT, MANAGEMENT_REVIEW
    item_name = Column(String(255), nullable=False)
    item_reference = Column(String(255), nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    redacted = Column(Boolean, default=True, nullable=False)

    package = relationship("AuditPackage", back_populates="items")
