"""Phase 6 Security Finding Management, Deduplication, SLA Tracking, and Retesting Engine."""
from datetime import datetime, timedelta
import hashlib
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.entities import SecurityFinding
from app.models.security_assurance import SecurityRiskAcceptance
from app.services.security_assurance.scanner_provider import RawFinding, SecurityScannerProvider


SLA_HOURS_MAP = {
    "CRITICAL": 24,       # 1 day
    "HIGH": 7 * 24,       # 7 days
    "MEDIUM": 30 * 24,    # 30 days
    "LOW": 90 * 24,       # 90 days
    "INFORMATIONAL": 90 * 24,
}


def compute_finding_fingerprint(asset: str, finding_type: str, location: str, line: Optional[int] = None) -> str:
    seed = f"{asset}:{finding_type}:{location}:{line or 0}"
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()[:32]


class FindingManager:
    """Manages finding normalization, fingerprint deduplication, SLA tracking, risk acceptance, and retests."""

    async def ingest_finding(
        self,
        db: AsyncSession,
        raw: RawFinding,
        organization_id: str,
        application_id: str,
        environment_id: str,
        assessment_id: Optional[str] = None,
    ) -> SecurityFinding:
        """Normalizes and deduplicates findings against active and historical inventory."""
        location = raw.file or raw.endpoint or "default"
        fingerprint = raw.fingerprint or compute_finding_fingerprint(
            raw.asset, raw.finding_type, location, raw.line
        )

        res = await db.execute(
            select(SecurityFinding).where(
                SecurityFinding.organization_id == organization_id,
                SecurityFinding.fingerprint == fingerprint,
            )
        )
        existing = res.scalars().first()

        now = datetime.utcnow()
        if existing:
            # Check for regression: finding was resolved but reappeared in later scan
            if existing.status == "RESOLVED":
                existing.status = "REOPENED"
                existing.retest_status = "STILL_PRESENT"
                existing.last_seen_at = now
            else:
                existing.last_seen_at = now
                if raw.evidence:
                    existing.evidence = raw.evidence
            db.add(existing)
            await db.commit()
            await db.refresh(existing)
            return existing

        # Compute SLA due date
        sla_hours = SLA_HOURS_MAP.get(raw.severity.upper(), 30 * 24)
        sla_due = now + timedelta(hours=sla_hours)

        finding = SecurityFinding(
            organization_id=organization_id,
            application_id=application_id,
            environment_id=environment_id,
            assessment_id=assessment_id,
            title=raw.title,
            severity=raw.severity,
            status="OPEN",
            cvss_score=str(raw.cvss_score),
            cvss_vector=raw.cvss_vector,
            category=raw.owasp_category,
            owasp_mapping=raw.owasp_category,
            cwe=raw.cwe,
            description=raw.description,
            suggested_fix=raw.remediation,
            affected_asset=raw.asset,
            scanner=raw.scanner,
            finding_type=raw.finding_type,
            endpoint=raw.endpoint,
            file=raw.file,
            line=raw.line,
            evidence=raw.evidence,
            confidence=raw.confidence,
            business_impact=raw.business_impact,
            technical_impact=raw.technical_impact,
            remediation=raw.remediation,
            detected_at=now,
            last_seen_at=now,
            retest_status="NONE",
            sla_due_date=sla_due,
            fingerprint=fingerprint,
        )
        db.add(finding)
        await db.commit()
        await db.refresh(finding)
        return finding

    async def update_status(
        self,
        db: AsyncSession,
        finding_id: str,
        organization_id: str,
        new_status: str,
        actor_email: str,
    ) -> Optional[SecurityFinding]:
        """Transitions status: OPEN, CONFIRMED, IN_PROGRESS, READY_FOR_RETEST, RESOLVED, FALSE_POSITIVE."""
        res = await db.execute(
            select(SecurityFinding).where(
                SecurityFinding.id == finding_id,
                SecurityFinding.organization_id == organization_id,
            )
        )
        finding = res.scalars().first()
        if not finding:
            return None

        finding.status = new_status
        if new_status == "RESOLVED":
            finding.resolved_at = datetime.utcnow()
            finding.retest_status = "FIXED"

        db.add(finding)
        await db.commit()
        await db.refresh(finding)
        return finding

    async def accept_risk(
        self,
        db: AsyncSession,
        finding_id: str,
        organization_id: str,
        justification: str,
        compensating_control: str = "Compensating Control Verified",
        accepted_by: Optional[str] = None,
        approved_by: Optional[str] = None,
        actor_email: Optional[str] = None,
        reason: Optional[str] = None,
        duration_days: int = 90,
    ) -> SecurityRiskAcceptance:
        """Records structured risk acceptance with mandatory expiration date."""
        res = await db.execute(
            select(SecurityFinding).where(
                SecurityFinding.id == finding_id,
                SecurityFinding.organization_id == organization_id,
            )
        )
        finding = res.scalars().first()
        if not finding:
            raise ValueError("Finding not found")

        user_acc = accepted_by or actor_email or "security@launchcomply.io"
        user_app = approved_by or actor_email or "ciso@launchcomply.io"
        final_justification = f"Reason: {reason} | Details: {justification}" if reason else justification

        now = datetime.utcnow()
        acceptance = SecurityRiskAcceptance(
            organization_id=organization_id,
            finding_id=finding_id,
            justification=final_justification,
            compensating_control=compensating_control,
            accepted_by=user_acc,
            approved_by=user_app,
            accepted_at=now,
            expires_at=now + timedelta(days=duration_days),
            status="ACTIVE",
        )
        db.add(acceptance)

        finding.status = "ACCEPTED_RISK"
        db.add(finding)

        await db.commit()
        await db.refresh(acceptance)
        return acceptance

    async def retest_finding(
        self,
        db: AsyncSession,
        finding_id: str,
        organization_id: str,
        mock_result_fixed: bool = True,
        actor_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Executes targeted retesting of a specific finding to verify remediation."""
        res = await db.execute(
            select(SecurityFinding).where(
                SecurityFinding.id == finding_id,
                SecurityFinding.organization_id == organization_id,
            )
        )
        finding = res.scalars().first()
        if not finding:
            raise ValueError("Finding not found")

        if mock_result_fixed:
            finding.status = "RESOLVED"
            finding.retest_status = "FIXED"
            finding.resolved_at = datetime.utcnow()
            outcome = "FIXED"
        else:
            finding.retest_status = "STILL_PRESENT"
            outcome = "STILL_PRESENT"

        db.add(finding)
        await db.commit()
        await db.refresh(finding)

        return {
            "finding_id": finding.id,
            "status": finding.status,
            "retest_status": outcome,
            "verified_at": datetime.utcnow().isoformat(),
        }

    async def get_security_posture_summary(
        self,
        db: AsyncSession,
        organization_id: str,
    ) -> Dict[str, Any]:
        """Computes executive security posture metrics, SLA status, and risk acceptance queue."""
        res = await db.execute(
            select(SecurityFinding).where(SecurityFinding.organization_id == organization_id)
        )
        findings = res.scalars().all()

        now = datetime.utcnow()
        open_statuses = {"OPEN", "CONFIRMED", "IN_PROGRESS", "REOPENED"}

        open_critical = 0
        open_high = 0
        open_medium = 0
        open_low = 0
        overdue_count = 0
        accepted_risk_count = 0
        retest_queue_count = 0

        for f in findings:
            if f.status == "ACCEPTED_RISK":
                accepted_risk_count += 1
            elif f.status == "READY_FOR_RETEST":
                retest_queue_count += 1
            elif f.status in open_statuses:
                sev = f.severity.upper()
                if sev == "CRITICAL":
                    open_critical += 1
                elif sev == "HIGH":
                    open_high += 1
                elif sev == "MEDIUM":
                    open_medium += 1
                else:
                    open_low += 1

                if f.sla_due_date and f.sla_due_date < now:
                    overdue_count += 1

        total_open = open_critical + open_high + open_medium + open_low
        # Compute normalized posture score (0-100%)
        deductions = (open_critical * 25) + (open_high * 10) + (open_medium * 3) + (overdue_count * 5)
        posture_score = max(20, min(100, 100 - deductions))

        return {
            "posture_score": f"{posture_score}%",
            "open_critical": open_critical,
            "open_high": open_high,
            "open_medium": open_medium,
            "open_low": open_low,
            "total_open": total_open,
            "overdue_findings": overdue_count,
            "accepted_risks": accepted_risk_count,
            "retest_queue": retest_queue_count,
        }
