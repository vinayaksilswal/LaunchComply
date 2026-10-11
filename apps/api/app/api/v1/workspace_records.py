"""Customer record views: no seeded fallbacks, generated statistics or provider calls."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.core.database import get_db, Base
from app.api.v1.architecture_workspace import member
from app.models.auth import OrganizationMembership, User, MembershipRole, Organization
from app.models.auth_commercial import Invitation, InvitationStatus
from app.models.audit import AuditEvent
from app.models.entities import ServiceRequest

router = APIRouter(prefix="/workspace-records", tags=["Workspace Records"])

# Explicit model allowlist. Never accept a table name or arbitrary fields from a browser.
MODELS = {
    "deployments": "Deployment", "releases": "ApplicationRelease", "environments": "Environment",
    "operations": "HealthSnapshot", "logs": "AuditEvent", "incidents": "Incident", "backups": "BackupObservation",
    "cost": "CostSnapshot", "security": "SecurityFinding", "threat-models": "ThreatModel", "vapt": "VAPTProject",
    "dr": "RestoreDrill", "compliance": "ComplianceAssessment", "policies": "Policy", "risks": "Risk",
    "vendors": "Vendor", "privacy": "DataInventoryItem", "actions": "ComplianceTask", "calendar": "ComplianceTask",
    "audits": "InternalAudit", "audit-packages": "AuditPackage", "audit-readiness": "ControlImplementation",
    "iso27001": "StatementOfApplicabilityEntry", "soc2": "ControlImplementation", "contracts": "CommercialContract",
    "trust": "ExternalAssuranceRecord", "assurance": "ContinuousControlMonitor", "bots": "AuditBot",
    "controls": "ContinuousControlMonitor", "evidence": "EvidenceObservation", "exceptions": "ControlException",
    "notifications": "Notification", "billing": "Invoice", "usage": "UsageEvent", "services": "ServiceRequest",
    "support": "SupportTicket", "business-units": "BusinessUnit", "sso": "SSOConfiguration", "workpapers": "AuditorWorkpaper",
}
VISIBLE = ("name", "title", "version", "action", "framework_name", "framework_code", "status", "overall_status", "severity",
    "provider", "deployment_mode", "evidence_level", "is_demo", "is_simulated", "currency", "invoice_number", "ticket_number",
    "region", "aws_region", "application_id", "description")

def plain(value):
    if hasattr(value, "value"): return value.value
    if hasattr(value, "isoformat"): return value.isoformat()
    return value if isinstance(value, (str, int, float, bool)) or value is None else None

@router.get("/team")
async def team(membership=Depends(member), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(OrganizationMembership, User).join(User, User.id == OrganizationMembership.user_id)
        .where(OrganizationMembership.organization_id == membership.organization_id, OrganizationMembership.is_active == True)
        .order_by(User.full_name))).all()
    return {"records": [{"id": item.id, "title": user.full_name, "status": item.role.value,
        "created_at": item.created_at, "user_id": user.id,
        "fields": {"email": user.email, "account_status": "Active" if user.is_active else "Inactive"}} for item, user in rows], "total": len(rows)}

async def team_manager(db, membership):
    org = (await db.execute(select(Organization).where(Organization.id == membership.organization_id).with_for_update())).scalar_one_or_none()
    actor = (await db.execute(select(OrganizationMembership).where(OrganizationMembership.id == membership.id)
        .execution_options(populate_existing=True))).scalar_one_or_none()
    if not org or not org.is_active or not actor or not actor.is_active or actor.role not in {MembershipRole.OWNER, MembershipRole.ADMIN}:
        raise HTTPException(403, "Business owner or administrator access is required.")
    return actor

@router.get("/team/invitations")
async def team_invitations(membership=Depends(member), db: AsyncSession = Depends(get_db)):
    if membership.role not in {MembershipRole.OWNER, MembershipRole.ADMIN}:
        raise HTTPException(403, "Business owner or administrator access is required.")
    rows = (await db.execute(select(Invitation).where(Invitation.organization_id == membership.organization_id,
        Invitation.status == InvitationStatus.PENDING, Invitation.expires_at > datetime.utcnow())
        .order_by(Invitation.created_at.desc()).limit(200))).scalars().all()
    return [{"id": item.id, "email": item.email, "role": item.role.value,
        "created_at": item.created_at, "expires_at": item.expires_at} for item in rows]

class TeamRole(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: MembershipRole

async def managed_member(db, membership, member_id):
    actor = await team_manager(db, membership)
    target = (await db.execute(select(OrganizationMembership).where(OrganizationMembership.id == member_id,
        OrganizationMembership.organization_id == actor.organization_id, OrganizationMembership.is_active == True)
        .with_for_update().execution_options(populate_existing=True))).scalar_one_or_none()
    if not target:
        raise HTTPException(404, "Team member not found in this business.")
    if target.user_id == actor.user_id or target.role == MembershipRole.OWNER:
        raise HTTPException(409, "Your own membership and business ownership cannot be changed here.")
    if target.role == MembershipRole.ADMIN and actor.role != MembershipRole.OWNER:
        raise HTTPException(403, "Only the business owner can manage administrators.")
    return actor, target

async def team_audit(db, actor, action, entity_id, details, entity_type="organization_membership"):
    user = await db.get(User, actor.user_id)
    db.add(AuditEvent(organization_id=actor.organization_id, actor_id=actor.user_id, actor_email=user.email,
        action=action, entity_type=entity_type, entity_id=entity_id, details=details))
    await db.commit()

@router.patch("/team/{member_id}")
async def team_role(member_id: str, payload: TeamRole, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    actor, target = await managed_member(db, membership, member_id)
    if payload.role == MembershipRole.OWNER or (payload.role == MembershipRole.ADMIN and actor.role != MembershipRole.OWNER):
        raise HTTPException(403, "Only the business owner can assign administrators. Ownership cannot be assigned here.")
    previous = target.role.value
    target.role = payload.role
    await team_audit(db, actor, "TEAM_MEMBER_ROLE_CHANGED", target.id, {"previous_role": previous, "role": payload.role.value})
    return {"status": "UPDATED"}

@router.delete("/team/{member_id}")
async def remove_team_member(member_id: str, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    actor, target = await managed_member(db, membership, member_id)
    user = await db.get(User, target.user_id)
    target.is_active = False
    # A previously issued invitation must not silently restore removed access.
    invites = (await db.execute(select(Invitation).where(Invitation.organization_id == actor.organization_id,
        func.lower(Invitation.email) == user.email.lower(), Invitation.status == InvitationStatus.PENDING))).scalars().all()
    for invite in invites:
        invite.status = InvitationStatus.REVOKED
    await team_audit(db, actor, "TEAM_MEMBER_REMOVED", target.id, {"user_id": target.user_id})
    return {"status": "REMOVED"}

@router.delete("/team/invitations/{invitation_id}")
async def revoke_invitation(invitation_id: str, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    actor = await team_manager(db, membership)
    invite = (await db.execute(select(Invitation).where(Invitation.id == invitation_id,
        Invitation.organization_id == actor.organization_id, Invitation.status == InvitationStatus.PENDING)
        .with_for_update())).scalar_one_or_none()
    if not invite:
        raise HTTPException(404, "Pending invitation not found in this business.")
    if invite.role in {MembershipRole.ADMIN, MembershipRole.OWNER} and actor.role != MembershipRole.OWNER:
        raise HTTPException(403, "Only the business owner can revoke administrator invitations.")
    invite.status = InvitationStatus.REVOKED
    await team_audit(db, actor, "TEAM_INVITATION_REVOKED", invite.id, {"email": invite.email}, "invitation")
    return {"status": "REVOKED"}

class BusinessName(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=255)
    expected_name: str = Field(max_length=255)

@router.patch("/account/business")
async def update_business_name(payload: BusinessName, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    actor = await team_manager(db, membership)
    org = await db.get(Organization, actor.organization_id)
    if org.name != payload.expected_name:
        raise HTTPException(409, "The business name changed. Refresh Settings before saving.")
    org.name = payload.name
    await team_audit(db, actor, "BUSINESS_NAME_UPDATED", org.id, {"name": org.name}, "organization")
    return {"status": "SAVED"}

class ProfileName(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    full_name: str = Field(min_length=2, max_length=255)
    expected_name: str = Field(max_length=255)

@router.patch("/account/profile")
async def update_profile_name(payload: ProfileName, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.id == membership.user_id).with_for_update()
        .execution_options(populate_existing=True))).scalar_one()
    if user.full_name != payload.expected_name:
        raise HTTPException(409, "Your profile changed. Refresh Settings before saving.")
    user.full_name = payload.full_name
    db.add(AuditEvent(organization_id=membership.organization_id, actor_id=user.id, actor_email=user.email,
        action="USER_PROFILE_UPDATED", entity_type="user", entity_id=user.id, details={"full_name": user.full_name}))
    await db.commit()
    return {"status": "SAVED"}

@router.get("/{module}")
async def records(module: str, application_id: str | None = None, record_id: str | None = None,
    offset: int = Query(default=0, ge=0, le=10000), membership=Depends(member), db: AsyncSession = Depends(get_db)):
    if module not in MODELS: raise HTTPException(404, "Workspace not available.")
    if module in {"billing", "usage"} and membership.role not in {MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.BILLING}:
        raise HTTPException(403, "Your business owner can grant access to billing records.")
    if module == "notifications":
        # Delivery events are scoped to this business and expose only public updates.
        conditions = [AuditEvent.organization_id == membership.organization_id,
            ServiceRequest.organization_id == membership.organization_id,
            AuditEvent.entity_type == "service_request",
            AuditEvent.action.in_({"BUSINESS_REQUEST_STATUS_UPDATED", "SERVICE_REPORT_PUBLISHED"})]
        if record_id: conditions.append(AuditEvent.id == record_id)
        joined = select(AuditEvent, ServiceRequest).join(ServiceRequest, ServiceRequest.id == AuditEvent.entity_id).where(*conditions)
        total = (await db.execute(select(func.count()).select_from(joined.subquery()))).scalar_one()
        rows = (await db.execute(joined.order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc()).offset(offset).limit(50))).all()
        return {"total": total, "available": True, "offset": offset, "records": [
            {"id": event.id, "title": request.title,
                "status": "Report published" if event.action == "SERVICE_REPORT_PUBLISHED" else (event.details or {}).get("status", "Updated"),
                "created_at": event.created_at,
                "fields": {"service_request_id": request.id,
                    "customer_update": (event.details or {}).get("customer_update", "") if event.action == "BUSINESS_REQUEST_STATUS_UPDATED" else "A service report is available on your application."}}
            for event, request in rows]}
    model = next((mapper.class_ for mapper in Base.registry.mappers if mapper.class_.__name__ == MODELS[module]), None)
    if not model or not hasattr(model, "organization_id"):
        # Unsupported integrations are explicit rather than accidentally querying a global table.
        return {"records": [], "total": 0, "available": False}
    conditions = [model.organization_id == membership.organization_id]
    if module == "deployments":
        conditions.extend([model.deployment_mode != "SIMULATED", model.evidence_level != "SIMULATED"])
    if application_id:
        if not hasattr(model, "application_id"): raise HTTPException(400, "This record type is not application specific.")
        conditions.append(model.application_id == application_id)
    if record_id: conditions.append(model.id == record_id)
    total = (await db.execute(select(func.count()).select_from(model).where(*conditions))).scalar_one()
    items = (await db.execute(select(model).where(*conditions).order_by(model.created_at.desc()).offset(offset).limit(50))).scalars().all()
    result = []
    for item in items:
        fields = {name: plain(getattr(item, name)) for name in VISIBLE if hasattr(item, name) and getattr(item, name) is not None}
        title = next((fields[key] for key in ("name", "title", "framework_name", "invoice_number", "ticket_number", "action", "version") if fields.get(key)), "Recorded item")
        state = next((fields[key] for key in ("status", "overall_status") if fields.get(key)), "Recorded")
        result.append({"id": item.id, "title": title, "status": state, "created_at": item.created_at, "fields": fields})
    return {"records": result, "total": total, "available": True, "offset": offset}
