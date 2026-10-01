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

    await db.commit()
