from fastapi import APIRouter, Depends, HTTPException
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership
from app.models.entities import ComplianceAssessment, Subprocessor, BackupPolicy
from app.api.v1.architecture_workspace import member
from app.models.auth import MembershipRole, Organization, User
from app.models.compliance_framework import CanonicalControl, ControlImplementation
from app.models.audit import AuditEvent
from app.services.compliance.workspace_readiness import workspace_readiness

router = APIRouter(prefix="/compliance", tags=["Compliance"])

@router.get("/workspace-readiness")
async def readiness(membership=Depends(member), db: AsyncSession = Depends(get_db)):
    return await workspace_readiness(db, membership.organization_id)

async def compliance_editor(db, membership):
    await db.execute(select(Organization).where(Organization.id == membership.organization_id).with_for_update())
    await db.refresh(membership)
    if not membership.is_active or membership.role not in {MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE}:
        raise HTTPException(403, "A business owner, administrator or compliance team member must update these controls.")

@router.post("/workspace-program")
async def setup_program(membership=Depends(member), db: AsyncSession = Depends(get_db)):
    await compliance_editor(db, membership)
    from app.services.compliance.framework_engine import framework_engine
    from sqlalchemy import text
    # The shared template library uses global unique codes. Serialize its initialization.
    if db.get_bind().dialect.name == "postgresql":
        await db.execute(text("SELECT pg_advisory_xact_lock(5248108001)"))
    await framework_engine.ensure_canonical_library(db)
    user = await db.get(User, membership.user_id)
    db.add(AuditEvent(organization_id=membership.organization_id, actor_id=user.id, actor_email=user.email,
        action="COMPLIANCE_WORKSPACE_OPENED", entity_type="organization", entity_id=membership.organization_id,
        details={"scope": "Mapped control templates; no implementation or evidence created."}))
    await db.commit()
    return await workspace_readiness(db, membership.organization_id)

class WorkspaceControlUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    status: Literal["NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED"]
    owner: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=3, max_length=4000)

@router.patch("/workspace-controls/{control_id}")
async def save_control(control_id: str, payload: WorkspaceControlUpdate, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    await compliance_editor(db, membership)
    control = await db.get(CanonicalControl, control_id)
    if not control:
        raise HTTPException(404, "Control template not found.")
    impl = (await db.execute(select(ControlImplementation).where(ControlImplementation.organization_id == membership.organization_id,
        ControlImplementation.control_id == control_id).order_by(ControlImplementation.updated_at.desc()).with_for_update())).scalars().first()
    if not impl:
        impl = ControlImplementation(organization_id=membership.organization_id, control_id=control.id,
            implementation_type=control.default_implementation_type, frequency=control.default_frequency)
        db.add(impl)
    # A changed description invalidates the previous review; declared completion cannot prove effectiveness.
    impl.status, impl.owner, impl.implementation_description = payload.status, payload.owner, payload.description
    impl.last_reviewed_at = None
    impl.next_review_at = None
    await db.flush()
    user = await db.get(User, membership.user_id)
    db.add(AuditEvent(organization_id=membership.organization_id, actor_id=user.id, actor_email=user.email,
        action="COMPLIANCE_CONTROL_DOCUMENTED", entity_type="control_implementation", entity_id=impl.id,
        details={"control_id": control.id, "status": payload.status}))
    await db.commit()
    return {"status": "SAVED"}

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
