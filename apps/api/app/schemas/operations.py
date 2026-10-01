"""Phase 5 Operations & Observability Pydantic Schemas."""
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class HealthSnapshotResponse(BaseModel):
    id: str
    organization_id: str
    application_id: str
    environment_id: str
    overall_status: str
    component_status_json: Dict[str, Any]
    reasons_json: List[str]
    captured_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertRuleCreate(BaseModel):
    name: str = Field(..., max_length=255)
    metric: str = Field(..., description="e.g. alb_5xx_rate, api_latency_p95, ecs_cpu, rds_storage_low")
    condition: str = Field(default="GT", description="GT, LT, EQ")
    threshold: float
    window_minutes: int = 5
    severity: str = Field(default="HIGH", description="INFO, LOW, MEDIUM, HIGH, CRITICAL")
    enabled: bool = True
    auto_create_incident: bool = True
    auto_rollback_release: bool = False


class AlertRuleResponse(BaseModel):
    id: str
    organization_id: str
    environment_id: str
    name: str
    metric: str
    condition: str
    threshold: float
    window_minutes: int
    severity: str
    enabled: bool
    auto_create_incident: bool
    auto_rollback_release: bool
    created_by: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertEventResponse(BaseModel):
    id: str
    organization_id: str
    environment_id: str
    alert_rule_id: str
    status: str
    severity: str
    value: float
    threshold: float
    started_at: datetime
    resolved_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    incident_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class IncidentTimelineEventCreate(BaseModel):
    event_type: str = Field(..., description="USER_ACTION, ALERT_FIRED, ROLLBACK_TRIGGERED, etc.")
    message: str
    actor: str = "Engineer"
    source: str = "LaunchComply"


class IncidentTimelineEventResponse(BaseModel):
    id: str
    incident_id: str
    event_type: str
    message: str
    actor: str
    source: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentCreate(BaseModel):
    title: str = Field(..., max_length=255)
    severity: str = Field(default="SEV2", description="SEV1, SEV2, SEV3, SEV4")
    description: Optional[str] = None
    commander: Optional[str] = None
    impact: Optional[str] = None
    alert_event_id: Optional[str] = None
    release_id: Optional[str] = None
    deployment_id: Optional[str] = None


class IncidentResolveRequest(BaseModel):
    root_cause: str
    corrective_actions: str


class IncidentResponse(BaseModel):
    id: str
    organization_id: str
    environment_id: str
    application_id: str
    release_id: Optional[str] = None
    deployment_id: Optional[str] = None
    alert_event_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    severity: str
    commander: Optional[str] = None
    impact: Optional[str] = None
    status: str
    root_cause: Optional[str] = None
    corrective_actions: Optional[str] = None
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    postmortem_markdown: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RestoreDrillRequest(BaseModel):
    resource_id: str = "rds-postgresql-primary"
    backup_observation_id: Optional[str] = None


class RestoreDrillResponse(BaseModel):
    id: str
    organization_id: str
    environment_id: str
    resource_id: str
    backup_observation_id: Optional[str] = None
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    rto_seconds: Optional[float] = None
    data_validation_status: str
    evidence_id: Optional[str] = None
    failure_reason: Optional[str] = None
    target_temp_db_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SecuritySignalResponse(BaseModel):
    id: str
    organization_id: str
    environment_id: str
    provider: str
    signal_type: str
    severity: str
    resource_id: str
    title: str
    description: Optional[str] = None
    status: str
    detected_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EvidenceFreshnessResponse(BaseModel):
    id: str
    framework: str
    control_id: str
    evidence_id: str
    last_collected_at: datetime
    expires_at: datetime
    freshness_status: str
    resource_ref: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
