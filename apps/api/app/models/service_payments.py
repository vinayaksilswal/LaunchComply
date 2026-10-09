"""Immutable service quotes and provider-confirmed one-time payment records."""
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, UniqueConstraint, Boolean
from app.models.base import BaseModel


class ServiceQuote(BaseModel):
    __tablename__ = "service_quotes"
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    request_id = Column(String(36), ForeignKey("service_requests.id"), nullable=False, unique=True)
    architecture_id = Column(String(36), ForeignKey("architectures.id"), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    scope = Column(Text, nullable=False)
    amount_minor = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False)
    status = Column(String(30), nullable=False, default="OPEN")
    delivery_mode = Column(String(30), nullable=False, default="ASSISTED_SERVICE")


class ServiceCheckout(BaseModel):
    __tablename__ = "service_checkouts"
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    quote_id = Column(String(36), ForeignKey("service_quotes.id"), unique=True, nullable=False)
    provider = Column(String(15), nullable=False)
    mode = Column(String(8), nullable=False)
    status = Column(String(30), nullable=False, default="CREATING")
    provider_reference = Column(String(120), unique=True, nullable=True)
    checkout_url = Column(Text, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_real_payment_verified = Column(Boolean, nullable=False, default=False)


class ServicePaymentEvent(BaseModel):
    __tablename__ = "service_payment_events"
    __table_args__ = (UniqueConstraint("provider", "provider_event_id", name="uq_service_payment_provider_event"),)
    provider = Column(String(15), nullable=False)
    provider_event_id = Column(String(150), nullable=False)
    event_type = Column(String(100), nullable=False)
    payload_sha256 = Column(String(64), nullable=False)
    status = Column(String(30), nullable=False)
    checkout_id = Column(String(36), ForeignKey("service_checkouts.id"), nullable=True)
