"""Phase 5 Operational Health Correlation Engine.
Evaluates metrics, resource health, uptime checks, deployments, drift, and security signals.
Outputs normalized component statuses and an explainable overall status with explicit reasons.
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.operations import (
    HealthSnapshot,
    UptimeCheck,
    UptimeResult,
    SecuritySignal,
    BackupObservation,
)
from app.models.infrastructure import DriftDetectionRun
from app.services.operations.observability_provider import (
    AWSCloudWatchProvider,
    TelemetrySummary,
)


class OperationalHealthEngine:
    """Evaluates multi-source operational signals into an explainable health snapshot."""

    def __init__(self, obs_provider: Optional[AWSCloudWatchProvider] = None):
        self.obs_provider = obs_provider or AWSCloudWatchProvider()

    async def evaluate_environment_health(
        self,
        db: AsyncSession,
        environment_id: str,
        organization_id: str,
        application_id: str,
        app_name: str = "launchcomply-app",
        env_name: str = "production",
        telemetry_override: Optional[TelemetrySummary] = None,
    ) -> HealthSnapshot:
        """Collects telemetry, evaluates thresholds, computes component health, and stores snapshot."""
        reasons: List[str] = []
        component_status: Dict[str, Any] = {
            "ingress": "HEALTHY",
            "ecs": "HEALTHY",
            "database": "HEALTHY",
            "uptime": "HEALTHY",
            "backup": "HEALTHY",
            "security": "HEALTHY",
            "drift": "HEALTHY",
        }

        # 1. Ingress & Compute Telemetry
        telemetry = telemetry_override or self.obs_provider.get_environment_telemetry(
            environment_id=environment_id, app_name=app_name, env_name=env_name
        )

        # Ingress Evaluation
        ingress = telemetry.ingress
        component_status["ingress"] = ingress.status
        if ingress.status == "CRITICAL":
            reasons.append(f"ALB 5xx error rate ({ingress.error_rate_5xx_percent:.1f}%) is CRITICAL (>5.0%)")
        elif ingress.status == "DEGRADED":
            reasons.append(f"ALB 5xx error rate ({ingress.error_rate_5xx_percent:.1f}%) or p95 latency ({ingress.p95_latency_ms:.0f}ms) is DEGRADED")

        if ingress.unhealthy_targets > 0:
            reasons.append(f"ALB has {ingress.unhealthy_targets} unhealthy backend target(s)")
            if component_status["ingress"] == "HEALTHY":
                component_status["ingress"] = "DEGRADED"

        # ECS Services Evaluation
        ecs_statuses = [svc.status for svc in telemetry.services]
        if "CRITICAL" in ecs_statuses:
            component_status["ecs"] = "CRITICAL"
        elif "DEGRADED" in ecs_statuses:
            component_status["ecs"] = "DEGRADED"
        elif "UNKNOWN" in ecs_statuses:
            component_status["ecs"] = "UNKNOWN"
        else:
            component_status["ecs"] = "HEALTHY"

        for svc in telemetry.services:
            if svc.restart_count > 0:
                reasons.append(f"ECS task restart detected for service '{svc.service_name}' ({svc.restart_count} restarts)")
            if svc.running_tasks < svc.desired_tasks:
                reasons.append(f"ECS service '{svc.service_name}' task deficit: {svc.running_tasks}/{svc.desired_tasks} running")

        # Database Evaluation
        db_metrics = telemetry.database
        component_status["database"] = db_metrics.status
        if db_metrics.status == "CRITICAL":
            reasons.append(f"RDS database CPU ({db_metrics.cpu_utilization:.0f}%) or free storage ({db_metrics.free_storage_gb:.1f}GB) is CRITICAL")
        elif db_metrics.status == "AT_RISK":
            reasons.append(f"RDS database storage ({db_metrics.free_storage_gb:.1f}GB free) or queue depth ({db_metrics.disk_queue_depth:.1f}) is AT_RISK")

        # 2. Synthetic Uptime Checks
        uptime_res = await db.execute(
            select(UptimeCheck).where(
                UptimeCheck.environment_id == environment_id,
                UptimeCheck.organization_id == organization_id,
                UptimeCheck.enabled == True,
            )
        )
        uptime_checks = uptime_res.scalars().all()
        if uptime_checks:
            failed_checks = 0
            for check in uptime_checks:
                latest_result_res = await db.execute(
                    select(UptimeResult)
                    .where(UptimeResult.uptime_check_id == check.id)
                    .order_by(UptimeResult.checked_at.desc())
                    .limit(1)
                )
                latest_res = latest_result_res.scalars().first()
                if latest_res and latest_res.status == "DOWN":
                    failed_checks += 1
                    reasons.append(f"Uptime check '{check.name}' is DOWN: {latest_res.failure_reason or 'No response'}")

            if failed_checks > 0:
                component_status["uptime"] = "CRITICAL" if failed_checks == len(uptime_checks) else "DEGRADED"

        # 3. Backup Observation Status
        backup_res = await db.execute(
            select(BackupObservation)
            .where(
                BackupObservation.environment_id == environment_id,
                BackupObservation.organization_id == organization_id,
            )
            .order_by(BackupObservation.started_at.desc())
            .limit(1)
        )
        latest_backup = backup_res.scalars().first()
        if latest_backup:
            if latest_backup.status == "FAILED":
                component_status["backup"] = "CRITICAL"
                reasons.append(f"Latest database backup failed (Recovery point: {latest_backup.recovery_point})")
            elif latest_backup.status == "PARTIAL":
                component_status["backup"] = "AT_RISK"
                reasons.append("Latest backup completed with partial snapshot warnings")
            elif latest_backup.started_at < datetime.utcnow() - timedelta(hours=36):
                component_status["backup"] = "AT_RISK"
                reasons.append("Last successful backup was more than 36 hours ago (SLA exceeded)")

        # 4. Active Security Signals
        sec_res = await db.execute(
            select(SecuritySignal).where(
                SecuritySignal.environment_id == environment_id,
                SecuritySignal.organization_id == organization_id,
                SecuritySignal.status == "ACTIVE",
            )
        )
        active_signals = sec_res.scalars().all()
        crit_sec = [s for s in active_signals if s.severity == "CRITICAL"]
        high_sec = [s for s in active_signals if s.severity == "HIGH"]
        if crit_sec:
            component_status["security"] = "CRITICAL"
            reasons.append(f"{len(crit_sec)} active CRITICAL security signal(s) detected ({crit_sec[0].title})")
        elif high_sec:
            component_status["security"] = "AT_RISK"
            reasons.append(f"{len(high_sec)} active HIGH security signal(s) pending investigation")

        # 5. Infrastructure Drift
        drift_res = await db.execute(
            select(DriftDetectionRun).where(
                DriftDetectionRun.organization_id == organization_id,
                DriftDetectionRun.status == "DRIFT_DETECTED",
            ).limit(5)
        )
        drifted_runs = drift_res.scalars().all()
        if drifted_runs:
            total_drifts = sum(d.drift_count for d in drifted_runs)
            component_status["drift"] = "AT_RISK"
            reasons.append(f"Infrastructure drift detected ({total_drifts} drifted resource attributes)")

        # Overall Status Determination
        all_comp_values = list(component_status.values())
        if "CRITICAL" in all_comp_values:
            overall_status = "CRITICAL"
        elif "DEGRADED" in all_comp_values:
            overall_status = "DEGRADED"
        elif "AT_RISK" in all_comp_values:
            overall_status = "AT_RISK"
        elif all(v == "UNKNOWN" for v in all_comp_values):
            overall_status = "UNKNOWN"
        else:
            overall_status = "HEALTHY"

        snapshot = HealthSnapshot(
            organization_id=organization_id,
            application_id=application_id,
            environment_id=environment_id,
            overall_status=overall_status,
            component_status_json=component_status,
            reasons_json=reasons,
            captured_at=datetime.utcnow(),
        )
        db.add(snapshot)
        await db.commit()
        await db.refresh(snapshot)
        return snapshot
