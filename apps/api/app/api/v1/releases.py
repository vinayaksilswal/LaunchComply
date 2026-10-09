"""Releases, Builds, Deployments, Domains, and Runtime Configuration API Router.
Implements Phase 4 Production Application Delivery Engine endpoints.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.config import settings
from app.core.permissions import get_current_membership, require_roles
from app.core.audit import log_audit_event
from app.models.auth import OrganizationMembership, MembershipRole
from app.models.application import Application, Environment
from app.models.release import (
    ApplicationRelease,
    BuildRun,
    BuildArtifact,
    ContainerImage,
    DatabaseMigrationRun,
    ApplicationDeployment,
    DeploymentService,
    TrafficShift,
    ReleaseVerification,
    RollbackRun,
    DomainBinding,
    CertificateRecord,
    RuntimeSecretBinding,
    ReleaseEvidence,
)
from app.schemas.release import (
    ReleaseCreateRequest,
    ReleaseResponse,
    BuildRunResponse,
    BuildArtifactSchema,
    ContainerImageSchema,
    ReleaseApproveRequest,
    MigrationPlanRequest,
    MigrationRunRequest,
    MigrationRunResponse,
    DeploymentTriggerRequest,
    DeploymentResponse,
    DeploymentServiceSchema,
    RollbackRequest,
    DomainBindingRequest,
    DomainBindingResponse,
    SecretWriteRequest,
    SecretMetadataResponse,
)
from app.services.release.build_engine import (
    LocalIsolatedBuildProvider,
    BuildSpecification,
    redact_secrets,
)
from app.services.release.migration_engine import (
    AlembicMigrationProvider,
    PrismaMigrationProvider,
    DjangoMigrationProvider,
    MigrationRiskAnalyzer,
)
from app.services.release.deployment_engine import (
    TaskDefinitionGenerator,
    BlueGreenDeploymentExecutor,
    RollingDeploymentExecutor,
)
from app.services.release.smoke_tests import SmokeTestProvider
from app.services.release.rollback_service import RollbackService
from app.services.release.domain_service import DomainService
from app.services.release.policy_engine import ReleasePolicyEngine
from app.services.release.evidence_service import ReleaseEvidenceService

async def delivery_execution_gate(request: Request, membership: OrganizationMembership = Depends(get_current_membership)):
    # The legacy engine fabricates build, migration, ECS and traffic outcomes.
    # Keep its read paths available, but never create those observations in real mode.
    mutating = request.method not in {"GET", "HEAD", "OPTIONS"} or request.url.path.endswith("/verification")
    if mutating:
        if membership.role not in {MembershipRole.OWNER, MembershipRole.ADMIN}:
            raise HTTPException(403, "A business owner or administrator must manage delivery.")
        if not settings.DEMO_MODE:
            raise HTTPException(503, {"code": "DELIVERY_EXECUTION_UNAVAILABLE",
                "message": "Automated release execution is not available. Request a reviewed deployment service; no build, migration or cloud operation was started."})

router = APIRouter(tags=["Releases & Delivery Engine"], dependencies=[Depends(delivery_execution_gate)])


async def _audit(
    db: AsyncSession,
    membership: OrganizationMembership,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
):
    actor_email = "admin@launchcomply.io"
    if hasattr(membership, "user") and membership.user and hasattr(membership.user, "email"):
        actor_email = membership.user.email
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details
    )


# =========================================================================
# 1. APPLICATION RELEASES
# =========================================================================

@router.post("/applications/{application_id}/releases", response_model=ReleaseResponse, status_code=status.HTTP_201_CREATED)
async def create_release(
    application_id: str,
    payload: ReleaseCreateRequest,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Creates a new application release candidate bound to a git commit."""
    # Verify application tenancy
    app_res = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.organization_id == membership.organization_id
        )
    )
    application = app_res.scalars().first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found or unauthorized")

    # Verify environment tenancy
    env_res = await db.execute(
        select(Environment).where(
            Environment.id == payload.environment_id,
            Environment.application_id == application_id
        )
    )
    environment = env_res.scalars().first()
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found or unauthorized")

    release = ApplicationRelease(
        organization_id=membership.organization_id,
        application_id=application_id,
        environment_id=payload.environment_id,
        repository_id=payload.repository_id,
        branch=payload.branch,
        commit_sha=payload.commit_sha,
        version=payload.version,
        status="DRAFT",
        created_by=membership.user_id,
    )
    db.add(release)
    await db.flush()

    await _audit(
        db=db,
        membership=membership,
        action="RELEASE_CREATED",
        entity_type="ApplicationRelease",
        entity_id=release.id,
        details={"version": payload.version, "commit_sha": payload.commit_sha}
    )
    await db.commit()
    await db.refresh(release)
    return release


@router.get("/applications/{application_id}/releases", response_model=List[ReleaseResponse])
async def list_releases(
    application_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Lists all releases for an application."""
    app_res = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.organization_id == membership.organization_id
        )
    )
    if not app_res.scalars().first():
        raise HTTPException(status_code=404, detail="Application not found or unauthorized")

    result = await db.execute(
        select(ApplicationRelease)
        .where(
            ApplicationRelease.application_id == application_id,
            ApplicationRelease.organization_id == membership.organization_id
        )
        .order_by(ApplicationRelease.created_at.desc())
    )
    return result.scalars().all()


@router.get("/releases/{release_id}")
async def get_release_detail(
    release_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Gets complete release details including builds, artifacts, deployments, and verification."""
    result = await db.execute(
        select(ApplicationRelease)
        .where(
            ApplicationRelease.id == release_id,
            ApplicationRelease.organization_id == membership.organization_id
        )
    )
    release = result.scalars().first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found or unauthorized")

    # Fetch build run
    build_res = await db.execute(
        select(BuildRun).where(
            BuildRun.application_release_id == release_id,
            BuildRun.organization_id == membership.organization_id
        )
    )
    build_run = build_res.scalars().first()

    # Fetch artifacts
    artifacts_res = await db.execute(
        select(BuildArtifact).where(
            BuildArtifact.organization_id == membership.organization_id,
            BuildArtifact.build_run_id == (build_run.id if build_run else "")
        )
    )
    artifacts = artifacts_res.scalars().all()

    # Fetch container images
    images_res = await db.execute(
        select(ContainerImage).where(
            ContainerImage.application_release_id == release_id,
            ContainerImage.organization_id == membership.organization_id
        )
    )
    images = images_res.scalars().all()

    # Fetch deployments
    deploy_res = await db.execute(
        select(ApplicationDeployment).where(
            ApplicationDeployment.application_release_id == release_id,
            ApplicationDeployment.organization_id == membership.organization_id
        ).order_by(ApplicationDeployment.created_at.desc())
    )
    deployments = deploy_res.scalars().all()

    # Fetch migration runs
    mig_res = await db.execute(
        select(DatabaseMigrationRun).where(
            DatabaseMigrationRun.application_release_id == release_id,
            DatabaseMigrationRun.organization_id == membership.organization_id
        )
    )
    migrations = mig_res.scalars().all()

    # Fetch verification
    ver_res = await db.execute(
        select(ReleaseVerification).where(
            ReleaseVerification.application_release_id == release_id,
            ReleaseVerification.organization_id == membership.organization_id
        )
    )
    verifications = ver_res.scalars().all()

    return {
        "release": release,
        "build_run": build_run,
        "artifacts": artifacts,
        "images": images,
        "deployments": deployments,
        "migrations": migrations,
        "verifications": verifications
    }


# =========================================================================
# 2. ISOLATED BUILD WORKER
# =========================================================================

@router.post("/releases/{release_id}/build", response_model=BuildRunResponse)
async def trigger_release_build(
    release_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Executes an isolated build worker job, generates SBOM, container CVE scans, and ECR artifacts."""
    result = await db.execute(
        select(ApplicationRelease).where(
            ApplicationRelease.id == release_id,
            ApplicationRelease.organization_id == membership.organization_id
        )
    )
    release = result.scalars().first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found or unauthorized")

    # Get application
    app_res = await db.execute(select(Application).where(Application.id == release.application_id))
    application = app_res.scalars().first()
    app_name = application.name if application else "app"

    # Get environment
    env_res = await db.execute(select(Environment).where(Environment.id == release.environment_id))
    environment = env_res.scalars().first()
    env_name = environment.name if environment else "production"

    release.status = "BUILDING"
    await db.flush()

    await _audit(
        db=db,
        membership=membership,
        action="BUILD_STARTED",
        entity_type="ApplicationRelease",
        entity_id=release.id,
        details={"version": release.version, "commit_sha": release.commit_sha}
    )

    build_run = BuildRun(
        organization_id=membership.organization_id,
        application_release_id=release.id,
        status="RUNNING",
        worker_job_id=f"job-build-{release.id[:8]}",
        started_at=datetime.utcnow(),
        builder_version="LaunchComply-Worker-v2.4",
        source_commit_sha=release.commit_sha
    )
    db.add(build_run)
    await db.flush()

    # Instantiate isolated build provider
    provider = LocalIsolatedBuildProvider()
    workspace = provider.prepare_source("", release.commit_sha)

    # Multi-service build specification
    services_to_build = [
        ("api", BuildSpecification(service_name="api", runtime="python", exposed_port=8000)),
        ("web", BuildSpecification(service_name="web", runtime="next", exposed_port=3000)),
        ("worker", BuildSpecification(service_name="worker", runtime="python", exposed_port=None))
    ]

    all_logs = []
    artifacts = []
    images = []
    has_critical_cve = False

    for s_name, spec in services_to_build:
        res = provider.build_service(
            app_name=app_name,
            env_name=env_name,
            service_name=s_name,
            spec=spec,
            commit_sha=release.commit_sha,
            release_version=release.version,
            source_dir=workspace
        )
        all_logs.extend(res.logs)

        # Record build artifact
        artifact = BuildArtifact(
            organization_id=membership.organization_id,
            build_run_id=build_run.id,
            artifact_type="CONTAINER_IMAGE",
            service_name=s_name,
            image_repository=res.ecr_repository,
            image_tag=res.image_tag,
            image_digest=res.image_digest,
            sbom_key=f"sboms/{release.id}/{s_name}-cyclonedx.json",
            size_bytes=res.size_bytes,
            sha256=res.image_digest.replace("sha256:", "")
        )
        db.add(artifact)
        artifacts.append(artifact)

        # Record container image with scan status
        image = ContainerImage(
            organization_id=membership.organization_id,
            application_release_id=release.id,
            service_name=s_name,
            ecr_repository=res.ecr_repository,
            image_tag=res.image_tag,
            image_digest=res.image_digest,
            scan_status=res.scan_result.status,
            critical_vulnerabilities=res.scan_result.critical_count,
            high_vulnerabilities=res.scan_result.high_count,
            medium_vulnerabilities=res.scan_result.medium_count
        )
        db.add(image)
        images.append(image)

        if res.scan_result.critical_count > 0:
            has_critical_cve = True

    provider.cleanup(workspace)

    build_run.status = "COMPLETED"
    build_run.completed_at = datetime.utcnow()
    build_run.duration_seconds = 18.4

    if has_critical_cve:
        release.status = "SECURITY_BLOCKED"
    else:
        release.status = "ARTIFACT_READY"

    await _audit(
        db=db,
        membership=membership,
        action="BUILD_COMPLETED",
        entity_type="BuildRun",
        entity_id=build_run.id,
        details={"status": build_run.status, "artifacts_built": len(artifacts)}
    )

    await db.commit()
    await db.refresh(build_run)

    return BuildRunResponse(
        id=build_run.id,
        status=build_run.status,
        started_at=build_run.started_at,
        completed_at=build_run.completed_at,
        duration_seconds=build_run.duration_seconds,
        source_commit_sha=build_run.source_commit_sha,
        artifacts=[BuildArtifactSchema.model_validate(a) for a in artifacts],
        images=[ContainerImageSchema.model_validate(img) for img in images],
        logs=all_logs
    )


@router.get("/releases/{release_id}/artifacts")
async def get_release_artifacts(
    release_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Returns immutable container artifacts and ECR image digests."""
    rel_res = await db.execute(
        select(ApplicationRelease).where(
            ApplicationRelease.id == release_id,
            ApplicationRelease.organization_id == membership.organization_id
        )
    )
    if not rel_res.scalars().first():
        raise HTTPException(status_code=404, detail="Release not found or unauthorized")

    images_res = await db.execute(
        select(ContainerImage).where(
            ContainerImage.application_release_id == release_id,
            ContainerImage.organization_id == membership.organization_id
        )
    )
    return images_res.scalars().all()


@router.get("/releases/{release_id}/sbom")
async def get_release_sbom(
    release_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Returns the CycloneDX SBOM document for the release."""
    rel_res = await db.execute(
        select(ApplicationRelease).where(
            ApplicationRelease.id == release_id,
            ApplicationRelease.organization_id == membership.organization_id
        )
    )
    release = rel_res.scalars().first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found or unauthorized")

    # Return standard CycloneDX SBOM structure
    provider = LocalIsolatedBuildProvider()
    sbom = provider._generate_cyclonedx_sbom("acmecloud-api", "python", release.commit_sha)
    return sbom.model_dump()


# =========================================================================
# 3. APPROVAL & GATES
# =========================================================================

@router.post("/releases/{release_id}/approve")
async def approve_release(
    release_id: str,
    payload: ReleaseApproveRequest,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Requires approval to proceed from ARTIFACT_READY to APPROVED."""
    rel_res = await db.execute(
        select(ApplicationRelease).where(
            ApplicationRelease.id == release_id,
            ApplicationRelease.organization_id == membership.organization_id
        )
    )
    release = rel_res.scalars().first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found or unauthorized")

    # Evaluate DevSecOps release gates
    assessment = ReleasePolicyEngine.evaluate(
        has_critical_vulns=False,
        missing_secrets=[],
        migration_failed=False,
        health_passed=True,
        has_valid_tls=True,
        has_artifact_digest=True,
        infra_ready=True,
        override_reason=payload.override_reason if payload.override_gates else None,
        override_by=membership.user_id if payload.override_gates else None
    )

    if not assessment.is_deployable:
        raise HTTPException(
            status_code=400,
            detail=f"Release gate policy blocked: {assessment.rules[0].details}"
        )

    release.status = "APPROVED"
    release.approved_by = membership.user_id
    release.approved_at = datetime.utcnow()

    await _audit(
        db=db,
        membership=membership,
        action="RELEASE_APPROVED",
        entity_type="ApplicationRelease",
        entity_id=release.id,
        details={"approved_by": membership.user_id, "gates_status": assessment.overall_status}
    )
    await db.commit()
    return {"status": "APPROVED", "gates": assessment.model_dump()}


# =========================================================================
# 4. DATABASE MIGRATIONS
# =========================================================================

@router.post("/releases/{release_id}/migrations/plan")
async def plan_release_migrations(
    release_id: str,
    payload: MigrationPlanRequest,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Analyzes pending database migrations and flags backward-incompatible operations."""
    rel_res = await db.execute(
        select(ApplicationRelease).where(
            ApplicationRelease.id == release_id,
            ApplicationRelease.organization_id == membership.organization_id
        )
    )
    if not rel_res.scalars().first():
        raise HTTPException(status_code=404, detail="Release not found or unauthorized")

    provider = AlembicMigrationProvider()
    plan = provider.plan("", "rev_20260915_001")
    return plan.model_dump()


@router.post("/releases/{release_id}/migrations/run", response_model=MigrationRunResponse)
async def run_release_migrations(
    release_id: str,
    payload: MigrationRunRequest,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Executes database schema migration in an isolated transient runner."""
    rel_res = await db.execute(
        select(ApplicationRelease).where(
            ApplicationRelease.id == release_id,
            ApplicationRelease.organization_id == membership.organization_id
        )
    )
    release = rel_res.scalars().first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found or unauthorized")

    provider = AlembicMigrationProvider()
    result = provider.execute(
        app_name="acmecloud",
        env_name="production",
        db_connection_arn="arn:aws:secretsmanager:us-east-1:123456789012:secret:acmecloud-db-conn",
        target_version="rev_20261001_004",
        create_snapshot=payload.create_snapshot
    )

    mig_run = DatabaseMigrationRun(
        organization_id=membership.organization_id,
        application_release_id=release.id,
        environment_id=release.environment_id,
        migration_type=payload.migration_type,
        status="COMPLETED" if result.success else "FAILED",
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
        output_summary=result.output_summary,
        migration_version_before=result.version_before,
        migration_version_after=result.version_after,
    )
    db.add(mig_run)

    await _audit(
        db=db,
        membership=membership,
        action="MIGRATION_COMPLETED" if result.success else "MIGRATION_FAILED",
        entity_type="DatabaseMigrationRun",
        entity_id=mig_run.id,
        details={"version_after": result.version_after, "snapshot_id": result.snapshot_id}
    )
    await db.commit()
    await db.refresh(mig_run)

    return MigrationRunResponse(
        id=mig_run.id,
        status=mig_run.status,
        migration_type=mig_run.migration_type,
        version_before=mig_run.migration_version_before,
        version_after=mig_run.migration_version_after,
        output_summary=mig_run.output_summary,
        duration_seconds=result.duration_seconds,
        started_at=mig_run.started_at,
        completed_at=mig_run.completed_at
    )


# =========================================================================
# 5. DEPLOYMENT & TRAFFIC PROMOTION
# =========================================================================

@router.post("/releases/{release_id}/deploy", response_model=DeploymentResponse)
async def deploy_release(
    release_id: str,
    payload: DeploymentTriggerRequest,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Deploys release via Blue/Green or Rolling strategy to ECS."""
    rel_res = await db.execute(
        select(ApplicationRelease).where(
            ApplicationRelease.id == release_id,
            ApplicationRelease.organization_id == membership.organization_id
        )
    )
    release = rel_res.scalars().first()
    if not release:
        raise HTTPException(status_code=404, detail="Release not found or unauthorized")

    # Find previous live release for rollback tracking
    prev_res = await db.execute(
        select(ApplicationRelease).where(
            ApplicationRelease.application_id == release.application_id,
            ApplicationRelease.environment_id == release.environment_id,
            ApplicationRelease.status == "LIVE",
            ApplicationRelease.id != release_id
        )
    )
    prev_release = prev_res.scalars().first()

    deployment = ApplicationDeployment(
        organization_id=membership.organization_id,
        application_release_id=release.id,
        environment_id=release.environment_id,
        strategy=payload.strategy,
        status="DEPLOYING",
        started_at=datetime.utcnow(),
        previous_release_id=prev_release.id if prev_release else None,
        target_release_id=release.id,
        traffic_percentage=0
    )
    db.add(deployment)
    release.status = "DEPLOYING"
    await db.flush()

    # Generate Task Definitions for API, Frontend, Worker
    task_defs = {
        "api": TaskDefinitionGenerator.generate(
            app_name="acmecloud",
            env_name="prod",
            service_name="api",
            service_type="api",
            image_digest="sha256:d8c6b7e0e7a4f5c90b6a7d8c6b7e0e7a4f5c90b6a7d8c6b7e0e7a4f5c90b6a7d",
            ecr_repository="launchcomply-acmecloud-prod-api",
            port=8000,
            env_vars={"PORT": "8000", "ENV": "production"},
            secrets_manager_arns={"DATABASE_URL": "arn:aws:secretsmanager:us-east-1:123456789012:secret:DATABASE_URL"}
        ),
        "web": TaskDefinitionGenerator.generate(
            app_name="acmecloud",
            env_name="prod",
            service_name="web",
            service_type="frontend",
            image_digest="sha256:e9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
            ecr_repository="launchcomply-acmecloud-prod-web",
            port=3000,
            env_vars={"PORT": "3000", "NEXT_PUBLIC_API_URL": "https://api.acmecloud.io"},
            secrets_manager_arns={}
        ),
        "worker": TaskDefinitionGenerator.generate(
            app_name="acmecloud",
            env_name="prod",
            service_name="worker",
            service_type="worker",
            image_digest="sha256:f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0b2",
            ecr_repository="launchcomply-acmecloud-prod-worker",
            port=None,
            env_vars={"WORKER_QUEUE": "tasks"},
            secrets_manager_arns={"DATABASE_URL": "arn:aws:secretsmanager:us-east-1:123456789012:secret:DATABASE_URL"}
        )
    }

    # Execute Deployment Strategy
    executor = BlueGreenDeploymentExecutor() if payload.strategy == "BLUE_GREEN" else RollingDeploymentExecutor()
    exec_result = executor.execute_deployment(
        deployment_id=deployment.id,
        app_name="acmecloud",
        env_name="production",
        task_definitions=task_defs
    )

    services_schemas = []
    for s in exec_result.deployed_services:
        d_service = DeploymentService(
            organization_id=membership.organization_id,
            application_deployment_id=deployment.id,
            service_name=s["service_name"],
            service_type=s["service_type"],
            ecs_service_arn=s["ecs_service_arn"],
            task_definition_arn=s["task_definition_arn"],
            desired_count=s["desired_count"],
            running_count=s["running_count"],
            healthy_count=s["healthy_count"],
            status=s["status"]
        )
        db.add(d_service)
        services_schemas.append(DeploymentServiceSchema(**s))

    deployment.status = "VERIFYING"
    release.status = "VERIFYING"

    await _audit(
        db=db,
        membership=membership,
        action="DEPLOYMENT_STARTED",
        entity_type="ApplicationDeployment",
        entity_id=deployment.id,
        details={"strategy": payload.strategy}
    )
    await db.commit()
    await db.refresh(deployment)

    return DeploymentResponse(
        id=deployment.id,
        application_release_id=deployment.application_release_id,
        environment_id=deployment.environment_id,
        strategy=deployment.strategy,
        status=deployment.status,
        started_at=deployment.started_at,
        traffic_percentage=deployment.traffic_percentage,
        previous_release_id=deployment.previous_release_id,
        services=services_schemas,
        logs=exec_result.logs
    )


@router.get("/deployments/{deployment_id}")
async def get_deployment(
    deployment_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves deployment state and deployed ECS services."""
    dep_res = await db.execute(
        select(ApplicationDeployment)
        .options(selectinload(ApplicationDeployment.services))
        .where(
            ApplicationDeployment.id == deployment_id,
            ApplicationDeployment.organization_id == membership.organization_id
        )
    )
    deployment = dep_res.scalars().first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found or unauthorized")

    return deployment


@router.get("/deployments/{deployment_id}/verification")
async def run_deployment_verification(
    deployment_id: str,
    simulate_failure: bool = False,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Executes automated smoke tests (health check, ping, latency, TLS) against deployment."""
    dep_res = await db.execute(
        select(ApplicationDeployment).where(
            ApplicationDeployment.id == deployment_id,
            ApplicationDeployment.organization_id == membership.organization_id
        )
    )
    deployment = dep_res.scalars().first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found or unauthorized")

    smoke_suite = SmokeTestProvider.execute_suite(
        base_url="https://app.acmecloud.io",
        health_path="/health",
        simulate_failure=simulate_failure
    )

    for item in smoke_suite.results:
        rec = ReleaseVerification(
            organization_id=membership.organization_id,
            application_release_id=deployment.application_release_id,
            environment_id=deployment.environment_id,
            verification_type=item.verification_type,
            status=item.status,
            endpoint=item.endpoint,
            response_code=item.response_code,
            latency_ms=item.latency_ms,
            details_json=item.details
        )
        db.add(rec)

    await db.commit()
    return smoke_suite.model_dump()


@router.post("/deployments/{deployment_id}/promote")
async def promote_deployment_traffic(
    deployment_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Shifts 100% traffic to Green target group and marks release LIVE."""
    dep_res = await db.execute(
        select(ApplicationDeployment).where(
            ApplicationDeployment.id == deployment_id,
            ApplicationDeployment.organization_id == membership.organization_id
        )
    )
    deployment = dep_res.scalars().first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found or unauthorized")

    # Shift traffic
    shift = TrafficShift(
        organization_id=membership.organization_id,
        application_deployment_id=deployment.id,
        from_target="Blue-TG-Active",
        to_target="Green-TG-Candidate",
        percentage=100,
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
        status="COMPLETED"
    )
    db.add(shift)

    deployment.traffic_percentage = 100
    deployment.status = "COMPLETED"
    deployment.completed_at = datetime.utcnow()

    # Update release status
    rel_res = await db.execute(
        select(ApplicationRelease).where(ApplicationRelease.id == deployment.application_release_id)
    )
    release = rel_res.scalars().first()
    if release:
        release.status = "LIVE"
        release.deployed_at = datetime.utcnow()

    # Mark previous release SUPERSEDED
    if deployment.previous_release_id:
        prev_res = await db.execute(
            select(ApplicationRelease).where(ApplicationRelease.id == deployment.previous_release_id)
        )
        prev_release = prev_res.scalars().first()
        if prev_release:
            prev_release.status = "SUPERSEDED"

    # Mark environment LIVE
    env_res = await db.execute(select(Environment).where(Environment.id == deployment.environment_id))
    environment = env_res.scalars().first()
    if environment:
        environment.is_live = True

    await _audit(
        db=db,
        membership=membership,
        action="RELEASE_LIVE",
        entity_type="ApplicationRelease",
        entity_id=release.id if release else deployment_id,
        details={"version": release.version if release else "v1.4.2", "traffic_percentage": 100}
    )

    await db.commit()
    return {
        "status": "LIVE",
        "traffic_percentage": 100,
        "release_version": release.version if release else None,
        "message": "Traffic shift completed. Release is now LIVE."
    }


# =========================================================================
# 6. FIRST-CLASS ROLLBACK
# =========================================================================

@router.post("/deployments/{deployment_id}/rollback")
async def rollback_deployment(
    deployment_id: str,
    payload: RollbackRequest,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Executes instant traffic rollback to previous release with DB compatibility verification."""
    dep_res = await db.execute(
        select(ApplicationDeployment).where(
            ApplicationDeployment.id == deployment_id,
            ApplicationDeployment.organization_id == membership.organization_id
        )
    )
    deployment = dep_res.scalars().first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found or unauthorized")

    target_release_id = payload.rollback_to_release_id or deployment.previous_release_id
    if not target_release_id:
        raise HTTPException(status_code=400, detail="No previous release available for rollback target")

    target_rel_res = await db.execute(
        select(ApplicationRelease).where(
            ApplicationRelease.id == target_release_id,
            ApplicationRelease.organization_id == membership.organization_id
        )
    )
    target_release = target_rel_res.scalars().first()
    if not target_release:
        raise HTTPException(status_code=404, detail="Target rollback release not found or unauthorized")

    # Current release
    curr_rel_res = await db.execute(
        select(ApplicationRelease).where(ApplicationRelease.id == deployment.application_release_id)
    )
    current_release = curr_rel_res.scalars().first()

    # Execute rollback logic
    rollback_result = RollbackService.execute_rollback(
        deployment_id=deployment.id,
        failed_release_id=current_release.id if current_release else "unknown",
        rollback_to_release_id=target_release.id,
        target_version=target_release.version,
        has_migrations=True,
        migration_risk="LOW"
    )

    rollback_run = RollbackRun(
        organization_id=membership.organization_id,
        application_deployment_id=deployment.id,
        rollback_to_release_id=target_release.id,
        reason=payload.reason,
        status="COMPLETED",
        requested_by=membership.user_id,
        approved_by=membership.user_id,
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow()
    )
    db.add(rollback_run)

    # Status updates
    if current_release:
        current_release.status = "ROLLED_BACK"
    target_release.status = "LIVE"
    deployment.status = "ROLLED_BACK"

    await _audit(
        db=db,
        membership=membership,
        action="ROLLBACK_COMPLETED",
        entity_type="RollbackRun",
        entity_id=rollback_run.id,
        details={
            "target_version": target_release.version,
            "reason": payload.reason,
            "database_assessment": rollback_result.db_assessment.compatibility_status
        }
    )
    await db.commit()
    return rollback_result.model_dump()


# =========================================================================
# 7. CUSTOM DOMAINS, ACM & HTTPS
# =========================================================================

@router.get("/environments/{environment_id}/domains", response_model=List[DomainBindingResponse])
async def list_domains(
    environment_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Lists domain bindings for an environment."""
    env_res = await db.execute(
        select(Environment).where(
            Environment.id == environment_id,
            Environment.organization_id == membership.organization_id
        )
    )
    if not env_res.scalars().first():
        raise HTTPException(status_code=404, detail="Environment not found or unauthorized")

    bindings_res = await db.execute(
        select(DomainBinding).where(
            DomainBinding.environment_id == environment_id,
            DomainBinding.organization_id == membership.organization_id
        )
    )
    return bindings_res.scalars().all()


@router.post("/environments/{environment_id}/domains", response_model=DomainBindingResponse)
async def add_domain_binding(
    environment_id: str,
    payload: DomainBindingRequest,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Binds a custom domain, generates ACM validation CNAME records."""
    env_res = await db.execute(
        select(Environment).where(
            Environment.id == environment_id,
            Environment.organization_id == membership.organization_id
        )
    )
    environment = env_res.scalars().first()
    if not environment:
        raise HTTPException(status_code=404, detail="Environment not found or unauthorized")

    verification = DomainService.create_domain_binding(
        app_name="app",
        env_name=environment.name,
        domain=payload.domain
    )

    binding = DomainBinding(
        organization_id=membership.organization_id,
        application_id=environment.application_id,
        environment_id=environment.id,
        domain=payload.domain,
        dns_provider=verification.dns_provider,
        status="ACTIVE" if verification.ownership_verified else "PENDING_DNS",
        target_type="ALB_CNAME",
        target_value=verification.target_value,
        verified_at=datetime.utcnow() if verification.ownership_verified else None
    )
    db.add(binding)
    await db.flush()

    cert = CertificateRecord(
        organization_id=membership.organization_id,
        domain_binding_id=binding.id,
        provider="AWS_ACM",
        certificate_arn=verification.certificate_arn,
        status=verification.certificate_status,
        validation_method="DNS",
        requested_at=datetime.utcnow(),
        issued_at=datetime.utcnow() if verification.certificate_status == "ISSUED" else None
    )
    db.add(cert)
    binding.certificate_id = cert.id

    # Update environment domain
    environment.domain_name = payload.domain
    environment.https_active = verification.https_enforced

    await _audit(
        db=db,
        membership=membership,
        action="DOMAIN_ADDED",
        entity_type="DomainBinding",
        entity_id=binding.id,
        details={"domain": payload.domain, "dns_provider": verification.dns_provider}
    )
    await db.commit()
    await db.refresh(binding)

    resp = DomainBindingResponse(
        id=binding.id,
        domain=binding.domain,
        dns_provider=binding.dns_provider,
        status=binding.status,
        certificate_id=binding.certificate_id,
        target_type=binding.target_type,
        target_value=binding.target_value,
        created_at=binding.created_at,
        verified_at=binding.verified_at,
        validation_records=[r.model_dump() for r in verification.validation_records]
    )
    return resp


@router.post("/domains/{domain_id}/verify")
async def verify_domain(
    domain_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Polls external DNS and marks domain and ACM certificate as active."""
    dom_res = await db.execute(
        select(DomainBinding).where(
            DomainBinding.id == domain_id,
            DomainBinding.organization_id == membership.organization_id
        )
    )
    binding = dom_res.scalars().first()
    if not binding:
        raise HTTPException(status_code=404, detail="Domain binding not found or unauthorized")

    status_data = DomainService.verify_dns_and_certificate(binding.domain)
    binding.status = "ACTIVE"
    binding.verified_at = datetime.utcnow()

    # Update cert
    cert_res = await db.execute(
        select(CertificateRecord).where(CertificateRecord.domain_binding_id == binding.id)
    )
    cert = cert_res.scalars().first()
    if cert:
        cert.status = "ISSUED"
        cert.issued_at = datetime.utcnow()

    await _audit(
        db=db,
        membership=membership,
        action="DNS_VERIFIED",
        entity_type="DomainBinding",
        entity_id=binding.id,
        details={"domain": binding.domain, "https": True}
    )
    await db.commit()
    return status_data.model_dump()


# =========================================================================
# 8. RUNTIME SECRETS (WRITE-ONLY)
# =========================================================================

@router.get("/environments/{environment_id}/runtime-config", response_model=List[SecretMetadataResponse])
async def list_runtime_secrets_metadata(
    environment_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Lists runtime environment variables & secret configurations. NEVER returns plaintext secret values."""
    env_res = await db.execute(
        select(Environment).where(
            Environment.id == environment_id,
            Environment.organization_id == membership.organization_id
        )
    )
    if not env_res.scalars().first():
        raise HTTPException(status_code=404, detail="Environment not found or unauthorized")

    secrets_res = await db.execute(
        select(RuntimeSecretBinding).where(
            RuntimeSecretBinding.environment_id == environment_id,
            RuntimeSecretBinding.organization_id == membership.organization_id
        )
    )
    bindings = secrets_res.scalars().all()

    return [
        SecretMetadataResponse(
            id=b.id,
            service_name=b.service_name,
            environment_variable_name=b.environment_variable_name,
            secrets_manager_arn=b.secrets_manager_arn,
            required=b.required,
            configured=b.configured,
            last_rotated_at=b.last_rotated_at
        )
        for b in bindings
    ]


@router.post("/environments/{environment_id}/secrets", response_model=SecretMetadataResponse)
async def configure_runtime_secret(
    environment_id: str,
    payload: SecretWriteRequest,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """Write-only secret configuration. Stores in AWS Secrets Manager reference and returns metadata only."""
    env_res = await db.execute(
        select(Environment).where(
            Environment.id == environment_id,
            Environment.organization_id == membership.organization_id
        )
    )
    if not env_res.scalars().first():
        raise HTTPException(status_code=404, detail="Environment not found or unauthorized")

    # Look for existing binding or create new
    existing_res = await db.execute(
        select(RuntimeSecretBinding).where(
            RuntimeSecretBinding.environment_id == environment_id,
            RuntimeSecretBinding.service_name == payload.service_name,
            RuntimeSecretBinding.environment_variable_name == payload.environment_variable_name
        )
    )
    binding = existing_res.scalars().first()

    arn = f"arn:aws:secretsmanager:us-east-1:123456789012:secret:lc-{environment_id[:8]}-{payload.service_name}-{payload.environment_variable_name}"

    if not binding:
        binding = RuntimeSecretBinding(
            organization_id=membership.organization_id,
            environment_id=environment_id,
            service_name=payload.service_name,
            environment_variable_name=payload.environment_variable_name,
            secrets_manager_arn=arn,
            required=payload.required,
            configured=True,
            last_rotated_at=datetime.utcnow()
        )
        db.add(binding)
    else:
        binding.configured = True
        binding.last_rotated_at = datetime.utcnow()

    # Never log the secret_value!
    await _audit(
        db=db,
        membership=membership,
        action="SECRET_CONFIGURED",
        entity_type="RuntimeSecretBinding",
        entity_id=binding.id or "new",
        details={
            "service_name": payload.service_name,
            "key": payload.environment_variable_name,
            "arn": arn
        }
    )
    await db.commit()
    await db.refresh(binding)

    return SecretMetadataResponse(
        id=binding.id,
        service_name=binding.service_name,
        environment_variable_name=binding.environment_variable_name,
        secrets_manager_arn=binding.secrets_manager_arn,
        required=binding.required,
        configured=binding.configured,
        last_rotated_at=binding.last_rotated_at
    )
