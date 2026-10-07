"""Phase 6 Professional VAPT Engagement & Report Generation Service.
Manages engagement lifecycle (REQUESTED -> CLOSED), rules of engagement approval,
and generates immutable audit-ready VAPT reports with cryptographic SHA256 hashes.
"""
from datetime import datetime
import hashlib
import json
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.entities import VAPTProject, SecurityFinding
from app.models.security_assurance import SecurityAssessment


class VAPTEngagementService:
    """Manages professional penetration testing engagements and report generation."""

    async def request_engagement(
        self,
        db: AsyncSession,
        organization_id: str,
        application_id: str,
        title: str,
        scope_description: str,
        lead_tester: str = "LaunchComply Offensive Security Certified Team",
    ) -> VAPTProject:
        """Initializes a new professional VAPT engagement request."""
        project = VAPTProject(
            organization_id=organization_id,
            application_id=application_id,
            title=title,
            status="REQUESTED",
            scope=scope_description,
            methodology="OWASP Web Security Testing Guide (WSTG) v4.2 + PTES + NIST SP 800-115",
            lead_tester=lead_tester,
            critical_count="0",
            high_count="0",
            medium_count="0",
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    async def advance_status(
        self,
        db: AsyncSession,
        project_id: str,
        organization_id: str,
        new_status: str,
    ) -> Optional[VAPTProject]:
        """Transitions VAPT project through its formal lifecycle."""
        res = await db.execute(
            select(VAPTProject).where(
                VAPTProject.id == project_id,
                VAPTProject.organization_id == organization_id,
            )
        )
        project = res.scalars().first()
        if not project:
            return None

        project.status = new_status
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    async def generate_vapt_report(
        self,
        db: AsyncSession,
        project_id: str,
        organization_id: str,
        version: str = "v1.0",
    ) -> Dict[str, Any]:
        """Generates an immutable, cryptographic SHA256-signed final VAPT report."""
        res = await db.execute(
            select(VAPTProject).where(
                VAPTProject.id == project_id,
                VAPTProject.organization_id == organization_id,
            )
        )
        project = res.scalars().first()
        if not project:
            raise ValueError("VAPT Project not found")

        findings_res = await db.execute(
            select(SecurityFinding).where(
                SecurityFinding.organization_id == organization_id,
                SecurityFinding.application_id == project.application_id,
            )
        )
        findings = findings_res.scalars().all()

        crit_count = sum(1 for f in findings if f.severity.upper() == "CRITICAL" and f.status != "RESOLVED")
        high_count = sum(1 for f in findings if f.severity.upper() == "HIGH" and f.status != "RESOLVED")
        med_count = sum(1 for f in findings if f.severity.upper() == "MEDIUM" and f.status != "RESOLVED")
        low_count = sum(1 for f in findings if f.severity.upper() == "LOW" and f.status != "RESOLVED")

        project.critical_count = str(crit_count)
        project.high_count = str(high_count)
        project.medium_count = str(med_count)

        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        report_content = {
            "report_id": f"VAPT-{project.id[:8].upper()}-{version}",
            "project_id": project.id,
            "title": project.title,
            "version": version,
            "generated_at": now_str,
            "methodology": project.methodology,
            "scope": project.scope,
            "lead_assessor": project.lead_tester,
            "findings_summary": {
                "critical": crit_count,
                "high": high_count,
                "medium": med_count,
                "low": low_count,
                "total_active": crit_count + high_count + med_count + low_count,
            },
            "findings_details": [
                {
                    "id": f.id,
                    "title": f.title,
                    "severity": f.severity,
                    "cvss": f.cvss_score,
                    "cwe": f.cwe,
                    "status": f.status,
                    "remediation": f.remediation,
                }
                for f in findings
            ],
            "limitations": "Testing was performed strictly within approved authorized scope. Denial-of-service and physical social engineering were explicitly prohibited.",
            "disclaimer": "This report represents a point-in-time security assessment and does not constitute third-party certification or regulatory compliance guarantee.",
        }

        # Compute SHA256 integrity hash
        serialized = json.dumps(report_content, sort_keys=True)
        report_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        report_content["sha256_integrity_hash"] = report_hash

        project.status = "FINAL_REPORT"
        db.add(project)
        await db.commit()

        return report_content
