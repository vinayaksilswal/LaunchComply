from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership
from app.models.entities import VAPTProject

router = APIRouter(prefix="/vapt", tags=["VAPT"])

@router.get("/projects")
async def list_vapt_projects(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(VAPTProject)
        .where(VAPTProject.organization_id == membership.organization_id)
        .order_by(VAPTProject.created_at.desc())
    )
    return result.scalars().all()
