"""Phase 10 MSP & Security Consultancy Partner Control Plane Models."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class PartnerRole(str, enum.Enum):
    PARTNER_ADMIN = "PARTNER_ADMIN"
    PARTNER_CONSULTANT = "PARTNER_CONSULTANT"
    PARTNER_AUDITOR = "PARTNER_AUDITOR"


class RelationshipStatus(str, enum.Enum):
    INVITED = "INVITED"
    PENDING_CUSTOMER_APPROVAL = "PENDING_CUSTOMER_APPROVAL"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    REVOKED = "REVOKED"


class PartnerOrganization(BaseModel):
    """Managed service provider or cybersecurity consultancy partner entity."""
    __tablename__ = "partner_organizations"

    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    contact_email = Column(String(255), nullable=False)
    website = Column(String(255), nullable=True)
    tier = Column(String(50), default="CERTIFIED", nullable=False)  # REGISTERED, CERTIFIED, PREMIER
    is_verified = Column(Boolean, default=True, nullable=False)
    branding_logo_url = Column(String(500), nullable=True)
    brand_name = Column(String(255), nullable=True)
    primary_accent_color = Column(String(20), default="#06B6D4", nullable=False)


class PartnerMembership(BaseModel):
    """Team members belonging to a partner organization."""
    __tablename__ = "partner_memberships"

    partner_id = Column(String(36), ForeignKey("partner_organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(PartnerRole), default=PartnerRole.PARTNER_CONSULTANT, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class ManagedCustomerRelationship(BaseModel):
    """Explicit customer authorization granting delegated management to a partner."""
    __tablename__ = "partner_managed_customer_relationships"

    partner_id = Column(String(36), ForeignKey("partner_organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(RelationshipStatus), default=RelationshipStatus.ACTIVE, nullable=False, index=True)
    delegated_permissions_json = Column(Text, default="[]", nullable=False)
    approved_by = Column(String(36), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)


class PartnerServiceCatalog(BaseModel):
    """Services offered by an MSP or advisory firm."""
    __tablename__ = "partner_service_catalogs"

    partner_id = Column(String(36), ForeignKey("partner_organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    service_name = Column(String(255), nullable=False)
    category = Column(String(100), default="MANAGED_SECURITY", nullable=False)  # CLOUD_DEPLOYMENT, MANAGED_SECURITY, VAPT, SOC2_READINESS, ISO27001_READINESS
    description = Column(Text, nullable=False)
    base_price = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
