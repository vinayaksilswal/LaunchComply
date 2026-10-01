"""Phase 5 Continuous Compliance & Evidence Freshness Engine.
Monitors technical evidence streams (RDS encryption, S3 blocks, restore drills, TLS validity),
tracks evidence freshness (CURRENT, EXPIRING, STALE, MISSING), evaluates controls,
and manages formal audit exception waivers.
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.operations import EvidenceFreshness, OperationalChange


TECHNICAL_CONTROLS = [
    {
        "framework": "SOC2",
        "control_id": "CC6.1-ENCRYPTION-AT-REST",
        "title": "Database and Storage Encryption at Rest",
        "resource_ref": "RDS PostgreSQL & S3 KMS AES-256",
        "ttl_days": 30,
    },
    {
        "framework": "SOC2",
        "control_id": "CC6.6-BOUNDARY-PROTECTION",
        "title": "Perimeter Protection & Public Access Blocking",
        "resource_ref": "AWS WAF & S3 Public Access Block",
        "ttl_days": 14,
    },
    {
        "framework": "SOC2",
        "control_id": "CC7.2-SECURITY-MONITORING",
        "title": "Continuous Threat Detection & Auditing",
        "resource_ref": "GuardDuty & CloudTrail Multi-Region",
        "ttl_days": 7,
    },
    {
        "framework": "SOC2",
        "control_id": "CC9.1-BACKUP-RESTORE-TEST",
        "title": "Automated Backup & Recoverability Verification",
        "resource_ref": "RDS Automated Backups & Restore Drill",
        "ttl_days": 90,
    },
    {
        "framework": "ISO27001",
        "control_id": "A.12.1.2-CHANGE-MANAGEMENT",
        "title": "Deployment Verification & Approval Gates",
        "resource_ref": "Release Engine Automated Smoke Tests",
        "ttl_days": 30,
    },
    {
        "framework": "ISO27001",
        "control_id": "A.14.1.2-TLS-IN-TRANSIT",
        "title": "Enforced TLS 1.3 Transport Encryption",
        "resource_ref": "ACM Managed Certificate on ALB",
        "ttl_days": 60,
    },
]


class ContinuousComplianceEngine:
    """Evaluates evidence freshness and computes dynamic control readiness."""

    async def refresh_evidence_statuses(
        self,
        db: AsyncSession,
        organization_id: str,
    ) -> List[EvidenceFreshness]:
        """Evaluates timestamps on all recorded evidence to update freshness states."""
        res = await db.execute(
            select(EvidenceFreshness).where(
                EvidenceFreshness.organization_id == organization_id,
            )
        )
        records = res.scalars().all()
        now = datetime.utcnow()

        for rec in records:
            if rec.expires_at < now:
                rec.freshness_status = "STALE"
            elif rec.expires_at < now + timedelta(days=7):
                rec.freshness_status = "EXPIRING"
            else:
                rec.freshness_status = "CURRENT"
            db.add(rec)

        await db.commit()
        return records

    async def get_compliance_posture(
        self,
        db: AsyncSession,
        organization_id: str,
    ) -> Dict[str, Any]:
        """Evaluates overall continuous compliance readiness and control statuses."""
        await self.refresh_evidence_statuses(db, organization_id)

        res = await db.execute(
            select(EvidenceFreshness).where(
                EvidenceFreshness.organization_id == organization_id,
            )
        )
        existing_evidence = {e.control_id: e for e in res.scalars().all()}

        controls_evaluated = []
        passing_count = 0
        expiring_count = 0
        stale_count = 0
        missing_count = 0

        for ctrl in TECHNICAL_CONTROLS:
            cid = ctrl["control_id"]
            ev = existing_evidence.get(cid)

            if not ev:
                status = "FAIL"
                freshness = "MISSING"
                missing_count += 1
                details = "No technical evidence collected yet."
            elif ev.freshness_status == "CURRENT":
                status = "PASS"
                freshness = "CURRENT"
                passing_count += 1
                details = f"Verified via {ev.resource_ref} ({ev.last_collected_at.strftime('%Y-%m-%d')})"
            elif ev.freshness_status == "EXPIRING":
                status = "PARTIAL"
                freshness = "EXPIRING"
                expiring_count += 1
                details = f"Evidence expiring in less than 7 days. Scheduled refresh required."
            else:  # STALE
                status = "FAIL"
                freshness = "STALE"
                stale_count += 1
                details = f"Evidence expired on {ev.expires_at.strftime('%Y-%m-%d')}. Control downgraded."

            controls_evaluated.append({
                "framework": ctrl["framework"],
                "control_id": cid,
                "title": ctrl["title"],
                "resource_ref": ctrl["resource_ref"],
                "status": status,
                "freshness": freshness,
                "details": details,
                "last_collected_at": ev.last_collected_at.isoformat() if ev else None,
                "expires_at": ev.expires_at.isoformat() if ev else None,
            })

        total = len(TECHNICAL_CONTROLS)
        coverage_pct = round((passing_count / total) * 100, 1) if total > 0 else 0.0

        return {
            "organization_id": organization_id,
            "evidence_coverage_percentage": coverage_pct,
            "summary": {
                "total_controls": total,
                "passing": passing_count,
                "expiring": expiring_count,
                "stale": stale_count,
                "missing": missing_count,
            },
            "controls": controls_evaluated,
            "disclaimer": "LaunchComply provides continuous technical evidence coverage. This report indicates audit readiness and does not constitute third-party attestation.",
        }

    async def ingest_evidence(
        self,
        db: AsyncSession,
        organization_id: str,
        framework: str,
        control_id: str,
        evidence_id: str,
        resource_ref: str,
        ttl_days: int = 30,
    ) -> EvidenceFreshness:
        """Records fresh technical evidence from AWS, Release Engine, or Restore Drill."""
        now = datetime.utcnow()
        expires = now + timedelta(days=ttl_days)

        res = await db.execute(
            select(EvidenceFreshness).where(
                EvidenceFreshness.organization_id == organization_id,
                EvidenceFreshness.control_id == control_id,
            )
        )
        existing = res.scalars().first()

        if existing:
            existing.evidence_id = evidence_id
            existing.last_collected_at = now
            existing.expires_at = expires
            existing.freshness_status = "CURRENT"
            existing.resource_ref = resource_ref
            rec = existing
        else:
            rec = EvidenceFreshness(
                organization_id=organization_id,
                framework=framework,
                control_id=control_id,
                evidence_id=evidence_id,
                last_collected_at=now,
                expires_at=expires,
                freshness_status="CURRENT",
                resource_ref=resource_ref,
            )
            db.add(rec)

        await db.commit()
        await db.refresh(rec)
        return rec
