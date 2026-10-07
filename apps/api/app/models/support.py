"""Phase 8 Support Ticketing and SLA Operations Models."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class TicketPriority(str, enum.Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_CUSTOMER = "WAITING_CUSTOMER"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class TicketCategory(str, enum.Enum):
    BILLING = "BILLING"
    DEPLOYMENT = "DEPLOYMENT"
    AWS = "AWS"
    SECURITY = "SECURITY"
    VAPT = "VAPT"
    COMPLIANCE = "COMPLIANCE"
    BUG = "BUG"
    ACCOUNT = "ACCOUNT"
    FEATURE_REQUEST = "FEATURE_REQUEST"
    INCIDENT = "INCIDENT"


class SupportTicket(BaseModel):
    """Customer support case."""
    __tablename__ = "commercial_support_tickets"

    ticket_number = Column(String(50), unique=True, nullable=False, index=True)  # e.g. LC-TCK-2026-0001
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    category = Column(Enum(TicketCategory), default=TicketCategory.DEPLOYMENT, nullable=False)
    priority = Column(Enum(TicketPriority), default=TicketPriority.NORMAL, nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN, nullable=False, index=True)
    assigned_to_email = Column(String(255), nullable=True)
    root_cause = Column(String(50), nullable=True, index=True)  # DOCUMENTATION, UX, PRODUCT_BUG, PROVIDER, CUSTOMER_CONFIG, PLATFORM_INCIDENT, FEATURE_GAP
    product_area = Column(String(50), default="DEPLOYMENT", nullable=False)  # AWS, DEPLOYMENT, SECURITY, BILLING, COMPLIANCE
    linked_incident_id = Column(String(36), nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)
    sla_response_due_at = Column(DateTime, nullable=True)
    first_responded_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    messages = relationship("SupportMessage", back_populates="ticket", cascade="all, delete-orphan")
    attachments = relationship("SupportAttachment", back_populates="ticket", cascade="all, delete-orphan")


class SupportMessage(BaseModel):
    """Message exchange in a support case."""
    __tablename__ = "commercial_support_messages"

    ticket_id = Column(String(36), ForeignKey("commercial_support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sender_email = Column(String(255), nullable=False)
    sender_name = Column(String(255), default="LaunchComply Support", nullable=False)
    is_internal = Column(Boolean, default=False, nullable=False)
    content = Column(Text, nullable=False)

    ticket = relationship("SupportTicket", back_populates="messages")


class SupportAttachment(BaseModel):
    """File attachment linked to support ticket."""
    __tablename__ = "commercial_support_attachments"

    ticket_id = Column(String(36), ForeignKey("commercial_support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    message_id = Column(String(36), ForeignKey("commercial_support_messages.id", ondelete="SET NULL"), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, default=0, nullable=False)
    mime_type = Column(String(100), default="application/octet-stream", nullable=False)
    storage_key = Column(String(500), nullable=False)

    ticket = relationship("SupportTicket", back_populates="attachments")


class SupportSLA(BaseModel):
    """SLA targets per plan and priority."""
    __tablename__ = "commercial_support_slas"

    plan_tier = Column(String(50), nullable=False, index=True)
    priority = Column(Enum(TicketPriority), nullable=False)
    first_response_hours = Column(Float, nullable=False)
    resolution_hours = Column(Float, nullable=False)
