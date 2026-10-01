from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership
from app.models.entities import ComplianceAssessment, Subprocessor, BackupPolicy

router = APIRouter(prefix="/compliance", tags=["Compliance"])

@router.get("/assessments")
async def list_compliance_assessments(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ComplianceAssessment)
        .where(ComplianceAssessment.organization_id == membership.organization_id)
        .order_by(ComplianceAssessment.created_at.asc())
    )
    return result.scalars().all()

@router.get("/subprocessors")
async def list_subprocessors(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Subprocessor)
        .where(Subprocessor.organization_id == membership.organization_id)
    )
    return result.scalars().all()

@router.get("/backups")
async def list_backups(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(BackupPolicy)
        .where(BackupPolicy.organization_id == membership.organization_id)
    )
    return result.scalars().all()
