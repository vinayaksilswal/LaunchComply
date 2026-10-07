"""Phase 7 Vendor and Subprocessor Risk Management Models."""
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Vendor(BaseModel):
    __tablename__ = "vendors"

    organization_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), default="INFRASTRUCTURE", nullable=False)  # INFRASTRUCTURE, SAAS_APPLICATION, COMMUNICATION, PAYMENT_GATEWAY, AI_SERVICE, DEVELOPMENT_TOOL
    service_description = Column(Text, nullable=False)
    criticality = Column(String(50), default="HIGH", nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW
    risk_level = Column(String(50), default="LOW", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(50), default="APPROVED", nullable=False, index=True)  # APPROVED, CONDITIONAL, REJECTED, UNDER_REVIEW
    dpa_status = Column(String(50), default="EXECUTED", nullable=False)  # EXECUTED, PENDING_REVIEW, NOT_APPLICABLE
    country = Column(String(100), default="USA / India", nullable=False)
    owner = Column(String(255), nullable=False)
    contract_expiry = Column(DateTime, nullable=True)
    last_assessment_date = Column(DateTime, nullable=True)
    next_review_date = Column(DateTime, nullable=True)
    security_certifications = Column(String(255), default="SOC 2 Type II, ISO 27001", nullable=False)

    assessments = relationship("VendorAssessment", back_populates="vendor", cascade="all, delete-orphan")
    findings = relationship("VendorFinding", back_populates="vendor", cascade="all, delete-orphan")


class VendorAssessment(BaseModel):
    __tablename__ = "vendor_assessments"

    organization_id = Column(String(36), nullable=False, index=True)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_title = Column(String(255), nullable=False)
    assessor = Column(String(255), nullable=False)
    assessment_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    security_score = Column(Integer, default=85, nullable=False)
    privacy_score = Column(Integer, default=80, nullable=False)
    availability_score = Column(Integer, default=95, nullable=False)
    overall_score = Column(Integer, default=87, nullable=False)
    decision = Column(String(50), default="APPROVED", nullable=False)  # APPROVED, CONDITIONAL, REJECTED
    decision_notes = Column(Text, nullable=True)
    status = Column(String(50), default="COMPLETED", nullable=False)  # DRAFT, COMPLETED

    vendor = relationship("Vendor", back_populates="assessments")


class VendorFinding(BaseModel):
    __tablename__ = "vendor_findings"

    organization_id = Column(String(36), nullable=False, index=True)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    severity = Column(String(50), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    description = Column(Text, nullable=False)
    mitigation_required = Column(Text, nullable=False)
    due_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="OPEN", nullable=False, index=True)  # OPEN, MITIGATED, ACCEPTED

    vendor = relationship("Vendor", back_populates="findings")
