"""Phase 8 Usage Metering and Idempotent Ingestion Engine."""
from typing import Dict, Any, List, Optional
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.commercial import UsageEvent, UsageAggregate, UsageMetricDefinition


DEFAULT_METRICS = [
    ("applications", "Connected Applications", "count"),
    ("environments", "Active Environments", "count"),
    ("aws_accounts", "Integrated AWS Accounts", "count"),
    ("build_minutes", "CI/CD Build Minutes", "minutes"),
    ("security_scans", "Automated Security Scans", "count"),
    ("vapt_assets", "Authorized VAPT Assets", "count"),
    ("stored_evidence_gb", "Compliance Evidence Storage", "gigabytes"),
    ("audit_packages", "Immutable Audit Packages Generated", "count"),
    ("restore_drills", "Cross-Region Restore Drills", "count"),
    ("monitored_resources", "Monitored Cloud Resources", "count"),
    ("ai_remediations", "AI Security Remediation Reviews", "count"),
]


class UsageService:
    """Manages idempotent metered usage ingestion and aggregation."""

    async def ensure_metric_definitions(self, db: AsyncSession) -> None:
        """Seeds standard metric definitions if missing."""
        for key, name, unit in DEFAULT_METRICS:
            res = await db.execute(select(UsageMetricDefinition).where(UsageMetricDefinition.metric_key == key))
            if not res.scalars().first():
                m = UsageMetricDefinition(metric_key=key, name=name, unit=unit, is_active=True)
                db.add(m)
        await db.commit()

    async def record_usage_event(
        self,
        db: AsyncSession,
        organization_id: str,
        metric_key: str,
        quantity: float,
        idempotency_key: str,
        source: str = "internal_engine"
    ) -> Dict[str, Any]:
        """
        Records a metered usage event with strict idempotency and validation.
        Prevents duplicate events and negative values.
        """
        if quantity < 0:
            raise ValueError("Usage quantity cannot be negative.")

        # Check existing idempotency key
        res = await db.execute(select(UsageEvent).where(UsageEvent.idempotency_key == idempotency_key))
        existing = res.scalars().first()
        if existing:
            return {
                "event_id": existing.id,
                "metric_key": existing.metric_key,
                "quantity": existing.quantity,
                "recorded_at": existing.recorded_at.isoformat(),
                "status": "DUPLICATE_IDEMPOTENT_IGNORED"
            }

        now = datetime.utcnow()
        event = UsageEvent(
            organization_id=organization_id,
            metric_key=metric_key,
            quantity=quantity,
            idempotency_key=idempotency_key,
            recorded_at=now,
            source=source
        )
        db.add(event)

        # Update monthly aggregate
        period_start = datetime(now.year, now.month, 1)
        next_month = now.month + 1 if now.month < 12 else 1
        next_year = now.year if now.month < 12 else now.year + 1
        period_end = datetime(next_year, next_month, 1)

        agg_res = await db.execute(
            select(UsageAggregate).where(
                UsageAggregate.organization_id == organization_id,
                UsageAggregate.metric_key == metric_key,
                UsageAggregate.period_start == period_start
            )
        )
        agg = agg_res.scalars().first()
        if not agg:
            agg = UsageAggregate(
                organization_id=organization_id,
                metric_key=metric_key,
                period_start=period_start,
                period_end=period_end,
                total_quantity=quantity
            )
            db.add(agg)
        else:
            agg.total_quantity += quantity

        await db.commit()
        return {
            "event_id": event.id,
            "metric_key": event.metric_key,
            "quantity": event.quantity,
            "recorded_at": event.recorded_at.isoformat(),
            "status": "RECORDED"
        }

    async def get_current_usage(self, db: AsyncSession, organization_id: str) -> Dict[str, Any]:
        """Returns monthly aggregated usage for an organization."""
        now = datetime.utcnow()
        period_start = datetime(now.year, now.month, 1)

        res = await db.execute(
            select(UsageAggregate).where(
                UsageAggregate.organization_id == organization_id,
                UsageAggregate.period_start == period_start
            )
        )
        aggregates = res.scalars().all()

        usage_map = {}
        for a in aggregates:
            usage_map[a.metric_key] = a.total_quantity

        # Provide defaults for any unmetered standard keys
        for key, name, unit in DEFAULT_METRICS:
            if key not in usage_map:
                usage_map[key] = 0.0

        return {
            "organization_id": organization_id,
            "period": f"{now.year}-{now.month:02d}",
            "metrics": usage_map
        }


usage_service = UsageService()
