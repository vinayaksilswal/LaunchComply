"""Phase 7 Compliance Operations: Tasks, Access Reviews, BCP/BIA, External Assurance, Contracts, and Professional Services."""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class ComplianceTask(BaseModel):
    __tablename__ = "compliance_tasks"

    organization_id = Column(String(36), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), default="CONTROL", nullable=False)  # CONTROL, RISK, AUDIT, POLICY, VENDOR, PRIVACY, EVIDENCE, CAPA
    source_type = Column(String(100), default="MANUAL", nullable=False)
    source_id = Column(String(255), nullable=True)
    owner = Column(String(255), nullable=False)
    priority = Column(String(20), default="MEDIUM", nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW
    due_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="OPEN", nullable=False, index=True)  # OPEN, IN_PROGRESS, BLOCKED, AWAITING_REVIEW, DONE, OVERDUE, CANCELLED
    recurrence_interval = Column(String(50), nullable=True)  # QUARTERLY, MONTHLY, ANNUAL


class AccessReviewCampaign(BaseModel):
    __tablename__ = "access_review_campaigns"

    organization_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    scope = Column(String(255), nullable=False)
    status = Column(String(50), default="PLANNED", nullable=False, index=True)  # PLANNED, ACTIVE, COMPLETED
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    total_items = Column(Integer, default=0, nullable=False)
    reviewed_items = Column(Integer, default=0, nullable=False)

    decisions = relationship("AccessReviewDecision", back_populates="campaign", cascade="all, delete-orphan")


class AccessReviewDecision(BaseModel):
    __tablename__ = "access_review_decisions"

    organization_id = Column(String(36), nullable=False, index=True)
    campaign_id = Column(String(36), ForeignKey("access_review_campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_name = Column(String(255), nullable=False)
    subject_email = Column(String(255), nullable=False)
    resource = Column(String(255), nullable=False)
    current_role = Column(String(100), nullable=False)
    decision = Column(String(50), default="KEEP", nullable=False)  # KEEP, REMOVE, MODIFY, INVESTIGATE
    justification = Column(Text, nullable=True)
    reviewed_by = Column(String(255), nullable=False)
    reviewed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    campaign = relationship("AccessReviewCampaign", back_populates="decisions")


class BusinessContinuityPlan(BaseModel):
    __tablename__ = "business_continuity_plans"

    organization_id = Column(String(36), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    version = Column(String(20), default="v1.0", nullable=False)
    scope = Column(Text, nullable=False)
    recovery_strategy = Column(Text, nullable=False)
    communication_plan = Column(Text, nullable=False)
    last_tested_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, IN_REVIEW


class BusinessImpactAnalysis(BaseModel):
    __tablename__ = "business_impact_analyses"

    organization_id = Column(String(36), nullable=False, index=True)
    critical_service_name = Column(String(255), nullable=False)
    owner = Column(String(255), nullable=False)
    impact_assessment = Column(Text, nullable=False)
    maximum_tolerable_downtime_hours = Column(Integer, default=4, nullable=False)
    target_rto_minutes = Column(Integer, default=30, nullable=False)
    target_rpo_minutes = Column(Integer, default=15, nullable=False)
    observed_rto_minutes = Column(Integer, default=13, nullable=True)  # Linked to real DR drill metrics
    dependencies = Column(Text, nullable=False)
    manual_workaround = Column(Text, nullable=False)
    recovery_priority = Column(String(50), default="TIER_1_CRITICAL", nullable=False)  # TIER_1_CRITICAL, TIER_2_HIGH, TIER_3_MEDIUM


class ExternalAssuranceRecord(BaseModel):
    __tablename__ = "external_assurance_records"

    organization_id = Column(String(36), nullable=False, index=True)
    assurance_type = Column(String(100), nullable=False)  # ISO_CERTIFICATE, SOC2_REPORT, PENETRATION_TEST_ATTESTATION, OTHER
    framework = Column(String(50), nullable=False)  # ISO27001, SOC2, VAPT, OTHER
    issuer_auditor = Column(String(255), nullable=False)  # e.g., BSI Group, PwC
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)
    issued_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    document_reference = Column(String(255), nullable=False)
    document_hash = Column(String(64), nullable=True)
    verified_by = Column(String(255), nullable=False)
    verified_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    public_visibility = Column(Boolean, default=True, nullable=False)


class CommercialContract(BaseModel):
    __tablename__ = "commercial_contracts"

    organization_id = Column(String(36), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    counterparty = Column(String(255), nullable=False)
    contract_type = Column(String(50), default="MSA", nullable=False)  # MSA, SAAS_TERMS, ORDER_FORM, SLA, DPA, SECURITY_ADDENDUM, PRIVACY_POLICY, SUBPROCESSOR_NOTICE, AUP, NDA, PSA, VAPT_ROE
    version = Column(String(20), default="1.0", nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)  # DRAFT, LEGAL_REVIEW, CUSTOMER_REVIEW, APPROVED, SENT, SIGNED, ACTIVE, EXPIRING, EXPIRED, SUPERSEDED
    effective_date = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    renewal_date = Column(DateTime, nullable=True)
    contract_value = Column(String(100), nullable=True)
    owner = Column(String(255), nullable=False)
    sla_target_availability = Column(String(50), default="99.9%", nullable=True)
    sla_observed_availability = Column(String(50), default="99.98%", nullable=True)
    sla_status = Column(String(50), default="MET", nullable=False)  # MET, AT_RISK, BREACHED


class ComplianceServiceProject(BaseModel):
    __tablename__ = "compliance_service_projects"

    organization_id = Column(String(36), nullable=False, index=True)
    service_code = Column(String(100), nullable=False)  # ISO27001_READINESS, SOC2_READINESS, DPDP_PRIVACY_SETUP, POLICY_PACK, RISK_ASSESSMENT, INTERNAL_AUDIT_ASSISTANCE
    title = Column(String(255), nullable=False)
    lead_consultant = Column(String(255), default="LaunchComply Principal Consultant", nullable=False)
    scope_description = Column(Text, nullable=False)
    status = Column(String(50), default="IN_PROGRESS", nullable=False, index=True)  # REQUESTED, QUALIFICATION, SCOPING, PROPOSAL, APPROVED, IN_PROGRESS, WAITING_CUSTOMER, REVIEW, DELIVERED, CLOSED
    milestones_json = Column(JSON, default=list, nullable=False)
    deliverables_json = Column(JSON, default=list, nullable=False)
    estimated_delivery = Column(String(100), default="4 weeks", nullable=False)
