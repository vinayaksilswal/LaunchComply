"""Recorded deployments and read-only preparation. Never simulate cloud execution."""
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, ConfigDict, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.v1.architecture_workspace import member, editor, application, latest, design_is_approved
from app.models.entities import Deployment, CloudAccount

router = APIRouter(prefix="/deployments", tags=["Deployments"])

@router.get("/")
async def list_deployments(membership=Depends(member), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Deployment).where(
        Deployment.organization_id == membership.organization_id,
        Deployment.deployment_mode != "SIMULATED", Deployment.evidence_level != "SIMULATED"
    ).order_by(Deployment.created_at.desc()))
    return result.scalars().all()

@router.get("/preparation/{application_id}")
async def preparation(application_id: str, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership)
    arch = await latest(db, app)
    spec = arch.spec_json if arch else {}
    evidence = spec.get("evidence") or {}
    targets = spec.get("requirements") or {}
    source_ready = bool(evidence.get("commit") and evidence.get("files") and not spec.get("source_changed"))
    accounts = (await db.execute(select(CloudAccount).where(
        CloudAccount.organization_id == membership.organization_id, CloudAccount.provider == "AWS",
        CloudAccount.region == targets.get("region"), CloudAccount.status == "CONNECTED"
    ).order_by(CloudAccount.last_verified_at.desc()))).scalars().all() if targets.get("region") else []
    now = datetime.now(timezone.utc)
    verified = []
    for account in accounts:
        checked = account.last_verified_at
        if checked and checked.tzinfo is None: checked = checked.replace(tzinfo=timezone.utc)
        if checked and now - timedelta(hours=24) <= checked <= now + timedelta(minutes=5) and (account.permission_profiles_json or {}).get("verification_source") == "AWS_STS_API":
            verified.append({"id": account.id, "account_id": account.account_id, "region": account.region, "checked_at": checked})
    approved = design_is_approved(arch)
    design_url = f"/dashboard/architecture?application={app.id}"
    checks = [
        {"id": "source", "title": "Review your source findings", "complete": source_ready,
         "detail": "Saved source analysis is available. Coverage is a static sample." if source_ready else "Connect source code and refresh findings for this asset.", "href": design_url},
        {"id": "targets", "title": "Set traffic and availability", "complete": bool(targets),
         "detail": f"{targets.get('region')} · {targets.get('availability')}" if targets else "Choose peak traffic, concurrent users, region and availability.", "href": design_url},
        {"id": "approval", "title": "Approve the saved design", "complete": approved,
         "detail": f"{arch.version} design approval recorded." if approved else "Review Services & sizing and approve the current version.", "href": design_url},
        {"id": "aws", "title": "Verify AWS role access", "complete": bool(verified),
         "detail": "Matching regional role access checked within 24 hours. Provisioning permissions are not verified." if verified else "Verify an AWS account in your chosen region. Verification expires after 24 hours.", "href": "#aws-account-connection"},
        {"id": "plan", "title": "Review infrastructure and costs", "complete": False,
         "detail": "The operations team must review the actual infrastructure plan, permissions, build settings and costs before deployment.", "href": "/dashboard/services"},
    ]
    return {"application_id": app.id, "application_name": app.name, "architecture_id": arch.id if arch else None,
        "version": arch.version if arch else None, "source_commit": evidence.get("commit"), "source_coverage": evidence.get("source_coverage"),
        "requirements": targets or None, "accounts": verified, "checks": checks, "evaluated_at": now,
        "automatic_deployment_available": False, "execution_status": "NOT_STARTED"}

class TriggerDeploymentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    application_id: str = Field(min_length=1, max_length=36)
    environment: str = Field(default="production", max_length=50)
    commit_sha: str | None = Field(default=None, max_length=64)

@router.post("/trigger")
async def trigger_deployment(payload: TriggerDeploymentRequest, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    await application(db, payload.application_id, membership)
    raise HTTPException(503, {"code": "AUTOMATIC_DEPLOYMENT_UNAVAILABLE",
        "message": "Automatic AWS provisioning is not available. Request a reviewed deployment service; no deployment was started."})
