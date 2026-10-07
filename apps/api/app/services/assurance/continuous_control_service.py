"""Phase 11 Continuous Control Monitoring & Operating Evidence Service."""
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, desc

from app.models.assurance import (
    ContinuousControlMonitor,
    ContinuousControlStatus,
    ControlEvaluationHistory,
    AssuranceAutomationPolicy,
    EvidenceObservation,
)
from app.models.compliance_framework import (
    CanonicalControl,
    ControlImplementation,
    ControlException,
)
from app.models.compliance_risk import Risk
from app.models.entities import SecurityFinding
from app.models.audit import AuditEvent


class ContinuousControlService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_monitor(
        self,
        organization_id: str,
        control_code: str,
    ) -> ContinuousControlMonitor:
        """Fetch active monitor or initialize default baseline state."""
        res = await self.db.execute(
            select(ContinuousControlMonitor).where(
                and_(
                    ContinuousControlMonitor.organization_id == organization_id,
                    ContinuousControlMonitor.control_code == control_code,
                )
            )
        )
        monitor = res.scalar_one_or_none()
        if not monitor:
            monitor = ContinuousControlMonitor(
                organization_id=organization_id,
                control_code=control_code,
                current_status=ContinuousControlStatus.PASS,
                last_evaluated_at=datetime.utcnow(),
                status_reason="Initial continuous monitoring verification established.",
                evidence_used_json="[]",
                evidence_missing_json="[]",
                operating_evidence_count=1,
                total_evaluations_count=1,
            )
            self.db.add(monitor)
            await self.db.commit()
            await self.db.refresh(monitor)
        return monitor

    async def evaluate_control(
        self,
        organization_id: str,
        control_code: str,
        new_status: ContinuousControlStatus,
        reason: str,
        evidence_observation_id: Optional[str] = None,
        evidence_code: Optional[str] = None,
        trigger_event: str = "BOT_RUN",
    ) -> Tuple[ContinuousControlMonitor, Optional[ControlEvaluationHistory], Optional[ControlException]]:
        """Evaluate continuous control state, register causal explanation, track exception window, and log transition history."""
        monitor = await self.get_or_create_monitor(organization_id, control_code)
        prev_status = monitor.current_status.value

        history_entry: Optional[ControlEvaluationHistory] = None
        exception_record: Optional[ControlException] = None

        status_changed = prev_status != new_status.value

        # Update Monitor
        monitor.current_status = new_status
        monitor.last_evaluated_at = datetime.utcnow()
        monitor.status_reason = reason
        monitor.total_evaluations_count += 1
        if new_status == ContinuousControlStatus.PASS:
            monitor.operating_evidence_count += 1

        used_evidence = []
        if evidence_code:
            used_evidence.append(evidence_code)
        monitor.evidence_used_json = json.dumps(used_evidence)
        monitor.evidence_missing_json = json.dumps([] if new_status == ContinuousControlStatus.PASS else ["VALID_CRYPTOGRAPHIC_EVIDENCE"])

        # Sync canonical ControlImplementation
        impl_res = await self.db.execute(
            select(ControlImplementation)
            .join(CanonicalControl, CanonicalControl.id == ControlImplementation.control_id)
            .where(
                and_(
                    ControlImplementation.organization_id == organization_id,
                    CanonicalControl.control_code == control_code,
                )
            )
        )
        impl = impl_res.scalar_one_or_none()
        if impl:
            if new_status == ContinuousControlStatus.PASS:
                impl.status = "EFFECTIVE"
            elif new_status == ContinuousControlStatus.PARTIAL:
                impl.status = "PARTIAL"
            elif new_status == ContinuousControlStatus.FAIL:
                impl.status = "INEFFECTIVE"
            elif new_status == ContinuousControlStatus.STALE:
                impl.status = "STALE_EVIDENCE"
            impl.last_reviewed_at = datetime.utcnow()

        if status_changed:
            # 1. Record Evaluation History
            history_entry = ControlEvaluationHistory(
                organization_id=organization_id,
                control_code=control_code,
                evaluated_at=datetime.utcnow(),
                previous_status=prev_status,
                new_status=new_status.value,
                reason=reason,
                trigger_event=trigger_event,
                evidence_observation_id=evidence_observation_id,
            )
            self.db.add(history_entry)

            # 2. Manage Exception Windows (PASS -> FAIL or FAIL -> PASS)
            if new_status == ContinuousControlStatus.FAIL and impl:
                now_dt = datetime.utcnow()
                q_num = (now_dt.month - 1) // 3 + 1
                exception_record = ControlException(
                    organization_id=organization_id,
                    control_implementation_id=impl.id,
                    title=f"Continuous control failure: {control_code}",
                    description=reason,
                    detected_at=now_dt,
                    impact="HIGH",
                    affected_period=f"{now_dt.year}-Q{q_num}",
                    remediation="Remediate resource drift to restore compliant configuration state.",
                    owner=impl.owner or "Security Operations",
                    status="OPEN",
                )
                self.db.add(exception_record)

            elif new_status == ContinuousControlStatus.PASS and impl:
                # Find open exception and resolve it
                open_exc_res = await self.db.execute(
                    select(ControlException).where(
                        and_(
                            ControlException.organization_id == organization_id,
                            ControlException.control_implementation_id == impl.id,
                            ControlException.status == "OPEN",
                        )
                    ).order_by(desc(ControlException.detected_at))
                )
                open_exc = open_exc_res.scalars().first()
                if open_exc:
                    open_exc.status = "RESOLVED"
                    open_exc.resolved_at = datetime.utcnow()
                    exception_record = open_exc

            # Audit Event
            audit = AuditEvent(
                organization_id=organization_id,
                actor_id="continuous-control-engine",
                actor_email="assurance@launchcomply.internal",
                action="CONTROL_EVALUATION_CHANGED",
                entity_type="ContinuousControlMonitor",
                entity_id=monitor.id,
                details={
                    "control_code": control_code,
                    "previous_status": prev_status,
                    "new_status": new_status.value,
                    "reason": reason,
                    "evidence_code": evidence_code,
                },
            )
            self.db.add(audit)

        await self.db.commit()
        await self.db.refresh(monitor)
        if history_entry:
            await self.db.refresh(history_entry)

        return monitor, history_entry, exception_record

    async def get_assurance_summary(self, organization_id: str) -> Dict[str, Any]:
        """Aggregate high-level continuous assurance statistics for executive & auditor dashboards."""
        monitors_res = await self.db.execute(
            select(ContinuousControlMonitor).where(ContinuousControlMonitor.organization_id == organization_id)
        )
        monitors = monitors_res.scalars().all()

        pass_count = sum(1 for m in monitors if m.current_status == ContinuousControlStatus.PASS)
        partial_count = sum(1 for m in monitors if m.current_status == ContinuousControlStatus.PARTIAL)
        fail_count = sum(1 for m in monitors if m.current_status == ContinuousControlStatus.FAIL)
        stale_count = sum(1 for m in monitors if m.current_status == ContinuousControlStatus.STALE)

        total_monitored = len(monitors) if monitors else 1
        effective_rate = round((pass_count / total_monitored) * 100, 1)

        # Retrieve recent exceptions
        exc_res = await self.db.execute(
            select(ControlException)
            .where(ControlException.organization_id == organization_id)
            .order_by(desc(ControlException.detected_at))
            .limit(10)
        )
        exceptions = exc_res.scalars().all()

        return {
            "monitored_controls_count": len(monitors),
            "pass_count": pass_count,
            "partial_count": partial_count,
            "fail_count": fail_count,
            "stale_count": stale_count,
            "effectiveness_percentage": effective_rate,
            "recent_exceptions_count": len(exceptions),
            "exceptions": [
                {
                    "id": e.id,
                    "title": e.title,
                    "impact": e.impact,
                    "status": e.status,
                    "detected_at": e.detected_at.isoformat() if e.detected_at else None,
                    "resolved_at": e.resolved_at.isoformat() if e.resolved_at else None,
                }
                for e in exceptions
            ],
        }
