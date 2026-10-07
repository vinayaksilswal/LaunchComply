"""Phase 8 Commercial Billing, Subscriptions, Invoices and Tax Profiles."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class SubscriptionStatus(str, enum.Enum):
    TRIALING = "TRIALING"
    ACTIVE = "ACTIVE"
    PAST_DUE = "PAST_DUE"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    GRACE_PERIOD = "GRACE_PERIOD"
    PAUSED = "PAUSED"
    CANCEL_AT_PERIOD_END = "CANCEL_AT_PERIOD_END"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    INVOICE_ONLY = "INVOICE_ONLY"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    UNCOLLECTIBLE = "UNCOLLECTIBLE"
    VOID = "VOID"


class PaymentStatus(str, enum.Enum):
    SUCCEEDED = "SUCCEEDED"
    PENDING = "PENDING"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class BillingProviderType(str, enum.Enum):
    STRIPE = "STRIPE"
    RAZORPAY = "RAZORPAY"
    MANUAL_INVOICE = "MANUAL_INVOICE"


class PaymentSource(str, enum.Enum):
    STRIPE = "STRIPE"
    RAZORPAY = "RAZORPAY"
    BANK_TRANSFER = "BANK_TRANSFER"
    MANUAL_INVOICE = "MANUAL_INVOICE"
    CREDIT = "CREDIT"
    OTHER_APPROVED = "OTHER_APPROVED"
    TEST = "TEST"
    DEMO = "DEMO"


class PaymentRealityStatus(str, enum.Enum):
    UNVERIFIED = "UNVERIFIED"
    TEST = "TEST"
    PENDING = "PENDING"
    RECONCILED = "RECONCILED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    VOID = "VOID"


class OrganizationProfile(BaseModel):
    """Legal, business and tax profile of the customer organization."""
    __tablename__ = "commercial_organization_profiles"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    legal_name = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    country = Column(String(10), default="IN", nullable=False)
    state = Column(String(100), default="Karnataka", nullable=False)
    postal_code = Column(String(20), nullable=True)
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    gstin = Column(String(20), nullable=True, index=True)
    pan = Column(String(20), nullable=True)
    billing_email = Column(String(255), nullable=False)
    security_email = Column(String(255), nullable=True)
    compliance_email = Column(String(255), nullable=True)
    company_size = Column(String(50), default="11-50", nullable=True)
    industry = Column(String(100), default="SaaS / Cloud Technology", nullable=True)


class BillingCustomer(BaseModel):
    """Customer identity mapped into billing gateways."""
    __tablename__ = "commercial_billing_customers"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    stripe_customer_id = Column(String(100), unique=True, nullable=True, index=True)
    razorpay_customer_id = Column(String(100), unique=True, nullable=True, index=True)
    currency = Column(String(10), default="INR", nullable=False)
    default_payment_method_id = Column(String(100), nullable=True)


class Subscription(BaseModel):
    """Commercial subscription state."""
    __tablename__ = "commercial_subscriptions"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    plan_tier = Column(String(50), default="GROWTH", nullable=False)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIALING, nullable=False, index=True)
    billing_provider = Column(Enum(BillingProviderType), default=BillingProviderType.STRIPE, nullable=False)
    external_subscription_id = Column(String(100), nullable=True, index=True)
    current_period_start = Column(DateTime, default=datetime.utcnow, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    trial_start = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)
    cancel_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    grace_period_end = Column(DateTime, nullable=True)
    interval = Column(String(20), default="MONTHLY", nullable=False)
    amount = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    payment_source = Column(String(50), default="TEST", nullable=False)  # STRIPE, RAZORPAY, BANK_TRANSFER, MANUAL_INVOICE, CREDIT, OTHER_APPROVED, TEST, DEMO
    reality_status = Column(String(50), default="TEST", nullable=False)  # UNVERIFIED, TEST, PENDING, RECONCILED, FAILED, REFUNDED, VOID
    is_real_payment_verified = Column(Boolean, default=False, nullable=False)

    items = relationship("SubscriptionItem", back_populates="subscription", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="subscription", cascade="all, delete-orphan")


class SubscriptionItem(BaseModel):
    """Individual line item or add-on bundled with a subscription."""
    __tablename__ = "commercial_subscription_items"

    subscription_id = Column(String(36), ForeignKey("commercial_subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    item_type = Column(String(50), default="BASE_PLAN", nullable=False)
    external_price_id = Column(String(100), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    unit_amount = Column(Float, default=0.0, nullable=False)

    subscription = relationship("Subscription", back_populates="items")


class Invoice(BaseModel):
    """Tax and commercial invoice issued to an organization."""
    __tablename__ = "commercial_invoices"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id = Column(String(36), ForeignKey("commercial_subscriptions.id", ondelete="SET NULL"), nullable=True, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)  # e.g. LC-INV-2026-0001
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.OPEN, nullable=False, index=True)
    currency = Column(String(10), default="INR", nullable=False)
    subtotal = Column(Float, default=0.0, nullable=False)
    tax_amount = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)
    tax_breakdown_json = Column(Text, nullable=True)  # CGST/SGST/IGST breakdown
    customer_legal_name = Column(String(255), nullable=False)
    customer_gstin = Column(String(20), nullable=True)
    customer_state = Column(String(100), nullable=True)
    billing_provider = Column(Enum(BillingProviderType), default=BillingProviderType.STRIPE, nullable=False)
    payment_source = Column(String(50), default="MANUAL_INVOICE", nullable=True)
    reality_status = Column(String(50), default="TEST", nullable=False)
    bank_reference = Column(String(100), nullable=True)
    reconciled_by = Column(String(255), nullable=True)
    reconciled_at = Column(DateTime, nullable=True)
    external_invoice_id = Column(String(100), nullable=True)
    payment_due_date = Column(DateTime, nullable=False)
    paid_at = Column(DateTime, nullable=True)
    pdf_url = Column(String(500), nullable=True)

    subscription = relationship("Subscription", back_populates="invoices")
    line_items = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLineItem(BaseModel):
    """Line item on a tax invoice."""
    __tablename__ = "commercial_invoice_line_items"

    invoice_id = Column(String(36), ForeignKey("commercial_invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    hsn_sac_code = Column(String(20), default="998313", nullable=True)  # Information technology services

    invoice = relationship("Invoice", back_populates="line_items")


class Payment(BaseModel):
    """Captured financial transaction against an invoice."""
    __tablename__ = "commercial_payments"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(String(36), ForeignKey("commercial_invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    provider = Column(Enum(BillingProviderType), nullable=False)
    payment_source = Column(String(50), default="TEST", nullable=False)
    reality_status = Column(String(50), default="TEST", nullable=False)  # UNVERIFIED, TEST, PENDING, RECONCILED, FAILED, REFUNDED, VOID
    transaction_reference = Column(String(150), unique=True, nullable=False, index=True)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.SUCCEEDED, nullable=False)
    utr_number = Column(String(100), nullable=True, index=True)
    finance_verifier_role = Column(String(100), nullable=True)
    revenue_type = Column(String(50), default="SERVICE", nullable=False)  # SERVICE, SUBSCRIPTION
    reconciled_by = Column(String(255), nullable=True)
    reconciled_at = Column(DateTime, nullable=True)
    reconciliation_notes = Column(Text, nullable=True)
    paid_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    receipt_url = Column(String(500), nullable=True)

    invoice = relationship("Invoice", back_populates="payments")


class Coupon(BaseModel):
    """Promotional discount code."""
    __tablename__ = "commercial_coupons"

    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_percentage = Column(Float, nullable=True)
    discount_amount = Column(Float, nullable=True)
    currency = Column(String(10), default="INR", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime, nullable=True)
