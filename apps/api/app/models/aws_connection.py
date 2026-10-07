"""
AWS Connection & Onboarding Automation Models (Phase 16 - §11, §13, §18, §19).
Stores template versions, ExternalId lifecycle/rotation, and stack observation logs.
"""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON, ForeignKey
from app.models.base import BaseModel


class AwsOnboardingTemplateVersion(BaseModel):
    """
    Versioned CloudFormation templates for customer AWS onboarding (§13, §14).
    Ensures templates are immutable, checksum-verified, and track revision history.
    """
    __tablename__ = "aws_onboarding_template_versions"

    version = Column(String(50), unique=True, nullable=False, index=True)
    permissions_revision = Column(String(50), nullable=False)
    trust_revision = Column(String(50), nullable=False)
    checksum = Column(String(64), nullable=False)  # SHA256 of template content
    template_yaml = Column(Text, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    deprecated = Column(Boolean, default=False, nullable=False)


class AwsExternalIdRotation(BaseModel):
    """
    Controlled lifecycle and rotation of customer-specific ExternalId values (§10, §11).
    States: ACTIVE, ROTATING, REVOKED.
    """
    __tablename__ = "aws_external_id_rotations"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    cloud_account_id = Column(String(36), ForeignKey("cloud_accounts.id", ondelete="CASCADE"), nullable=True, index=True)
    external_id = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, ROTATING, REVOKED
    rotated_at = Column(DateTime, nullable=True)
    grace_period_deadline = Column(DateTime, nullable=True)


class AwsStackObservation(BaseModel):
    """
    CloudFormation stack status and event ingestion history (§18, §19).
    Translates raw AWS events into customer-safe explanations.
    """
    __tablename__ = "aws_stack_observations"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    cloud_account_id = Column(String(36), ForeignKey("cloud_accounts.id", ondelete="CASCADE"), nullable=True, index=True)
    stack_name = Column(String(255), nullable=False, index=True)
    region = Column(String(50), default="ap-south-1", nullable=False)
    stack_status = Column(String(50), nullable=False)  # CREATE_IN_PROGRESS, CREATE_COMPLETE, CREATE_FAILED, etc.
    events_json = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    customer_safe_summary = Column(Text, nullable=True)
