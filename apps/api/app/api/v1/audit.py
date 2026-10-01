from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership
from app.models.audit import AuditEvent
from app.schemas.dashboard import AuditEventResponse

router = APIRouter(prefix="/audit-events", tags=["Audit Trail"])

@router.get("/", response_model=List[AuditEventResponse])
async def list_audit_events(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AuditEvent)
        .where(AuditEvent.organization_id == membership.organization_id)
        .order_by(AuditEvent.created_at.desc())
        .limit(50)
    )
    events = result.scalars().all()
    return [
        AuditEventResponse(
            id=e.id,
            action=e.action,
            actor_email=e.actor_email,
            entity_type=e.entity_type,
            entity_id=e.entity_id,
            ip_address=e.ip_address,
            created_at=e.created_at.isoformat(),
            details=e.details
        )
        for e in events
    ]
