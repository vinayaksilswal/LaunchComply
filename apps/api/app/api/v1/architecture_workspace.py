import uuid
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership, MembershipRole, User
from app.models.application import Application
from app.models.entities import Architecture
from app.models.audit import AuditEvent
from app.models.source_archive import ApplicationSourceArchive
from app.models.source_control import Repository, ApplicationRepository, SourceControlConnection, ConnectionStatus
from app.services.architecture import workspace as service
from app.services.architecture import knowledge
from app.services.architecture.environment_connections import Connection, map_connections
from app.services.architecture.capacity_planning import plan_capacity
from app.services.architecture.deployment_planning import WorkloadPolicy, policy_issues
from app.services.architecture.edit_scope import EditScope
from app.services.architecture.resource_configuration import ResourceConfiguration, schemas as resource_schemas, validate_resources, compile_template
from app.services.architecture.resource_edits import apply_resource_updates, fingerprint as resource_fingerprint
from app.services.architecture.resource_topology import build_topology
from typing import Annotated, Literal
from app.services.architecture.repository_links import linked_repositories
from app.services.architecture.workspace_state import read_state, source_stale, effective_spec, record_head

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
        Architecture.organization_id == app.organization_id).order_by(Architecture.created_at.desc(), Architecture.id.desc()).execution_options(populate_existing=True))).scalars().all()
    # Legacy sample topologies have no verified provenance; never present them as code analysis.
    arch = next((item for item in records if (item.spec_json or {}).get("format") == "repository-draft-v1"), None)
    if arch:
        arch._workspace_source_changed = source_stale(await read_state(db, app.organization_id, app.id))
    return arch

def pending_proposal(spec):
    proposal = spec.get("proposal")
    return proposal if proposal and (proposal.get("graph") != spec.get("graph") or
        proposal.get("resource_configurations", spec.get("resource_configurations", {})) != spec.get("resource_configurations", {})) else None

def decision_messages(spec, proposal, decision):
    request_id = proposal.get("request_id") or (spec.get("ai_request") or {}).get("id")
    return [{**message, "proposal_status": decision} if request_id and message.get("request_id") == request_id else message
            for message in spec.get("messages", [])]

def output(arch):
    if not arch:
        return None
    from app.services.architecture.design_review import build_review
    spec = effective_spec(arch)
    region = (spec.get("requirements") or {}).get("region")
    proposal = pending_proposal(spec)
    topology = lambda graph, configs: build_topology(graph, configs, region, spec.get("resource_schema_version", 1))
    return {"id": arch.id, "version": arch.version, "created_at": arch.created_at,
            **spec, "proposal": {**proposal, "resource_topology": topology(proposal["graph"], proposal.get("resource_configurations", spec.get("resource_configurations", {})))} if proposal else None,
            "resource_topology": topology(spec["graph"], spec.get("resource_configurations", {})),
            "resource_review": validate_resources(spec["graph"], spec.get("resource_configurations", {}), (spec.get("requirements") or {}).get("region")),
            "design_review": build_review(spec["graph"], spec.get("evidence"), spec.get("requirements"), spec.get("source_changed", False))}

def design_is_approved(arch):
    if not arch:
        return False
    spec = effective_spec(arch)
    approval = spec.get("design_approval") or {}
    graph = spec.get("graph")
    return bool(isinstance(approval, dict) and isinstance(graph, dict) and graph.get("nodes")
        and not spec.get("source_changed") and not pending_proposal(spec) and approval.get("architecture_id") == arch.id
        and approval.get("version") == arch.version
        and approval.get("graph_fingerprint") == knowledge.fingerprint(graph)
        and approval.get("repository_commit") == (spec.get("evidence") or {}).get("commit"))

async def audit(db, membership, app, action, details=None):
    user = await db.get(User, membership.user_id)
    db.add(AuditEvent(organization_id=membership.organization_id, actor_id=membership.user_id,
        actor_email=user.email, action=action, entity_type="application", entity_id=app.id, details={"application_name": app.name, **(details or {})}))

@router.get("/resource-schemas")
async def configuration_schemas(membership=Depends(member)):
    return resource_schemas()

@router.get("/{application_id}")
async def read(application_id: str, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership)
    arch = await latest(db, app)
    return {"application_id": app.id, "application_name": app.name, "architecture": output(arch),
        "capabilities": {"repository_analysis": service.github_available(), "ai_chat": service.ai_available(),
                         "aws_references": knowledge.available(), "workload_scaling": True, "scoped_ai_edits": True,
                         "resource_configuration": True, "resource_ai_edits": True, "cloudformation_export": True, "empty_canvas": True}}

@router.post("/{application_id}/initialize")
async def initialize(application_id: str, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    if await latest(db, app):
        raise HTTPException(409, "This asset already has a saved architecture. Open it or use its version history.")
    spec = {"format": "repository-draft-v1", "revision": 1, "graph": {"nodes": [], "edges": []},
            "resource_schema_version": 1, "resource_configurations": {}, "messages": [], "proposal": None,
            "deployment_status": "NOT_DEPLOYED", "evidence": {"scope": "Manual design; no repository inspection.",
                "repository": "", "branch": "", "commit": "", "files": [], "components": [], "repositories": []}}
    arch = Architecture(application_id=app.id, organization_id=membership.organization_id, name=app.name,
                        version="v1", status="DRAFT", spec_json=spec)
    db.add(arch)
    await record_head(db, app, arch)
    await audit(db, membership, app, "ARCHITECTURE_EMPTY_CREATED")
    await db.commit()
    await db.refresh(arch)
    return output(arch)

@router.get("/{application_id}/versions")
async def versions(application_id: str, offset: int = Query(default=0, ge=0, le=10000),
    membership=Depends(member), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership)
    rows = (await db.execute(select(Architecture).where(Architecture.application_id == app.id,
        Architecture.organization_id == membership.organization_id,
        Architecture.spec_json["format"].as_string() == "repository-draft-v1")
        .order_by(Architecture.created_at.desc(), Architecture.id.desc()).offset(offset).limit(21))).scalars().all()
    return {"versions": [{"id": item.id, "version": item.version, "created_at": item.created_at,
        "components": len((item.spec_json.get("graph") or {}).get("nodes", [])),
        "configured_resources": len(item.spec_json.get("resource_configurations", {})),
        "source_commit": (item.spec_json.get("evidence") or {}).get("commit"),
        "restored_from": item.spec_json.get("restored_from")} for item in rows[:20]],
        "has_more": len(rows) > 20, "offset": offset}

async def historical_version(db, app, version_id):
    arch = (await db.execute(select(Architecture).where(Architecture.id == version_id,
        Architecture.application_id == app.id, Architecture.organization_id == app.organization_id))).scalar_one_or_none()
    if not arch or (arch.spec_json or {}).get("format") != "repository-draft-v1":
        raise HTTPException(404, "Saved architecture not found for this business asset.")
    return arch

@router.get("/{application_id}/versions/{version_id}")
async def version_preview(application_id: str, version_id: str, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership)
    return output(await historical_version(db, app, version_id))

class RestoreVersion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_id: str = Field(max_length=36)
    version_id: str = Field(max_length=36)

@router.post("/{application_id}/restore")
async def restore_version(application_id: str, payload: RestoreVersion, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await latest(db, app)
    if not arch or arch.id != payload.expected_id:
        raise HTTPException(409, "The current architecture changed. Refresh before restoring a saved version.")
    old = await historical_version(db, app, payload.version_id)
    if old.id == arch.id:
        raise HTTPException(409, "This version is already current.")
    graph = service.Graph.model_validate(old.spec_json["graph"]).model_dump()
    spec = {**old.spec_json, "revision": arch.spec_json["revision"] + 1, "graph": graph, "proposal": None,
        "messages": [], "restored_from": {"id": old.id, "version": old.version}, "deployment_status": "NOT_DEPLOYED"}
    for key in ("design_approval", "aws_references", "ai_request", "last_ai_questions", "last_ai_workflow", "last_ai_diagnostics"):
        spec.pop(key, None)
    spec["source_changed"] = bool(effective_spec(arch).get("source_changed") or old.spec_json.get("source_changed")
        or (old.spec_json.get("evidence") or {}).get("commit") != (arch.spec_json.get("evidence") or {}).get("commit"))
    record = Architecture(application_id=app.id, organization_id=membership.organization_id, name=app.name,
        version=f"v{spec['revision']}", status="DRAFT", spec_json=spec)
    db.add(record)
    await record_head(db, app, record)
    await audit(db, membership, app, "ARCHITECTURE_VERSION_RESTORED", {"restored_id": old.id, "restored_version": old.version})
    await db.commit()
    await db.refresh(record)
    return output(record)

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
    graph = service.draft_graph(evidence)
    if previous:
        saved_bindings = (previous.spec_json.get("evidence") or {}).get("environment_connections", [])
        ids = {node["id"] for node in graph["nodes"]}
        retained = [Connection(name=item["name"], source=item["source"], target=item.get("target") if item.get("target") in ids else None, protocol=item.get("protocol", "unknown")) for item in saved_bindings if item["source"] in ids]
        if retained:
            graph, records = map_connections(graph, evidence, retained)
            evidence = {**evidence, "environment_connections": records}
        if len(retained) < len(saved_bindings):
            evidence = {**evidence, "environment_mapping_notice": "Some workload identities changed. Previous mapping remains in design history; review keys for the new workload identities."}
    requirements = (previous.spec_json or {}).get("requirements") if previous else None
    capacity_plan = None
    if requirements:
        graph, capacity_plan = plan_capacity(graph, requirements)
    revision = (previous.spec_json["revision"] + 1) if previous else 1
    arch = Architecture(application_id=app.id, organization_id=membership.organization_id,
        name=app.name, version=f"v{revision}", status="DRAFT", spec_json={"format": "repository-draft-v1", "revision": revision,
            "graph": graph, "evidence": evidence, "messages": [], "proposal": None,
            "deployment_status": "NOT_DEPLOYED", "requirements": requirements, "capacity_plan": capacity_plan})
    db.add(arch)
    await record_head(db, app, arch, source_refreshed=True)
    await audit(db, membership, app, "ARCHITECTURE_MANIFESTS_ANALYZED")
    await db.commit()
    await db.refresh(arch)
    return output(arch)

class Save(BaseModel):
    expected_id: str = Field(max_length=36)
    graph: service.Graph

class Chat(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_id: str = Field(max_length=36)
    message: str = Field(min_length=1, max_length=2000)
    edit_scope: EditScope = Field(default_factory=EditScope)
    answer_to: str | None = Field(default=None, max_length=36)

class Apply(BaseModel):
    expected_id: str = Field(max_length=36)
    proposal_id: str = Field(max_length=36)

class ApplyReferences(BaseModel):
    expected_id: str = Field(max_length=36)

class Requirements(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_id: str = Field(max_length=36)
    peak_requests_per_minute: int = Field(ge=1, le=100_000_000)
    concurrent_users: int = Field(ge=1, le=10_000_000)
    region: Literal["ap-south-1", "ap-south-2", "us-east-1", "us-east-2", "us-west-2", "eu-west-1", "eu-west-2", "eu-central-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ca-central-1", "sa-east-1"]
    availability: Literal["SINGLE_AZ", "MULTI_AZ", "MULTI_REGION"]
    secondary_region: str | None = Field(default=None, max_length=30)
    sizing_workload_id: str | None = Field(default=None, max_length=64)
    requests_per_second_per_replica: float | None = Field(default=None, gt=0, le=1_000_000, allow_inf_nan=False)
    workload_policies: list[WorkloadPolicy] = Field(default_factory=list, max_length=80)

@router.post("/{application_id}/requirements")
async def requirements(application_id: str, payload: Requirements, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await current(db, app, payload.expected_id)
    values = payload.model_dump(exclude={"expected_id"})
    if "workload_policies" not in payload.model_fields_set:
        values["workload_policies"] = (arch.spec_json.get("requirements") or {}).get("workload_policies", [])
    if pending_proposal(arch.spec_json):
        raise HTTPException(409, "Apply or resolve the pending AI proposal before changing deployment targets.")
    regions = Requirements.model_fields["region"].annotation.__args__
    if payload.availability == "MULTI_REGION" and (payload.secondary_region not in regions or payload.secondary_region == payload.region):
        raise HTTPException(422, "Choose a different supported recovery region for a multi-region design.")
    if payload.availability != "MULTI_REGION": values["secondary_region"] = None
    if payload.sizing_workload_id and not any(node["id"] == payload.sizing_workload_id and node["zone"] == "APPLICATION" for node in arch.spec_json["graph"]["nodes"]):
        raise HTTPException(422, "Choose a workload from this saved architecture for sizing.")
    if payload.requests_per_second_per_replica and not payload.sizing_workload_id:
        raise HTTPException(422, "Select a workload before entering its benchmark throughput.")
    issues = policy_issues(arch.spec_json["graph"], values["workload_policies"])
    if issues:
        raise HTTPException(422, "Review workload scaling and load-balancer settings: " + " ".join(issues))
    graph, plan = plan_capacity(arch.spec_json["graph"], values)
    return await save_version(db, membership, app, arch, graph, "ARCHITECTURE_REQUIREMENTS_SAVED", {"requirements": values, "capacity_plan": plan})

class EnvironmentConnections(BaseModel):
    expected_id: str = Field(max_length=36)
    bindings: list[Connection] = Field(max_length=60)

@router.post("/{application_id}/environment-connections")
async def environment_connections(application_id: str, payload: EnvironmentConnections, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await current(db, app, payload.expected_id)
    if pending_proposal(arch.spec_json):
        raise HTTPException(409, "Apply or resolve the pending AI proposal before mapping connections.")
    evidence = arch.spec_json["evidence"]
    graph, records = map_connections(arch.spec_json["graph"], evidence, payload.bindings)
    return await save_version(db, membership, app, arch, graph, "ARCHITECTURE_ENVIRONMENT_CONNECTIONS_SAVED", {"evidence": {**evidence, "environment_connections": records}})

async def current(db, app, expected_id):
    arch = await latest(db, app)
    if not arch or arch.id != expected_id:
        raise HTTPException(409, "This architecture changed. Reload it before saving your changes.")
    if effective_spec(arch).get("source_changed"):
        raise HTTPException(409, "Repository links changed. Refresh code findings before editing or approving this architecture.")
    return arch

async def save_version(db, membership, app, arch, graph, action, updates=None):
    spec = {**arch.spec_json, "revision": arch.spec_json["revision"] + 1, "graph": graph, "proposal": None, **(updates or {})}
    if "resource_configurations" in spec:
        ids = {node["id"] for node in graph["nodes"]}
        spec["resource_configurations"] = {key: value for key, value in spec["resource_configurations"].items() if key in ids}
    # Approval belongs to one saved version; editing never authorizes deployment.
    spec.pop("design_approval", None)
    spec.pop("ai_request", None)
    spec.pop("last_ai_questions", None)
    if graph != arch.spec_json["graph"] or updates:
        spec.pop("aws_references", None)
    record = Architecture(application_id=app.id, organization_id=membership.organization_id,
        name=app.name, version=f"v{spec['revision']}", status="DRAFT", spec_json=spec)
    db.add(record)
    await record_head(db, app, record)
    await audit(db, membership, app, action)
    await db.commit()
    await db.refresh(record)
    return output(record)

@router.post("/{application_id}/save")
async def save(application_id: str, payload: Save, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await current(db, app, payload.expected_id)
    return await save_version(db, membership, app, arch, payload.graph.model_dump(), "ARCHITECTURE_DRAFT_SAVED")


class ConfigureResource(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_id: str = Field(max_length=36)
    node_id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    configuration: ResourceConfiguration | None


@router.post("/{application_id}/resource-configuration")
async def configure_resource(application_id: str, payload: ConfigureResource,
                             membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await current(db, app, payload.expected_id)
    if pending_proposal(arch.spec_json):
        raise HTTPException(409, "Apply or discard the pending proposal before configuring resources.")
    if arch.spec_json.get("resource_schema_version") not in (None, 1):
        raise HTTPException(409, "This resource schema needs an explicit migration before editing.")
    if payload.node_id not in {node["id"] for node in arch.spec_json["graph"]["nodes"]}:
        raise HTTPException(422, "Select a component in this saved architecture.")
    configs = dict(arch.spec_json.get("resource_configurations", {}))
    if payload.configuration is None:
        configs.pop(payload.node_id, None)
    else:
        configs[payload.node_id] = payload.configuration.model_dump()
        review = validate_resources(arch.spec_json["graph"], configs, (arch.spec_json.get("requirements") or {}).get("region"))
        # Validate all configured resources: a VPC resize must not invalidate
        # already configured children or introduce overlapping subnet ranges.
        if review["issues"]:
            raise HTTPException(422, {"code": "RESOURCE_CONFIGURATION_INVALID", "message": " ".join(issue["message"] for issue in review["issues"][:5])})
    if configs == arch.spec_json.get("resource_configurations", {}):
        return output(arch)
    return await save_version(db, membership, app, arch, arch.spec_json["graph"], "ARCHITECTURE_RESOURCE_CONFIGURED",
                              {"resource_schema_version": 1, "resource_configurations": configs})


class ExportResources(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_id: str = Field(max_length=36)
    resource_ids: list[Annotated[str, Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")]] | None = Field(default=None, max_length=80)


@router.post("/{application_id}/cloudformation-export")
async def export_cloudformation(application_id: str, payload: ExportResources,
                               membership=Depends(member), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await current(db, app, payload.expected_id)
    if pending_proposal(arch.spec_json):
        raise HTTPException(409, "Apply or discard the pending proposal before exporting saved infrastructure definitions.")
    if arch.spec_json.get("resource_schema_version") not in (None, 1):
        raise HTTPException(409, "This resource schema needs an explicit migration before export.")
    try:
        result = compile_template(arch.spec_json["graph"], arch.spec_json.get("resource_configurations", {}),
                                  (arch.spec_json.get("requirements") or {}).get("region"), payload.resource_ids)
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    await audit(db, membership, app, "ARCHITECTURE_CLOUDFORMATION_EXPORTED", {"architecture_id": arch.id,
        "version": arch.version, "sha256": result["sha256"], "included_node_ids": result["included_node_ids"],
        "omitted_count": len(result["omitted_node_ids"])})
    await db.commit()
    return {**result, "architecture_id": arch.id, "version": arch.version}

@router.post("/{application_id}/approve-design")
async def approve_design(application_id: str, payload: ApplyReferences,
                         membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await current(db, app, payload.expected_id)
    if not arch.spec_json["graph"]["nodes"]:
        raise HTTPException(409, "Add and save a cloud design before approving it.")
    if not arch.spec_json.get("requirements"):
        raise HTTPException(409, "Set expected traffic, region and availability before approving the design.")
    if pending_proposal(arch.spec_json):
        raise HTTPException(409, "Apply and save the pending proposal before approving this design.")
    running = arch.spec_json.get("ai_request") or {}
    if running.get("status") == "RUNNING" and (datetime.now(timezone.utc) - datetime.fromisoformat(running["started_at"])).total_seconds() < 110:
        raise HTTPException(409, "Wait for the current architecture request to finish before approving this design.")
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
    from app.services.architecture.edit_scope import EditScope, ScopeViolation, validate_selection
    if pending_proposal(spec):
        raise HTTPException(409, "Apply or discard the pending proposal before asking for another change.")
    message = payload.message
    if payload.answer_to:
        if payload.answer_to != (spec.get("ai_request") or {}).get("id") or not spec.get("last_ai_questions"):
            raise HTTPException(409, "These questions have expired. Start a new request.")
        scope_input = spec.get("last_ai_scope")
        message = (spec.get("last_ai_intent") or "") + "\nCustomer clarification:\n" + message
    else:
        scope_input = payload.edit_scope.model_dump()
    try:
        scope = EditScope.model_validate(scope_input or {}).model_dump()
        validate_selection(spec["graph"], scope)
    except ValueError:
        raise HTTPException(422, "Choose valid components for the AI edit scope.") from None
    if spec.get("resource_schema_version") not in (None, 1) and scope["mode"] != "REVIEW":
        raise HTTPException(409, "This resource schema needs an explicit migration before AI editing.")
    now = datetime.now(timezone.utc)
    running = spec.get("ai_request") or {}
    if running.get("status") == "RUNNING" and (now - datetime.fromisoformat(running["started_at"])).total_seconds() < 110:
        raise HTTPException(409, "An architecture request is already running. Wait for it to finish before trying again.")
    if spec.get("last_ai_at") and (now - datetime.fromisoformat(spec["last_ai_at"])).total_seconds() < 5:
        raise HTTPException(429, "Please wait a few seconds before sending another request.")
    references = spec.get("aws_references")
    if references and references.get("graph_fingerprint") != knowledge.fingerprint(spec["graph"]):
        references = None
    request_id = str(uuid.uuid4())
    spec["ai_request"] = {"id": request_id, "status": "RUNNING", "started_at": now.isoformat()}
    spec["last_ai_at"] = now.isoformat()
    arch.spec_json = spec
    await db.commit()  # Do not keep row locks or a database transaction open across model I/O.
    failure = None
    answer = None
    try:
        answer = await service.refine(spec["graph"], spec["evidence"], message, spec["messages"], references, spec.get("requirements"), scope, spec.get("resource_configurations", {}), spec.get("resource_schema_version", 1))
    except ScopeViolation:
        failure = HTTPException(422, {"code": "ARCHITECTURE_AI_SCOPE_REJECTED", "message": "AI tried to change components outside your selected scope. Your saved design is unchanged. Narrow the request or choose the required components."})
    except HTTPException as error:
        failure = error
    except TimeoutError:
        failure = HTTPException(504, {"code": "ARCHITECTURE_AI_TIMEOUT", "message": "The architecture review timed out. Your saved design is unchanged."})
    except Exception:
        # Clear the running receipt and record a fixed error without exposing source
        # context or arbitrary exception text from agent/provider libraries.
        failure = HTTPException(503, {"code": "ARCHITECTURE_AI_UNAVAILABLE", "message": "The architecture review could not complete. Your saved design is unchanged."})
    app = await application(db, application_id, membership, lock=True)
    fresh_member = await db.get(OrganizationMembership, membership.id, populate_existing=True)
    fresh_user = await db.get(User, membership.user_id, populate_existing=True)
    if not fresh_member or not fresh_member.is_active or fresh_member.organization_id != app.organization_id or fresh_member.role not in (MembershipRole.OWNER, MembershipRole.ADMIN) or not fresh_user or not fresh_user.is_active:
        raise HTTPException(403, "Your business editing access changed during this request. No proposal was saved.")
    latest_arch = await latest(db, app)
    if not latest_arch or latest_arch.id != payload.expected_id or effective_spec(latest_arch).get("source_changed") or (latest_arch.spec_json.get("ai_request") or {}).get("id") != request_id:
        await audit(db, membership, app, "ARCHITECTURE_AI_REQUEST_DISCARDED", {"request_id": request_id, "code": "DESIGN_CHANGED"})
        await db.commit()
        raise HTTPException(409, "Your design or source changed while AI was responding. Reload before requesting a new proposal.")
    arch = latest_arch
    spec = dict(arch.spec_json)
    finished = datetime.now(timezone.utc).isoformat()
    if failure:
        code = failure.detail.get("code", "ARCHITECTURE_AI_UNAVAILABLE") if isinstance(failure.detail, dict) else "ARCHITECTURE_AI_UNAVAILABLE"
        diagnostics = {"request_id": request_id, "code": code, "provider": settings.ARCHITECTURE_AI_PROVIDER,
            "attempts": getattr(failure, "attempts", []), "finished_at": finished}
        spec["last_ai_failure"] = diagnostics
        spec["ai_request"] = {**spec["ai_request"], "status": "FAILED", "finished_at": finished}
        arch.spec_json = spec
        await audit(db, membership, app, "ARCHITECTURE_AI_REQUEST_FAILED", diagnostics)
        await db.commit()
        raise HTTPException(failure.status_code, {"code": code, "request_id": request_id, "message": "AI tried to change components outside your selected scope. Your saved design is unchanged. Narrow the request or select the required components." if code == "ARCHITECTURE_AI_SCOPE_REJECTED" else "The architecture request failed. Your saved design is unchanged."})
    spec.pop("last_ai_failure", None)
    spec["ai_request"] = {**spec["ai_request"], "status": "COMPLETED", "finished_at": finished}
    graph_changed = answer["graph"] != spec["graph"]
    resource_changed = answer.get("resource_configurations", spec.get("resource_configurations", {})) != spec.get("resource_configurations", {})
    metadata = {"version": arch.version, "scope": scope, "request_id": request_id,
                "proposal_status": "PROPOSED" if graph_changed or resource_changed else "NO_CHANGES"}
    spec["messages"] = (spec["messages"] + [{"role": "user", "content": payload.message, **metadata}, {"role": "assistant", "content": answer["message"], **metadata}])[-20:]
    # An explanation with no diagram edits must not block requirement entry or
    # make the customer apply an unchanged graph. Existing versions stay intact.
    spec["last_ai_questions"] = answer.get("questions", [])
    spec["last_ai_scope"] = scope
    spec["last_ai_intent"] = message[:4000]
    spec["proposal"] = {"id": str(uuid.uuid4()), "graph": answer["graph"], "scope": scope, "request_id": request_id,
                        "base_fingerprint": knowledge.fingerprint(spec["graph"]),
                        "base_resource_fingerprint": resource_fingerprint(spec.get("resource_configurations", {})),
                        "resource_updates": answer.get("resource_updates", []),
                        "resource_configurations": answer.get("resource_configurations", spec.get("resource_configurations", {}))} if graph_changed or resource_changed else None
    spec["last_ai_at"] = now.isoformat()
    if answer.get("ai_model"): spec["last_ai_model"] = answer["ai_model"]
    if answer.get("agent_workflow"): spec["last_ai_workflow"] = answer["agent_workflow"]
    arch.spec_json = spec
    await audit(db, membership, app, "ARCHITECTURE_AI_PROPOSAL_CREATED", {"request_id": request_id,
        "provider": settings.ARCHITECTURE_AI_PROVIDER, "model": answer.get("ai_model"), "attempts": answer.get("provider_attempts", []), "graph_changed": graph_changed, "resource_changed": resource_changed})
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
    from app.services.architecture.edit_scope import enforce_scope, ScopeViolation
    if not proposal.get("scope") or proposal.get("base_fingerprint") != knowledge.fingerprint(arch.spec_json["graph"]):
        raise HTTPException(409, "This proposal predates the current edit scope. Discard it and request a new one.")
    try:
        enforce_scope(arch.spec_json["graph"], proposal["graph"], proposal["scope"])
        from app.services.architecture.edit_scope import enforce_resource_identity
        enforce_resource_identity(arch.spec_json["graph"], proposal["graph"], arch.spec_json.get("resource_configurations", {}))
        from app.services.architecture.proposal_policy import check_transition
        check_transition(arch.spec_json["graph"], proposal["graph"], "Apply reviewed scoped proposal")
        remaining = {node["id"] for node in proposal["graph"]["nodes"]}
        configs = {key: value for key, value in arch.spec_json.get("resource_configurations", {}).items() if key in remaining}
        if proposal.get("base_resource_fingerprint") and proposal["base_resource_fingerprint"] != resource_fingerprint(arch.spec_json.get("resource_configurations", {})):
            raise HTTPException(409, "Resource settings changed after this proposal. Discard it and request a new one.")
        configs = apply_resource_updates(proposal["graph"], configs, proposal.get("resource_updates", []),
            proposal["scope"], (arch.spec_json.get("requirements") or {}).get("region"))
        if proposal.get("resource_updates") and arch.spec_json.get("resource_schema_version") not in (None, 1):
            raise HTTPException(409, "This resource schema needs an explicit migration before applying property changes.")
        if "resource_configurations" in proposal and proposal["resource_configurations"] != configs:
            raise ValueError("Proposal properties do not match the reviewed operations.")
    except ScopeViolation:
        raise HTTPException(409, "The proposal exceeds its approved edit scope. Discard it.") from None
    except ValueError:
        raise HTTPException(409, "The proposal contains invalid resource settings. Discard it and request a new one.") from None
    return await save_version(db, membership, app, arch, proposal["graph"], "ARCHITECTURE_AI_PROPOSAL_APPLIED",
                              {"messages": decision_messages(arch.spec_json, proposal, "APPLIED"),
                               "resource_schema_version": arch.spec_json.get("resource_schema_version", 1), "resource_configurations": configs})

@router.post("/{application_id}/discard-proposal")
async def discard_proposal(application_id: str, payload: Apply, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership, lock=True)
    arch = await current(db, app, payload.expected_id)
    proposal = arch.spec_json.get("proposal")
    if not proposal or proposal["id"] != payload.proposal_id:
        raise HTTPException(409, "This proposal has expired. Reload the design.")
    arch.spec_json = {**arch.spec_json, "proposal": None, "last_ai_questions": [],
                     "messages": decision_messages(arch.spec_json, proposal, "DISCARDED")}
    await audit(db, membership, app, "ARCHITECTURE_AI_PROPOSAL_DISCARDED", {"proposal_id": payload.proposal_id})
    await db.commit()
    return output(arch)
