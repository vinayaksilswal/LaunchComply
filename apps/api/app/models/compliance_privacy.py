"""Phase 7 India DPDP Privacy Operations, Data Inventory, Processing Activities, and DSR Models."""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text
from app.models.base import BaseModel


class DataInventoryItem(BaseModel):
    __tablename__ = "data_inventory_items"

    organization_id = Column(String(36), nullable=False, index=True)
    system_name = Column(String(255), nullable=False)
    application_name = Column(String(255), nullable=False)
    dataset_name = Column(String(255), nullable=False)
    data_category = Column(String(100), nullable=False)  # IDENTIFIER, CONTACT, FINANCIAL, AUTHENTICATION, TECHNICAL_TELEMETRY, BEHAVIORAL, EMPLOYEE
    personal_data = Column(Boolean, default=True, nullable=False)
    sensitive_classification = Column(String(50), default="PERSONAL", nullable=False)  # NON_PERSONAL, PERSONAL, SENSITIVE_PERSONAL, CRITICAL_PERSONAL
    purpose = Column(Text, nullable=False)
    source = Column(String(255), nullable=False)
    data_principals = Column(String(255), default="Customers", nullable=False)
    storage_location = Column(String(255), nullable=False)
    storage_region = Column(String(100), default="ap-south-1", nullable=False)
    retention_period = Column(String(100), default="7 years", nullable=False)
    deletion_method = Column(String(255), default="Cryptographic Erasure / RDS Drop", nullable=False)
    encryption_in_transit = Column(String(100), default="TLS 1.3", nullable=False)
    encryption_at_rest = Column(String(100), default="AWS KMS AES-256", nullable=False)
    access_control = Column(String(255), default="RBAC + MFA Least Privilege", nullable=False)
    subprocessor = Column(String(255), nullable=True)
    cross_border_transfer = Column(Boolean, default=False, nullable=False)


class ProcessingActivity(BaseModel):
    __tablename__ = "processing_activities"

    organization_id = Column(String(36), nullable=False, index=True)
    activity_name = Column(String(255), nullable=False)
    purpose = Column(Text, nullable=False)
    systems_involved = Column(Text, nullable=False)
    data_categories = Column(Text, nullable=False)
    data_principals = Column(Text, nullable=False)
    collection_source = Column(String(255), nullable=False)
    processing_basis = Column(String(100), default="CONTRACTUAL_NECESSITY", nullable=False)  # CONSENT, CONTRACTUAL_NECESSITY, LEGAL_OBLIGATION, LEGITIMATE_USES_SEC_7
    retention_schedule = Column(String(100), nullable=False)
    third_party_sharing = Column(Text, nullable=True)
    subprocessors_involved = Column(Text, nullable=True)
    security_safeguards = Column(Text, nullable=False)
    owner = Column(String(255), nullable=False)
    last_reviewed_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class PrivacyRequest(BaseModel):
    __tablename__ = "privacy_requests"

    organization_id = Column(String(36), nullable=False, index=True)
    request_number = Column(String(50), nullable=False, index=True)  # e.g., DSR-2026-001
    request_type = Column(String(50), default="ACCESS", nullable=False)  # ACCESS, CORRECTION, ERASURE, WITHDRAWAL, GRIEVANCE, OTHER
    data_principal_name = Column(String(255), nullable=False)
    data_principal_email = Column(String(255), nullable=False, index=True)
    status = Column(String(50), default="RECEIVED", nullable=False, index=True)  # RECEIVED, IDENTITY_VERIFICATION, IN_PROGRESS, WAITING, COMPLETED, REJECTED_WITH_REASON, CLOSED
    received_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    owner = Column(String(255), nullable=False)
    verification_method = Column(String(100), default="EMAIL_OTP", nullable=False)  # EMAIL_OTP, GOVERNMENT_ID_MATCH, AUTHENTICATED_SESSION
    rejection_reason = Column(Text, nullable=True)
    response_notes = Column(Text, nullable=True)


class DataRetentionPolicy(BaseModel):
    __tablename__ = "data_retention_policies"

    organization_id = Column(String(36), nullable=False, index=True)
    data_category = Column(String(100), nullable=False)
    system = Column(String(255), nullable=False)
    retention_period_days = Column(Integer, nullable=False)
    deletion_method = Column(String(255), nullable=False)
    justification = Column(Text, nullable=False)
    owner = Column(String(255), nullable=False)
    last_reviewed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
