"""Phase 5 Operations, Observability, Incidents, Backup/DR, Cloud Security, Cost, and Continuous Compliance Models."""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Float, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class MonitoringConfiguration(BaseModel):
    __tablename__ = "monitoring_configurations"

    organization_id = Column(String(36), nullable=False, index=True)
    application_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    enabled = Column(Boolean, default=True, nullable=False)
    provider = Column(String(50), default="CLOUDWATCH", nullable=False)  # CLOUDWATCH, DATADOG, GRAFANA, PROMETHEUS
    poll_interval_seconds = Column(Integer, default=60, nullable=False)
    retention_days = Column(Integer, default=90, nullable=False)


class HealthSnapshot(BaseModel):
    __tablename__ = "health_snapshots"

    organization_id = Column(String(36), nullable=False, index=True)
    application_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    overall_status = Column(String(50), default="HEALTHY", nullable=False, index=True)  # HEALTHY, DEGRADED, AT_RISK, CRITICAL, UNKNOWN, MAINTENANCE
    component_status_json = Column(JSON, nullable=False)
    reasons_json = Column(JSON, default=list, nullable=False)
    captured_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class MetricDefinition(BaseModel):
    __tablename__ = "metric_definitions"

    name = Column(String(100), unique=True, nullable=False)
    provider_metric = Column(String(100), nullable=False)
    namespace = Column(String(100), nullable=False)
    unit = Column(String(50), nullable=False)
    aggregation = Column(String(50), default="Average", nullable=False)  # Average, p95, Maximum, Sum
    default_thresholds_json = Column(JSON, nullable=True)


class AlertRule(BaseModel):
    __tablename__ = "alert_rules"

    organization_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    metric = Column(String(100), nullable=False)  # alb_5xx_rate, api_latency_p95, ecs_cpu, rds_free_storage
    condition = Column(String(10), default="GT", nullable=False)  # GT, LT, EQ
    threshold = Column(Float, nullable=False)
    window_minutes = Column(Integer, default=5, nullable=False)
    severity = Column(String(20), default="HIGH", nullable=False)  # INFO, LOW, MEDIUM, HIGH, CRITICAL
    enabled = Column(Boolean, default=True, nullable=False)
    auto_create_incident = Column(Boolean, default=True, nullable=False)
    auto_rollback_release = Column(Boolean, default=False, nullable=False)
    created_by = Column(String(255), nullable=False)

    events = relationship("AlertEvent", back_populates="rule", cascade="all, delete-orphan")


class AlertEvent(BaseModel):
    __tablename__ = "alert_events"

    organization_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    alert_rule_id = Column(String(36), ForeignKey("alert_rules.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="OPEN", nullable=False, index=True)  # OPEN, ACKNOWLEDGED, RESOLVED, SUPPRESSED
    severity = Column(String(20), nullable=False)
    value = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(255), nullable=True)
    incident_id = Column(String(36), nullable=True, index=True)

    rule = relationship("AlertRule", back_populates="events")


class UptimeCheck(BaseModel):
    __tablename__ = "uptime_checks"

    organization_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    check_type = Column(String(50), default="HTTPS", nullable=False)  # HTTP, HTTPS, TLS, HEALTH_ENDPOINT, API_PING
    interval_seconds = Column(Integer, default=60, nullable=False)
    timeout_seconds = Column(Integer, default=10, nullable=False)
    expected_status = Column(Integer, default=200, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)

    results = relationship("UptimeResult", back_populates="check", cascade="all, delete-orphan")


class UptimeResult(BaseModel):
    __tablename__ = "uptime_results"

    uptime_check_id = Column(String(36), ForeignKey("uptime_checks.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="UP", nullable=False)  # UP, DOWN, DEGRADED
    response_code = Column(Integer, nullable=True)
    latency_ms = Column(Float, nullable=True)
    checked_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    failure_reason = Column(String(500), nullable=True)

    check = relationship("UptimeCheck", back_populates="results")


class ServiceLevelObjective(BaseModel):
    __tablename__ = "service_level_objectives"

    organization_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    indicator = Column(String(50), default="AVAILABILITY", nullable=False)  # AVAILABILITY, LATENCY_P95, ERROR_RATE
    target_percentage = Column(Float, default=99.9, nullable=False)
    window_days = Column(Integer, default=30, nullable=False)

    snapshots = relationship("SLOSnapshot", back_populates="slo", cascade="all, delete-orphan")


class SLOSnapshot(BaseModel):
    __tablename__ = "slo_snapshots"

    slo_id = Column(String(36), ForeignKey("service_level_objectives.id", ondelete="CASCADE"), nullable=False, index=True)
    actual_percentage = Column(Float, nullable=False)
    error_budget_remaining = Column(Float, nullable=False)
    window_start = Column(DateTime, nullable=False)
    window_end = Column(DateTime, nullable=False)

    slo = relationship("ServiceLevelObjective", back_populates="snapshots")


class Incident(BaseModel):
    __tablename__ = "incidents"

    organization_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    application_id = Column(String(36), nullable=False, index=True)
    release_id = Column(String(36), nullable=True, index=True)
    deployment_id = Column(String(36), nullable=True, index=True)
    alert_event_id = Column(String(36), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(20), default="SEV2", nullable=False, index=True)  # SEV1, SEV2, SEV3, SEV4
    commander = Column(String(255), nullable=True)
    impact = Column(String(500), nullable=True)
    status = Column(String(50), default="DETECTED", nullable=False, index=True)  # DETECTED, INVESTIGATING, IDENTIFIED, CONTAINING, MONITORING, RESOLVED, POSTMORTEM, CLOSED
    root_cause = Column(Text, nullable=True)
    corrective_actions = Column(Text, nullable=True)
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    postmortem_markdown = Column(Text, nullable=True)

    timeline_events = relationship("IncidentTimelineEvent", back_populates="incident", cascade="all, delete-orphan")


class IncidentTimelineEvent(BaseModel):
    __tablename__ = "incident_timeline_events"

    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # ALERT_FIRED, RELEASE_DEPLOYED, ROLLBACK_TRIGGERED, DRIFT_DETECTED, HEALTH_RESTORED, USER_ACTION, SECURITY_SIGNAL
    message = Column(String(1000), nullable=False)
    actor = Column(String(255), default="System", nullable=False)
    source = Column(String(100), default="LaunchComply", nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    incident = relationship("Incident", back_populates="timeline_events")


class OperationalChange(BaseModel):
    __tablename__ = "operational_changes"

    organization_id = Column(String(36), nullable=False, index=True)
    application_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    change_type = Column(String(50), nullable=False)  # RELEASE, INFRASTRUCTURE_APPLY, DOMAIN_BINDING, SECRET_ROTATION, DRIFT_EVENT, POLICY_UPDATE
    source = Column(String(100), nullable=False)
    release_id = Column(String(36), nullable=True)
    infrastructure_plan_id = Column(String(36), nullable=True)
    actor = Column(String(255), nullable=False)
    summary = Column(String(1000), nullable=False)
    occurred_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class BackupObservation(BaseModel):
    __tablename__ = "backup_observations"

    organization_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    resource_id = Column(String(255), nullable=False, index=True)
    resource_name = Column(String(255), nullable=False)
    backup_type = Column(String(50), default="AUTOMATED_SNAPSHOT", nullable=False)  # AUTOMATED_SNAPSHOT, MANUAL_SNAPSHOT, AWS_BACKUP
    status = Column(String(50), default="SUCCESS", nullable=False, index=True)  # SUCCESS, FAILED, PARTIAL, EXPIRED, UNKNOWN
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    recovery_point = Column(String(255), nullable=False)
    provider_backup_id = Column(String(255), nullable=False)
    size_bytes = Column(Integer, nullable=True)

    drills = relationship("RestoreDrill", back_populates="backup_observation")


class RestoreDrill(BaseModel):
    __tablename__ = "restore_drills"

    organization_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    resource_id = Column(String(255), nullable=False, index=True)
    backup_observation_id = Column(String(36), ForeignKey("backup_observations.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(50), default="PENDING", nullable=False, index=True)  # PENDING, RUNNING, COMPLETED, FAILED
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    rto_seconds = Column(Float, nullable=True)
    data_validation_status = Column(String(50), default="PASSED", nullable=False)  # PASSED, FAILED
    evidence_id = Column(String(36), nullable=True)
    failure_reason = Column(String(1000), nullable=True)
    target_temp_db_id = Column(String(255), nullable=True)

    backup_observation = relationship("BackupObservation", back_populates="drills")


class SecuritySignal(BaseModel):
    __tablename__ = "security_signals"

    organization_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    provider = Column(String(50), default="GUARDDUTY", nullable=False)  # GUARDDUTY, SECURITY_HUB, CLOUDTRAIL, WAF
    signal_type = Column(String(100), nullable=False)
    severity = Column(String(20), default="MEDIUM", nullable=False, index=True)  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    resource_id = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)  # ACTIVE, INVESTIGATING, RESOLVED, ARCHIVED
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    raw_payload_json = Column(JSON, nullable=True)


class CostSnapshot(BaseModel):
    __tablename__ = "cost_snapshots"

    organization_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    currency = Column(String(10), default="INR", nullable=False)
    total = Column(Float, nullable=False)
    forecast_monthly = Column(Float, nullable=False)
    service_breakdown_json = Column(JSON, nullable=False)
    daily_trend_json = Column(JSON, nullable=True)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    captured_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class CostAlert(BaseModel):
    __tablename__ = "cost_alerts"

    organization_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # BUDGET_EXCEEDED, ANOMALY_SPIKE, FORECAST_OVERRUN
    threshold = Column(Float, nullable=False)
    actual = Column(Float, nullable=False)
    status = Column(String(50), default="OPEN", nullable=False, index=True)  # OPEN, ACKNOWLEDGED, RESOLVED
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class EvidenceFreshness(BaseModel):
    __tablename__ = "evidence_freshnesses"

    organization_id = Column(String(36), nullable=False, index=True)
    framework = Column(String(50), nullable=False, index=True)  # SOC2, ISO27001, DPDP
    control_id = Column(String(100), nullable=False, index=True)
    evidence_id = Column(String(255), nullable=False)
    last_collected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    freshness_status = Column(String(50), default="CURRENT", nullable=False, index=True)  # CURRENT, EXPIRING, STALE, MISSING
    resource_ref = Column(String(255), nullable=True)
