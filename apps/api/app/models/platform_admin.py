"""Phase 8 Platform Admin, Feature Flags, Product Analytics, Customer Success, and Status Incidents Models."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum

from app.models.base import BaseModel


class FeatureFlagScope(str, enum.Enum):
    GLOBAL = "GLOBAL"
    PLAN = "PLAN"
    ORGANIZATION = "ORGANIZATION"
    USER = "USER"


class CustomerHealthStatus(str, enum.Enum):
    HEALTHY = "HEALTHY"
    NEEDS_ATTENTION = "NEEDS_ATTENTION"
    AT_RISK = "AT_RISK"
    UNKNOWN = "UNKNOWN"


class StatusIncidentImpact(str, enum.Enum):
    NONE = "NONE"
    MINOR = "MINOR"
    MAJOR = "MAJOR"
    CRITICAL = "CRITICAL"


class StatusIncidentState(str, enum.Enum):
    INVESTIGATING = "INVESTIGATING"
    IDENTIFIED = "IDENTIFIED"
    MONITORING = "MONITORING"
    RESOLVED = "RESOLVED"


class FeatureFlag(BaseModel):
    """Platform feature flag configuration."""
    __tablename__ = "commercial_feature_flags"

    key = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_enabled_default = Column(Boolean, default=False, nullable=False)


class FeatureFlagOverride(BaseModel):
    """Granular flag overrides for specific plans, orgs, or users."""
    __tablename__ = "commercial_feature_flag_overrides"

    flag_key = Column(String(100), nullable=False, index=True)
    scope_type = Column(Enum(FeatureFlagScope), default=FeatureFlagScope.ORGANIZATION, nullable=False)
    scope_id = Column(String(100), nullable=False, index=True)
    is_enabled = Column(Boolean, nullable=False)


class PlatformSetting(BaseModel):
    """Platform configuration parameter."""
    __tablename__ = "commercial_platform_settings"

    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)


class ProductEvent(BaseModel):
    """Privacy-conscious product analytics telemetry."""
    __tablename__ = "commercial_product_events"

    event_name = Column(String(100), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    metadata_json = Column(Text, default="{}", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CustomerSuccessHealth(BaseModel):
    """Customer health assessment record."""
    __tablename__ = "commercial_customer_success_health"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    status = Column(Enum(CustomerHealthStatus), default=CustomerHealthStatus.HEALTHY, nullable=False, index=True)
    health_score = Column(Float, default=100.0, nullable=False)
    components_json = Column(Text, default="{}", nullable=False)  # {"deployment": 30, "security": 25, "engagement": 15, "support": 20}
    health_trend = Column(String(20), default="STABLE", nullable=False)  # IMPROVING, STABLE, DECLINING
    trend_reason = Column(String(255), nullable=True)
    reasons_json = Column(Text, default="[]", nullable=False)
    last_evaluated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CustomerSuccessTask(BaseModel):
    """Action items for customer success representatives."""
    __tablename__ = "commercial_customer_success_tasks"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    due_date = Column(DateTime, nullable=False)
    status = Column(String(50), default="OPEN", nullable=False)
    owner = Column(String(255), default="Customer Success Lead", nullable=False)


class StatusIncident(BaseModel):
    """Public platform status incident displayed on /status."""
    __tablename__ = "commercial_status_incidents"

    title = Column(String(255), nullable=False)
    state = Column(Enum(StatusIncidentState), default=StatusIncidentState.INVESTIGATING, nullable=False, index=True)
    impact = Column(Enum(StatusIncidentImpact), default=StatusIncidentImpact.MINOR, nullable=False)
    message = Column(Text, nullable=False)
    affected_components_json = Column(Text, default="[]", nullable=False)
    resolved_at = Column(DateTime, nullable=True)


class LightweightExperiment(BaseModel):
    """Lightweight onboarding/pricing experiment framework (§85-90)."""
    __tablename__ = "commercial_experiments"

    name = Column(String(255), unique=True, nullable=False, index=True)
    hypothesis = Column(Text, nullable=False)
    metric = Column(String(100), nullable=False)
    audience = Column(String(100), default="ALL_TRAFFIC", nullable=False)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    variant = Column(String(100), default="A_CONTROL", nullable=False)
    result_json = Column(Text, default="{}", nullable=False)
    status = Column(String(50), default="DRAFT", nullable=False)  # DRAFT, RUNNING, CONCLUDED, ABORTED


Experiment = LightweightExperiment


class ManualAssistanceTask(BaseModel):
    """Tracks human engineering/TAM work for early customers to drive Phase 15 automation (§45-47, §114-116)."""
    __tablename__ = "commercial_manual_assistance_tasks"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    task_name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)  # AWS, DNS, DEPLOYMENT, SECURITY, VAPT, COMPLIANCE, BILLING, TRAINING
    duration_minutes = Column(Integer, default=30, nullable=False)
    operator = Column(String(255), nullable=False)
    resolution_notes = Column(Text, nullable=True)
    is_automation_candidate = Column(Boolean, default=False, nullable=False)

