import re
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.v1.github_authorization import authorized_member
from app.models.auth import OrganizationMembership, User
from app.models.application import Application, AppStatus
from app.models.source_control import Repository, SourceControlConnection, ConnectionStatus, ApplicationRepository
from app.models.audit import AuditEvent

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])

class WorkspaceRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    repository_id: UUID
    request_id: UUID

async def existing_workspace(db, identifier, organization_id, name, repository_id):
    app = await db.get(Application, identifier)
    if not app:
        return None
    if app.organization_id != organization_id:
        raise HTTPException(409, "Please start a new workspace request.")
    link = (await db.execute(select(ApplicationRepository).where(ApplicationRepository.application_id == app.id,
        ApplicationRepository.organization_id == organization_id, ApplicationRepository.repository_id == repository_id))).scalar_one_or_none()
    if app.name != name or not link:
        raise HTTPException(409, "This request was already used for a different workspace.")
    return {"id": app.id, "name": app.name, "status": app.status.value}

@router.post("/workspace")
async def workspace(payload: WorkspaceRequest, membership: OrganizationMembership = Depends(authorized_member), db: AsyncSession = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(422, "Application name is required.")
    identifier, repo_id = str(payload.request_id), str(payload.repository_id)
    previous = await existing_workspace(db, identifier, membership.organization_id, name, repo_id)
    if previous:
        return previous
    repo = (await db.execute(select(Repository).join(SourceControlConnection).where(
        Repository.id == repo_id, Repository.organization_id == membership.organization_id, Repository.selected == True,
        Repository.archived == False, SourceControlConnection.organization_id == membership.organization_id,
        SourceControlConnection.status == ConnectionStatus.ACTIVE))).scalar_one_or_none()
    if not repo:
        raise HTTPException(404, "Choose an accessible repository from your connected GitHub account.")
    user = await db.get(User, membership.user_id)
    app = Application(id=identifier, organization_id=membership.organization_id, name=name,
        slug=re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or identifier,
        repo_url=repo.html_url, repo_branch=repo.default_branch, repo_provider="github",
        framework_frontend="Not analyzed", framework_backend="Not analyzed", database_engine="Not analyzed",
        runtime="Not analyzed", containerized=False, health_endpoint="",
        status=AppStatus.READY_FOR_ARCHITECTURE, production_readiness_score="UNKNOWN",
        security_posture_score="UNKNOWN", compliance_readiness_score="UNKNOWN")
    db.add(app)
    db.add(ApplicationRepository(organization_id=membership.organization_id, application_id=app.id,
        repository_id=repo.id, branch=repo.default_branch, root_path="/", is_primary=True))
    db.add(AuditEvent(organization_id=membership.organization_id, actor_id=membership.user_id,
        actor_email=user.email, action="APPLICATION_CREATED", entity_type="application", entity_id=app.id,
        details={"name": app.name, "repository_id": repo.id, "source": "ONBOARDING"}))
    try:
        # Insert the parent first, retaining a single outer transaction for link and audit.
        await db.flush([app])
        await db.commit()
    except IntegrityError:
        await db.rollback()
        previous = await existing_workspace(db, identifier, membership.organization_id, name, repo_id)
        if previous:
            return previous
        raise HTTPException(409, "The workspace could not be saved. Please try again.") from None
    return {"id": app.id, "name": app.name, "status": app.status.value}
