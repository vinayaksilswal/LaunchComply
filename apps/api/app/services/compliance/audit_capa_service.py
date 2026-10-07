"""Phase 7 Internal Audit, Centralized CAPA, and Executive Management Review Service."""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.compliance_audit import (
    InternalAudit,
    InternalAuditFinding,
    CorrectiveAction,
    ManagementReview,
)


class AuditAndCAPAService:
    """Internal Audit, CAPA Root Cause Resolution, and Management Reviews."""

    async def ensure_default_audit_data(
        self, db: AsyncSession, organization_id: str
    ):
        stmt = select(InternalAudit).where(InternalAudit.organization_id == organization_id)
        existing = (await db.execute(stmt)).scalars().first()
        if not existing:
            # 1. Create CAPA
            capa1 = CorrectiveAction(
                organization_id=organization_id,
                capa_number="CAPA-2026-001",
                title="Stale Subprocessor DPA Remediation for Resend Inc.",
                source_type="AUDIT",
                description="Internal audit observed that Resend Technologies was operating under standard online click-through terms rather than an executed bilateral Data Processing Addendum.",
                root_cause_analysis="Vendor was onboarded rapidly for MVP transactional notifications without triggering mandatory legal vendor intake workflow.",
                action_plan="Procure custom DPA containing India DPDP / EU SCC standard contractual clauses and obtain executive signature.",
                owner="legal@acmecloud.io",
                due_date=datetime.utcnow() + timedelta(days=14),
                status="IN_PROGRESS",
            )
            capa2 = CorrectiveAction(
                organization_id=organization_id,
                capa_number="CAPA-2026-002",
                title="Automate Monthly Vulnerability Retesting Pipeline",
                source_type="VAPT",
                description="Manual retesting of patched medium severity findings in admin console took over 30 days.",
                root_cause_analysis="Lack of automated webhook callback between GitHub PR merge and dynamic scanner queue.",
                action_plan="Deploy LaunchComply continuous security webhook to auto-queue retests on pull request merge.",
                owner="devops@acmecloud.io",
                due_date=datetime.utcnow() - timedelta(days=5),
                status="EFFECTIVE",
                implemented_at=datetime.utcnow() - timedelta(days=10),
                verification_notes="Verified webhook triggers retest scan cleanly within 5 minutes of PR merge.",
                verified_by="siddharth.rao@launchcomply.io",
                verified_at=datetime.utcnow() - timedelta(days=8),
                effectiveness_review="100% of subsequent PRs in Sprint 47 triggered automated retest verification with zero regressions.",
                effectiveness_reviewer="ciso@acmecloud.io",
                effectiveness_reviewed_at=datetime.utcnow() - timedelta(days=6),
            )
            db.add(capa1)
            db.add(capa2)
            await db.flush()

            # 2. Create Internal Audit
            audit = InternalAudit(
                organization_id=organization_id,
                audit_code="IA-2026-Q3",
                title="Annual ISO 27001 & SOC 2 Comprehensive Internal Management Systems Audit",
                framework="ISO27001_SOC2",
                lead_auditor="Priya Nair (Lead ISO 27001 Auditor)",
                audit_team="Priya Nair, Arjun Verma (Technical Security Assessor)",
                start_date=datetime.utcnow() - timedelta(days=20),
                end_date=datetime.utcnow() - timedelta(days=14),
                scope_description="Assessment of ISMS scope, AWS production infrastructure, container deployment pipelines, DR drills, and vendor risk management.",
                status="FINAL",
                summary_notes="ISMS is functioning effectively. Technical controls for encryption and multi-region resilience met all criteria. 1 Minor Non-Conformity recorded for subprocessor DPA tracking.",
                report_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            )
            db.add(audit)
            await db.flush()

            finding = InternalAuditFinding(
                organization_id=organization_id,
                internal_audit_id=audit.id,
                control_code="A.5.19",
                severity="MINOR",
                observation="Subprocessor agreement for transactional email provider lacked formal signed DPA counter-signature.",
                root_cause="Ad-hoc vendor onboarding without compliance intake checkpoint.",
                recommendation="Execute formal DPA and link evidence to Control LC-SR-001.",
                status="CAPA_ASSIGNED",
                corrective_action_id=capa1.id,
            )
            db.add(finding)

            # 3. Create Management Review
            review = ManagementReview(
                organization_id=organization_id,
                review_title="Q3 2026 Executive Information Security Management Review",
                review_date=datetime.utcnow() - timedelta(days=10),
                period_covered="Q1 - Q3 2026",
                chairperson="Alex Mercer (CTO & Acting CISO)",
                attendees_json=[
                    {"name": "Alex Mercer", "role": "CTO / Executive Sponsor"},
                    {"name": "Vikram Patel", "role": "Head of Engineering"},
                    {"name": "Priya Nair", "role": "Compliance Lead"},
                    {"name": "Siddharth Rao", "role": "Security Architect"},
                ],
                security_objectives_summary="All 4 quarterly security objectives on track. Mean Time to Remediate critical findings improved to 18 hours (target 24h). Backup restore drills RTO measured at 12m22s (target 30m).",
                audit_results_summary="Completed IA-2026-Q3 with 1 minor finding assigned to CAPA-2026-001.",
                incident_and_vapt_summary="Zero SEV-1 production security breaches. VAPT identified 1 critical secret finding, immediately remediated and retested.",
                risk_assessment_summary="Risk register updated with 5 enterprise risks. 1 medium risk accepted with compensating WAF controls.",
                supplier_performance_summary="AWS and Stripe continue to meet high assurance standards. Resend DPA in progress.",
                corrective_actions_summary="CAPA-2026-002 closed as effective. CAPA-2026-001 active with due date within 14 days.",
                improvement_decisions="Approved budget allocation for multi-region warm standby expansion and automated compliance evidence collection.",
                resource_needs="Authorized recruitment of dedicated Security Operations Engineer in Q4.",
                approved_minutes_markdown="""# Minutes of Executive Management Review (ISMS Clause 9.3)
**Date:** October 2026 | **Presiding:** Alex Mercer

1. **Review of Security Objectives:** Achieved 98% privileged MFA coverage; RTO target met.
2. **Audit Findings & CAPA:** Reviewed IA-2026-Q3. Management confirmed CAPA-2026-001 actions.
3. **Resource Commitments:** Approved cloud security budget for multi-region automation.
4. **Conclusion:** ISMS deemed suitable, adequate, and effective.
""",
                approved_by="alex.mercer@acmecloud.io",
                approved_at=datetime.utcnow() - timedelta(days=10),
                status="APPROVED",
            )
            db.add(review)
            await db.commit()

    async def list_internal_audits(
        self, db: AsyncSession, organization_id: str
    ) -> List[InternalAudit]:
        await self.ensure_default_audit_data(db, organization_id)
        stmt = (
            select(InternalAudit)
            .where(InternalAudit.organization_id == organization_id)
            .options(selectinload(InternalAudit.findings))
            .order_by(InternalAudit.start_date.desc())
        )
        res = await db.execute(stmt)
        return res.scalars().all()

    async def list_corrective_actions(
        self, db: AsyncSession, organization_id: str
    ) -> List[CorrectiveAction]:
        await self.ensure_default_audit_data(db, organization_id)
        stmt = (
            select(CorrectiveAction)
            .where(CorrectiveAction.organization_id == organization_id)
            .order_by(CorrectiveAction.created_at.desc())
        )
        res = await db.execute(stmt)
        return res.scalars().all()

    async def list_management_reviews(
        self, db: AsyncSession, organization_id: str
    ) -> List[ManagementReview]:
        await self.ensure_default_audit_data(db, organization_id)
        stmt = (
            select(ManagementReview)
            .where(ManagementReview.organization_id == organization_id)
            .order_by(ManagementReview.review_date.desc())
        )
        res = await db.execute(stmt)
        return res.scalars().all()


audit_capa_service = AuditAndCAPAService()
