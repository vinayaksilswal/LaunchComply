"""Phase 8 CRM, Leads, Opportunities, Quotes and Service Orders Models."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class LeadStatus(str, enum.Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    QUALIFIED = "QUALIFIED"
    UNQUALIFIED = "UNQUALIFIED"


class OpportunityStage(str, enum.Enum):
    NEW = "NEW"
    QUALIFIED = "QUALIFIED"
    DISCOVERY = "DISCOVERY"
    SOLUTION_DESIGN = "SOLUTION_DESIGN"
    PROPOSAL = "PROPOSAL"
    NEGOTIATION = "NEGOTIATION"
    WON = "WON"
    LOST = "LOST"


class QuoteStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    INTERNAL_REVIEW = "INTERNAL_REVIEW"
    SENT = "SENT"
    VIEWED = "VIEWED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class OrderStatus(str, enum.Enum):
    CREATED = "CREATED"
    IN_PROGRESS = "IN_PROGRESS"
    DELIVERED = "DELIVERED"
    CLOSED = "CLOSED"


class Lead(BaseModel):
    """Prospective business lead."""
    __tablename__ = "commercial_crm_leads"

    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    company = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    source = Column(String(100), default="WEBSITE", nullable=False)  # DEMO_REQUEST, VAPT_INQUIRY, COMPLIANCE_INQUIRY, REFERRAL
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW, nullable=False, index=True)
    estimated_value = Column(Float, default=0.0, nullable=False)
    notes = Column(Text, nullable=True)


class Opportunity(BaseModel):
    """Commercial sales opportunity pipeline."""
    __tablename__ = "commercial_crm_opportunities"

    title = Column(String(255), nullable=False)
    lead_id = Column(String(36), ForeignKey("commercial_crm_leads.id", ondelete="SET NULL"), nullable=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    stage = Column(Enum(OpportunityStage), default=OpportunityStage.NEW, nullable=False, index=True)
    product_or_service = Column(String(255), nullable=False)
    estimated_value = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    expected_close_date = Column(DateTime, nullable=True)
    owner = Column(String(255), default="Sales Lead", nullable=False)
    next_action = Column(String(255), nullable=True)
    closed_lost_reason = Column(String(100), nullable=True)
    closed_won_reason = Column(String(100), nullable=True)
    primary_objection = Column(String(100), nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False)


class ServiceQuote(BaseModel):
    """Commercial proposal & quote for professional or implementation services."""
    __tablename__ = "commercial_service_quotes"

    quote_number = Column(String(50), unique=True, nullable=False, index=True)  # e.g. LC-QUO-2026-0001
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    service_name = Column(String(255), nullable=False)
    scope_description = Column(Text, nullable=False)
    deliverables_description = Column(Text, nullable=False)
    subtotal = Column(Float, nullable=False)
    tax_amount = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    valid_until = Column(DateTime, nullable=False)
    status = Column(Enum(QuoteStatus), default=QuoteStatus.DRAFT, nullable=False, index=True)
    proposal_text = Column(Text, nullable=True)

    order = relationship("ServiceOrder", back_populates="quote", uselist=False)


class ServiceOrder(BaseModel):
    """Customer-accepted service contract execution record."""
    __tablename__ = "commercial_service_orders"

    order_number = Column(String(50), unique=True, nullable=False, index=True)  # e.g. LC-ORD-2026-0001
    quote_id = Column(String(36), ForeignKey("commercial_service_quotes.id", ondelete="SET NULL"), unique=True, nullable=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    service_name = Column(String(255), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.CREATED, nullable=False, index=True)
    assigned_consultant = Column(String(255), default="LaunchComply Advisory Team", nullable=False)
    total_amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    milestones_json = Column(Text, default="[]", nullable=False)

    quote = relationship("ServiceQuote", back_populates="order")
