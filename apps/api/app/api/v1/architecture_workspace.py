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
from app.models.source_archive import ApplicationSourceArchive
from app.models.source_control import Repository, ApplicationRepository, SourceControlConnection, ConnectionStatus
from app.services.architecture import workspace as service
from app.services.architecture import knowledge
from typing import Literal
from app.services.architecture.repository_links import linked_repositories

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

def design_is_approved(arch):
    if not arch:
        return False
    spec = arch.spec_json or {}
    approval = spec.get("design_approval") or {}
    graph = spec.get("graph")
    return bool(isinstance(approval, dict) and isinstance(graph, dict) and graph.get("nodes")
        and not spec.get("source_changed") and not spec.get("proposal") and approval.get("architecture_id") == arch.id
        and approval.get("version") == arch.version
        and approval.get("graph_fingerprint") == knowledge.fingerprint(graph)
        and approval.get("repository_commit") == (spec.get("evidence") or {}).get("commit"))

async def audit(db, membership, app, action):
    user = await db.get(User, membership.user_id)
    db.add(AuditEvent(organization_id=membership.organization_id, actor_id=membership.user_id,
        actor_email=user.email, action=action, entity_type="application", entity_id=app.id, details={"application_name": app.name}))

@router.get("/{application_id}")
async def read(application_id: str, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership)
    arch = await latest(db, app)
    return {"application_id": app.id, "application_name": app.name, "architecture": output(arch),
        "capabilities": {"repository_analysis": service.github_available(), "ai_chat": service.ai_available(),
                         "aws_references": knowledge.available()}}

@router.post("/{application_id}/analyze")
async def analyze(application_id: str, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    repos = await linked_repositories(db, app.id, membership.organization_id)
    upload_evidence = (await db.execute(select(ApplicationSourceArchive.evidence_json).where(
        ApplicationSourceArchive.application_id == app.id, ApplicationSourceArchive.organization_id == membership.organization_id))).scalar_one_or_none()
    if not repos and not upload_evidence: raise HTTPException(409, "Connect GitHub or upload code before analyzing this business asset.")
    try:
        async with asyncio.timeout(90):
            evidence = await service.inspect_repositories(repos) if repos else upload_evidence
    except TimeoutError:
        raise HTTPException(504, "Repository analysis timed out. No draft was saved. Please try again.") from None
    previous = await latest(db, app)
    revision = (previous.spec_json["revision"] + 1) if previous else 1
    arch = Architecture(application_id=app.id, organization_id=membership.organization_id,
        name=app.name, version=f"v{revision}", status="DRAFT", spec_json={"format": "repository-draft-v1", "revision": revision,
            "graph": service.draft_graph(evidence), "evidence": evidence, "messages": [], "proposal": None,
            "deployment_status": "NOT_DEPLOYED", "requirements": (previous.spec_json or {}).get("requirements") if previous else None})
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

class ApplyReferences(BaseModel):
    expected_id: str = Field(max_length=36)

class Requirements(BaseModel):
    expected_id: str = Field(max_length=36)
    peak_requests_per_minute: int = Field(ge=1, le=100_000_000)
    concurrent_users: int = Field(ge=1, le=10_000_000)
    region: Literal["ap-south-1", "ap-south-2", "us-east-1", "us-east-2", "us-west-2", "eu-west-1", "eu-west-2", "eu-central-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ca-central-1", "sa-east-1"]
    availability: Literal["SINGLE_AZ", "MULTI_AZ", "MULTI_REGION"]
    secondary_region: str | None = Field(default=None, max_length=30)

@router.post("/{application_id}/requirements")
async def requirements(application_id: str, payload: Requirements, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await current(db, app, payload.expected_id)
    values = payload.model_dump(exclude={"expected_id"})
    regions = Requirements.model_fields["region"].annotation.__args__
    if payload.availability == "MULTI_REGION" and (payload.secondary_region not in regions or payload.secondary_region == payload.region):
        raise HTTPException(422, "Choose a different supported recovery region for a multi-region design.")
    if payload.availability != "MULTI_REGION": values["secondary_region"] = None
    # A changed requirement creates a new design version and invalidates its approval.
    return await save_version(db, membership, app, arch, arch.spec_json["graph"], "ARCHITECTURE_REQUIREMENTS_SAVED", {"requirements": values})

async def current(db, app, expected_id):
    arch = await latest(db, app)
    if not arch or arch.id != expected_id:
        raise HTTPException(409, "This architecture changed. Reload it before saving your changes.")
    if arch.spec_json.get("source_changed"):
        raise HTTPException(409, "Repository links changed. Refresh code findings before editing or approving this architecture.")
    return arch

async def save_version(db, membership, app, arch, graph, action, updates=None):
    spec = {**arch.spec_json, "revision": arch.spec_json["revision"] + 1, "graph": graph, "proposal": None, **(updates or {})}
    # Approval belongs to one saved version; editing never authorizes deployment.
    spec.pop("design_approval", None)
    if graph != arch.spec_json["graph"] or updates:
        spec.pop("aws_references", None)
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

@router.post("/{application_id}/approve-design")
async def approve_design(application_id: str, payload: ApplyReferences,
                         membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await current(db, app, payload.expected_id)
    if not arch.spec_json["graph"]["nodes"]:
        raise HTTPException(409, "Add and save a cloud design before approving it.")
    if not arch.spec_json.get("requirements"):
        raise HTTPException(409, "Set expected traffic, region and availability before approving the design.")
    if arch.spec_json.get("proposal"):
        raise HTTPException(409, "Apply and save the pending proposal before approving this design.")
    if arch.spec_json.get("design_approval"):
        return output(arch)
    arch.spec_json = {**arch.spec_json, "design_approval": {
        "architecture_id": arch.id, "version": arch.version,
        "graph_fingerprint": knowledge.fingerprint(arch.spec_json["graph"]),
        "repository_commit": arch.spec_json["evidence"]["commit"],
        "approved_by": membership.user_id,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "scope": "Saved design only. AWS access, infrastructure plan and deployment approval are still required.",
    }}
    await audit(db, membership, app, "ARCHITECTURE_DESIGN_APPROVED")
    await db.commit()
    return output(arch)

@router.post("/{application_id}/chat")
async def chat(application_id: str, payload: Chat, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await current(db, app, payload.expected_id)
    spec = dict(arch.spec_json)
    now = datetime.now(timezone.utc)
    if spec.get("last_ai_at") and (now - datetime.fromisoformat(spec["last_ai_at"])).total_seconds() < 5:
        raise HTTPException(429, "Please wait a few seconds before sending another request.")
    references = spec.get("aws_references")
    if references and references.get("graph_fingerprint") != knowledge.fingerprint(spec["graph"]):
        references = None
    answer = await service.refine(spec["graph"], spec["evidence"], payload.message, spec["messages"], references, spec.get("requirements"))
    spec["messages"] = (spec["messages"] + [{"role": "user", "content": payload.message}, {"role": "assistant", "content": answer["message"]}])[-20:]
    spec["proposal"] = {"id": str(uuid.uuid4()), "graph": answer["graph"]}
    spec["last_ai_at"] = now.isoformat()
    if answer.get("ai_model"): spec["last_ai_model"] = answer["ai_model"]
    if answer.get("agent_workflow"): spec["last_ai_workflow"] = answer["agent_workflow"]
    arch.spec_json = spec
    await audit(db, membership, app, "ARCHITECTURE_AI_PROPOSAL_CREATED")
    await db.commit()
    return output(arch)

@router.post("/{application_id}/references")
async def find_references(application_id: str, payload: ApplyReferences,
                          membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await current(db, app, payload.expected_id)
    previous = arch.spec_json.get("aws_references")
    if previous and previous.get("graph_fingerprint") == knowledge.fingerprint(arch.spec_json["graph"]):
        age = (datetime.now(timezone.utc) - datetime.fromisoformat(previous["checked_at"])).total_seconds()
        if age < 300:
            return output(arch)
    review = await knowledge.lookup(arch.spec_json["graph"])
    arch.spec_json = {**arch.spec_json, "aws_references": review}
    await audit(db, membership, app, "ARCHITECTURE_AWS_REFERENCES_RETRIEVED")
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
