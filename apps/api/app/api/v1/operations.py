"""Phase 5 Operations Command Center API Router.
Exposes endpoints for Environment Health, CloudWatch Telemetry, Logs Explorer,
Alerts, Incidents, Backup & DR Restore Drills, Security Signals, Cloud Cost, and Continuous Compliance.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.permissions import get_current_membership, require_permission
from app.core.audit import log_audit_event
from app.models.auth import OrganizationMembership
from app.models.operations import (
    HealthSnapshot,
    AlertRule,
    AlertEvent,
    Incident,
    IncidentTimelineEvent,
    BackupObservation,
    RestoreDrill,
    SecuritySignal,
    CostSnapshot,
    CostAlert,
    EvidenceFreshness,
    OperationalChange,
)
from app.models.application import Environment, Application
from app.schemas.operations import (
    HealthSnapshotResponse,
    AlertRuleCreate,
    AlertRuleResponse,
    AlertEventResponse,
    IncidentCreate,
    IncidentResponse,
    IncidentTimelineEventCreate,
    IncidentTimelineEventResponse,
    IncidentResolveRequest,
    RestoreDrillRequest,
    RestoreDrillResponse,
    SecuritySignalResponse,
    EvidenceFreshnessResponse,
)
from app.services.operations import (
    AWSCloudWatchProvider,
    OperationalHealthEngine,
    AlertEngine,
    IncidentEngine,
    BackupDREngine,
    SecuritySignalsEngine,
    CostEngine,
    ContinuousComplianceEngine,
    UptimeEngine,
)

router = APIRouter(prefix="/operations", tags=["Operations"])

health_engine = OperationalHealthEngine()
alert_engine = AlertEngine()
incident_engine = IncidentEngine()
backup_engine = BackupDREngine()
security_engine = SecuritySignalsEngine()
cost_engine = CostEngine()
compliance_engine = ContinuousComplianceEngine()
uptime_engine = UptimeEngine()
cloudwatch_provider = AWSCloudWatchProvider()


# -------------------------------------------------------------
# 1. Environment Health & Telemetry
# -------------------------------------------------------------
@router.get("/environments/{id}/health", response_model=HealthSnapshotResponse)
async def get_environment_health(
    id: str,
    membership: OrganizationMembership = Depends(require_permission("monitoring.read")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves or evaluates real-time production health with explainable reasons."""
    env_res = await db.execute(
        select(Environment).where(
            Environment.id == id,
            Environment.organization_id == membership.organization_id,
        )
    )
    env = env_res.scalars().first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")

    # Evaluate fresh snapshot
    snapshot = await health_engine.evaluate_environment_health(
        db=db,
        environment_id=env.id,
        organization_id=membership.organization_id,
        application_id=env.application_id,
        env_name=env.name,
    )
    return snapshot


@router.get("/environments/{id}/metrics")
async def get_environment_metrics(
    id: str,
    membership: OrganizationMembership = Depends(require_permission("monitoring.read")),
    db: AsyncSession = Depends(get_db),
):
    """Collects normalized CloudWatch ECS, ALB, RDS, and WAF telemetry."""
    env_res = await db.execute(
        select(Environment).where(
            Environment.id == id,
            Environment.organization_id == membership.organization_id,
        )
    )
    env = env_res.scalars().first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")

    telemetry = cloudwatch_provider.get_environment_telemetry(
        environment_id=env.id, app_name="acmecloud", env_name=env.name
    )
    return telemetry.model_dump()


@router.get("/environments/{id}/logs")
async def get_environment_logs(
    id: str,
    severity: Optional[str] = Query(None, description="INFO, WARN, ERROR, CRITICAL"),
    search: Optional[str] = Query(None, description="Search term in log messages"),
    limit: int = Query(50, ge=1, le=200),
    membership: OrganizationMembership = Depends(require_permission("logs.read")),
    db: AsyncSession = Depends(get_db),
):
    """Fetches sanitized, credential-redacted application and access logs."""
    env_res = await db.execute(
        select(Environment).where(
            Environment.id == id,
            Environment.organization_id == membership.organization_id,
        )
    )
    env = env_res.scalars().first()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")

    logs = cloudwatch_provider.get_logs(
        environment_id=env.id, severity=severity, search=search, limit=limit
    )
    return [l.model_dump() for l in logs]


@router.get("/environments/{id}/timeline")
async def get_operations_timeline(
    id: str,
    membership: OrganizationMembership = Depends(require_permission("monitoring.read")),
    db: AsyncSession = Depends(get_db),
):
    """Returns chronologically ordered operational events and changes."""
    res = await db.execute(
        select(OperationalChange)
        .where(
            OperationalChange.environment_id == id,
            OperationalChange.organization_id == membership.organization_id,
        )
        .order_by(OperationalChange.occurred_at.desc())
        .limit(30)
    )
    changes = res.scalars().all()
    return [
        {
            "id": c.id,
            "change_type": c.change_type,
            "source": c.source,
            "actor": c.actor,
            "summary": c.summary,
            "occurred_at": c.occurred_at.isoformat(),
        }
        for c in changes
    ]


@router.get("/environments/{id}/tls")
async def get_domain_tls_health(
    id: str,
    membership: OrganizationMembership = Depends(require_permission("monitoring.read")),
    db: AsyncSession = Depends(get_db),
):
    """Monitors DNS resolution, HTTPS handshake, and ACM TLS certificate renewal."""
    return await uptime_engine.get_domain_tls_health()


# -------------------------------------------------------------
# 2. Alert Rules & Events
# -------------------------------------------------------------
@router.get("/alerts", response_model=Dict[str, Any])
async def list_alerts(
    environment_id: Optional[str] = None,
    membership: OrganizationMembership = Depends(require_permission("alerts.read")),
    db: AsyncSession = Depends(get_db),
):
    """Lists configured alert rules and active/resolved alert events."""
    rules_q = select(AlertRule).where(AlertRule.organization_id == membership.organization_id)
    events_q = select(AlertEvent).where(AlertEvent.organization_id == membership.organization_id)

    if environment_id:
        rules_q = rules_q.where(AlertRule.environment_id == environment_id)
        events_q = events_q.where(AlertEvent.environment_id == environment_id)

    rules_res = await db.execute(rules_q.order_by(AlertRule.created_at.desc()))
    events_res = await db.execute(events_q.order_by(AlertEvent.started_at.desc()))

    return {
        "rules": [AlertRuleResponse.model_validate(r) for r in rules_res.scalars().all()],
        "events": [AlertEventResponse.model_validate(e) for e in events_res.scalars().all()],
    }


@router.post("/alerts/rules", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_alert_rule(
    rule_in: AlertRuleCreate,
    environment_id: str = Query(...),
    membership: OrganizationMembership = Depends(require_permission("alerts.manage")),
    db: AsyncSession = Depends(get_db),
):
    """Creates a new structured operational alert rule."""
    rule = AlertRule(
        organization_id=membership.organization_id,
        environment_id=environment_id,
        name=rule_in.name,
        metric=rule_in.metric,
        condition=rule_in.condition,
        threshold=rule_in.threshold,
        window_minutes=rule_in.window_minutes,
        severity=rule_in.severity,
        enabled=rule_in.enabled,
        auto_create_incident=rule_in.auto_create_incident,
        auto_rollback_release=rule_in.auto_rollback_release,
        created_by=membership.user.email if membership.user else "admin",
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=membership.user.email if membership.user else "admin",
        action="ALERT_RULE_CREATED",
        entity_type="AlertRule",
        entity_id=rule.id,
        details={"name": rule.name, "metric": rule.metric, "threshold": rule.threshold},
    )
    return rule


@router.patch("/alerts/{id}/acknowledge", response_model=AlertEventResponse)
async def acknowledge_alert(
    id: str,
    membership: OrganizationMembership = Depends(require_permission("alerts.manage")),
    db: AsyncSession = Depends(get_db),
):
    """Acknowledges an open alert event to signify responder investigation."""
    event = await alert_engine.acknowledge_alert(
        db=db,
        alert_id=id,
        organization_id=membership.organization_id,
        actor_email=membership.user.email if membership.user else "engineer",
    )
    if not event:
        raise HTTPException(status_code=404, detail="Alert event not found or already acknowledged")

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=membership.user.email if membership.user else "engineer",
        action="ALERT_ACKNOWLEDGED",
        entity_type="AlertEvent",
        entity_id=event.id,
    )
    return event


# -------------------------------------------------------------
# 3. Incident Command Center
# -------------------------------------------------------------
@router.get("/incidents", response_model=List[IncidentResponse])
async def list_incidents(
    environment_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    membership: OrganizationMembership = Depends(require_permission("incident.read")),
    db: AsyncSession = Depends(get_db),
):
    """Lists incidents with optional environment and status filtering."""
    q = select(Incident).where(Incident.organization_id == membership.organization_id)
    if environment_id:
        q = q.where(Incident.environment_id == environment_id)
    if status_filter:
        q = q.where(Incident.status == status_filter)

    res = await db.execute(q.order_by(Incident.detected_at.desc()))
    return res.scalars().all()


@router.post("/incidents", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    inc_in: IncidentCreate,
    environment_id: str = Query(...),
    application_id: str = Query(...),
    membership: OrganizationMembership = Depends(require_permission("incident.create")),
    db: AsyncSession = Depends(get_db),
):
    """One-click declaration of an operational incident."""
    incident = await incident_engine.create_incident(
        db=db,
        organization_id=membership.organization_id,
        environment_id=environment_id,
        application_id=application_id,
        title=inc_in.title,
        severity=inc_in.severity,
        description=inc_in.description,
        commander=inc_in.commander or (membership.user.full_name if membership.user else "On-Call Commander"),
        impact=inc_in.impact,
        alert_event_id=inc_in.alert_event_id,
        release_id=inc_in.release_id,
        deployment_id=inc_in.deployment_id,
        actor=membership.user.email if membership.user else "Engineer",
    )

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=membership.user.email if membership.user else "engineer",
        action="INCIDENT_CREATED",
        entity_type="Incident",
        entity_id=incident.id,
        details={"title": incident.title, "severity": incident.severity},
    )
    return incident


@router.get("/incidents/{id}")
async def get_incident(
    id: str,
    membership: OrganizationMembership = Depends(require_permission("incident.read")),
    db: AsyncSession = Depends(get_db),
):
    """Returns incident details, full chronological timeline, and postmortem."""
    res = await db.execute(
        select(Incident)
        .options(selectinload(Incident.timeline_events))
        .where(
            Incident.id == id,
            Incident.organization_id == membership.organization_id,
        )
    )
    incident = res.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    return {
        "incident": IncidentResponse.model_validate(incident),
        "timeline": [IncidentTimelineEventResponse.model_validate(t) for t in sorted(incident.timeline_events, key=lambda x: x.timestamp)],
    }


@router.post("/incidents/{id}/timeline", response_model=IncidentTimelineEventResponse)
async def add_incident_timeline_event(
    id: str,
    event_in: IncidentTimelineEventCreate,
    membership: OrganizationMembership = Depends(require_permission("incident.manage")),
    db: AsyncSession = Depends(get_db),
):
    """Appends an event to the incident timeline."""
    event = await incident_engine.append_timeline(
        db=db,
        incident_id=id,
        event_type=event_in.event_type,
        message=event_in.message,
        actor=event_in.actor or (membership.user.email if membership.user else "Engineer"),
        source=event_in.source,
    )
    return event


@router.post("/incidents/{id}/resolve", response_model=IncidentResponse)
async def resolve_incident(
    id: str,
    body: IncidentResolveRequest,
    membership: OrganizationMembership = Depends(require_permission("incident.manage")),
    db: AsyncSession = Depends(get_db),
):
    """Resolves an incident with documented root cause and corrective actions."""
    res = await db.execute(
        select(Incident).where(
            Incident.id == id,
            Incident.organization_id == membership.organization_id,
        )
    )
    incident = res.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.root_cause = body.root_cause
    incident.corrective_actions = body.corrective_actions
    db.add(incident)
    await db.commit()

    updated = await incident_engine.update_status(
        db=db,
        incident_id=id,
        organization_id=membership.organization_id,
        new_status="RESOLVED",
        actor=membership.user.email if membership.user else "Incident Commander",
        note=f"Root cause documented: {body.root_cause[:80]}...",
    )

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=membership.user.email if membership.user else "admin",
        action="INCIDENT_RESOLVED",
        entity_type="Incident",
        entity_id=id,
    )
    return updated


@router.post("/incidents/{id}/postmortem")
async def generate_incident_postmortem(
    id: str,
    membership: OrganizationMembership = Depends(require_permission("incident.manage")),
    db: AsyncSession = Depends(get_db),
):
    """Drafts a structured postmortem markdown document from timeline facts."""
    markdown = await incident_engine.generate_postmortem(
        db=db, incident_id=id, organization_id=membership.organization_id
    )
    if not markdown:
        raise HTTPException(status_code=404, detail="Incident not found")

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=membership.user.email if membership.user else "admin",
        action="POSTMORTEM_CREATED",
        entity_type="Incident",
        entity_id=id,
    )
    return {"postmortem_markdown": markdown}


# -------------------------------------------------------------
# 4. Backup & DR Restore Drills
# -------------------------------------------------------------
@router.get("/backups/environments/{id}")
async def get_environment_backups(
    id: str,
    membership: OrganizationMembership = Depends(require_permission("backup.read")),
    db: AsyncSession = Depends(get_db),
):
    """Returns 4-stage recovery status, RPO/RTO calculations, and backup observations."""
    return await backup_engine.get_recovery_status(
        db=db, environment_id=id, organization_id=membership.organization_id
    )


@router.post("/backups/{id}/restore-drill", response_model=RestoreDrillResponse)
async def execute_restore_drill(
    id: str,
    body: RestoreDrillRequest,
    membership: OrganizationMembership = Depends(require_permission("restore.execute")),
    db: AsyncSession = Depends(get_db),
):
    """Executes a safe, non-destructive restore drill into an isolated temporary DB."""
    actor_email = membership.user.email if membership.user else "devops-engineer"
    drill = await backup_engine.execute_restore_drill(
        db=db,
        environment_id=id,
        organization_id=membership.organization_id,
        resource_id=body.resource_id,
        actor_email=actor_email,
        backup_observation_id=body.backup_observation_id,
    )

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="RESTORE_DRILL_COMPLETED",
        entity_type="RestoreDrill",
        entity_id=drill.id,
        details={"rto_seconds": drill.rto_seconds, "validation": drill.data_validation_status},
    )
    return drill


# -------------------------------------------------------------
# 5. Cloud Security Signals
# -------------------------------------------------------------
@router.get("/security/signals", response_model=List[SecuritySignalResponse])
async def list_security_signals(
    environment_id: Optional[str] = None,
    membership: OrganizationMembership = Depends(require_permission("security.signal.read")),
    db: AsyncSession = Depends(get_db),
):
    """Lists normalized GuardDuty, Security Hub, and CloudTrail findings."""
    q = select(SecuritySignal).where(SecuritySignal.organization_id == membership.organization_id)
    if environment_id:
        q = q.where(SecuritySignal.environment_id == environment_id)

    res = await db.execute(q.order_by(SecuritySignal.detected_at.desc()))
    signals = res.scalars().all()

    # If empty in dev, run initial sync
    if not signals and environment_id:
        signals = await security_engine.sync_security_signals(
            db=db,
            environment_id=environment_id,
            organization_id=membership.organization_id,
            application_id=environment_id,
        )
    return signals


# -------------------------------------------------------------
# 6. Cloud Cost Center
# -------------------------------------------------------------
@router.get("/cost/environments/{id}")
async def get_cost_data(
    id: str,
    membership: OrganizationMembership = Depends(require_permission("cost.read")),
    db: AsyncSession = Depends(get_db),
):
    """Fetches AWS Cost Explorer spend breakdown, monthly forecast, and anomaly alerts."""
    snapshot = await cost_engine.refresh_cost_snapshot(
        db=db, environment_id=id, organization_id=membership.organization_id
    )
    correlations = await cost_engine.get_cost_correlation(
        db=db, environment_id=id, organization_id=membership.organization_id
    )

    # Fetch active cost alerts
    alerts_res = await db.execute(
        select(CostAlert).where(
            CostAlert.environment_id == id,
            CostAlert.organization_id == membership.organization_id,
        )
    )
    alerts = alerts_res.scalars().all()

    return {
        "currency": snapshot.currency,
        "total_month_to_date": snapshot.total,
        "forecast_monthly": snapshot.forecast_monthly,
        "service_breakdown": snapshot.service_breakdown_json,
        "daily_trend": snapshot.daily_trend_json,
        "period_start": snapshot.period_start.isoformat(),
        "period_end": snapshot.period_end.isoformat(),
        "captured_at": snapshot.captured_at.isoformat(),
        "alerts": [
            {
                "type": a.type,
                "threshold": a.threshold,
                "actual": a.actual,
                "status": a.status,
                "detected_at": a.detected_at.isoformat(),
            }
            for a in alerts
        ],
        "correlated_changes": correlations,
    }


# -------------------------------------------------------------
# 7. Continuous Compliance & Evidence Freshness
# -------------------------------------------------------------
@router.get("/compliance/monitoring")
async def get_continuous_compliance(
    membership: OrganizationMembership = Depends(require_permission("compliance.monitor.read")),
    db: AsyncSession = Depends(get_db),
):
    """Returns real-time evidence coverage and dynamic technical control statuses."""
    return await compliance_engine.get_compliance_posture(
        db=db, organization_id=membership.organization_id
    )


@router.get("/compliance/evidence/freshness", response_model=List[EvidenceFreshnessResponse])
async def list_evidence_freshness(
    membership: OrganizationMembership = Depends(require_permission("compliance.monitor.read")),
    db: AsyncSession = Depends(get_db),
):
    """Lists technical compliance evidence with freshness state (CURRENT, EXPIRING, STALE)."""
    records = await compliance_engine.refresh_evidence_statuses(
        db=db, organization_id=membership.organization_id
    )
    return records
