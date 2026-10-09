import re
import asyncio
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.v1.github_authorization import authorized_member
from app.models.auth import OrganizationMembership, User, Organization
from app.models.application import Application, AppStatus
from app.models.source_control import Repository, SourceControlConnection, ConnectionStatus, ApplicationRepository
from app.models.audit import AuditEvent
from app.models.entities import Architecture
from app.models.source_archive import ApplicationSourceArchive
from app.services.architecture import workspace as architecture_service
from app.services.architecture.source_archive import inspect_archive, MAX_UPLOAD_BYTES

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])
upload_slots = asyncio.Semaphore(2)

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


@router.post("/upload")
async def upload_workspace(name: str = Form(min_length=1, max_length=255), request_id: UUID = Form(),
    file: UploadFile = File(), membership: OrganizationMembership = Depends(authorized_member), db: AsyncSession = Depends(get_db)):
    name = name.strip()
    if not name:
        raise HTTPException(422, "Application name is required.")
    filename = (file.filename or "").replace("\\", "/").split("/")[-1]
    if not filename or len(filename) > 255:
        raise HTTPException(422, "Choose a ZIP file with a filename of up to 255 characters.")
    try:
        raw = await file.read(MAX_UPLOAD_BYTES + 1)
    finally:
        await file.close()
    async with upload_slots:
        inspected = await run_in_threadpool(inspect_archive, raw, filename)
    identifier = str(request_id)
    # Serialize the storage quota and retries within one business.
    await db.execute(select(Organization).where(Organization.id == membership.organization_id).with_for_update())
    previous = await db.get(Application, identifier)
    if previous:
        source = (await db.execute(select(ApplicationSourceArchive).where(
            ApplicationSourceArchive.application_id == identifier,
            ApplicationSourceArchive.organization_id == membership.organization_id))).scalar_one_or_none()
        if previous.organization_id != membership.organization_id or previous.name != name or not source or source.sha256 != inspected["sha256"]:
            raise HTTPException(409, "This upload request was already used. Select the file again to start a new request.")
        return {"id": previous.id, "name": previous.name, "status": previous.status.value}
    from sqlalchemy import func
    count = (await db.execute(select(func.count()).select_from(ApplicationSourceArchive).where(
        ApplicationSourceArchive.organization_id == membership.organization_id))).scalar_one()
    if count >= 25:
        raise HTTPException(409, "Your business has reached 25 uploaded applications. Contact support to arrange additional storage.")
    app = Application(id=identifier, organization_id=membership.organization_id, name=name,
        slug=re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or identifier,
        repo_provider="archive", repo_url=None, repo_branch="uploaded",
        framework_frontend="Not assessed", framework_backend="Not assessed", database_engine="Not assessed",
        runtime="Not assessed", containerized=False, health_endpoint="", status=AppStatus.READY_FOR_ARCHITECTURE,
        production_readiness_score="UNKNOWN", security_posture_score="UNKNOWN", compliance_readiness_score="UNKNOWN")
    db.add(app)
    await db.flush([app])
    db.add(ApplicationSourceArchive(organization_id=membership.organization_id, application_id=app.id,
        uploaded_by=membership.user_id, filename=filename, size_bytes=len(raw), sha256=inspected["sha256"],
        file_count=inspected["file_count"], encrypted_archive=inspected["encrypted_archive"], evidence_json=inspected["evidence"]))
    db.add(Architecture(application_id=app.id, organization_id=membership.organization_id, name=app.name, version="v1",
        status="DRAFT", spec_json={"format": "repository-draft-v1", "revision": 1,
            "graph": architecture_service.draft_graph(inspected["evidence"]), "evidence": inspected["evidence"],
            "messages": [], "proposal": None, "deployment_status": "NOT_DEPLOYED"}))
    user = await db.get(User, membership.user_id)
    db.add(AuditEvent(organization_id=membership.organization_id, actor_id=membership.user_id, actor_email=user.email,
        action="APPLICATION_CODE_UPLOADED", entity_type="application", entity_id=app.id,
        details={"source": "ZIP_UPLOAD", "sha256": inspected["sha256"], "file_count": inspected["file_count"]}))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "The upload request conflicts with an existing workspace. Start a new request.") from None
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
