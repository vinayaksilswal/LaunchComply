from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership
from app.models.entities import Deployment
from app.core.audit import log_audit_event

router = APIRouter(prefix="/deployments", tags=["Deployments"])

class TriggerDeploymentRequest(BaseModel):
    application_id: str
    environment: str = "production"
    commit_sha: Optional[str] = "HEAD"

@router.get("/")
async def list_deployments(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Deployment)
        .where(Deployment.organization_id == membership.organization_id)
        .order_by(Deployment.created_at.desc())
    )
    return result.scalars().all()

@router.post("/trigger")
async def trigger_deployment(
    payload: TriggerDeploymentRequest,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    dep = Deployment(
        application_id=payload.application_id,
        organization_id=membership.organization_id,
        version="v1.4.3",
        status="PROVISIONING",
        commit_sha=payload.commit_sha or "c4e1a8b",
        initiated_by="Manual Deployment Trigger",
        logs_json={
            "steps": [
                {"name": "Stack Validation", "status": "IN_PROGRESS", "duration": "Active"},
                {"name": "Terraform Plan Verification", "status": "QUEUED", "duration": "-"},
                {"name": "Container ECR Image Build", "status": "QUEUED", "duration": "-"},
                {"name": "ECS Fargate Rolling Update", "status": "QUEUED", "duration": "-"},
                {"name": "Synthetics Health Check", "status": "QUEUED", "duration": "-"},
            ]
        }
    )
    db.add(dep)
    await db.commit()
    await db.refresh(dep)

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="system@launchcomply.io",
        action="DEPLOYMENT_TRIGGERED",
        entity_type="deployment",
        entity_id=dep.id,
        details={"version": dep.version, "environment": payload.environment}
    )

    return dep
