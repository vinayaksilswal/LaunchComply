"""Phase 5 Incident Command Center Engine.
Provides 1-click incident creation from alerts/releases, automated timeline tracking,
structured postmortem drafting, and lifecycle management (DETECTED -> CLOSED).
"""
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.operations import Incident, IncidentTimelineEvent, AlertEvent
from app.models.release import ApplicationRelease


class IncidentEngine:
    """Manages operational incidents, automated event timelines, and postmortems."""

    async def create_incident(
        self,
        db: AsyncSession,
        organization_id: str,
        environment_id: str,
        application_id: str,
        title: str,
        severity: str = "SEV2",
        description: Optional[str] = None,
        commander: Optional[str] = None,
        impact: Optional[str] = None,
        alert_event_id: Optional[str] = None,
        release_id: Optional[str] = None,
        deployment_id: Optional[str] = None,
        actor: str = "System",
    ) -> Incident:
        """Creates a new incident, prepopulates contextual links, and adds initial timeline event."""
        incident = Incident(
            organization_id=organization_id,
            environment_id=environment_id,
            application_id=application_id,
            title=title,
            severity=severity,
            description=description or f"Operational incident declared with severity {severity}.",
            commander=commander,
            impact=impact or "Potential user-facing degradation or availability impact.",
            alert_event_id=alert_event_id,
            release_id=release_id,
            deployment_id=deployment_id,
            status="DETECTED",
            detected_at=datetime.utcnow(),
        )
        db.add(incident)
        await db.flush()

        # Link alert event if provided
        if alert_event_id:
            alert_res = await db.execute(select(AlertEvent).where(AlertEvent.id == alert_event_id))
            alert_obj = alert_res.scalars().first()
            if alert_obj:
                alert_obj.incident_id = incident.id
                db.add(alert_obj)

        # Initial Timeline Event
        init_event = IncidentTimelineEvent(
            incident_id=incident.id,
            event_type="ALERT_FIRED" if alert_event_id else "USER_ACTION",
            message=f"Incident opened: {title} (Severity: {severity})",
            actor=actor,
            source="IncidentEngine",
            timestamp=datetime.utcnow(),
        )
        db.add(init_event)

        # If release is linked, record context in timeline
        if release_id:
            rel_res = await db.execute(select(ApplicationRelease).where(ApplicationRelease.id == release_id))
            rel_obj = rel_res.scalars().first()
            if rel_obj:
                rel_event = IncidentTimelineEvent(
                    incident_id=incident.id,
                    event_type="RELEASE_DEPLOYED",
                    message=f"Correlated release {rel_obj.version} (Commit: {rel_obj.commit_sha[:8]}) was active at detection time",
                    actor="System",
                    source="LaunchComply",
                    timestamp=rel_obj.deployed_at or datetime.utcnow(),
                )
                db.add(rel_event)

        await db.commit()
        await db.refresh(incident)
        return incident

    async def append_timeline(
        self,
        db: AsyncSession,
        incident_id: str,
        event_type: str,
        message: str,
        actor: str = "System",
        source: str = "LaunchComply",
    ) -> IncidentTimelineEvent:
        """Appends a timestamped event to the incident timeline."""
        event = IncidentTimelineEvent(
            incident_id=incident_id,
            event_type=event_type,
            message=message,
            actor=actor,
            source=source,
            timestamp=datetime.utcnow(),
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event

    async def update_status(
        self,
        db: AsyncSession,
        incident_id: str,
        organization_id: str,
        new_status: str,
        actor: str = "Engineer",
        note: Optional[str] = None,
    ) -> Optional[Incident]:
        """Transitions incident status through DETECTED -> INVESTIGATING -> RESOLVED -> CLOSED."""
        res = await db.execute(
            select(Incident).where(
                Incident.id == incident_id,
                Incident.organization_id == organization_id,
            )
        )
        incident = res.scalars().first()
        if not incident:
            return None

        old_status = incident.status
        incident.status = new_status
        if new_status in ("RESOLVED", "CLOSED") and not incident.resolved_at:
            incident.resolved_at = datetime.utcnow()

        db.add(incident)

        msg = f"Status transitioned from {old_status} to {new_status}."
        if note:
            msg += f" Note: {note}"

        await self.append_timeline(
            db=db,
            incident_id=incident.id,
            event_type="USER_ACTION",
            message=msg,
            actor=actor,
            source="LaunchComply",
        )
        await db.commit()
        await db.refresh(incident)
        return incident

    async def generate_postmortem(
        self,
        db: AsyncSession,
        incident_id: str,
        organization_id: str,
    ) -> str:
        """Drafts a structured postmortem markdown document from recorded timeline facts."""
        res = await db.execute(
            select(Incident)
            .options(selectinload(Incident.timeline_events))
            .where(
                Incident.id == incident_id,
                Incident.organization_id == organization_id,
            )
        )
        incident = res.scalars().first()
        if not incident:
            return ""

        timeline_lines = []
        for t in sorted(incident.timeline_events, key=lambda x: x.timestamp):
            ts = t.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")
            timeline_lines.append(f"- **{ts}** `[{t.event_type}]` ({t.actor}): {t.message}")

        duration = "Unknown"
        if incident.resolved_at and incident.detected_at:
            mins = int((incident.resolved_at - incident.detected_at).total_seconds() / 60)
            duration = f"{mins} minutes"

        timeline_text = "\n".join(timeline_lines)
        default_corrective = "- [ ] Review threshold sensitivity\n- [ ] Expand canary observation windows\n- [ ] Update synthetic uptime verification suites"
        corrective_text = incident.corrective_actions or default_corrective

        postmortem = f"""# Postmortem: {incident.title}

## Executive Summary
- **Incident ID**: `{incident.id}`
- **Severity**: {incident.severity}
- **Commander**: {incident.commander or 'Unassigned'}
- **Detected**: {incident.detected_at.strftime("%Y-%m-%d %H:%M:%S UTC")}
- **Resolved**: {incident.resolved_at.strftime("%Y-%m-%d %H:%M:%S UTC") if incident.resolved_at else 'In Progress'}
- **Time to Resolution**: {duration}

## Impact
{incident.impact or 'Production telemetry degradation affecting ingress and target latency.'}

## Timeline
{timeline_text}

## Root Cause Analysis
{incident.root_cause or 'To be determined by incident commander during retrospective.'}

## Contributing Factors
- Recent application deployment or operational changes prior to signal breach.
- Telemetry thresholds triggered automated alerting.

## Corrective Actions & Prevention
{corrective_text}

## Evidence Links
- Linked Alert Event ID: `{incident.alert_event_id or 'None'}`
- Linked Release ID: `{incident.release_id or 'None'}`
"""
        incident.postmortem_markdown = postmortem
        incident.status = "POSTMORTEM"
        db.add(incident)
        await db.commit()
        return postmortem
