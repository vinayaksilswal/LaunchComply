"""Phase 11 Independent Auditor Workspace, Workpapers, Sampling & Collaboration Service."""
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, desc

from app.models.assurance import (
    AuditorWorkpaper,
    EvidenceReviewThread,
    AuditorReviewStatus,
)
from app.models.security_assurance import AuditorAccessGrant


class AuditorWorkspaceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_workpaper(
        self,
        organization_id: str,
        grant_id: str,
        control_code: str,
        workpaper_number: str,
        auditor_email: str,
        framework: str = "SOC2",
        sampling_notes: Optional[str] = None,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None,
    ) -> AuditorWorkpaper:
        """Create an auditor assessment workpaper scoped strictly to authorized audit grants."""
        grant_res = await self.db.execute(
            select(AuditorAccessGrant).where(
                and_(
                    AuditorAccessGrant.id == grant_id,
                    AuditorAccessGrant.organization_id == organization_id,
                    AuditorAccessGrant.status == "ACTIVE",
                )
            )
        )
        grant = grant_res.scalar_one_or_none()
        if not grant:
            raise ValueError("Active auditor access grant not found or expired.")

        p_start = period_start or (datetime.utcnow() - timedelta(days=90))
        p_end = period_end or datetime.utcnow()

        workpaper = AuditorWorkpaper(
            organization_id=organization_id,
            grant_id=grant.id,
            workpaper_number=workpaper_number,
            framework=framework,
            control_code=control_code,
            auditor_email=auditor_email,
            review_status=AuditorReviewStatus.NOT_REVIEWED,
            sampling_notes=sampling_notes,
            period_start=p_start,
            period_end=p_end,
            is_locked=False,
        )
        self.db.add(workpaper)
        await self.db.commit()
        await self.db.refresh(workpaper)
        return workpaper

    async def update_workpaper_status(
        self,
        organization_id: str,
        workpaper_id: str,
        status: AuditorReviewStatus,
        findings_notes: Optional[str] = None,
        evidence_references: Optional[List[str]] = None,
    ) -> AuditorWorkpaper:
        """Record auditor evaluation. Note: External auditor review does not autonomously sign off certifications."""
        res = await self.db.execute(
            select(AuditorWorkpaper).where(
                and_(
                    AuditorWorkpaper.id == workpaper_id,
                    AuditorWorkpaper.organization_id == organization_id,
                )
            )
        )
        wp = res.scalar_one_or_none()
        if not wp:
            raise ValueError(f"Workpaper {workpaper_id} not found.")

        if wp.is_locked:
            raise ValueError("Workpaper is locked following audit period conclusion.")

        wp.review_status = status
        if findings_notes:
            wp.findings_notes = findings_notes
        if evidence_references is not None:
            wp.evidence_references_json = json.dumps(evidence_references)

        await self.db.commit()
        await self.db.refresh(wp)
        return wp

    async def add_review_thread_message(
        self,
        organization_id: str,
        workpaper_id: str,
        author_email: str,
        author_role: str,
        message: str,
        evidence_reference: Optional[str] = None,
    ) -> EvidenceReviewThread:
        """Post a threaded inquiry or auditee clarification response."""
        res = await self.db.execute(
            select(AuditorWorkpaper).where(
                and_(
                    AuditorWorkpaper.id == workpaper_id,
                    AuditorWorkpaper.organization_id == organization_id,
                )
            )
        )
        wp = res.scalar_one_or_none()
        if not wp:
            raise ValueError(f"Workpaper {workpaper_id} not found.")

        thread_msg = EvidenceReviewThread(
            organization_id=organization_id,
            workpaper_id=wp.id,
            author_email=author_email,
            author_role=author_role,
            message=message,
            evidence_reference=evidence_reference,
            created_at=datetime.utcnow(),
        )
        self.db.add(thread_msg)
        await self.db.commit()
        await self.db.refresh(thread_msg)
        return thread_msg

    async def get_workpapers(self, organization_id: str) -> List[AuditorWorkpaper]:
        """List all workpapers for an organization."""
        res = await self.db.execute(
            select(AuditorWorkpaper).where(AuditorWorkpaper.organization_id == organization_id).order_by(desc(AuditorWorkpaper.created_at))
        )
        return res.scalars().all()
