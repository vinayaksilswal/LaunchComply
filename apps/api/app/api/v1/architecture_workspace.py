import uuid
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership, MembershipRole, User
from app.models.application import Application
from app.models.entities import Architecture
from app.models.audit import AuditEvent
from app.models.source_control import Repository, ApplicationRepository, SourceControlConnection, ConnectionStatus
from app.services.architecture import workspace as service

router = APIRouter(prefix="/architecture/workspace", tags=["Architecture Workspace"])

async def member(request: Request, membership: OrganizationMembership = Depends(get_current_membership)):
    if request.headers.get("X-Organization-ID") not in (None, membership.organization_id):
        raise HTTPException(403, "You are not a member of this organization.")
    return membership

async def editor(membership: OrganizationMembership = Depends(member)):
    if membership.role not in (MembershipRole.OWNER, MembershipRole.ADMIN):
        raise HTTPException(403, "An owner or administrator must edit architecture.")
    return membership

async def application(db, application_id, membership, lock=False):
    query = select(Application).where(Application.id == application_id, Application.organization_id == membership.organization_id)
    if lock: query = query.with_for_update()
    app = (await db.execute(query)).scalar_one_or_none()
    if not app: raise HTTPException(404, "Application not found in your business.")
    return app

async def latest(db, app):
    records = (await db.execute(select(Architecture).where(Architecture.application_id == app.id,
        Architecture.organization_id == app.organization_id).order_by(Architecture.created_at.desc()))).scalars().all()
    # Legacy sample topologies have no verified provenance; never present them as code analysis.
    return next((item for item in records if (item.spec_json or {}).get("format") == "repository-draft-v1"), None)

def output(arch):
    return {"id": arch.id, "version": arch.version, "created_at": arch.created_at, **arch.spec_json} if arch else None

async def audit(db, membership, app, action):
    user = await db.get(User, membership.user_id)
    db.add(AuditEvent(organization_id=membership.organization_id, actor_id=membership.user_id,
        actor_email=user.email, action=action, entity_type="application", entity_id=app.id, details={"application_name": app.name}))

@router.get("/{application_id}")
async def read(application_id: str, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership)
    arch = await latest(db, app)
    return {"application_id": app.id, "application_name": app.name, "architecture": output(arch),
        "capabilities": {"repository_analysis": service.github_available(), "ai_chat": service.ai_available()}}

@router.post("/{application_id}/analyze")
async def analyze(application_id: str, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    repo = (await db.execute(select(Repository).options(selectinload(Repository.connection))
        .join(ApplicationRepository, ApplicationRepository.repository_id == Repository.id)
        .join(SourceControlConnection, SourceControlConnection.id == Repository.source_control_connection_id)
        .where(ApplicationRepository.application_id == app.id, ApplicationRepository.organization_id == membership.organization_id,
            Repository.organization_id == membership.organization_id, Repository.selected == True, Repository.archived == False,
            SourceControlConnection.organization_id == membership.organization_id, SourceControlConnection.status == ConnectionStatus.ACTIVE).limit(1))).scalar_one_or_none()
    if not repo: raise HTTPException(409, "Connect an authorized GitHub repository to this application first.")
    try:
        async with asyncio.timeout(90):
            evidence = await service.inspect_repository(repo)
    except TimeoutError:
        raise HTTPException(504, "Repository analysis timed out. No draft was saved. Please try again.") from None
    previous = await latest(db, app)
    revision = (previous.spec_json["revision"] + 1) if previous else 1
    arch = Architecture(application_id=app.id, organization_id=membership.organization_id,
        name=app.name, version=f"v{revision}", status="DRAFT", spec_json={"format": "repository-draft-v1", "revision": revision,
            "graph": service.draft_graph(evidence), "evidence": evidence, "messages": [], "proposal": None,
            "deployment_status": "NOT_DEPLOYED"})
    db.add(arch)
    await audit(db, membership, app, "ARCHITECTURE_MANIFESTS_ANALYZED")
    await db.commit()
    await db.refresh(arch)
    return output(arch)

class Save(BaseModel):
    expected_id: str = Field(max_length=36)
    graph: service.Graph

class Chat(BaseModel):
    expected_id: str = Field(max_length=36)
    message: str = Field(min_length=1, max_length=2000)

class Apply(BaseModel):
    expected_id: str = Field(max_length=36)
    proposal_id: str = Field(max_length=36)

async def current(db, app, expected_id):
    arch = await latest(db, app)
    if not arch or arch.id != expected_id:
        raise HTTPException(409, "This architecture changed. Reload it before saving your changes.")
    return arch

async def save_version(db, membership, app, arch, graph, action):
    spec = {**arch.spec_json, "revision": arch.spec_json["revision"] + 1, "graph": graph, "proposal": None}
    record = Architecture(application_id=app.id, organization_id=membership.organization_id,
        name=app.name, version=f"v{spec['revision']}", status="DRAFT", spec_json=spec)
    db.add(record)
    await audit(db, membership, app, action)
    await db.commit()
    await db.refresh(record)
    return output(record)

@router.post("/{application_id}/save")
async def save(application_id: str, payload: Save, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await current(db, app, payload.expected_id)
    return await save_version(db, membership, app, arch, payload.graph.model_dump(), "ARCHITECTURE_DRAFT_SAVED")

@router.post("/{application_id}/chat")
async def chat(application_id: str, payload: Chat, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await current(db, app, payload.expected_id)
    spec = dict(arch.spec_json)
    now = datetime.now(timezone.utc)
    if spec.get("last_ai_at") and (now - datetime.fromisoformat(spec["last_ai_at"])).total_seconds() < 5:
        raise HTTPException(429, "Please wait a few seconds before sending another request.")
    answer = await service.refine(spec["graph"], spec["evidence"], payload.message, spec["messages"])
    spec["messages"] = (spec["messages"] + [{"role": "user", "content": payload.message}, {"role": "assistant", "content": answer["message"]}])[-20:]
    spec["proposal"] = {"id": str(uuid.uuid4()), "graph": answer["graph"]}
    spec["last_ai_at"] = now.isoformat()
    arch.spec_json = spec
    await audit(db, membership, app, "ARCHITECTURE_AI_PROPOSAL_CREATED")
    await db.commit()
    return output(arch)

@router.post("/{application_id}/apply")
async def apply(application_id: str, payload: Apply, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await current(db, app, payload.expected_id)
    proposal = arch.spec_json.get("proposal")
    if not proposal or proposal["id"] != payload.proposal_id:
        raise HTTPException(409, "This proposal has expired. Request a new proposal.")
    return await save_version(db, membership, app, arch, proposal["graph"], "ARCHITECTURE_AI_PROPOSAL_APPLIED")
