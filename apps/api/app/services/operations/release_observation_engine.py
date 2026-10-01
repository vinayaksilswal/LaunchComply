"""Phase 5 Release Observation & Canary Progression Engine.
Provides post-deployment observation windows (LIVE_OBSERVING -> LIVE_STABLE / LIVE_DEGRADED),
deterministic auto-rollback on degradation, and staged canary traffic promotion (0% -> 100%).
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.models.release import ApplicationRelease, ApplicationDeployment, TrafficShift
from app.models.operations import Incident, IncidentTimelineEvent, OperationalChange
from app.services.operations.observability_provider import TelemetrySummary


CANARY_STAGES = [0, 5, 10, 25, 50, 100]


class ReleaseObservationEngine:
    """Manages post-deployment observation windows and staged canary traffic shifts."""

    async def evaluate_release_observation(
        self,
        db: AsyncSession,
        release_id: str,
        organization_id: str,
        telemetry: TelemetrySummary,
        window_minutes: int = 10,
    ) -> Dict[str, Any]:
        """Evaluates health during the observation window and advances state."""
        res = await db.execute(
            select(ApplicationRelease).where(
                ApplicationRelease.id == release_id,
                ApplicationRelease.organization_id == organization_id,
            )
        )
        release = res.scalars().first()
        if not release:
            return {"status": "ERROR", "message": "Release not found"}

        # Accept either LIVE or LIVE_OBSERVING
        if release.status not in ("LIVE", "LIVE_OBSERVING"):
            return {"status": release.status, "message": f"Release is in state {release.status}"}

        # Check for degradation signals
        degradation_reasons = []
        if telemetry.ingress.error_rate_5xx_percent > 1.0:
            degradation_reasons.append(f"5xx error rate ({telemetry.ingress.error_rate_5xx_percent:.1f}%) > 1.0% threshold")
        if telemetry.ingress.p95_latency_ms > 800.0:
            degradation_reasons.append(f"p95 latency ({telemetry.ingress.p95_latency_ms:.0f}ms) > 800ms threshold")
        if telemetry.ingress.unhealthy_targets > 0:
            degradation_reasons.append(f"{telemetry.ingress.unhealthy_targets} unhealthy targets on ALB")

        for svc in telemetry.services:
            if svc.restart_count > 0:
                degradation_reasons.append(f"ECS task restarts detected on service '{svc.service_name}' ({svc.restart_count})")
            if svc.running_tasks < svc.desired_tasks:
                degradation_reasons.append(f"ECS service '{svc.service_name}' under-provisioned ({svc.running_tasks}/{svc.desired_tasks})")

        if degradation_reasons:
            release.status = "LIVE_DEGRADED"
            result = {
                "release_id": release.id,
                "status": "LIVE_DEGRADED",
                "reasons": degradation_reasons,
                "auto_rollback_triggered": False,
            }

            # Deterministic auto-rollback if enabled
            if settings.ENABLE_AUTO_ROLLBACK:
                release.status = "ROLLBACK_TRIGGERED"
                result["auto_rollback_triggered"] = True
                result["status"] = "ROLLBACK_TRIGGERED"

                # Log operational change & auto-incident
                change = OperationalChange(
                    organization_id=organization_id,
                    application_id=release.application_id,
                    environment_id=release.environment_id,
                    change_type="RELEASE",
                    source="ReleaseObservationEngine",
                    release_id=release.id,
                    actor="System-AutoRollback",
                    summary=f"Automated rollback triggered for release {release.version} due to degradation: {'; '.join(degradation_reasons)}",
                    occurred_at=datetime.utcnow(),
                )
                db.add(change)

            db.add(release)
            await db.commit()
            return result

        # If healthy, check if observation window has elapsed
        deployed_at = release.deployed_at or release.created_at
        if deployed_at:
            if deployed_at.tzinfo is None:
                deployed_at = deployed_at.replace(tzinfo=timezone.utc)
            now_utc = datetime.now(timezone.utc)
            elapsed_minutes = (now_utc - deployed_at).total_seconds() / 60.0
        else:
            elapsed_minutes = 0.0

        if elapsed_minutes >= window_minutes:
            release.status = "LIVE_STABLE"
            db.add(release)
            await db.commit()
            return {
                "release_id": release.id,
                "status": "LIVE_STABLE",
                "elapsed_minutes": round(elapsed_minutes, 1),
                "message": f"Release observed healthy for {elapsed_minutes:.1f}m. Promoted to LIVE_STABLE.",
            }
        else:
            release.status = "LIVE_OBSERVING"
            db.add(release)
            await db.commit()
            return {
                "release_id": release.id,
                "status": "LIVE_OBSERVING",
                "elapsed_minutes": round(elapsed_minutes, 1),
                "window_minutes": window_minutes,
                "message": f"Release in observation window ({round(elapsed_minutes, 1)}/{window_minutes}m). Telemetry is healthy.",
            }

    async def advance_canary_stage(
        self,
        db: AsyncSession,
        release_id: str,
        organization_id: str,
        telemetry: TelemetrySummary,
    ) -> Dict[str, Any]:
        """Evaluates health gate and steps up canary traffic percentage (e.g. 5% -> 10% -> 25% -> 50% -> 100%)."""
        dep_res = await db.execute(
            select(ApplicationDeployment).where(
                ApplicationDeployment.application_release_id == release_id,
                ApplicationDeployment.organization_id == organization_id,
            ).order_by(ApplicationDeployment.created_at.desc())
        )
        deployment = dep_res.scalars().first()
        if not deployment:
            return {"status": "ERROR", "message": "No deployment found for release"}

        current_pct = deployment.traffic_percentage

        # Evaluate health gate before stepping
        health_errors = []
        if telemetry.ingress.error_rate_5xx_percent > 1.0:
            health_errors.append(f"5xx error rate ({telemetry.ingress.error_rate_5xx_percent:.1f}%) exceeds 1.0%")
        if telemetry.ingress.p95_latency_ms > 800:
            health_errors.append(f"p95 latency ({telemetry.ingress.p95_latency_ms:.0f}ms) exceeds 800ms")

        if health_errors:
            deployment.status = "CANARY_PAUSED_DEGRADED"
            db.add(deployment)
            await db.commit()
            return {
                "status": "CANARY_PAUSED_DEGRADED",
                "current_traffic_percentage": current_pct,
                "reasons": health_errors,
                "message": "Canary progression halted due to telemetry degradation.",
            }

        # Find next stage
        next_pct = 100
        for stage in CANARY_STAGES:
            if stage > current_pct:
                next_pct = stage
                break

        shift = TrafficShift(
            organization_id=organization_id,
            application_deployment_id=deployment.id,
            from_target=f"weight_{current_pct}",
            to_target=f"weight_{next_pct}",
            percentage=next_pct,
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
            status="COMPLETED",
        )
        db.add(shift)

        deployment.traffic_percentage = next_pct
        if next_pct == 100:
            deployment.status = "LIVE"
        db.add(deployment)

        await db.commit()
        return {
            "status": "ADVANCED",
            "previous_percentage": current_pct,
            "current_traffic_percentage": next_pct,
            "is_fully_promoted": next_pct == 100,
            "message": f"Canary traffic stepped to {next_pct}%. Health gate passed.",
        }
