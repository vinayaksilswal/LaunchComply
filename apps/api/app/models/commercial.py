"""Phase 8 Commercial Product Catalog, Pricing, Entitlements and Usage Models."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class PlanTier(str, enum.Enum):
    STARTER = "STARTER"
    GROWTH = "GROWTH"
    BUSINESS = "BUSINESS"
    ENTERPRISE = "ENTERPRISE"


class BillingInterval(str, enum.Enum):
    MONTHLY = "MONTHLY"
    ANNUAL = "ANNUAL"


class ValueType(str, enum.Enum):
    BOOLEAN = "BOOLEAN"
    NUMERIC = "NUMERIC"
    STRING = "STRING"


class EntitlementSource(str, enum.Enum):
    PLAN = "PLAN"
    ADDON = "ADDON"
    ENTERPRISE_OVERRIDE = "ENTERPRISE_OVERRIDE"
    TRIAL = "TRIAL"
    PROMOTION = "PROMOTION"
    MANUAL_ADMIN = "MANUAL_ADMIN"


class Product(BaseModel):
    """Commercial product offering."""
    __tablename__ = "commercial_products"

    product_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    plans = relationship("Plan", back_populates="product", cascade="all, delete-orphan")


class Plan(BaseModel):
    """Subscription tier under a commercial product."""
    __tablename__ = "commercial_plans"

    product_id = Column(String(36), ForeignKey("commercial_products.id", ondelete="CASCADE"), nullable=False, index=True)
    tier = Column(Enum(PlanTier), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    tagline = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    trial_days = Column(Integer, default=14, nullable=False)
    display_order = Column(Integer, default=1, nullable=False)

    product = relationship("Product", back_populates="plans")
    prices = relationship("Price", back_populates="plan", cascade="all, delete-orphan")
    entitlements = relationship("PlanEntitlement", back_populates="plan", cascade="all, delete-orphan")


class Price(BaseModel):
    """Recurring or one-time price point for a Plan."""
    __tablename__ = "commercial_prices"

    plan_id = Column(String(36), ForeignKey("commercial_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    currency = Column(String(10), default="INR", nullable=False)  # INR or USD
    interval = Column(Enum(BillingInterval), default=BillingInterval.MONTHLY, nullable=False)
    amount = Column(Float, nullable=False)  # in major units e.g. 4999.00
    stripe_price_id = Column(String(100), nullable=True)
    razorpay_plan_id = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    plan = relationship("Plan", back_populates="prices")


class PlanEntitlement(BaseModel):
    """Baseline feature entitlement limits bundled with a plan."""
    __tablename__ = "commercial_plan_entitlements"

    plan_id = Column(String(36), ForeignKey("commercial_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_key = Column(String(100), nullable=False, index=True)
    value_type = Column(Enum(ValueType), default=ValueType.NUMERIC, nullable=False)
    boolean_value = Column(Boolean, nullable=True)
    numeric_value = Column(Float, nullable=True)
    string_value = Column(String(255), nullable=True)

    plan = relationship("Plan", back_populates="entitlements")


class OrganizationEntitlement(BaseModel):
    """Organization-specific entitlement overrides, trial limits, or custom enterprise terms."""
    __tablename__ = "commercial_organization_entitlements"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_key = Column(String(100), nullable=False, index=True)
    value_type = Column(Enum(ValueType), default=ValueType.NUMERIC, nullable=False)
    boolean_value = Column(Boolean, nullable=True)
    numeric_value = Column(Float, nullable=True)
    string_value = Column(String(255), nullable=True)
    source = Column(Enum(EntitlementSource), default=EntitlementSource.PLAN, nullable=False)
    effective_from = Column(DateTime, default=datetime.utcnow, nullable=False)
    effective_to = Column(DateTime, nullable=True)


class UsageMetricDefinition(BaseModel):
    """Catalog of meterable technical and compliance usage dimensions."""
    __tablename__ = "commercial_usage_metric_definitions"

    metric_key = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    unit = Column(String(50), default="count", nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)


class UsageEvent(BaseModel):
    """Raw idempotent metered usage event."""
    __tablename__ = "commercial_usage_events"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_key = Column(String(100), nullable=False, index=True)
    quantity = Column(Float, default=1.0, nullable=False)
    idempotency_key = Column(String(150), unique=True, nullable=False, index=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    source = Column(String(100), default="internal_engine", nullable=False)


class UsageAggregate(BaseModel):
    """Periodic rolled-up usage aggregate per organization and metric."""
    __tablename__ = "commercial_usage_aggregates"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_key = Column(String(100), nullable=False, index=True)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    total_quantity = Column(Float, default=0.0, nullable=False)
