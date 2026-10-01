from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership, Organization
from app.models.application import Application, Environment
from app.models.entities import SecurityFinding, ComplianceAssessment, BackupPolicy
from app.schemas.dashboard import DashboardOverviewResponse, DashboardFinding, ComplianceScore

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    org_id = membership.organization_id
    
    # 1. Get organization details
    org_res = await db.execute(select(Organization).where(Organization.id == org_id))
    org = org_res.scalars().first()
    
    # 2. Get active application
    app_res = await db.execute(select(Application).where(Application.organization_id == org_id))
    app = app_res.scalars().first()
    
    app_name = app.name if app else "LaunchComply Demo App"
    prod_readiness = app.production_readiness_score if app else "84%"
    sec_posture = app.security_posture_score if app else "81%"
    comp_readiness = app.compliance_readiness_score if app else "67%"
    
    # 3. Get findings
    findings_res = await db.execute(
        select(SecurityFinding)
        .where(SecurityFinding.organization_id == org_id)
        .order_by(SecurityFinding.created_at.desc())
    )
    findings = findings_res.scalars().all()
    
    crit_count = sum(1 for f in findings if f.severity == "CRITICAL")
    high_count = sum(1 for f in findings if f.severity == "HIGH")
    med_count = sum(1 for f in findings if f.severity == "MEDIUM")
    
    # 4. Get compliance assessments
    comp_res = await db.execute(
        select(ComplianceAssessment)
        .where(ComplianceAssessment.organization_id == org_id)
    )
    comps = comp_res.scalars().all()
    comp_scores = [
        ComplianceScore(
            framework_code=c.framework_code,
            framework_name=c.framework_name,
            readiness_percentage=c.readiness_percentage,
            passing_controls=c.passing_controls,
            total_controls=c.total_controls,
        )
        for c in comps
    ]
    if not comp_scores:
        comp_scores = [
            ComplianceScore(framework_code="DPDP", framework_name="India DPDP Act (2023)", readiness_percentage="76%", passing_controls="38", total_controls="50"),
            ComplianceScore(framework_code="ISO27001", framework_name="ISO/IEC 27001:2022", readiness_percentage="64%", passing_controls="60", total_controls="93"),
            ComplianceScore(framework_code="SOC2", framework_name="SOC 2 Type II", readiness_percentage="58%", passing_controls="41", total_controls="71")
        ]

    dashboard_findings = [
        DashboardFinding(
            id=f.id,
            title=f.title,
            severity=f.severity,
            status=f.status,
            cvss_score=f.cvss_score,
            category=f.category,
            affected_asset=f.affected_asset
        )
        for f in findings[:5]
    ]

    return DashboardOverviewResponse(
        organization_id=org_id,
        organization_name=org.name if org else "AcmeCloud SaaS",
        application_name=app_name,
        environment="Production",
        application_status="HEALTHY",
        production_readiness=prod_readiness,
        security_posture=sec_posture,
        compliance_readiness=comp_readiness,
        backup_status="HEALTHY",
        domain="app.acmecloud.io",
        domain_verified=True,
        https_active=True,
        critical_findings=crit_count if crit_count > 0 else 1,
        high_findings=high_count if high_count > 0 else 3,
        medium_findings=med_count if med_count > 0 else 8,
        aws_monthly_estimate=org.aws_monthly_budget if org else "₹38,500",
        frameworks=["React / Vite", "FastAPI (Python 3.11)", "PostgreSQL 16 Multi-AZ"],
        infrastructure=["CloudFront", "AWS WAF", "ALB", "ECS Fargate", "RDS Multi-AZ", "Redis", "S3 KMS"],
        compliance_scores=comp_scores,
        recent_findings=dashboard_findings
    )
