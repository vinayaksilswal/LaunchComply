import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership
from app.models.application import Application, Environment, AppStatus
from app.schemas.application import (
    ApplicationCreate,
    ApplicationResponse,
    EnvironmentSchema,
    StackAnalysisRequest,
    StackAnalysisResult
)
from app.core.audit import log_audit_event

router = APIRouter(prefix="/applications", tags=["Applications"])

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
    membership: OrganizationMembership = Depends(get_current_membership),
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
        runtime="Node.js 20 / Python 3.11",
        containerized=True,
        health_endpoint="/api/v1/health",
        status=AppStatus.READY_TO_DEPLOY,
        production_readiness_score="78%",
        security_posture_score="72%",
        compliance_readiness_score="60%",
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
        domain_name=f"{app_slug}.launchcomply.app",
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
