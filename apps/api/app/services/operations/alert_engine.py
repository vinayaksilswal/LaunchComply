"""Phase 5 Alert Engine.
Evaluates structured alert rules, enforces deduplication to prevent alert storms,
auto-creates incidents when configured, and supports deterministic auto-rollback.
"""
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.models.operations import (
    AlertRule,
    AlertEvent,
    Incident,
    IncidentTimelineEvent,
)
from app.models.release import ApplicationRelease
from app.services.operations.observability_provider import TelemetrySummary


class AlertEngine:
    """Evaluates rules against telemetry with deduplication and incident generation."""

    def _extract_metric_value(self, metric: str, telemetry: TelemetrySummary) -> Optional[float]:
        if metric == "alb_5xx_rate":
            return telemetry.ingress.error_rate_5xx_percent
        elif metric == "api_latency_p95":
            return telemetry.ingress.p95_latency_ms
        elif metric == "ecs_cpu":
            if telemetry.services:
                return max(svc.cpu_utilization for svc in telemetry.services)
            return 0.0
        elif metric == "ecs_restarts":
            if telemetry.services:
                return float(sum(svc.restart_count for svc in telemetry.services))
            return 0.0
        elif metric == "rds_storage_low":
            return telemetry.database.free_storage_gb
        elif metric == "rds_cpu":
            return telemetry.database.cpu_utilization
        return None

    def _is_condition_met(self, condition: str, value: float, threshold: float) -> bool:
        if condition == "GT":
            return value > threshold
        elif condition == "LT":
            return value < threshold
        elif condition == "EQ":
            return value == threshold
        return False

    async def evaluate_alert_rules(
        self,
        db: AsyncSession,
        environment_id: str,
        organization_id: str,
        application_id: str,
        telemetry: TelemetrySummary,
        is_in_maintenance_window: bool = False,
        current_release: Optional[ApplicationRelease] = None,
    ) -> List[AlertEvent]:
        """Evaluates all enabled rules, deduplicates events, and generates incidents."""
        rules_res = await db.execute(
            select(AlertRule).where(
                AlertRule.environment_id == environment_id,
                AlertRule.organization_id == organization_id,
                AlertRule.enabled == True,
            )
        )
        rules = rules_res.scalars().all()
        triggered_events: List[AlertEvent] = []

        for rule in rules:
            metric_val = self._extract_metric_value(rule.metric, telemetry)
            if metric_val is None:
                continue

            breached = self._is_condition_met(rule.condition, metric_val, rule.threshold)

            # Query existing OPEN event for deduplication
            existing_event_res = await db.execute(
                select(AlertEvent).where(
                    AlertEvent.alert_rule_id == rule.id,
                    AlertEvent.environment_id == environment_id,
                    AlertEvent.status == "OPEN",
                )
            )
            existing_event = existing_event_res.scalars().first()

            if breached:
                if existing_event:
                    # Update existing open alert to avoid storm
                    existing_event.value = metric_val
                    db.add(existing_event)
                    triggered_events.append(existing_event)
                else:
                    # Create new alert event
                    status = "SUPPRESSED" if is_in_maintenance_window else "OPEN"
                    event = AlertEvent(
                        organization_id=organization_id,
                        environment_id=environment_id,
                        alert_rule_id=rule.id,
                        status=status,
                        severity=rule.severity,
                        value=metric_val,
                        threshold=rule.threshold,
                        started_at=datetime.utcnow(),
                    )
                    db.add(event)
                    await db.flush()

                    # Auto-create incident if configured and not suppressed
                    if rule.auto_create_incident and status == "OPEN":
                        incident = Incident(
                            organization_id=organization_id,
                            environment_id=environment_id,
                            application_id=application_id,
                            release_id=current_release.id if current_release else None,
                            alert_event_id=event.id,
                            title=f"Alert: {rule.name} breached ({metric_val:.2f} {rule.condition} {rule.threshold:.2f})",
                            description=f"Automated incident opened due to alert rule '{rule.name}' for metric '{rule.metric}'.",
                            severity=f"SEV2" if rule.severity == "CRITICAL" else f"SEV3",
                            status="DETECTED",
                            detected_at=datetime.utcnow(),
                        )
                        db.add(incident)
                        await db.flush()

                        timeline = IncidentTimelineEvent(
                            incident_id=incident.id,
                            event_type="ALERT_FIRED",
                            message=f"Rule '{rule.name}' fired: value {metric_val:.2f} {rule.condition} threshold {rule.threshold:.2f}",
                            actor="AlertEngine",
                            source="LaunchComply",
                        )
                        db.add(timeline)
                        event.incident_id = incident.id

                    # Check deterministic auto-rollback
                    if rule.auto_rollback_release and settings.ENABLE_AUTO_ROLLBACK and current_release:
                        current_release.status = "ROLLBACK_TRIGGERED"
                        db.add(current_release)
                        if event.incident_id:
                            db.add(
                                IncidentTimelineEvent(
                                    incident_id=event.incident_id,
                                    event_type="ROLLBACK_TRIGGERED",
                                    message=f"Deterministic auto-rollback triggered for release {current_release.version} by rule '{rule.name}'",
                                    actor="AlertEngine",
                                    source="LaunchComply",
                                )
                            )

                    triggered_events.append(event)
            else:
                # Value returned to normal - auto-resolve open event
                if existing_event:
                    existing_event.status = "RESOLVED"
                    existing_event.resolved_at = datetime.utcnow()
                    db.add(existing_event)

        await db.commit()
        return triggered_events

    async def acknowledge_alert(
        self, db: AsyncSession, alert_id: str, organization_id: str, actor_email: str
    ) -> Optional[AlertEvent]:
        res = await db.execute(
            select(AlertEvent).where(
                AlertEvent.id == alert_id,
                AlertEvent.organization_id == organization_id,
            )
        )
        event = res.scalars().first()
        if event and event.status == "OPEN":
            event.status = "ACKNOWLEDGED"
            event.acknowledged_by = actor_email
            db.add(event)
            await db.commit()
            await db.refresh(event)
        return event

    async def resolve_alert(
        self, db: AsyncSession, alert_id: str, organization_id: str, actor_email: str
    ) -> Optional[AlertEvent]:
        res = await db.execute(
            select(AlertEvent).where(
                AlertEvent.id == alert_id,
                AlertEvent.organization_id == organization_id,
            )
        )
        event = res.scalars().first()
        if event and event.status in ("OPEN", "ACKNOWLEDGED"):
            event.status = "RESOLVED"
            event.resolved_at = datetime.utcnow()
            db.add(event)
            await db.commit()
            await db.refresh(event)
        return event
