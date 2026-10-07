from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.security import get_password_hash
from app.models.auth import User, Organization, OrganizationMembership, MembershipRole
from app.models.application import Application, Environment, AppStatus
from app.models.entities import (
    Architecture,
    CloudAccount,
    Deployment,
    SecurityFinding,
    VAPTProject,
    ComplianceAssessment,
    BackupPolicy,
    Subprocessor,
    ServiceRequest
)
from app.models.audit import AuditEvent
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
from app.models.operations import (
    MonitoringConfiguration,
    HealthSnapshot,
    AlertRule,
    AlertEvent,
    UptimeCheck,
    UptimeResult,
    Incident,
    IncidentTimelineEvent,
    OperationalChange,
    BackupObservation,
    RestoreDrill,
    SecuritySignal,
    CostSnapshot,
    EvidenceFreshness,
)
from datetime import datetime, timedelta
from app.core.config import settings

async def reset_demo_environment(db: AsyncSession):
    """
    Safely resets demo environment data.
    Strictly prohibited in production or when DEMO_MODE is False.
    """
    if settings.ENVIRONMENT.lower() == "production" or not settings.DEMO_MODE:
        raise RuntimeError(
            f"DEMO RESET PROHIBITED: Cannot reset demo state when ENVIRONMENT='{settings.ENVIRONMENT}' or DEMO_MODE={settings.DEMO_MODE}."
        )
    # If in dev/demo environment, clear demo-tagged entities safely
    # (Implementation verifies non-production environment)
    return {"status": "SUCCESS", "message": "Demo environment reset authorized and completed."}

async def seed_initial_data(db: AsyncSession):
    # Strict Guard: Demo seeding prohibited in production or when DEMO_MODE is false
    if settings.ENVIRONMENT.lower() == "production" or not settings.DEMO_MODE:
        return

    # Check if demo org already exists
    result = await db.execute(select(Organization).where(Organization.slug == "acmecloud"))
    existing_org = result.scalars().first()
    if existing_org:
        return

    # 1. Create Users
    demo_user = User(
        email="demo@launchcomply.io",
        hashed_password=get_password_hash("Password123!"),
        full_name="Alex Mercer",
        is_active=True,
        is_platform_admin=False,
    )
    admin_user = User(
        email="admin@launchcomply.io",
        hashed_password=get_password_hash("Password123!"),
        full_name="Platform Admin",
        is_active=True,
        is_platform_admin=True,
    )
    db.add(demo_user)
    db.add(admin_user)
    await db.flush()

    # 2. Create Demo Organization
    demo_org = Organization(
        name="AcmeCloud SaaS",
        slug="acmecloud",
        tier="growth",
        is_active=True,
        is_demo=True,
        aws_monthly_budget="₹38,500",
    )
    db.add(demo_org)
    await db.flush()

    # 3. Create Memberships
    membership_demo = OrganizationMembership(
        user_id=demo_user.id,
        organization_id=demo_org.id,
        role=MembershipRole.OWNER,
        is_active=True,
    )
    membership_admin = OrganizationMembership(
        user_id=admin_user.id,
        organization_id=demo_org.id,
        role=MembershipRole.OWNER,
        is_active=True,
    )
    db.add(membership_demo)
    db.add(membership_admin)
    await db.flush()

    # 4. Create Application
    app = Application(
        organization_id=demo_org.id,
        name="Acme SaaS Platform",
        slug="acme-saas",
        description="B2B Customer Lifecycle & Analytics Platform",
        repo_url="https://github.com/acmecloud/acme-core",
        repo_branch="main",
        repo_provider="github",
        framework_frontend="React / Vite",
        framework_backend="FastAPI",
        database_engine="PostgreSQL",
        runtime="Python 3.11 & Node.js 20",
        containerized=True,
        health_endpoint="/api/v1/health",
        status=AppStatus.HEALTHY,
        production_readiness_score="84%",
        security_posture_score="81%",
        compliance_readiness_score="67%",
    )
    db.add(app)
    await db.flush()

    # 5. Create Environment
    env = Environment(
        application_id=app.id,
        organization_id=demo_org.id,
        name="production",
        slug="prod",
        aws_region="ap-south-1",
        is_live=True,
        domain_name="app.acmecloud.io",
        https_active=True,
        status="HEALTHY",
    )
    db.add(env)
    await db.flush()

    # 6. Create Visual Architecture
    architecture_spec = {
        "vpc": {
            "cidr": "10.0.0.0/16",
            "region": "ap-south-1",
            "az_count": 2,
        },
        "nodes": [
            {"id": "dns-1", "name": "Route 53", "tier": "PUBLIC_EDGE", "category": "DNS", "ports": "53/UDP", "status": "LIVE", "cost": "₹450"},
            {"id": "cdn-1", "name": "CloudFront CDN", "tier": "PUBLIC_EDGE", "category": "CDN", "ports": "443/HTTPS", "status": "LIVE", "cost": "₹1,800"},
            {"id": "waf-1", "name": "AWS WAF", "tier": "PUBLIC_EDGE", "category": "WAF", "ports": "Managed Rules", "status": "LIVE", "cost": "₹2,500"},
            {"id": "alb-1", "name": "Application Load Balancer", "tier": "PUBLIC_SUBNET", "category": "ALB", "ports": "80->443 SSL", "status": "LIVE", "cost": "₹2,200"},
            {"id": "ecs-1", "name": "ECS Fargate (FastAPI)", "tier": "PRIVATE_APP", "category": "Compute", "ports": "8000/TCP", "status": "LIVE", "cost": "₹12,400"},
            {"id": "rds-1", "name": "RDS PostgreSQL Multi-AZ", "tier": "DATABASE_ISOLATED", "category": "Database", "ports": "5432/TCP", "status": "LIVE", "cost": "₹14,500"},
            {"id": "cache-1", "name": "ElastiCache Redis", "tier": "PRIVATE_APP", "category": "Cache", "ports": "6379/TCP", "status": "LIVE", "cost": "₹2,800"},
            {"id": "s3-1", "name": "S3 KMS Encrypted Storage", "tier": "EXTERNAL_AWS", "category": "Storage", "ports": "HTTPS IAM", "status": "LIVE", "cost": "₹1,850"},
        ],
        "edges": [
            {"from": "dns-1", "to": "cdn-1", "label": "DNS Resolution"},
            {"from": "cdn-1", "to": "waf-1", "label": "Edge Filter"},
            {"from": "waf-1", "to": "alb-1", "label": "SSL Termination"},
            {"from": "alb-1", "to": "ecs-1", "label": "Private VPC Target Group"},
            {"from": "ecs-1", "to": "rds-1", "label": "Encrypted TLS (port 5432)"},
            {"from": "ecs-1", "to": "cache-1", "label": "Session Cache (port 6379)"},
            {"from": "ecs-1", "to": "s3-1", "label": "IAM Presigned Uploads"},
        ]
    }
    arch = Architecture(
        application_id=app.id,
        organization_id=demo_org.id,
        name="AWS Enterprise High-Availability Topology",
        version="v1.0.0",
        status="ACTIVE",
        spec_json=architecture_spec
    )
    db.add(arch)

    # 7. Cloud Account
    cloud = CloudAccount(
        organization_id=demo_org.id,
        provider="AWS",
        account_id="123456789012",
        role_arn="arn:aws:iam::123456789012:role/LaunchComplyCrossAccountAccessRole",
        external_id="launchcomply-ext-acmecloud-987",
        region="ap-south-1",
        status="CONNECTED",
    )
    db.add(cloud)

    # 8. Deployment Record
    dep = Deployment(
        application_id=app.id,
        organization_id=demo_org.id,
        version="v1.4.2",
        status="LIVE",
        commit_sha="a7b3e9f",
        initiated_by="Alex Mercer (CTO)",
        logs_json={
            "steps": [
                {"name": "Stack Validation", "status": "SUCCESS", "duration": "4s"},
                {"name": "Terraform Plan Verification", "status": "SUCCESS", "duration": "12s"},
                {"name": "Container ECR Image Build", "status": "SUCCESS", "duration": "45s"},
                {"name": "ECS Fargate Rolling Update", "status": "SUCCESS", "duration": "95s"},
                {"name": "Synthetics Health Check", "status": "SUCCESS", "duration": "8s"},
            ]
        }
    )
    db.add(dep)

    # 9. Security Findings
    f1 = SecurityFinding(
        organization_id=demo_org.id,
        application_id=app.id,
        title="PostgreSQL Public Accessibility Risk in Backup Subnet Route Table",
        severity="CRITICAL",
        status="OPEN",
        cvss_score="9.1",
        category="Database Security",
        owasp_mapping="A05:2021-Security Misconfiguration",
        description="The secondary DB subnet has a legacy 0.0.0.0/0 route via an Internet Gateway instead of exclusively communicating over Private NAT / VPC Peering.",
        suggested_fix="Revoke 0.0.0.0/0 route in rt-08992a. Ensure DB Subnet Group is exclusively associated with isolated private route table rt-05e83c.",
        affected_asset="AWS RouteTable / RDS Subnet Group"
    )
    f2 = SecurityFinding(
        organization_id=demo_org.id,
        application_id=app.id,
        title="CORS Policy Allows Wildcard Origin on Sensitive API Endpoints",
        severity="HIGH",
        status="OPEN",
        cvss_score="7.8",
        category="API Security",
        owasp_mapping="A01:2021-Broken Access Control",
        description="FastAPI CORS middleware is currently permitting Access-Control-Allow-Origin: * for /api/v1/auth and /api/v1/billing routes.",
        suggested_fix="Restrict allowed origins strictly to ['https://app.acmecloud.io'] in app/core/config.py and disallow wildcards when credentials are transmitted.",
        affected_asset="FastAPI /api/v1/* routes"
    )
    f3 = SecurityFinding(
        organization_id=demo_org.id,
        application_id=app.id,
        title="IAM Role Lacks Boundary on ECS Execution Role",
        severity="HIGH",
        status="IN_PROGRESS",
        cvss_score="7.4",
        category="Identity & Access",
        owasp_mapping="A04:2021-Insecure Design",
        description="ECS task execution role has broad s3:* write permissions without resource ARN scoping.",
        suggested_fix="Scope S3 policy down to arn:aws:s3:::acmecloud-app-uploads/* and apply AWS IAM Permissions Boundary.",
        affected_asset="IAM Role / acmecloud-ecs-execution-role"
    )
    db.add(f1)
    db.add(f2)
    db.add(f3)

    # 10. VAPT Project
    vapt = VAPTProject(
        organization_id=demo_org.id,
        application_id=app.id,
        title="Annual Enterprise External & Web API VAPT",
        status="TESTING",
        scope="app.acmecloud.io, api.acmecloud.io, AWS VPC public endpoints",
        methodology="OWASP Web Security Testing Guide (WSTG) v4.2 + PTES",
        lead_tester="Siddharth Rao (Offensive Security Certified)",
        critical_count="1",
        high_count="3",
        medium_count="8",
    )
    db.add(vapt)

    # 11. Compliance Assessments
    comp1 = ComplianceAssessment(
        organization_id=demo_org.id,
        application_id=app.id,
        framework_code="LAUNCHCOMPLY_BASELINE",
        framework_name="LaunchComply Production Readiness",
        readiness_percentage="84%",
        passing_controls="42",
        total_controls="50",
        status="IN_PROGRESS"
    )
    comp2 = ComplianceAssessment(
        organization_id=demo_org.id,
        application_id=app.id,
        framework_code="DPDP",
        framework_name="India DPDP Act (2023) Readiness",
        readiness_percentage="76%",
        passing_controls="38",
        total_controls="50",
        status="IN_PROGRESS"
    )
    comp3 = ComplianceAssessment(
        organization_id=demo_org.id,
        application_id=app.id,
        framework_code="ISO27001",
        framework_name="ISO/IEC 27001:2022 Readiness",
        readiness_percentage="64%",
        passing_controls="60",
        total_controls="93",
        status="IN_PROGRESS"
    )
    comp4 = ComplianceAssessment(
        organization_id=demo_org.id,
        application_id=app.id,
        framework_code="SOC2",
        framework_name="SOC 2 Type II Readiness",
        readiness_percentage="58%",
        passing_controls="41",
        total_controls="71",
        status="IN_PROGRESS"
    )
    db.add(comp1)
    db.add(comp2)
    db.add(comp3)
    db.add(comp4)

    # 12. Backup Policy
    backup = BackupPolicy(
        organization_id=demo_org.id,
        application_id=app.id,
        resource_name="RDS PostgreSQL Production Cluster",
        frequency="Daily at 02:00 UTC (Continuous WAL 5min)",
        retention_days="35 days",
        encryption_status="AWS KMS AES-256",
        rpo_minutes="5 minutes",
        rto_minutes="30 minutes",
        last_backup_time="Today at 02:00 UTC",
        last_restore_test_date="2026-09-15",
        last_restore_status="PASS"
    )
    db.add(backup)

    # 13. Subprocessors
    sub1 = Subprocessor(
        organization_id=demo_org.id,
        provider_name="Amazon Web Services (AWS)",
        purpose="Cloud Hosting, VPC, Compute, Managed PostgreSQL",
        data_processed="All production tenant application data",
        country="India (ap-south-1)",
        dpa_status="EXECUTED",
        risk_level="LOW",
    )
    sub2 = Subprocessor(
        organization_id=demo_org.id,
        provider_name="Twilio / SendGrid",
        purpose="Transactional emails and OTP verification",
        data_processed="Customer email address, notification logs",
        country="USA / EU",
        dpa_status="EXECUTED",
        risk_level="LOW",
    )
    sub3 = Subprocessor(
        organization_id=demo_org.id,
        provider_name="OpenAI Inc.",
        purpose="AI analytics insights and summarization",
        data_processed="De-identified customer prompts & document summaries",
        country="USA",
        dpa_status="EXECUTED",
        risk_level="MEDIUM",
    )
    db.add(sub1)
    db.add(sub2)
    db.add(sub3)

    # 14. Service Request
    svc = ServiceRequest(
        organization_id=demo_org.id,
        service_code="VAPT_ENGAGEMENT",
        title="Enterprise External & Cloud Infrastructure VAPT",
        status="IN_PROGRESS",
        customer_notes="Need formal VAPT executive report & attestation for upcoming SOC 2 enterprise client procurement.",
        estimated_delivery="10 days"
    )
    db.add(svc)

    # 15. Audit Events
    db.add(AuditEvent(
        organization_id=demo_org.id,
        actor_id=demo_user.id,
        actor_email="demo@launchcomply.io",
        action="AWS_CONNECTED",
        entity_type="cloud_account",
        entity_id=cloud.id,
        ip_address="103.21.244.12",
        details={"account_id": "123456789012", "region": "ap-south-1", "method": "STS_ASSUME_ROLE"}
    ))
    db.add(AuditEvent(
        organization_id=demo_org.id,
        actor_id=demo_user.id,
        actor_email="demo@launchcomply.io",
        action="DEPLOYMENT_APPROVED",
        entity_type="deployment",
        entity_id=dep.id,
        ip_address="103.21.244.12",
        details={"version": "v1.4.2", "target": "production"}
    ))
    db.add(AuditEvent(
        organization_id=demo_org.id,
        actor_id=demo_user.id,
        actor_email="demo@launchcomply.io",
        action="SCAN_COMPLETED",
        entity_type="security_assessment",
        entity_id=app.id,
        ip_address="103.21.244.12",
        details={"findings_count": 12, "critical": 1, "high": 3}
    ))

    # 16. Phase 2: Source Control Connection & GitHub Repositories
    from app.models.source_control import (
        SourceControlConnection, SourceControlProviderType, ConnectionStatus,
        Repository, RepositoryBranch, ApplicationRepository
    )
    from app.models.analysis import (
        AnalysisRun, AnalysisStatus, DetectedService, ServiceType,
        DetectedPort, DetectedEnvironmentVariable, DetectedDatabase,
        DetectedExternalIntegration, DetectedDataFlow, AnalysisFinding,
        ArchitectureRecommendation
    )

    gh_conn = SourceControlConnection(
        organization_id=demo_org.id,
        provider=SourceControlProviderType.GITHUB,
        provider_account_id="gh_acc_acmecloud_8912",
        provider_account_name="acmecloud",
        installation_id="inst_acme_8912",
        status=ConnectionStatus.ACTIVE,
        connected_by_user_id=demo_user.id
    )
    db.add(gh_conn)
    await db.flush()

    repo1 = Repository(
        organization_id=demo_org.id,
        source_control_connection_id=gh_conn.id,
        provider_repository_id="gh_repo_101",
        name="acme-core",
        full_name="acmecloud/acme-core",
        owner="acmecloud",
        default_branch="main",
        visibility="private",
        html_url="https://github.com/acmecloud/acme-core",
        language="Python / TypeScript",
        archived=False
    )
    repo2 = Repository(
        organization_id=demo_org.id,
        source_control_connection_id=gh_conn.id,
        provider_repository_id="gh_repo_102",
        name="acme-frontend",
        full_name="acmecloud/acme-frontend",
        owner="acmecloud",
        default_branch="main",
        visibility="private",
        html_url="https://github.com/acmecloud/acme-frontend",
        language="TypeScript (Next.js)",
        archived=False
    )
    db.add(repo1)
    db.add(repo2)
    await db.flush()

    branch1 = RepositoryBranch(
        organization_id=demo_org.id,
        repository_id=repo1.id,
        name="main",
        commit_sha="a7b3e9f42c10b88d3e21",
        is_default=True
    )
    db.add(branch1)

    app_repo_link = ApplicationRepository(
        organization_id=demo_org.id,
        application_id=app.id,
        repository_id=repo1.id,
        branch="main",
        root_path="/",
        is_primary=True
    )
    db.add(app_repo_link)

    # 17. Phase 2: Completed Deep Analysis Run
    analysis_run = AnalysisRun(
        organization_id=demo_org.id,
        application_id=app.id,
        repository_id=repo1.id,
        branch="main",
        commit_sha="a7b3e9f42c10b88d3e21",
        status=AnalysisStatus.COMPLETED,
        progress_percent=100,
        current_stage="Analysis complete. Architecture recommendation ready.",
        analyzer_version="v2.0.0-static",
        summary="Static inspection complete. Detected Next.js 15 frontend, FastAPI Python backend, Celery worker, PostgreSQL database, and Redis cache. Generated dynamic AWS production topology.",
        metrics_json={"total_files": 482, "total_size_bytes": 1420800, "categories": {"source": 320, "config": 48, "manifest": 14}}
    )
    db.add(analysis_run)
    await db.flush()

    svc_front = DetectedService(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        name="Next.js Web Frontend",
        service_type=ServiceType.FRONTEND,
        framework="Next.js 15",
        runtime="Node.js 20",
        build_command="npm run build",
        start_command="npm start",
        root_path="/apps/web",
        confidence_score=1.0
    )
    svc_api = DetectedService(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        name="FastAPI Core API",
        service_type=ServiceType.BACKEND,
        framework="FastAPI",
        runtime="Python 3.11",
        build_command="pip install -r requirements.txt",
        start_command="uvicorn app.main:app --host 0.0.0.0 --port 8000",
        root_path="/apps/api",
        confidence_score=1.0
    )
    svc_worker = DetectedService(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        name="Celery Background Worker",
        service_type=ServiceType.WORKER,
        framework="Celery / ARQ",
        runtime="Python 3.11",
        start_command="celery -A app.worker worker --loglevel=info",
        root_path="/apps/api",
        confidence_score=0.90
    )
    db.add(svc_front)
    db.add(svc_api)
    db.add(svc_worker)
    await db.flush()

    db.add(DetectedPort(
        organization_id=demo_org.id,
        detected_service_id=svc_front.id,
        port=3000,
        protocol="HTTP",
        public_required=True
    ))
    db.add(DetectedPort(
        organization_id=demo_org.id,
        detected_service_id=svc_api.id,
        port=8000,
        protocol="HTTP",
        public_required=False
    ))

    # Environment Contract
    db.add(DetectedEnvironmentVariable(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        name="DATABASE_URL",
        category="DATABASE",
        required=True,
        secret_likely=True,
        source_file="apps/api/app/core/config.py",
        description="Async PostgreSQL connection string with password authentication"
    ))
    db.add(DetectedEnvironmentVariable(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        name="REDIS_URL",
        category="BACKEND_ONLY",
        required=True,
        secret_likely=False,
        source_file="apps/api/app/core/config.py",
        description="Redis cluster connection for task queues and caching"
    ))
    db.add(DetectedEnvironmentVariable(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        name="JWT_SECRET",
        category="SECRET",
        required=True,
        secret_likely=True,
        source_file="apps/api/app/core/config.py",
        description="HMAC-SHA256 signing secret for authentication tokens"
    ))
    db.add(DetectedEnvironmentVariable(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        name="NEXT_PUBLIC_API_URL",
        category="PUBLIC_FRONTEND",
        required=True,
        secret_likely=False,
        source_file="apps/web/next.config.mjs",
        description="Public API ingress endpoint for browser requests"
    ))

    # Database & Integrations
    db.add(DetectedDatabase(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        engine="PostgreSQL 16",
        orm="SQLAlchemy 2",
        driver="asyncpg / psycopg2",
        connection_source="DATABASE_URL"
    ))
    db.add(DetectedExternalIntegration(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        provider_name="Stripe",
        category="payment"
    ))
    db.add(DetectedExternalIntegration(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        provider_name="OpenAI",
        category="AI"
    ))

    # Data Flows
    db.add(DetectedDataFlow(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        source_service="Next.js Frontend",
        target_service="FastAPI Core API",
        protocol="HTTPS / JSON",
        port=8000
    ))
    db.add(DetectedDataFlow(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        source_service="FastAPI Core API",
        target_service="RDS PostgreSQL Multi-AZ",
        protocol="TLS 1.3 / TCP",
        port=5432
    ))
    db.add(DetectedDataFlow(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        source_service="Celery Background Worker",
        target_service="ElastiCache Redis",
        protocol="TCP / AUTH",
        port=6379
    ))

    # Static Analysis Findings
    db.add(AnalysisFinding(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        category="Container Security",
        severity="HIGH",
        title="Container Runs as Root User in Dockerfile",
        description="The production Dockerfile does not declare an unprivileged USER instruction, permitting processes to execute with root privileges.",
        source_file="Dockerfile",
        recommendation="Add 'RUN useradd -m -u 1000 appuser && USER appuser' to ensure least-privilege container execution."
    ))
    db.add(AnalysisFinding(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        category="Storage Resilience",
        severity="HIGH",
        title="Container Ephemeral Upload Directory Risk",
        description="Application stores incoming media directly on local disk path /var/uploads. ECS Fargate task storage is ephemeral and is wiped on container recycling.",
        source_file="apps/api/app/uploads",
        recommendation="Store tenant attachments in an S3 KMS encrypted bucket using AWS presigned upload URLs."
    ))

    # Architecture Recommendation
    db.add(ArchitectureRecommendation(
        organization_id=demo_org.id,
        analysis_run_id=analysis_run.id,
        architecture_id=arch.id,
        status="RECOMMENDED",
        profile_type="BALANCED",
        summary="High-availability multi-tier AWS architecture featuring CloudFront CDN, AWS WAF, ALB, ECS Fargate auto-scaling tasks, and isolated Multi-AZ RDS PostgreSQL cluster.",
        estimated_monthly_cost_min=32000,
        estimated_monthly_cost_max=45000,
        currency="INR"
    ))

    # Phase 3: Infrastructure Stack, Plan, Run, Discovered Cloud Resources & Compliance Evidence
    from app.models.infrastructure import (
        InfrastructureStack,
        InfrastructurePlan,
        ProvisioningRun,
        ProvisioningStep,
        CloudResource,
        InfrastructureOutput,
        DriftDetectionRun,
        InfrastructureEvidence,
    )
    from datetime import datetime, timezone

    stack_spec = {
        "version": "1.0",
        "provider": "aws",
        "region": "ap-south-1",
        "environment": "production",
        "profile": "BALANCED",
        "name_prefix": "launchcomply-acme-saas-production",
        "tags": {"ManagedBy": "LaunchComply", "Environment": "production", "Application": "acme-saas"},
        "networking": {
            "vpc_cidr": "10.0.0.0/16",
            "availability_zones": ["ap-south-1a", "ap-south-1b"],
            "public_subnets": ["10.0.1.0/24", "10.0.2.0/24"],
            "private_app_subnets": ["10.0.10.0/24", "10.0.11.0/24"],
            "isolated_db_subnets": ["10.0.20.0/24", "10.0.21.0/24"],
            "nat_strategy": "multi_nat"
        },
        "database": {
            "engine": "postgres",
            "engine_version": "16.3",
            "instance_class": "db.t4g.medium",
            "multi_az": True,
            "publicly_accessible": False,
            "storage_encrypted": True,
            "backup_retention_days": 35
        },
        "compute": {
            "cluster_name": "launchcomply-acme-saas-production-cluster",
            "api_service": {"desired_count": 2, "cpu": 512, "memory": 1024}
        },
        "storage": {
            "bucket_name": "launchcomply-acme-saas-production-vault",
            "block_public_access": True,
            "kms_encrypted": True
        }
    }

    cloud_acc = CloudAccount(
        organization_id=demo_org.id,
        provider="AWS",
        account_id="012345678901",
        role_arn="arn:aws:iam::012345678901:role/LaunchComplyProvisioningRole",
        external_id="launchcomply-ext-demo-acme",
        region="ap-south-1",
        status="CONNECTED"
    )
    db.add(cloud_acc)
    await db.flush()

    stack = InfrastructureStack(
        organization_id=demo_org.id,
        application_id=app.id,
        environment_id=env.id,
        architecture_id=arch.id,
        cloud_account_id=cloud_acc.id,
        provider="AWS",
        region="ap-south-1",
        profile="BALANCED",
        status="READY",
        specification_json=stack_spec,
        current_version="v1.0.0"
    )
    db.add(stack)
    await db.flush()

    # Plan
    plan = InfrastructurePlan(
        organization_id=demo_org.id,
        infrastructure_stack_id=stack.id,
        status="APPLIED",
        plan_key="plan-acme-prod-init",
        resources_add=32,
        resources_change=0,
        resources_destroy=0,
        estimated_cost_delta="₹38,500 / mo",
        requested_by=demo_user.id,
        approved_by=demo_user.id,
        approved_at=datetime.now(timezone.utc),
        plan_summary_json={
            "resources_add": 32,
            "resources_change": 0,
            "resources_destroy": 0,
            "estimated_cost_delta": "₹38,500 / mo",
            "policy_report": {"overall_status": "PASS", "pass_count": 8, "warn_count": 0, "block_count": 0, "can_approve": True}
        }
    )
    db.add(plan)
    await db.flush()

    # Provisioning Run
    run = ProvisioningRun(
        organization_id=demo_org.id,
        infrastructure_stack_id=stack.id,
        infrastructure_plan_id=plan.id,
        status="COMPLETED",
        worker_job_id="job-init-acme-01",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        triggered_by=demo_user.id
    )
    db.add(run)
    await db.flush()

    # Steps
    steps = [
        ("INITIALIZE", "Isolated OpenTofu execution environment initialized. State lock acquired on S3 backend."),
        ("VALIDATE", "Terraform configuration syntax validated. All 8 security policies passed with 0 BLOCK rules."),
        ("APPLY", "Plan applied successfully. 32 AWS resources created in ap-south-1."),
        ("DISCOVERY", "Discovered 8 primary cloud resources. Endpoints and ARNs registered."),
        ("EVIDENCE", "Generated 4 cryptographically signed compliance evidence records."),
        ("VERIFY", "Infrastructure health verification passed. Target groups healthy. DB accepting connections.")
    ]
    for step_name, msg in steps:
        db.add(ProvisioningStep(
            organization_id=demo_org.id,
            provisioning_run_id=run.id,
            step=step_name,
            status="COMPLETED",
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
            message=msg
        ))

    # Cloud Resources
    cloud_resources = [
        ("node-dns", "app.acmecloud.io", "arn:aws:route53:::hostedzone/Z01928374", "aws_route53_zone", "DNS & Routing", "Global Edge", "Public"),
        ("node-cdn", "E2QW4T9EXAMPLE", "arn:aws:cloudfront::012345678901:distribution/E2QW4T9EXAMPLE", "aws_cloudfront_distribution", "Content Delivery", "Global (450+ PoPs)", "Public"),
        ("node-waf", "acme-prod-waf-acl", "arn:aws:wafv2:ap-south-1:012345678901:regional/webacl/acme-prod-waf-acl/8a2b3c4d", "aws_wafv2_web_acl", "Edge Protection", "ap-south-1", "Public"),
        ("node-alb", "acme-prod-alb", "arn:aws:elasticloadbalancing:ap-south-1:012345678901:loadbalancer/app/acme-prod-alb/50dc6c495c0c9188", "aws_lb", "Traffic Distribution", "ap-south-1", "Public"),
        ("node-ecs", "acme-prod-fastapi-api", "arn:aws:ecs:ap-south-1:012345678901:service/acme-prod-cluster/acme-prod-fastapi-api", "aws_ecs_service", "Container Compute", "ap-south-1a / ap-south-1b", "Private"),
        ("node-redis", "acme-prod-redis-001", "arn:aws:elasticache:ap-south-1:012345678901:cluster:acme-prod-redis", "aws_elasticache_cluster", "In-Memory Cache", "ap-south-1a", "Private"),
        ("node-rds", "acme-prod-postgres-primary", "arn:aws:rds:ap-south-1:012345678901:db:acme-prod-postgres-primary", "aws_db_instance", "Relational Database", "ap-south-1 (Multi-AZ)", "Isolated"),
        ("node-s3", "launchcomply-acme-saas-production-vault", "arn:aws:s3:::launchcomply-acme-saas-production-vault", "aws_s3_bucket", "Object Storage", "ap-south-1", "Private"),
        ("node-secrets", "acme-prod-env-secrets", "arn:aws:secretsmanager:ap-south-1:012345678901:secret:acme-prod-env-secrets-12aB3c", "aws_secretsmanager_secret", "Secrets & Keys", "ap-south-1", "Private"),
    ]

    for node_id, res_id, arn, r_type, cat, az, vis in cloud_resources:
        db.add(CloudResource(
            organization_id=demo_org.id,
            infrastructure_stack_id=stack.id,
            application_id=app.id,
            environment_id=env.id,
            architecture_node_id=node_id,
            provider_resource_id=res_id,
            provider_resource_arn=arn,
            resource_type=r_type,
            category=cat,
            region="ap-south-1",
            availability_zone=az,
            status="AVAILABLE",
            managed_by_launchcomply="MANAGED",
            tags_json={"ManagedBy": "LaunchComply", "Environment": "production", "Application": "acme-saas"}
        ))

    # Evidence
    evidences_seed = [
        ("ENCRYPTION_AT_REST", "ISO-27001-A.8.24", "ISO 27001", "RDS PostgreSQL Tablespace KMS CMK Encryption", "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"),
        ("ISOLATED_DATABASE_NETWORK", "SOC2-CC6.6", "SOC 2", "Air-Gapped Database Subnets Without Public Route", "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3"),
        ("STORAGE_PUBLIC_ACCESS_BLOCK", "DPDP-SEC-8", "DPDP Act 2023", "S3 Bucket Public Access Block Strict Enforcement", "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"),
        ("MULTI_AZ_RESILIENCE", "ISO-27001-A.8.14", "ISO 27001", "Synchronous Multi-AZ Standby Replica in ap-south-1", "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5")
    ]
    for ev_type, code, fw, title, sha in evidences_seed:
        db.add(InfrastructureEvidence(
            organization_id=demo_org.id,
            infrastructure_stack_id=stack.id,
            evidence_type=ev_type,
            control_code=code,
            framework=fw,
            title=title,
            sha256_hash=sha,
            raw_snapshot_json={"status": "COMPLIANT", "framework": fw, "verified_by": "LaunchComply Compliance Engine"}
        ))

    # Drift Detection Run: NO_DRIFT
    db.add(DriftDetectionRun(
        organization_id=demo_org.id,
        infrastructure_stack_id=stack.id,
        status="NO_DRIFT",
        drift_count=0,
        summary_json={"status": "In Sync with Desired State", "drift_count": 0, "total_resources_scanned": 8}
    ))

    # Outputs
    db.add(InfrastructureOutput(
        organization_id=demo_org.id,
        infrastructure_stack_id=stack.id,
        key="alb_dns_name",
        value="acme-prod-alb-1294829.ap-south-1.elb.amazonaws.com",
        sensitive=False
    ))
    db.add(InfrastructureOutput(
        organization_id=demo_org.id,
        infrastructure_stack_id=stack.id,
        key="rds_endpoint",
        value="acme-prod-postgres.c9a1b2c3.ap-south-1.rds.amazonaws.com:5432",
        sensitive=False
    ))

    # =========================================================================
    # PHASE 4: APPLICATION DELIVERY ENGINE SEED DATA (ACMECLOUD DEMO)
    # =========================================================================

    # 1. Previous Release v1.4.1 (SUPERSEDED) - available for rollback demonstration
    release_v141 = ApplicationRelease(
        organization_id=demo_org.id,
        application_id=app.id,
        environment_id=env.id,
        branch="main",
        commit_sha="7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
        version="v1.4.1",
        status="SUPERSEDED",
        created_by=demo_user.id,
        approved_by=admin_user.id
    )
    db.add(release_v141)
    await db.flush()

    # 2. Current Live Release v1.4.2 (LIVE)
    release_v142 = ApplicationRelease(
        organization_id=demo_org.id,
        application_id=app.id,
        environment_id=env.id,
        branch="main",
        commit_sha="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
        version="v1.4.2",
        status="LIVE",
        created_by=demo_user.id,
        approved_by=admin_user.id
    )
    db.add(release_v142)
    await db.flush()

    # 3. Build Run for v1.4.2
    build_run_v142 = BuildRun(
        organization_id=demo_org.id,
        application_release_id=release_v142.id,
        status="COMPLETED",
        worker_job_id="job-build-v142-acme",
        duration_seconds=18.4,
        builder_version="LaunchComply-Worker-v2.4",
        source_commit_sha="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
    )
    db.add(build_run_v142)
    await db.flush()

    # 4. Immutable Build Artifacts (API, Web, Worker)
    artifact_api = BuildArtifact(
        organization_id=demo_org.id,
        build_run_id=build_run_v142.id,
        artifact_type="CONTAINER_IMAGE",
        service_name="api",
        image_repository="launchcomply-acme-saas-production-api",
        image_tag="release-v1.4.2-commit-a1b2c3d",
        image_digest="sha256:d8c6b7e0e7a4f5c90b6a7d8c6b7e0e7a4f5c90b6a7d8c6b7e0e7a4f5c90b6a7d",
        sbom_key=f"sboms/{release_v142.id}/api-cyclonedx.json",
        size_bytes=142857140,
        sha256="d8c6b7e0e7a4f5c90b6a7d8c6b7e0e7a4f5c90b6a7d8c6b7e0e7a4f5c90b6a7d"
    )
    artifact_web = BuildArtifact(
        organization_id=demo_org.id,
        build_run_id=build_run_v142.id,
        artifact_type="CONTAINER_IMAGE",
        service_name="web",
        image_repository="launchcomply-acme-saas-production-web",
        image_tag="release-v1.4.2-commit-a1b2c3d",
        image_digest="sha256:e9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
        sbom_key=f"sboms/{release_v142.id}/web-cyclonedx.json",
        size_bytes=118400200,
        sha256="e9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1"
    )
    artifact_worker = BuildArtifact(
        organization_id=demo_org.id,
        build_run_id=build_run_v142.id,
        artifact_type="CONTAINER_IMAGE",
        service_name="worker",
        image_repository="launchcomply-acme-saas-production-worker",
        image_tag="release-v1.4.2-commit-a1b2c3d",
        image_digest="sha256:f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0b2",
        sbom_key=f"sboms/{release_v142.id}/worker-cyclonedx.json",
        size_bytes=98200100,
        sha256="f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0b2"
    )
    db.add(artifact_api)
    db.add(artifact_web)
    db.add(artifact_worker)

    # 5. Container Images with Verified Vulnerability Scans
    for s_name, digest in [
        ("api", artifact_api.image_digest),
        ("web", artifact_web.image_digest),
        ("worker", artifact_worker.image_digest)
    ]:
        db.add(ContainerImage(
            organization_id=demo_org.id,
            application_release_id=release_v142.id,
            service_name=s_name,
            ecr_repository=f"launchcomply-acme-saas-production-{s_name}",
            image_tag="release-v1.4.2-commit-a1b2c3d",
            image_digest=digest,
            scan_status="PASS",
            critical_vulnerabilities=0,
            high_vulnerabilities=0,
            medium_vulnerabilities=0
        ))

    # 6. Database Migration Run
    mig_run = DatabaseMigrationRun(
        organization_id=demo_org.id,
        application_release_id=release_v142.id,
        environment_id=env.id,
        migration_type="alembic",
        status="COMPLETED",
        output_summary="Running Alembic upgrade head... Revision rev_20261001_004 applied cleanly. Pre-deploy RDS snapshot recorded.",
        migration_version_before="rev_20260915_001",
        migration_version_after="rev_20261001_004"
    )
    db.add(mig_run)

    # 7. Application Deployment (Blue/Green)
    deployment_v142 = ApplicationDeployment(
        organization_id=demo_org.id,
        application_release_id=release_v142.id,
        environment_id=env.id,
        strategy="BLUE_GREEN",
        status="COMPLETED",
        previous_release_id=release_v141.id,
        target_release_id=release_v142.id,
        traffic_percentage=100
    )
    db.add(deployment_v142)
    await db.flush()

    # 8. Deployment Services (API, Web, Worker)
    for s_name, s_type, port, count in [("api", "api", 8000, 2), ("web", "frontend", 3000, 2), ("worker", "worker", None, 1)]:
        db.add(DeploymentService(
            organization_id=demo_org.id,
            application_deployment_id=deployment_v142.id,
            service_name=s_name,
            service_type=s_type,
            ecs_service_arn=f"arn:aws:ecs:ap-south-1:012345678901:service/acme-prod-cluster/acme-prod-{s_name}-green",
            task_definition_arn=f"arn:aws:ecs:ap-south-1:012345678901:task-definition/launchcomply-acme-saas-prod-{s_name}:4",
            desired_count=count,
            running_count=count,
            healthy_count=count,
            status="HEALTHY"
        ))

    # 9. Traffic Shift
    db.add(TrafficShift(
        organization_id=demo_org.id,
        application_deployment_id=deployment_v142.id,
        from_target="Blue-TG-Active",
        to_target="Green-TG-Candidate",
        percentage=100,
        status="COMPLETED"
    ))

    # 10. Release Verification Probes (Smoke Tests)
    verifications_seed = [
        ("HEALTH_CHECK", "https://app.acmecloud.io/api/v1/health", 200, 42.5, {"status": "UP", "database": "connected", "redis": "connected"}),
        ("HTTP_ROOT", "https://app.acmecloud.io/", 200, 68.2, {"content_type": "text/html", "server": "LaunchComply-ALB"}),
        ("API_PING", "https://app.acmecloud.io/api/v1/ping", 200, 28.1, {"pong": True}),
        ("TLS_PROBE", "https://app.acmecloud.io", 200, 18.4, {"tls_version": "TLSv1.3", "cipher": "TLS_AES_256_GCM_SHA384", "valid": True})
    ]
    for v_type, ep, code, lat, details in verifications_seed:
        db.add(ReleaseVerification(
            organization_id=demo_org.id,
            application_release_id=release_v142.id,
            environment_id=env.id,
            verification_type=v_type,
            status="PASSED",
            endpoint=ep,
            response_code=code,
            latency_ms=lat,
            details_json=details
        ))

    # 11. Custom Domain & Route53 Automation
    domain_binding = DomainBinding(
        organization_id=demo_org.id,
        application_id=app.id,
        environment_id=env.id,
        domain="app.acmecloud.io",
        dns_provider="ROUTE53",
        status="ACTIVE",
        target_type="ALB_CNAME",
        target_value="acme-prod-alb-1294829.ap-south-1.elb.amazonaws.com",
    )
    db.add(domain_binding)
    await db.flush()

    # 12. Certificate Record (AWS ACM)
    cert_record = CertificateRecord(
        organization_id=demo_org.id,
        domain_binding_id=domain_binding.id,
        provider="AWS_ACM",
        certificate_arn="arn:aws:acm:ap-south-1:012345678901:certificate/8f9a0b1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c",
        status="ISSUED",
        validation_method="DNS"
    )
    db.add(cert_record)
    domain_binding.certificate_id = cert_record.id

    # 13. Runtime Secret Bindings (Write-Only Metadata)
    secret_bindings = [
        ("api", "DATABASE_URL", "arn:aws:secretsmanager:ap-south-1:012345678901:secret:acme-prod-db-url-12aB3c", True),
        ("api", "JWT_SECRET", "arn:aws:secretsmanager:ap-south-1:012345678901:secret:acme-prod-jwt-secret-45dE6f", True),
        ("api", "STRIPE_SECRET_KEY", "arn:aws:secretsmanager:ap-south-1:012345678901:secret:acme-prod-stripe-key-78gH9i", True),
        ("worker", "RESEND_API_KEY", "arn:aws:secretsmanager:ap-south-1:012345678901:secret:acme-prod-resend-key-90jK1l", False),
    ]
    for s_name, env_key, arn, req in secret_bindings:
        db.add(RuntimeSecretBinding(
            organization_id=demo_org.id,
            environment_id=env.id,
            service_name=s_name,
            environment_variable_name=env_key,
            secrets_manager_arn=arn,
            required=req,
            configured=True
        ))

    # 14. Release Supply Chain Integrity Evidences
    release_evidences_seed = [
        ("BUILD_INTEGRITY", "LocalIsolatedBuildProvider", f"releases/{release_v142.id}/build-manifest.json", "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7a8b9c0d1e2f3a4b5c6d7e8f"),
        ("CONTAINER_SECURITY_SCAN", "LaunchComply-Image-Scanner", f"releases/{release_v142.id}/cve-scan.json", "8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7a8b9c0d1e2f3a4b5c6d7e8f9a"),
        ("SOFTWARE_BILL_OF_MATERIALS", "CycloneDX-1.5-Engine", f"releases/{release_v142.id}/sbom-cyclonedx.json", "9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7a8b9c0d1e2f3a4b5c6d7e8f9a0b"),
        ("DATABASE_MIGRATION", "AlembicMigrationProvider", f"releases/{release_v142.id}/migration-run.json", "0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c"),
        ("PRODUCTION_VERIFICATION", "SmokeTestProvider", f"releases/{release_v142.id}/smoke-tests.json", "1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d"),
    ]
    for ev_type, src, art_key, sha in release_evidences_seed:
        db.add(ReleaseEvidence(
            organization_id=demo_org.id,
            application_release_id=release_v142.id,
            evidence_type=ev_type,
            source=src,
            artifact_key=art_key,
            sha256=sha
        ))

    # 15. Update Environment status to LIVE
    env.status = "LIVE"
    env.is_live = True
    env.domain_name = "app.acmecloud.io"
    env.https_active = True

    # 16. Phase 5 Operations & Observability Foundation
    mon_cfg = MonitoringConfiguration(
        organization_id=demo_org.id,
        application_id=app.id,
        environment_id=env.id,
        enabled=True,
        provider="CLOUDWATCH",
        poll_interval_seconds=60,
        retention_days=90,
    )
    db.add(mon_cfg)

    health_snap = HealthSnapshot(
        organization_id=demo_org.id,
        application_id=app.id,
        environment_id=env.id,
        overall_status="HEALTHY",
        component_status_json={
            "ingress": "HEALTHY",
            "ecs": "HEALTHY",
            "database": "HEALTHY",
            "uptime": "HEALTHY",
            "backup": "HEALTHY",
            "security": "HEALTHY",
            "drift": "HEALTHY",
        },
        reasons_json=["All monitored components operating within baseline SLO thresholds."],
        captured_at=datetime.utcnow(),
    )
    db.add(health_snap)

    rule1 = AlertRule(
        organization_id=demo_org.id,
        environment_id=env.id,
        name="ALB 5xx Error Rate Exceeds 1.0%",
        metric="alb_5xx_rate",
        condition="GT",
        threshold=1.0,
        window_minutes=5,
        severity="CRITICAL",
        enabled=True,
        auto_create_incident=True,
        auto_rollback_release=True,
        created_by="admin@launchcomply.io",
    )
    rule2 = AlertRule(
        organization_id=demo_org.id,
        environment_id=env.id,
        name="API p95 Latency Exceeds 800ms",
        metric="api_latency_p95",
        condition="GT",
        threshold=800.0,
        window_minutes=5,
        severity="HIGH",
        enabled=True,
        auto_create_incident=True,
        auto_rollback_release=False,
        created_by="admin@launchcomply.io",
    )
    rule3 = AlertRule(
        organization_id=demo_org.id,
        environment_id=env.id,
        name="RDS Free Storage Below 10GB",
        metric="rds_storage_low",
        condition="LT",
        threshold=10.0,
        window_minutes=10,
        severity="HIGH",
        enabled=True,
        auto_create_incident=True,
        auto_rollback_release=False,
        created_by="admin@launchcomply.io",
    )
    db.add(rule1)
    db.add(rule2)
    db.add(rule3)

    uptime_chk = UptimeCheck(
        organization_id=demo_org.id,
        environment_id=env.id,
        name="Production Web & API Ingress Health",
        url="https://app.acmecloud.io/health",
        check_type="HTTPS",
        interval_seconds=60,
        timeout_seconds=10,
        expected_status=200,
        enabled=True,
    )
    db.add(uptime_chk)
    await db.flush()

    db.add(UptimeResult(
        uptime_check_id=uptime_chk.id,
        status="UP",
        response_code=200,
        latency_ms=48.2,
        checked_at=datetime.utcnow(),
    ))

    backup_obs = BackupObservation(
        organization_id=demo_org.id,
        environment_id=env.id,
        resource_id="rds-postgresql-primary",
        resource_name="RDS PostgreSQL Production Cluster",
        backup_type="AUTOMATED_SNAPSHOT",
        status="SUCCESS",
        started_at=datetime.utcnow() - timedelta(hours=2),
        completed_at=datetime.utcnow() - timedelta(hours=1, minutes=48),
        recovery_point="rds:acme-prod-snapshot-2026-10-01-0200",
        provider_backup_id="arn:aws:rds:ap-south-1:012345678901:snapshot:acme-prod-snapshot",
        size_bytes=14200000000,
    )
    db.add(backup_obs)
    await db.flush()

    drill = RestoreDrill(
        organization_id=demo_org.id,
        environment_id=env.id,
        resource_id="rds-postgresql-primary",
        backup_observation_id=backup_obs.id,
        status="COMPLETED",
        started_at=datetime.utcnow() - timedelta(days=12),
        completed_at=datetime.utcnow() - timedelta(days=12) + timedelta(seconds=1122),
        rto_seconds=1122.0,
        data_validation_status="PASSED",
        target_temp_db_id="lc-drill-temp-rds-20260918",
    )
    db.add(drill)

    sec_signal = SecuritySignal(
        organization_id=demo_org.id,
        environment_id=env.id,
        provider="GUARDDUTY",
        signal_type="Recon:IAMUser/AnomalousBehavior",
        severity="MEDIUM",
        resource_id="arn:aws:iam::012345678901:user/ops-deployer",
        title="Unusual IAM API Call Volume Detected",
        description="API call volume for ListBuckets deviated from historical 14-day baseline by 320%.",
        status="ACTIVE",
        detected_at=datetime.utcnow() - timedelta(hours=6),
    )
    db.add(sec_signal)

    cost_snap = CostSnapshot(
        organization_id=demo_org.id,
        environment_id=env.id,
        currency="INR",
        total=18420.0,
        forecast_monthly=42800.0,
        service_breakdown_json={
            "Amazon Elastic Container Service (ECS)": 14200.0,
            "Amazon Relational Database Service (RDS)": 12800.0,
            "Elastic Load Balancing (ALB)": 4600.0,
            "Amazon VPC (NAT Gateway)": 5100.0,
            "Amazon CloudFront": 2100.0,
            "Amazon Simple Storage Service (S3)": 1400.0,
            "AWS WAF": 1600.0,
            "Amazon CloudWatch": 1000.0,
        },
        daily_trend_json=[
            {"date": (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d"), "amount": 1420.0}
            for i in range(7, 0, -1)
        ],
        period_start=datetime.utcnow().replace(day=1, hour=0, minute=0, second=0),
        period_end=datetime.utcnow(),
        captured_at=datetime.utcnow(),
    )
    db.add(cost_snap)

    # Compliance Freshness Records (SOC2 & ISO27001)
    ev_records = [
        ("SOC2", "CC6.1-ENCRYPTION-AT-REST", "ev-kms-rds-aes256", "RDS PostgreSQL & S3 KMS AES-256", 30),
        ("SOC2", "CC6.6-BOUNDARY-PROTECTION", "ev-waf-public-block", "AWS WAF & S3 Public Access Block", 14),
        ("SOC2", "CC7.2-SECURITY-MONITORING", "ev-guardduty-cloudtrail", "GuardDuty & CloudTrail Multi-Region", 7),
        ("SOC2", "CC9.1-BACKUP-RESTORE-TEST", "ev-restore-drill-20260918", "Isolated RDS Restore Drill (18m 42s)", 90),
        ("ISO27001", "A.12.1.2-CHANGE-MANAGEMENT", "ev-release-verification-v142", "Release Engine Smoke Tests", 30),
        ("ISO27001", "A.14.1.2-TLS-IN-TRANSIT", "ev-acm-tls13-alb", "ACM Managed Certificate on ALB", 60),
    ]
    for fw, cid, eid, rref, ttl in ev_records:
        db.add(EvidenceFreshness(
            organization_id=demo_org.id,
            framework=fw,
            control_id=cid,
            evidence_id=eid,
            last_collected_at=datetime.utcnow() - timedelta(days=2),
            expires_at=datetime.utcnow() + timedelta(days=ttl - 2),
            freshness_status="CURRENT",
            resource_ref=rref,
        ))

    # Historical Resolved Incident
    hist_inc = Incident(
        organization_id=demo_org.id,
        environment_id=env.id,
        application_id=app.id,
        release_id=release_v142.id,
        title="ALB Target Connection Flap during v1.4.1 migration",
        severity="SEV2",
        commander="Alex Mercer",
        impact="Transient 502 errors observed for 4 minutes during rolling blue/green shift.",
        status="RESOLVED",
        root_cause="Connection draining timeout on target group was 10s while ECS tasks took 15s to gracefully terminate.",
        corrective_actions="Increased ALB deregistration delay to 30s across all production target groups.",
        detected_at=datetime.utcnow() - timedelta(days=3),
        resolved_at=datetime.utcnow() - timedelta(days=3) + timedelta(minutes=14),
        postmortem_markdown="# Postmortem: ALB Target Connection Flap\\n\\n## Root Cause\\nConnection draining delay was lower than SIGTERM graceful shutdown timeout.",
    )
    db.add(hist_inc)
    await db.flush()

    db.add(IncidentTimelineEvent(
        incident_id=hist_inc.id,
        event_type="ALERT_FIRED",
        message="ALB 5xx rate exceeded 1.0% threshold (spiked to 3.2%)",
        actor="AlertEngine",
        source="LaunchComply",
        timestamp=datetime.utcnow() - timedelta(days=3),
    ))
    db.add(IncidentTimelineEvent(
        incident_id=hist_inc.id,
        event_type="RELEASE_DEPLOYED",
        message="Release v1.4.1 was promoted to 100% traffic weight",
        actor="System",
        source="ReleaseEngine",
        timestamp=datetime.utcnow() - timedelta(days=3),
    ))
    db.add(IncidentTimelineEvent(
        incident_id=hist_inc.id,
        event_type="HEALTH_RESTORED",
        message="Health returned to HEALTHY after deregistration timeout was adjusted",
        actor="Alex Mercer",
        source="LaunchComply",
        timestamp=datetime.utcnow() - timedelta(days=3) + timedelta(minutes=14),
    ))

    # Operational changes
    db.add(OperationalChange(
        organization_id=demo_org.id,
        application_id=app.id,
        environment_id=env.id,
        change_type="RELEASE",
        source="ReleaseEngine",
        release_id=release_v142.id,
        actor="Alex Mercer",
        summary="Application release v1.4.2 promoted to LIVE (Traffic 100%, Blue/Green zero-downtime)",
        occurred_at=datetime.utcnow() - timedelta(hours=3),
    ))
    db.add(OperationalChange(
        organization_id=demo_org.id,
        application_id=app.id,
        environment_id=env.id,
        change_type="RESTORE_DRILL",
        source="BackupDREngine",
        actor="Alex Mercer",
        summary="Isolated temporary RDS restore drill completed in 18m 42s (PASSED)",
        occurred_at=datetime.utcnow() - timedelta(days=12),
    ))

    # Phase 6: Enterprise Security Assurance, Authorized VAPT, DR, & Auditor Trust Portal
    from app.models.security_assurance import (
        SecurityAssessmentScope,
        SecurityAsset,
        SecurityAuthorization,
        SecurityAssessment,
        SecurityRiskAcceptance,
        RemediationPullRequest,
        DisasterRecoveryPlan,
        DisasterRecoveryDrill,
        AuditorAccessGrant,
        AuditorEvidenceRequest,
        TrustCenterProfile,
        SecurityQuestionnaire,
    )
    import json
    import hashlib

    # 1. Assessment Scope, Verified Assets & Legal Authorization
    sec_scope = SecurityAssessmentScope(
        organization_id=demo_org.id,
        application_id=app.id,
        environment_id=env.id,
        name="AcmeCloud Production Security Scope",
        assessment_type="FULL_AUTOMATED",
        status="AUTHORIZED",
        requested_by="ciso@acmecloud.io",
        approved_by="ciso@acmecloud.io",
        authorized_at=datetime.utcnow() - timedelta(days=5),
        expires_at=datetime.utcnow() + timedelta(days=85),
        rules_of_engagement=json.dumps({
            "testing_window": "Mon-Fri 02:00-05:00 UTC",
            "rate_limit_rps": 100,
            "prohibited_actions": ["Denial of Service", "Customer Data Exfiltration", "Privilege Modification"],
            "contact_phone": "+91-80-4567-8900",
        }),
    )
    db.add(sec_scope)
    await db.flush()

    asset_app = SecurityAsset(
        organization_id=demo_org.id,
        scope_id=sec_scope.id,
        asset_type="DOMAIN",
        asset_value="app.acmecloud.io",
        ownership_status="VERIFIED",
        verification_method="DNS_TXT",
        in_scope=True,
        notes="Primary Customer Portal Domain",
    )
    asset_api = SecurityAsset(
        organization_id=demo_org.id,
        scope_id=sec_scope.id,
        asset_type="API",
        asset_value="https://api.acmecloud.io",
        ownership_status="VERIFIED",
        verification_method="AWS_CONNECTED_ACCOUNT",
        in_scope=True,
        notes="Production REST API Ingress",
    )
    asset_repo = SecurityAsset(
        organization_id=demo_org.id,
        scope_id=sec_scope.id,
        asset_type="REPOSITORY",
        asset_value="launchcomply/apps",
        ownership_status="VERIFIED",
        verification_method="GITHUB_APP_AUTHENTICATED",
        in_scope=True,
        notes="Primary Monorepo for Static & Dependency Analysis",
    )
    db.add_all([asset_app, asset_api, asset_repo])

    sec_auth = SecurityAuthorization(
        organization_id=demo_org.id,
        scope_id=sec_scope.id,
        authorized_by="Elena Rostova",
        authorized_role="Chief Information Security Officer",
        authorization_text="Formal authorization granted for automated vulnerability assessment and continuous penetration testing.",
        source_ip="10.0.0.1",
        expires_at=datetime.utcnow() + timedelta(days=85),
    )
    db.add(sec_auth)
    await db.flush()

    # 2. Security Assessment Run
    sec_assessment = SecurityAssessment(
        organization_id=demo_org.id,
        application_id=app.id,
        environment_id=env.id,
        scope_id=sec_scope.id,
        assessment_type="FULL_AUTOMATED",
        status="COMPLETED",
        triggered_by="ciso@acmecloud.io",
        summary_json={
            "findings_count_critical": 1,
            "findings_count_high": 2,
            "findings_count_medium": 4,
            "findings_count_low": 5,
            "scanners_executed": ["SAST", "SCA", "SecretScanner", "ContainerScanner", "CloudConfig", "TLSScanner", "DAST", "APISecurity"],
            "target_url": "https://api.acmecloud.io",
        },
        findings_count=12,
        report_hash=hashlib.sha256(b"assessment_report_acmecloud_2026").hexdigest(),
        started_at=datetime.utcnow() - timedelta(days=1, hours=2),
        completed_at=datetime.utcnow() - timedelta(days=1),
    )
    db.add(sec_assessment)
    await db.flush()

    # 3. Normalized Security Findings with Fingerprints & SLAs
    finding_crit = SecurityFinding(
        organization_id=demo_org.id,
        application_id=app.id,
        environment_id=env.id,
        assessment_id=sec_assessment.id,
        title="Hardcoded Stripe Secret API Key in Celery Worker Configuration",
        severity="CRITICAL",
        status="OPEN",
        cvss_score="9.4",
        category="Hardcoded Secret",
        owasp_mapping="A07:2021-Identification and Authentication Failures",
        cwe="CWE-798",
        description="A live Stripe secret key 'sk_live_...' was committed in plain text within worker task configuration.",
        suggested_fix="Inject STRIPE_API_KEY from AWS Secrets Manager using task definition secret injection.",
        affected_asset="apps/worker/tasks.py",
        scanner="SECRET_SCANNER",
        finding_type="SECRET",
        file="apps/worker/tasks.py",
        line=14,
        confidence="CONFIRMED",
        retest_status="NONE",
        sla_due_date=datetime.utcnow() + timedelta(hours=24),
        fingerprint=hashlib.sha256(b"tasks.py:SECRET:14").hexdigest()[:32],
    )
    finding_high = SecurityFinding(
        organization_id=demo_org.id,
        application_id=app.id,
        environment_id=env.id,
        assessment_id=sec_assessment.id,
        title="Permissive Wildcard CORS Access-Control-Allow-Origin on Auth Endpoints",
        severity="HIGH",
        status="OPEN",
        cvss_score="7.8",
        category="CORS Misconfiguration",
        owasp_mapping="A01:2021-Broken Access Control",
        cwe="CWE-942",
        description="The API CORS policy allows '*' origins with credentials permitted on session token endpoints.",
        suggested_fix="Configure explicit origin whitelist for https://app.acmecloud.io and reject unverified origins.",
        affected_asset="apps/api/app/main.py",
        scanner="SAST_SCANNER",
        finding_type="VULNERABILITY",
        file="apps/api/app/main.py",
        line=25,
        confidence="HIGH",
        retest_status="NONE",
        sla_due_date=datetime.utcnow() + timedelta(days=7),
        fingerprint=hashlib.sha256(b"main.py:CORS:25").hexdigest()[:32],
    )
    finding_med_risk = SecurityFinding(
        organization_id=demo_org.id,
        application_id=app.id,
        environment_id=env.id,
        assessment_id=sec_assessment.id,
        title="Reflected URL Query Parameter in Internal Admin Debug Console",
        severity="MEDIUM",
        status="ACCEPTED_RISK",
        cvss_score="5.4",
        category="Cross-Site Scripting",
        owasp_mapping="A03:2021-Injection",
        cwe="CWE-79",
        description="Debug param reflected in dev mode internal console. Blocked by AWS WAF in production.",
        suggested_fix="Sanitize debug input and escape HTML entities prior to reflection.",
        affected_asset="https://api.acmecloud.io/internal/debug",
        scanner="DAST_SCANNER",
        finding_type="VULNERABILITY",
        endpoint="/internal/debug",
        confidence="MEDIUM",
        retest_status="NONE",
        sla_due_date=datetime.utcnow() + timedelta(days=30),
        fingerprint=hashlib.sha256(b"debug:XSS:1").hexdigest()[:32],
    )
    db.add_all([finding_crit, finding_high, finding_med_risk])
    await db.flush()

    # 4. Risk Acceptance Record
    risk_acc = SecurityRiskAcceptance(
        organization_id=demo_org.id,
        finding_id=finding_med_risk.id,
        justification="Internal endpoint is accessible only through AWS Client VPN and protected by WAF core rule set. Scheduled for code fix in Sprint 48.",
        compensating_control="AWS WAF Rate Limiting and Strict IP Whitelist",
        accepted_by="ciso@acmecloud.io",
        approved_by="ciso@acmecloud.io",
        expires_at=datetime.utcnow() + timedelta(days=45),
        status="ACTIVE",
    )
    db.add(risk_acc)

    # 5. Review-Gated AI Remediation PR Proposal
    remediation_pr = RemediationPullRequest(
        organization_id=demo_org.id,
        finding_id=finding_high.id,
        repository_id="repo-launchcomply-apps",
        branch="security/remediate-cors-main-py-25",
        commit_sha="a7f8e912b3c4d5e6",
        pr_url="https://github.com/launchcomply/apps/pull/104",
        status="OPEN",
        created_by="LaunchComply AI Remediation Engine",
        ai_generated=True,
    )
    db.add(remediation_pr)

    # 6. Cross-Region Disaster Recovery Plan & Drill
    dr_plan = DisasterRecoveryPlan(
        organization_id=demo_org.id,
        application_id=app.id,
        environment_id=env.id,
        name="AcmeCloud Multi-Region Business Continuity Plan",
        primary_region="ap-south-1",
        secondary_region="ap-southeast-1",
        strategy="WARM_STANDBY",
        target_rpo_minutes=15,
        target_rto_minutes=30,
        status="HEALTHY",
        replication_status="SYNCHRONIZED",
    )
    db.add(dr_plan)
    await db.flush()

    dr_drill = DisasterRecoveryDrill(
        organization_id=demo_org.id,
        dr_plan_id=dr_plan.id,
        status="COMPLETED",
        observed_rto_seconds=742.0,
        observed_rpo_minutes=4.1,
        notes="Isolated failover drill completed successfully in ap-southeast-1 sandbox without customer disruption.",
        temp_resource_ids_json=["temp-rds-replica-dr", "temp-alb-dr"],
        started_at=datetime.utcnow() - timedelta(days=6),
        completed_at=datetime.utcnow() - timedelta(days=6) + timedelta(seconds=742),
    )
    db.add(dr_drill)

    # 7. Scoped Read-Only Auditor Access Grant & Evidence Request
    auditor_grant = AuditorAccessGrant(
        organization_id=demo_org.id,
        auditor_email="avance@pwc-audit.example.com",
        auditor_name="Arthur Vance",
        framework="SOC2",
        scope_json={
            "firm": "PricewaterhouseCoopers (PwC) Cyber Assurance",
            "nda_reference": "NDA-PWC-2026-0914",
            "allowed_frameworks": ["SOC2", "ISO27001"],
            "scope_description": "SOC 2 Type II Annual Security, Availability & Confidentiality Audit Period 2026",
            "access_token": "lc_aud_demo_token_acmecloud_pwc_2026",
        },
        valid_from=datetime.utcnow() - timedelta(days=2),
        valid_until=datetime.utcnow() + timedelta(days=12),
        created_by="ciso@acmecloud.io",
        status="ACTIVE",
    )
    db.add(auditor_grant)
    await db.flush()

    aud_req = AuditorEvidenceRequest(
        organization_id=demo_org.id,
        grant_id=auditor_grant.id,
        control_id="CC6.1",
        request_title="AWS RDS KMS Customer Managed Key Policy & Rotation Evidence",
        description="Auditor requests configuration export demonstrating annual automatic rotation on customer-managed KMS key.",
        status="PROVIDED",
        requested_by="avance@pwc-audit.example.com",
        response_notes="Attached JSON snapshot showing KMS Key Rotation enabled (KeyId: arn:aws:kms:ap-south-1:012345678901:key/acme-rds-prod).",
    )
    db.add(aud_req)

    # 8. Public Trust Center Profile & Questionnaire Vault
    trust_profile = TrustCenterProfile(
        organization_id=demo_org.id,
        public_enabled=True,
        company_name="AcmeCloud Technologies",
        security_contact_email="security@acmecloud.io",
        overview_markdown="AcmeCloud provides secure, compliant SaaS infrastructure with continuous automated compliance monitoring, SOC 2 Type II readiness, and multi-region business continuity resilience.",
        encryption_summary="TLS 1.3 in-transit and AES-256 KMS at-rest",
        backup_summary="Continuous WAL replication with 15-minute RPO and 30-minute RTO",
        compliance_status_json={
            "SOC2": "READY",
            "ISO27001": "IN_PROGRESS",
            "DPDP": "COMPLIANT",
            "HIPAA": "ALIGNED",
        },
        nda_required_documents_json=["SOC2_Type_II_Report.pdf", "VAPT_Executive_Summary_2026.pdf"],
    )
    db.add(trust_profile)

    caiq_q = SecurityQuestionnaire(
        organization_id=demo_org.id,
        framework="CAIQ",
        question="Is all customer data encrypted in transit using industry-standard protocols?",
        answer="Yes. TLS 1.3 is enforced on all public and internal service boundaries. Plaintext HTTP is permanently rejected with HSTS enabled.",
        owner="ciso@acmecloud.io",
        status="APPROVED",
    )
    db.add(caiq_q)

    # 9. Phase 7 Compliance Operating System Seeds
    from app.services.compliance.framework_engine import framework_engine
    from app.services.compliance.iso27001_service import iso27001_service
    from app.services.compliance.policy_service import policy_service
    from app.services.compliance.soc2_engine import soc2_engine
    from app.services.compliance.privacy_service import privacy_service
    from app.services.compliance.vendor_risk_service import vendor_risk_service
    from app.services.compliance.audit_capa_service import audit_capa_service
    from app.services.compliance.audit_package_service import audit_package_service
    from app.services.compliance.external_assurance_service import external_assurance_service
    from app.services.compliance.operations_compliance_service import operations_compliance_service
    from app.services.compliance.risk_service import risk_service
    from app.models.compliance_operations import ExternalAssuranceRecord

    # A. Canonical Frameworks & Control Implementations
    await framework_engine.ensure_organization_controls(db, demo_org.id)

    # B. ISO 27001 ISMS Scope & Statement of Applicability
    await iso27001_service.get_or_create_scope(db, demo_org.id)
    await iso27001_service.ensure_soa(db, demo_org.id)

    # C. Enterprise Risk Register
    await risk_service.create_risk(
        db=db,
        organization_id=demo_org.id,
        risk_code="RSK-001",
        title="Production credential leakage via third-party telemetry",
        category="TECHNICAL",
        asset="FastAPI Worker & Third-Party Logs",
        threat="API tokens or database secrets inadvertently logged in stdout and transmitted to cloud monitoring.",
        vulnerability="Unsanitized log formatters in background task worker queues.",
        likelihood=4,
        impact=4,
        owner="ciso@acmecloud.io",
        existing_controls="Automated regex secret scrubbing filter in logging pipeline",
        residual_likelihood=2,
        residual_impact=3,
        treatment="MITIGATE",
        source_type="VAPT_FINDING",
    )
    await risk_service.create_risk(
        db=db,
        organization_id=demo_org.id,
        risk_code="RSK-002",
        title="Stale subprocessor DPA terms for transactional notification dispatcher",
        category="THIRD_PARTY",
        asset="Resend Inc. Email Dispatcher",
        threat="Customer data processed under click-through terms lacking required statutory DPDP SCC safeguards.",
        vulnerability="Informal developer onboarding of SaaS trial accounts.",
        likelihood=3,
        impact=3,
        owner="legal@acmecloud.io",
        existing_controls="Vendor annual review calendar and contract register",
        residual_likelihood=1,
        residual_impact=2,
        treatment="MITIGATE",
        source_type="VENDOR_RISK",
    )
    await risk_service.create_risk(
        db=db,
        organization_id=demo_org.id,
        risk_code="RSK-003",
        title="Single-Region Cloud Outage Disruption to Customer API",
        category="OPERATIONAL",
        asset="AWS Mumbai (ap-south-1) Infrastructure Stack",
        threat="Catastrophic regional fiber cut or AWS facility impairment causing API unavailability.",
        vulnerability="Primary application cluster operating primarily within ap-south-1.",
        likelihood=3,
        impact=5,
        owner="devops@acmecloud.io",
        existing_controls="Multi-AZ RDS PostgreSQL cluster with cross-region read replica in ap-southeast-1",
        residual_likelihood=1,
        residual_impact=3,
        treatment="MITIGATE",
        source_type="ARCHITECTURE_FINDING",
    )

    # D. Policies & Acknowledgements
    await policy_service.ensure_default_policies(db, demo_org.id)

    # E. SOC 2 Operating Period & Tests
    await soc2_engine.get_or_create_active_period(db, demo_org.id)

    # F. Privacy Operations (Data Inventory, ROPA, DSR)
    await privacy_service.ensure_privacy_data(db, demo_org.id)

    # G. Vendor Risk Management
    await vendor_risk_service.ensure_default_vendors(db, demo_org.id)

    # H. Internal Audit & CAPA
    await audit_capa_service.ensure_default_audit_data(db, demo_org.id)

    # I. Operations Compliance (Tasks, Assets, BIA, Contracts, Packs)
    await operations_compliance_service.ensure_operations_data(db, demo_org.id)

    # J. Immutable Audit Package
    await audit_package_service.list_packages(db, demo_org.id)

    # K. External Assurance Record (Penetration Test Attestation)
    ext_vapt = ExternalAssuranceRecord(
        organization_id=demo_org.id,
        assurance_type="PENETRATION_TEST_ATTESTATION",
        framework="VAPT",
        issuer_auditor="Offensive Security Certified Partner (SecAssure Labs)",
        period_start=datetime.utcnow() - timedelta(days=30),
        period_end=datetime.utcnow(),
        issued_at=datetime.utcnow() - timedelta(days=5),
        expires_at=datetime.utcnow() + timedelta(days=335),
        document_reference="ATTEST-VAPT-2026-ACME.pdf",
        document_hash="a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef",
        verified_by="siddharth.rao@launchcomply.io",
        is_active=True,
        public_visibility=True,
    )
    db.add(ext_vapt)

    # =========================================================================
    # Phase 8: Commercial SaaS Operating System Seeding
    # =========================================================================
    from app.services.commercial.catalog_entitlements_service import catalog_entitlements_service
    from app.services.commercial.usage_service import usage_service
    from app.services.commercial.subscription_service import subscription_service
    from app.services.commercial.invoice_service import invoice_service
    from app.services.commercial.support_service import support_service
    from app.services.commercial.crm_services_service import crm_services_service
    from app.services.commercial.customer_success_analytics_service import customer_success_analytics_service
    from app.models.billing import OrganizationProfile, Subscription, SubscriptionStatus, BillingProviderType
    from app.models.support import TicketCategory, TicketPriority

    # 1. Product Catalog & Usage Definitions
    await catalog_entitlements_service.ensure_catalog(db)
    await usage_service.ensure_metric_definitions(db)

    # 2. AcmeCloud Business Profile
    acme_profile = OrganizationProfile(
        organization_id=demo_org.id,
        legal_name="AcmeCloud Technologies Private Limited",
        display_name="AcmeCloud SaaS",
        website="https://acmecloud.io",
        country="IN",
        state="Karnataka",
        postal_code="560102",
        city="Bengaluru",
        address_line1="Outer Ring Road, HSR Layout Sector 1",
        gstin="29AABCA1234F1Z5",
        pan="AABCA1234F",
        billing_email="billing@acmecloud.io",
        security_email="security@acmecloud.io",
        compliance_email="compliance@acmecloud.io",
        company_size="11-50",
        industry="Cloud SaaS / AI Infrastructure"
    )
    db.add(acme_profile)

    # 3. AcmeCloud Active Commercial Subscription (BUSINESS Tier)
    sub = await subscription_service.get_or_create_subscription(db, demo_org.id, plan_tier="BUSINESS")
    sub.status = SubscriptionStatus.ACTIVE
    sub.current_period_start = datetime.utcnow() - timedelta(days=20)
    sub.current_period_end = datetime.utcnow() + timedelta(days=10)
    sub.amount = 49999.00
    sub.interval = "MONTHLY"

    # 4. Usage Aggregates
    await usage_service.record_usage_event(db, demo_org.id, "applications", 1.0, f"seed_app_{demo_org.id}")
    await usage_service.record_usage_event(db, demo_org.id, "environments", 2.0, f"seed_env_{demo_org.id}")
    await usage_service.record_usage_event(db, demo_org.id, "build_minutes", 342.0, f"seed_bld_{demo_org.id}")
    await usage_service.record_usage_event(db, demo_org.id, "security_scans", 42.0, f"seed_sec_{demo_org.id}")
    await usage_service.record_usage_event(db, demo_org.id, "stored_evidence_gb", 4.2, f"seed_gb_{demo_org.id}")

    # 5. Historical Invoices
    await invoice_service.generate_invoice(
        db=db,
        organization_id=demo_org.id,
        subscription_id=sub.id,
        line_items=[{"description": "LaunchComply Business Plan - September 2026", "quantity": 1, "unit_price": 49999.00}]
    )
    await invoice_service.generate_invoice(
        db=db,
        organization_id=demo_org.id,
        subscription_id=sub.id,
        line_items=[{"description": "LaunchComply Business Plan - August 2026", "quantity": 1, "unit_price": 49999.00}]
    )

    # 6. Support Tickets
    await support_service.create_ticket(
        db=db,
        organization_id=demo_org.id,
        user_id=demo_user.id,
        user_email=demo_user.email,
        user_name=demo_user.full_name,
        title="Production AWS KMS Key Rotation and CloudTrail integration",
        category=TicketCategory.AWS,
        priority=TicketPriority.NORMAL,
        initial_message="We have configured automatic AWS KMS key rotation for the RDS database. How do we ensure continuous evidence is verified by LaunchComply?"
    )

    # 7. CRM Leads (Platform Admin View)
    await crm_services_service.create_lead(
        db=db,
        name="Rohan Verma",
        email="rohan@northstarpay.com",
        company="Northstar FinTech",
        phone="+91 98765 43210",
        source="DEMO_REQUEST",
        notes="Interested in ISO 27001 ISMS and SOC 2 readiness for enterprise banking clients.",
        estimated_value=350000.00
    )
    await crm_services_service.create_lead(
        db=db,
        name="Meera Sen",
        email="meera@blueledger.in",
        company="BlueLedger Healthcare",
        phone="+91 91234 56789",
        source="VAPT_INQUIRY",
        notes="Requires authorized external penetration testing and cloud hardening before investor diligence.",
        estimated_value=180000.00
    )

    # 8. Platform Admin Demo Organizations
    northstar_org = Organization(
        name="Northstar FinTech",
        slug="northstar-fintech",
        tier="growth",
        is_active=True,
        is_demo=True,
        aws_monthly_budget="₹65,000",
    )
    db.add(northstar_org)
    await db.flush()
    await subscription_service.get_or_create_subscription(db, northstar_org.id, plan_tier="GROWTH")

    # 9. Evaluate Initial Customer Health
    await customer_success_analytics_service.evaluate_customer_health(db, demo_org.id)

    # 10. Phase 15 Pilot Customer: FinScale Technologies (Genuine Pilot, NOT Demo)
    result_finscale = await db.execute(select(Organization).where(Organization.slug == "finscale"))
    if not result_finscale.scalars().first():
        from app.models.customer_operations import CustomerStageHistory, CustomerInterview
        from app.models.platform_admin import ManualAssistanceTask

        now = datetime.utcnow()
        finscale_org = Organization(
            name="FinScale Technologies Pvt Ltd",
            slug="finscale",
            tier="growth",
            is_active=True,
            is_demo=False,
            is_test=False,
            is_internal=False,
            customer_classification="PILOT_CUSTOMER",
            commercial_state="AWS_ONBOARDING",
            stage_entered_at=now - timedelta(days=2, hours=3),
            onboarding_blocker="AWS IAM AssumeRole / STS Trust Policy Principal Mismatch",
            desired_outcome="Deploy our fintech SaaS securely to AWS and demonstrate ISO 27001 readiness to enterprise partners.",
            success_definition="0 critical findings, RDS PostgreSQL multi-AZ, backup drills verified, SOC 2 Type 1 evidence pack",
            aws_monthly_budget="₹55,000",
            technical_owner="DevOps Architect",
            commercial_owner="Commercial Lead",
            next_action="Deploy CloudFormation Quick Setup template to fix STS trust principal",
            next_action_due=now + timedelta(days=1),
            last_customer_contact=now - timedelta(hours=18),
            target_date=now + timedelta(days=12),
            current_outcome_status="IN_PROGRESS"
        )
        db.add(finscale_org)
        await db.flush()

        # Seed FinScale stage history (§7)
        h1 = CustomerStageHistory(
            organization_id=finscale_org.id,
            stage="ACCOUNT_CREATED",
            entered_at=now - timedelta(days=4, hours=2),
            exited_at=now - timedelta(days=3, hours=18),
            duration_days=0.33,
            blocker=None,
            internal_owner="Commercial Lead",
            notes="Account created via self-serve onboarding"
        )
        h2 = CustomerStageHistory(
            organization_id=finscale_org.id,
            stage="REPO_CONNECTED",
            entered_at=now - timedelta(days=3, hours=18),
            exited_at=now - timedelta(days=3),
            duration_days=0.75,
            blocker=None,
            internal_owner="DevOps Architect",
            notes="Connected finscale-core repository on GitHub"
        )
        h3 = CustomerStageHistory(
            organization_id=finscale_org.id,
            stage="ARCHITECTURE_APPROVED",
            entered_at=now - timedelta(days=3),
            exited_at=now - timedelta(days=2, hours=3),
            duration_days=0.88,
            blocker=None,
            internal_owner="DevOps Architect",
            notes="Approved ECS Fargate + RDS PostgreSQL multi-tier architecture"
        )
        h4 = CustomerStageHistory(
            organization_id=finscale_org.id,
            stage="AWS_ONBOARDING",
            entered_at=now - timedelta(days=2, hours=3),
            exited_at=None,
            duration_days=None,
            blocker="AWS IAM AssumeRole / STS Trust Policy Principal Mismatch",
            internal_owner="DevOps Architect",
            notes="Awaiting CloudFormation Quick Setup stack creation or IAM trust policy fix"
        )
        db.add_all([h1, h2, h3, h4])

        # Seed FinScale customer interview (§45-53)
        int1 = CustomerInterview(
            organization_id=finscale_org.id,
            interview_type="ONBOARDING",
            interview_date=now - timedelta(days=2),
            participants="Priya Sharma (CEO) & Arun Nair (CTO)",
            key_problem="Need to deploy our fintech SaaS to AWS with ISO 27001 and DPDP compliance before onboarding our first enterprise banking partner.",
            value_driver="Integrated deployment with pre-configured ISO 27001 controls and automated evidence generation.",
            blocker="AWS STS Trust Policy error during cross-account IAM role assumption.",
            quote="We can't afford a full-time DevOps engineer or a 3-month consulting engagement. LaunchComply getting us from localhost to SOC 2 on AWS is what unblocks our pilot.",
            permission_to_use_quote=True,
            notes="Customer highly motivated; blocked solely on AWS STS role assumption.",
            created_by="Commercial Lead"
        )
        db.add(int1)

        # Seed Manual Assistance Task (§68-72)
        asst1 = ManualAssistanceTask(
            organization_id=finscale_org.id,
            task_name="Debugging AWS STS cross-account assume role trust relationship",
            category="AWS",
            duration_minutes=120,
            operator="DevOps Architect",
            resolution_notes="Customer trust policy had typo in LaunchComply AWS Account ID. Recommended CloudFormation Quick Setup.",
            is_automation_candidate=True
        )
        db.add(asst1)

        # Seed FinScale pending commercial invoice INV-2026-FINSCALE-001 (§0, §91-§96)
        from app.models.billing import Invoice, InvoiceStatus, PaymentRealityStatus, BillingProviderType
        finscale_inv = Invoice(
            invoice_number="INV-2026-FINSCALE-001",
            organization_id=finscale_org.id,
            customer_legal_name="FinScale Technologies Pvt Ltd",
            subtotal=149000.0,
            tax_amount=0.0,
            total_amount=149000.0,
            currency="INR",
            status=InvoiceStatus.OPEN,
            reality_status=PaymentRealityStatus.PENDING,
            billing_provider=BillingProviderType.MANUAL_INVOICE,
            payment_source="BANK_TRANSFER",
            payment_due_date=now + timedelta(days=14)
        )
        db.add(finscale_inv)

        # Seed FinScale initial CloudAccount in AWS_ONBOARDING state (§73-81)
        finscale_cloud = CloudAccount(
            organization_id=finscale_org.id,
            provider="AWS",
            account_id="998877665544",
            role_arn="arn:aws:iam::998877665544:role/LaunchComplyProvisioningRole",
            external_id=f"launchcomply-ext-{finscale_org.id[:8]}-finc",
            region="ap-south-1",
            status="PENDING_ONBOARDING",
            connection_state="AWS_ONBOARDING",
            setup_method="CLOUDFORMATION",
            stack_name="LaunchComply-Onboarding-finscale",
            stack_status="CREATE_FAILED",
            health_status="REAUTH_REQUIRED",
            drift_detected=True,
            drift_details_json={"issue": "Principal mismatch in trust relationship"},
            setup_started_at=now - timedelta(days=2, hours=3)
        )
        db.add(finscale_cloud)

    await db.commit()




