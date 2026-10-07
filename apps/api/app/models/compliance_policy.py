"""Phase 7 Enterprise Policy Management, Acknowledgements, and Training Models."""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Policy(BaseModel):
    __tablename__ = "policies"

    organization_id = Column(String(36), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False, index=True)
    category = Column(String(100), default="SECURITY", nullable=False)  # SECURITY, OPERATIONS, PRIVACY, DEVELOPMENT, HR, BUSINESS_CONTINUITY
    description = Column(Text, nullable=False)
    owner = Column(String(255), nullable=False)
    status = Column(String(50), default="DRAFT", nullable=False, index=True)  # DRAFT, IN_REVIEW, APPROVED, PUBLISHED, SUPERSEDED, RETIRED
    current_version = Column(String(20), default="1.0", nullable=False)
    effective_date = Column(DateTime, nullable=True)
    next_review_date = Column(DateTime, nullable=True)
    is_mandatory_acknowledgement = Column(Boolean, default=True, nullable=False)

    versions = relationship("PolicyVersion", back_populates="policy", cascade="all, delete-orphan")


class PolicyVersion(BaseModel):
    __tablename__ = "policy_versions"

    organization_id = Column(String(36), nullable=False, index=True)
    policy_id = Column(String(36), ForeignKey("policies.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(String(20), default="1.0", nullable=False)
    content_markdown = Column(Text, nullable=False)
    change_summary = Column(Text, nullable=False)
    author = Column(String(255), nullable=False)
    status = Column(String(50), default="DRAFT", nullable=False, index=True)  # DRAFT, IN_REVIEW, APPROVED, PUBLISHED, SUPERSEDED

    policy = relationship("Policy", back_populates="versions")
    approvals = relationship("PolicyApproval", back_populates="policy_version", cascade="all, delete-orphan")
    acknowledgements = relationship("PolicyAcknowledgement", back_populates="policy_version", cascade="all, delete-orphan")


class PolicyApproval(BaseModel):
    __tablename__ = "policy_approvals"

    organization_id = Column(String(36), nullable=False, index=True)
    policy_version_id = Column(String(36), ForeignKey("policy_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    approver_email = Column(String(255), nullable=False)
    approver_name = Column(String(255), nullable=False)
    role = Column(String(100), nullable=False)
    approved_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    comments = Column(Text, nullable=True)

    policy_version = relationship("PolicyVersion", back_populates="approvals")


class PolicyAcknowledgement(BaseModel):
    __tablename__ = "policy_acknowledgements"

    organization_id = Column(String(36), nullable=False, index=True)
    policy_version_id = Column(String(36), ForeignKey("policy_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_email = Column(String(255), nullable=False, index=True)
    employee_name = Column(String(255), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_at = Column(DateTime, nullable=False)
    acknowledged_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="PENDING", nullable=False, index=True)  # PENDING, ACKNOWLEDGED, OVERDUE

    policy_version = relationship("PolicyVersion", back_populates="acknowledgements")


class TrainingRecord(BaseModel):
    __tablename__ = "training_records"

    organization_id = Column(String(36), nullable=False, index=True)
    training_module = Column(String(255), nullable=False)
    employee_email = Column(String(255), nullable=False, index=True)
    employee_name = Column(String(255), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    score_percent = Column(Integer, nullable=True)
    certificate_ref = Column(String(255), nullable=True)
    status = Column(String(50), default="ASSIGNED", nullable=False, index=True)  # ASSIGNED, IN_PROGRESS, COMPLETED, EXPIRED
