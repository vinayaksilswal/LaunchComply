"""Customer record views: no seeded fallbacks, generated statistics or provider calls."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db, Base
from app.api.v1.architecture_workspace import member
from app.models.auth import OrganizationMembership, User, MembershipRole

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
        "created_at": item.created_at, "fields": {"email": user.email, "account_status": "Active" if user.is_active else "Inactive"}} for item, user in rows], "total": len(rows)}

@router.get("/{module}")
async def records(module: str, application_id: str | None = None, record_id: str | None = None,
    offset: int = Query(default=0, ge=0, le=10000), membership=Depends(member), db: AsyncSession = Depends(get_db)):
    if module not in MODELS: raise HTTPException(404, "Workspace not available.")
    if module in {"billing", "usage"} and membership.role not in {MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.BILLING}:
        raise HTTPException(403, "Your business owner can grant access to billing records.")
    model = next((mapper.class_ for mapper in Base.registry.mappers if mapper.class_.__name__ == MODELS[module]), None)
    if not model or not hasattr(model, "organization_id"):
        # Unsupported integrations are explicit rather than accidentally querying a global table.
        return {"records": [], "total": 0, "available": False}
    conditions = [model.organization_id == membership.organization_id]
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
