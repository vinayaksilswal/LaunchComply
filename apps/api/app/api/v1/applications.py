import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.permissions import get_current_membership, require_roles
from app.core.config import settings
from app.models.auth import OrganizationMembership, MembershipRole
from app.models.application import Application, Environment, AppStatus
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    EnvironmentSchema,
    StackAnalysisRequest,
    StackAnalysisResult
)
from app.core.audit import log_audit_event
from app.models.source_control import Repository, ApplicationRepository, SourceControlConnection, ConnectionStatus
from app.models.audit import AuditEvent
from app.models.source_archive import ApplicationSourceArchive

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.get("/{application_id}/workspace")
async def application_workspace(application_id: str, request: Request,
    membership: OrganizationMembership = Depends(get_current_membership), db: AsyncSession = Depends(get_db)):
    org_id = membership.organization_id
    if request.headers.get("X-Organization-ID") not in (None, org_id):
        raise HTTPException(403, "You are not a member of this organization.")
    application = (await db.execute(select(Application).where(Application.id == application_id, Application.organization_id == org_id))).scalar_one_or_none()
    if not application:
        raise HTTPException(404, "Application not found in your business.")
    repository = (await db.execute(select(Repository).join(ApplicationRepository, ApplicationRepository.repository_id == Repository.id)
        .join(SourceControlConnection).where(ApplicationRepository.application_id == application.id,
            ApplicationRepository.organization_id == org_id, Repository.organization_id == org_id, Repository.selected == True,
            SourceControlConnection.organization_id == org_id, SourceControlConnection.status == ConnectionStatus.ACTIVE).limit(1))).scalar_one_or_none()
    upload = (await db.execute(select(ApplicationSourceArchive.filename, ApplicationSourceArchive.sha256,
        ApplicationSourceArchive.size_bytes, ApplicationSourceArchive.file_count, ApplicationSourceArchive.created_at).where(
        ApplicationSourceArchive.application_id == application.id, ApplicationSourceArchive.organization_id == org_id))).mappings().one_or_none()
    activity = (await db.execute(select(AuditEvent).where(AuditEvent.organization_id == org_id,
        AuditEvent.entity_id == application.id).order_by(AuditEvent.created_at.desc()).limit(10))).scalars().all()
    return {"id": application.id, "name": application.name, "created_at": application.created_at,
        "repository": {"full_name": repository.full_name, "url": repository.html_url,
            "branch": repository.default_branch, "visibility": repository.visibility, "last_synced_at": repository.last_synced_at} if repository else None,
        "submitted_repository_url": application.repo_url,
        "source_archive": dict(upload) if upload else None,
        "assessments": {"architecture": "NOT_ASSESSED", "deployment": "NOT_VERIFIED", "security": "NOT_ASSESSED", "compliance": "NOT_ASSESSED"},
        "activity": [{"id": item.id, "action": item.action, "created_at": item.created_at} for item in activity]}

def slugify(text: str) -> str:
    text = text.lower().strip()
    return re.sub(r'[\s\W-]+', '-', text).strip('-')

@router.get("/", response_model=List[ApplicationResponse])
async def list_applications(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Application)
        .options(selectinload(Application.environments))
        .where(Application.organization_id == membership.organization_id)
        .order_by(Application.created_at.desc())
    )
    apps = result.scalars().all()

    response = []
    for app in apps:
        envs = [
            EnvironmentSchema(
                id=e.id,
                name=e.name,
                slug=e.slug,
                aws_region=e.aws_region,
                is_live=e.is_live,
                domain_name=e.domain_name,
                https_active=e.https_active,
                status=e.status
            )
            for e in app.environments
        ]
        response.append(ApplicationResponse(
            id=app.id,
            organization_id=app.organization_id,
            name=app.name,
            slug=app.slug,
            description=app.description,
            repo_url=app.repo_url,
            repo_provider=app.repo_provider,
            repo_branch=app.repo_branch,
            framework_frontend=app.framework_frontend,
            framework_backend=app.framework_backend,
            database_engine=app.database_engine,
            runtime=app.runtime,
            status=app.status.value if hasattr(app.status, "value") else str(app.status),
            production_readiness_score=app.production_readiness_score,
            security_posture_score=app.security_posture_score,
            compliance_readiness_score=app.compliance_readiness_score,
            environments=envs,
            created_at=app.created_at
        ))
    return response

@router.post("/", response_model=ApplicationResponse)
async def create_application(
    payload: ApplicationCreate,
    membership: OrganizationMembership = Depends(require_roles([MembershipRole.OWNER, MembershipRole.ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    app_slug = slugify(payload.name)
    app = Application(
        organization_id=membership.organization_id,
        name=payload.name,
        slug=app_slug,
        description=payload.description,
        repo_url=payload.repo_url,
        repo_branch=payload.repo_branch,
        framework_frontend=payload.framework_frontend,
        framework_backend=payload.framework_backend,
        database_engine=payload.database_engine,
        runtime="Not analyzed",
        containerized=False,
        health_endpoint="",
        status=AppStatus.READY_FOR_ARCHITECTURE,
        production_readiness_score="UNKNOWN",
        security_posture_score="UNKNOWN",
        compliance_readiness_score="UNKNOWN",
    )
    db.add(app)
    await db.flush()

    # Create default production environment
    env = Environment(
        application_id=app.id,
        organization_id=membership.organization_id,
        name="production",
        slug="prod",
        aws_region="ap-south-1",
        is_live=False,
        domain_name="",
        https_active=False,
        status="PLANNING",
    )
    db.add(env)
    await db.commit()
    await db.refresh(app)

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="system@launchcomply.io",
        action="APPLICATION_CREATED",
        entity_type="application",
        entity_id=app.id,
        details={"name": app.name, "frameworks": f"{payload.framework_frontend} + {payload.framework_backend}"}
    )

    return ApplicationResponse(
        id=app.id,
        organization_id=app.organization_id,
        name=app.name,
        slug=app.slug,
        description=app.description,
        repo_url=app.repo_url,
            repo_provider=app.repo_provider,
        repo_branch=app.repo_branch,
        framework_frontend=app.framework_frontend,
        framework_backend=app.framework_backend,
        database_engine=app.database_engine,
        runtime=app.runtime,
        status=app.status.value if hasattr(app.status, "value") else str(app.status),
        production_readiness_score=app.production_readiness_score,
        security_posture_score=app.security_posture_score,
        compliance_readiness_score=app.compliance_readiness_score,
        environments=[
            EnvironmentSchema(
                id=env.id,
                name=env.name,
                slug=env.slug,
                aws_region=env.aws_region,
                is_live=env.is_live,
                domain_name=env.domain_name,
                https_active=env.https_active,
                status=env.status
            )
        ],
        created_at=app.created_at
    )

@router.post("/analyze", response_model=StackAnalysisResult)
async def analyze_stack(payload: StackAnalysisRequest):
    if not settings.DEMO_MODE or settings.ENVIRONMENT.lower() in {"production", "staging"}:
        raise HTTPException(503, "Connect GitHub and analyze the application in the architecture workspace. This legacy sample analyzer is disabled.")
    # Intelligent application analyzer
    frontend = payload.frontend_hint or "React / Next.js 15"
    backend = payload.backend_hint or "FastAPI (Python 3.11)"
    database = payload.database_hint or "PostgreSQL 16"

    # Calculate recommended AWS services
    services = [
        "AWS Route 53 (Managed DNS with Latency Routing)",
        "Amazon CloudFront (Global CDN + Brotli Compression)",
        "AWS WAF (Web Application Firewall with OWASP Core Rules)",
        "Application Load Balancer (ALB with ACM TLS 1.3 Termination)",
        "Amazon ECS Fargate (Private Subnet Auto-Scaling Tasks)",
        "Amazon RDS PostgreSQL (Multi-AZ with Automated KMS Backups)",
        "Amazon ElastiCache Redis (Session Cache in Private VPC)",
        "Amazon S3 (Encrypted Storage for User Assets)",
        "AWS Secrets Manager (Zero Hardcoded Credentials)",
        "AWS CloudWatch & CloudTrail (Centralized Audit & Metrics)",
        "AWS Backup (Automated Point-in-Time Recovery)"
    ]

    return StackAnalysisResult(
        frontend=frontend,
        backend=backend,
        database=database,
        runtime="Containerized (Docker multi-stage build)",
        container_ready=True,
        estimated_monthly_inr="₹32,000 - ₹45,000",
        detected_services=["Authentication", "REST API", "Database Pooling", "Redis Caching", "Object Storage"],
        suggested_aws_architecture=services
    )
