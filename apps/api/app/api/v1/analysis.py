from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db, AsyncSessionLocal
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership
from app.models.application import Application
from app.models.source_control import ApplicationRepository, Repository
from app.models.analysis import (
    AnalysisRun,
    AnalysisStatus,
    DetectedService,
    DetectedPort,
    DetectedEnvironmentVariable,
    DetectedDataFlow,
    AnalysisFinding,
    ArchitectureRecommendation,
)
from app.models.entities import Architecture
from app.services.analyzer.pipeline import execute_analysis_run
from app.services.architecture.generator import ArchitectureGenerator, AWSCostEstimator
from app.core.audit import log_audit_event

router = APIRouter(tags=["Application Analysis & Architecture Generation"])

class LinkRepoPayload(BaseModel):
    repository_id: str
    branch: str = "main"
    root_path: str = "/"
    is_primary: bool = True

class TriggerAnalysisPayload(BaseModel):
    branch: Optional[str] = None
    commit_sha: Optional[str] = "HEAD"

class GenerateArchPayload(BaseModel):
    profile: str = "BALANCED" # LEAN, BALANCED, HIGH_AVAILABILITY

async def background_run_task(analysis_run_id: str):
    async with AsyncSessionLocal() as session:
        await execute_analysis_run(session, analysis_run_id)

@router.post("/applications/{application_id}/repository")
async def link_application_repository(
    application_id: str,
    payload: LinkRepoPayload,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    # Verify application belongs to tenant
    app_res = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.organization_id == membership.organization_id
        )
    )
    app = app_res.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    link = ApplicationRepository(
        organization_id=membership.organization_id,
        application_id=app.id,
        repository_id=payload.repository_id,
        branch=payload.branch,
        root_path=payload.root_path,
        is_primary=payload.is_primary
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="user@launchcomply.io",
        action="REPOSITORY_LINKED",
        entity_type="application_repository",
        entity_id=link.id,
        details={"application_id": app.id, "repository_id": payload.repository_id, "branch": payload.branch}
    )

    return link

@router.post("/applications/{application_id}/analysis")
async def trigger_analysis(
    application_id: str,
    payload: TriggerAnalysisPayload,
    background_tasks: BackgroundTasks,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    app_res = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.organization_id == membership.organization_id
        )
    )
    app = app_res.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Get linked repository if present
    repo_res = await db.execute(
        select(ApplicationRepository).where(
            ApplicationRepository.application_id == app.id,
            ApplicationRepository.organization_id == membership.organization_id
        )
    )
    link = repo_res.scalars().first()

    analysis_run = AnalysisRun(
        organization_id=membership.organization_id,
        application_id=app.id,
        repository_id=link.repository_id if link else None,
        branch=payload.branch or (link.branch if link else "main"),
        commit_sha=payload.commit_sha or "HEAD",
        status=AnalysisStatus.QUEUED,
        progress_percent=0,
        current_stage="Queued for analysis",
        triggered_by_user_id=membership.user_id
    )
    db.add(analysis_run)
    await db.commit()
    await db.refresh(analysis_run)

    # Queue asynchronous execution
    background_tasks.add_task(background_run_task, analysis_run.id)

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="user@launchcomply.io",
        action="ANALYSIS_STARTED",
        entity_type="analysis_run",
        entity_id=analysis_run.id,
        details={"application_id": app.id, "branch": analysis_run.branch}
    )

    return {
        "analysis_id": analysis_run.id,
        "status": analysis_run.status.value,
        "progress_percent": analysis_run.progress_percent,
        "current_stage": analysis_run.current_stage,
        "started_at": analysis_run.started_at.isoformat()
    }

@router.get("/analysis/{analysis_id}")
async def get_analysis_status(
    analysis_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AnalysisRun).where(
            AnalysisRun.id == analysis_id,
            AnalysisRun.organization_id == membership.organization_id
        )
    )
    run = result.scalars().first()
    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    return {
        "id": run.id,
        "status": run.status.value,
        "progress_percent": run.progress_percent,
        "current_stage": run.current_stage,
        "started_at": run.started_at.isoformat(),
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "summary": run.summary,
        "metrics": run.metrics_json,
        "failure_reason": run.failure_reason
    }

@router.get("/analysis/{analysis_id}/services")
async def get_detected_services(
    analysis_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(DetectedService).where(
            DetectedService.analysis_run_id == analysis_id,
            DetectedService.organization_id == membership.organization_id
        )
    )
    services = result.scalars().all()
    return services

@router.get("/analysis/{analysis_id}/environment-contract")
async def get_environment_contract(
    analysis_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(DetectedEnvironmentVariable).where(
            DetectedEnvironmentVariable.analysis_run_id == analysis_id,
            DetectedEnvironmentVariable.organization_id == membership.organization_id
        )
    )
    return result.scalars().all()

@router.get("/analysis/{analysis_id}/findings")
async def get_analysis_findings(
    analysis_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AnalysisFinding).where(
            AnalysisFinding.analysis_run_id == analysis_id,
            AnalysisFinding.organization_id == membership.organization_id
        )
    )
    return result.scalars().all()

@router.get("/analysis/{analysis_id}/application-topology")
async def get_application_topology(
    analysis_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result_flows = await db.execute(
        select(DetectedDataFlow).where(
            DetectedDataFlow.analysis_run_id == analysis_id,
            DetectedDataFlow.organization_id == membership.organization_id
        )
    )
    flows = result_flows.scalars().all()

    result_services = await db.execute(
        select(DetectedService).where(
            DetectedService.analysis_run_id == analysis_id,
            DetectedService.organization_id == membership.organization_id
        )
    )
    services = result_services.scalars().all()

    return {
        "services": services,
        "data_flows": flows
    }

@router.post("/analysis/{analysis_id}/generate-architecture")
async def generate_architecture_from_analysis(
    analysis_id: str,
    payload: GenerateArchPayload,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AnalysisRun).where(
            AnalysisRun.id == analysis_id,
            AnalysisRun.organization_id == membership.organization_id
        )
    )
    run = result.scalars().first()
    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    # Fetch detected services
    svc_res = await db.execute(
        select(DetectedService).where(
            DetectedService.analysis_run_id == analysis_id,
            DetectedService.organization_id == membership.organization_id
        )
    )
    services = [{"name": s.name, "service_type": s.service_type.value} for s in svc_res.scalars().all()]
    
    generated = ArchitectureGenerator.generate({"services": services}, profile=payload.profile)

    arch = Architecture(
        application_id=run.application_id,
        organization_id=membership.organization_id,
        name=f"Generated AWS Topology ({payload.profile} Profile)",
        version="v2.1.0",
        status="RECOMMENDED",
        spec_json=generated
    )
    db.add(arch)
    await db.commit()
    await db.refresh(arch)

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="user@launchcomply.io",
        action="ARCHITECTURE_GENERATED",
        entity_type="architecture",
        entity_id=arch.id,
        details={"profile": payload.profile, "analysis_id": run.id}
    )

    return {
        "architecture_id": arch.id,
        "name": arch.name,
        "status": arch.status,
        "profile": payload.profile,
        "topology": generated
    }

@router.post("/architectures/{architecture_id}/approve")
async def approve_architecture(
    architecture_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Architecture).where(
            Architecture.id == architecture_id,
            Architecture.organization_id == membership.organization_id
        )
    )
    arch = result.scalars().first()
    if not arch:
        raise HTTPException(status_code=404, detail="Architecture not found")

    arch.status = "APPROVED"
    await db.commit()

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="user@launchcomply.io",
        action="ARCHITECTURE_APPROVED",
        entity_type="architecture",
        entity_id=arch.id,
        details={"version": arch.version}
    )

    return {
        "id": arch.id,
        "status": arch.status,
        "message": "Architecture approved! Ready for automated CloudFormation/Terraform provisioning in Phase 3."
    }

@router.get("/architectures/{architecture_id}/cost-estimate")
async def get_cost_estimate(
    architecture_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Architecture).where(
            Architecture.id == architecture_id,
            Architecture.organization_id == membership.organization_id
        )
    )
    arch = result.scalars().first()
    if not arch:
        raise HTTPException(status_code=404, detail="Architecture not found")

    profile = arch.spec_json.get("profile", "BALANCED") if arch.spec_json else "BALANCED"
    estimate = AWSCostEstimator.estimate_cost(profile=profile)
    return estimate
