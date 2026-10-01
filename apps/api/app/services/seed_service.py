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

async def seed_initial_data(db: AsyncSession):
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

    await db.commit()

