"""Phase 10 Enterprise Scale: Business Units, Custom Frameworks & Outbound Webhooks."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class BusinessUnitRole(str, enum.Enum):
    BU_ADMIN = "BU_ADMIN"
    REGIONAL_ADMIN = "REGIONAL_ADMIN"
    BU_MEMBER = "BU_MEMBER"


class WebhookDeliveryStatus(str, enum.Enum):
    PENDING = "PENDING"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"
    DEAD_LETTER = "DEAD_LETTER"


class BusinessUnit(BaseModel):
    """Regional or departmental business unit within an enterprise."""
    __tablename__ = "enterprise_business_units"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_business_unit_id = Column(String(36), ForeignKey("enterprise_business_units.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False)  # e.g., BU-INDIA, BU-US
    region = Column(String(100), default="GLOBAL", nullable=False)
    owner = Column(String(255), nullable=False)


class BusinessUnitMembership(BaseModel):
    """Assignment of users to specific enterprise business units."""
    __tablename__ = "enterprise_business_unit_memberships"

    business_unit_id = Column(String(36), ForeignKey("enterprise_business_units.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(BusinessUnitRole), default=BusinessUnitRole.BU_MEMBER, nullable=False)


class CustomFrameworkImport(BaseModel):
    """Custom corporate security standard or compliance framework."""
    __tablename__ = "enterprise_custom_frameworks"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    business_unit_id = Column(String(36), ForeignKey("enterprise_business_units.id", ondelete="SET NULL"), nullable=True)
    framework_name = Column(String(255), nullable=False)
    version = Column(String(50), default="1.0", nullable=False)
    controls_count = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)


class OutboundWebhook(BaseModel):
    """Outbound webhook subscription dispatching real-time security & compliance events."""
    __tablename__ = "enterprise_outbound_webhooks"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    target_url = Column(String(500), nullable=False)
    secret_token_encrypted = Column(Text, nullable=False)
    subscribed_events_json = Column(Text, default="[]", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class WebhookDelivery(BaseModel):
    """Audit log of dispatched outbound webhook payload deliveries."""
    __tablename__ = "enterprise_webhook_deliveries"

    webhook_id = Column(String(36), ForeignKey("enterprise_outbound_webhooks.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    payload_hash = Column(String(64), nullable=False)
    status = Column(Enum(WebhookDeliveryStatus), default=WebhookDeliveryStatus.PENDING, nullable=False, index=True)
    response_code = Column(Integer, nullable=True)
    attempt_count = Column(Integer, default=1, nullable=False)
    delivered_at = Column(DateTime, nullable=True)
