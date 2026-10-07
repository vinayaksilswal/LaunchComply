"""Phase 7 Enterprise Risk Management and Asset Register Models."""
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Risk(BaseModel):
    __tablename__ = "risks"

    organization_id = Column(String(36), nullable=False, index=True)
    risk_id = Column(String(50), nullable=False, index=True)  # e.g., RSK-001
    title = Column(String(255), nullable=False)
    category = Column(String(100), default="TECHNICAL", nullable=False)  # TECHNICAL, OPERATIONAL, LEGAL, THIRD_PARTY, STRATEGIC
    asset = Column(String(255), nullable=False)
    threat = Column(String(500), nullable=False)
    vulnerability = Column(String(500), nullable=False)
    likelihood = Column(Integer, default=3, nullable=False)  # 1 to 5
    impact = Column(Integer, default=3, nullable=False)  # 1 to 5
    inherent_score = Column(Integer, default=9, nullable=False)  # likelihood * impact
    existing_controls = Column(Text, nullable=True)
    residual_likelihood = Column(Integer, default=2, nullable=False)
    residual_impact = Column(Integer, default=2, nullable=False)
    residual_score = Column(Integer, default=4, nullable=False)
    owner = Column(String(255), nullable=False)
    treatment = Column(String(50), default="MITIGATE", nullable=False)  # MITIGATE, ACCEPT, TRANSFER, AVOID
    treatment_justification = Column(Text, nullable=True)
    treatment_approver = Column(String(255), nullable=True)
    treatment_expires_at = Column(DateTime, nullable=True)
    review_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(String(50), default="IDENTIFIED", nullable=False, index=True)  # IDENTIFIED, ASSESSED, TREATED, ACCEPTED, CLOSED
    source_type = Column(String(100), default="MANUAL", nullable=False)  # MANUAL, SECURITY_FINDING, VAPT_FINDING, INCIDENT, VENDOR_RISK, ARCHITECTURE_FINDING, BACKUP_FAILURE, COMPLIANCE_GAP, CLOUD_SECURITY_SIGNAL
    source_id = Column(String(255), nullable=True)

    treatment_actions = relationship("RiskTreatmentAction", back_populates="risk", cascade="all, delete-orphan")


class RiskTreatmentAction(BaseModel):
    __tablename__ = "risk_treatment_actions"

    organization_id = Column(String(36), nullable=False, index=True)
    risk_id = Column(String(36), ForeignKey("risks.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(Text, nullable=False)
    owner = Column(String(255), nullable=False)
    due_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="PLANNED", nullable=False, index=True)  # PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
    linked_control_code = Column(String(100), nullable=True)
    linked_task_id = Column(String(100), nullable=True)
    evidence_ref = Column(String(255), nullable=True)
    completed_at = Column(DateTime, nullable=True)

    risk = relationship("Risk", back_populates="treatment_actions")


class InformationAsset(BaseModel):
    __tablename__ = "information_assets"

    organization_id = Column(String(36), nullable=False, index=True)
    asset_name = Column(String(255), nullable=False)
    asset_type = Column(String(100), nullable=False)  # APPLICATION, DATABASE, STORAGE_BUCKET, REPOSITORY, SAAS_VENDOR, DATASET, CLOUD_ACCOUNT, INFRASTRUCTURE
    classification = Column(String(50), default="CONFIDENTIAL", nullable=False)  # PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
    criticality = Column(String(50), default="HIGH", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    owner = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    data_stored = Column(Text, nullable=True)
    dependencies = Column(Text, nullable=True)
    lifecycle_status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, PROVISIONING, DEPRECATED, DECOMMISSIONED
