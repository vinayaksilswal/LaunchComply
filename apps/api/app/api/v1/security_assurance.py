"""Phase 6 Security Assurance, Authorized VAPT, DR, & Auditor Trust Portal API Router."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.demo_boundary import require_demo_result_engine
from app.core.permissions import require_permission
from app.core.audit import log_audit_event
from app.models.auth import OrganizationMembership
from app.models.security_assurance import (
    SecurityAssessmentScope,
    SecurityAsset,
    SecurityAuthorization,
    SecurityExclusion,
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
from app.models.entities import SecurityFinding, VAPTProject
from app.schemas.security_assurance import (
    SecurityAssessmentScopeCreate,
    SecurityAssessmentScopeResponse,
    SecurityAssetCreate,
    SecurityAssetResponse,
    AuthorizeScopeRequest,
    SecurityAuthorizationResponse,
    SecurityExclusionCreate,
    SecurityExclusionResponse,
    TriggerAssessmentRequest,
    SecurityAssessmentResponse,
    SecurityFindingResponse,
    AcceptRiskRequest,
    SecurityRiskAcceptanceResponse,
    RetestFindingResponse,
    GenerateRemediationRequest,
    RemediationPullRequestResponse,
    ReviewRemediationRequest,
    VAPTEngagementCreate,
    VAPTEngagementResponse,
    DisasterRecoveryPlanCreate,
    DisasterRecoveryPlanResponse,
    TriggerDRDrillRequest,
    DisasterRecoveryDrillResponse,
    AuditorAccessGrantCreate,
    AuditorAccessGrantResponse,
    AuditorAccessGrantWithTokenResponse,
    AuditorEvidenceRequestCreate,
    AuditorEvidenceRequestResponse,
    FulfillEvidenceRequest,
    TrustCenterProfileUpdate,
    TrustCenterProfileResponse,
    SecurityQuestionnaireCreate,
    SecurityQuestionnaireResponse,
)
from app.services.security_assurance import (
    ScopeManager,
    FindingManager,
    AIRemediationEngine,
    VAPTEngagementService,
    MultiRegionDREngine,
    AuditorPortalService,
    TrustCenterService,
    validate_target_url,
)
from app.services.security_assurance.scanner_provider import (
    SASTScanner,
    SCAScanner,
    SecretScanner,
    ContainerSecurityScanner,
    CloudConfigurationScanner,
    TLSScanner,
    DASTScanner,
    APISecurityScanner,
)

def require_observed_security_results(request: Request):
    if request.method != "GET" and (
        request.url.path.endswith(("/assessments/trigger", "/retest", "/remediation/generate", "/report", "/dr/drills"))
        or "/remediation-prs/" in request.url.path
    ):
        require_demo_result_engine()


router = APIRouter(prefix="/security", tags=["Security Assurance & VAPT"], dependencies=[Depends(require_observed_security_results)])

scope_mgr = ScopeManager()
finding_mgr = FindingManager()
remediation_engine = AIRemediationEngine()
vapt_service = VAPTEngagementService()
dr_engine = MultiRegionDREngine()
auditor_service = AuditorPortalService()
trust_service = TrustCenterService()


# =========================================================================
# 1. SCOPES & AUTHORIZATION
# =========================================================================

@router.post("/scopes", response_model=SecurityAssessmentScopeResponse)
async def create_scope(
    payload: SecurityAssessmentScopeCreate,
    membership: OrganizationMembership = Depends(require_permission("security.write")),
    db: AsyncSession = Depends(get_db),
):
    actor_email = getattr(membership.user, "email", "security@launchcomply.io") if membership.user else "security@launchcomply.io"
    scope = await scope_mgr.create_scope(
        db=db,
        organization_id=membership.organization_id,
        application_id=payload.application_id or "",
        environment_id=payload.environment_id or "",
        name=payload.name,
        requested_by=actor_email,
        rules_of_engagement=str(payload.rules_of_engagement or {}),
    )
    # Add initial assets if provided
    if payload.assets:
        for a in payload.assets:
            await scope_mgr.add_asset(
                db=db,
                scope_id=scope.id,
                organization_id=membership.organization_id,
                asset_type=a.asset_type,
                target_url_or_id=a.identifier,
                criticality=a.criticality,
                verification_method=a.verification_method or "AUTOMATED_DNS",
            )
    stmt = select(SecurityAssessmentScope).where(SecurityAssessmentScope.id == scope.id)
    res = await db.execute(stmt)
    return res.scalars().first()


@router.get("/scopes", response_model=List[SecurityAssessmentScopeResponse])
async def list_scopes(
    membership: OrganizationMembership = Depends(require_permission("security.read")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SecurityAssessmentScope).where(
        SecurityAssessmentScope.organization_id == membership.organization_id
    ).order_by(SecurityAssessmentScope.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.post("/scopes/{scope_id}/assets", response_model=SecurityAssetResponse)
async def add_asset_to_scope(
    scope_id: str,
    payload: SecurityAssetCreate,
    membership: OrganizationMembership = Depends(require_permission("security.write")),
    db: AsyncSession = Depends(get_db),
):
    try:
        asset = await scope_mgr.add_asset(
            db=db,
            scope_id=scope_id,
            organization_id=membership.organization_id,
            asset_type=payload.asset_type,
            target_url_or_id=payload.identifier,
            criticality=payload.criticality,
            verification_method=payload.verification_method or "AUTOMATED_DNS",
        )
        return asset
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/scopes/{scope_id}/authorize", response_model=SecurityAuthorizationResponse)
async def authorize_scope(
    scope_id: str,
    payload: AuthorizeScopeRequest,
    membership: OrganizationMembership = Depends(require_permission("security.execute")),
    db: AsyncSession = Depends(get_db),
):
    try:
        auth = await scope_mgr.authorize_scope(
            db=db,
            scope_id=scope_id,
            organization_id=membership.organization_id,
            authorized_by_email=payload.authorizer_email,
            valid_days=payload.valid_days,
            terms_hash="TERMS_v1_OWASP_ROE_ACCEPTED",
        )
        return auth
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/scopes/{scope_id}/exclusions", response_model=SecurityExclusionResponse)
async def add_exclusion_to_scope(
    scope_id: str,
    payload: SecurityExclusionCreate,
    membership: OrganizationMembership = Depends(require_permission("security.write")),
    db: AsyncSession = Depends(get_db),
):
    try:
        ex = await scope_mgr.add_exclusion(
            db=db,
            scope_id=scope_id,
            organization_id=membership.organization_id,
            pattern=payload.pattern,
            reason=payload.reason,
            actor_email=payload.approved_by,
        )
        return ex
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================================================================
# 2. SECURITY ASSESSMENTS & SCANS
# =========================================================================

@router.post("/assessments/trigger", response_model=SecurityAssessmentResponse)
async def trigger_assessment(
    payload: TriggerAssessmentRequest,
    membership: OrganizationMembership = Depends(require_permission("security.execute")),
    db: AsyncSession = Depends(get_db),
):
    """Triggers an authorized assessment run. Verifies active legal authorization prior to scan execution."""
    stmt = select(SecurityAssessmentScope).where(
        SecurityAssessmentScope.id == payload.scope_id,
        SecurityAssessmentScope.organization_id == membership.organization_id,
    )
    res = await db.execute(stmt)
    scope = res.scalars().first()
    if not scope:
        raise HTTPException(status_code=404, detail="Scope not found")

    is_authorized, auth_reason = await scope_mgr.verify_authorization(db, scope.id)
    if not is_authorized:
        raise HTTPException(
            status_code=403,
            detail=f"Security assessment blocked: {auth_reason}. Explicit authorized consent required.",
        )

    # Initialize assessment record
    assessment = SecurityAssessment(
        organization_id=membership.organization_id,
        scope_id=scope.id,
        assessment_type=payload.assessment_type,
        target_environment=payload.target_environment,
        status="RUNNING",
        started_at=datetime.utcnow(),
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)

    # Dispatch scanners based on assessment_type
    target_url = "https://app.launchcomply.io"
    target_repo = "launchcomply/apps"
    target_image = "launchcomply/api:latest"
    if scope.assets:
        target_url = scope.assets[0].identifier

    raw_findings = []
    scanners_to_run = []
    atype = payload.assessment_type.upper()

    if atype in ("SAST", "FULL_ASSESSMENT"):
        scanners_to_run.append(SASTScanner())
    if atype in ("SCA", "FULL_ASSESSMENT"):
        scanners_to_run.append(SCAScanner())
    if atype in ("SECRET", "FULL_ASSESSMENT"):
        scanners_to_run.append(SecretScanner())
    if atype in ("CONTAINER", "FULL_ASSESSMENT"):
        scanners_to_run.append(ContainerSecurityScanner())
    if atype in ("CLOUD_CONFIG", "FULL_ASSESSMENT"):
        scanners_to_run.append(CloudConfigurationScanner())
    if atype in ("TLS", "FULL_ASSESSMENT"):
        scanners_to_run.append(TLSScanner())
    if atype in ("DAST", "FULL_ASSESSMENT"):
        scanners_to_run.append(DASTScanner())
    if atype in ("API_SECURITY", "FULL_ASSESSMENT"):
        scanners_to_run.append(APISecurityScanner())

    for scanner in scanners_to_run:
        target = target_repo if "repo" in scanner.scanner_name.lower() or "sast" in scanner.scanner_name.lower() else target_url
        if "container" in scanner.scanner_name.lower():
            target = target_image
        findings = await scanner.scan(target)
        raw_findings.extend(findings)

    # Ingest and deduplicate findings
    crit_count = 0
    high_count = 0
    med_count = 0
    low_count = 0

    for rf in raw_findings:
        sev = (rf.severity or "MEDIUM").upper()
        if sev == "CRITICAL":
            crit_count += 1
        elif sev == "HIGH":
            high_count += 1
        elif sev == "MEDIUM":
            med_count += 1
        else:
            low_count += 1

        await finding_mgr.ingest_finding(
            db=db,
            raw=rf,
            organization_id=membership.organization_id,
            application_id=scope.application_id or "",
            environment_id=scope.environment_id or "",
            assessment_id=assessment.id,
        )

    assessment.status = "COMPLETED"
    assessment.completed_at = datetime.utcnow()
    assessment.findings_count_critical = crit_count
    assessment.findings_count_high = high_count
    assessment.findings_count_medium = med_count
    assessment.findings_count_low = low_count
    assessment.execution_summary = {
        "scanners_executed": [s.scanner_name for s in scanners_to_run],
        "total_raw_findings": len(raw_findings),
        "target_url": target_url,
    }
    await db.commit()
    await db.refresh(assessment)
    return assessment


@router.get("/assessments", response_model=List[SecurityAssessmentResponse])
async def list_assessments(
    membership: OrganizationMembership = Depends(require_permission("security.read")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SecurityAssessment).where(
        SecurityAssessment.organization_id == membership.organization_id
    ).order_by(SecurityAssessment.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


# =========================================================================
# 3. FINDINGS, SLA & RETESTS
# =========================================================================

@router.get("/findings", response_model=List[SecurityFindingResponse])
async def list_findings(
    severity: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    sla_breached: Optional[bool] = Query(None),
    membership: OrganizationMembership = Depends(require_permission("security.read")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SecurityFinding).where(
        SecurityFinding.organization_id == membership.organization_id
    )
    if severity:
        stmt = stmt.where(SecurityFinding.severity == severity.upper())
    if status_filter:
        stmt = stmt.where(SecurityFinding.status == status_filter.upper())
    if sla_breached is not None:
        stmt = stmt.where(SecurityFinding.sla_breached == sla_breached)

    stmt = stmt.order_by(SecurityFinding.created_at.desc()).limit(100)
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.post("/findings/{finding_id}/accept-risk", response_model=SecurityRiskAcceptanceResponse)
async def accept_finding_risk(
    finding_id: str,
    payload: AcceptRiskRequest,
    membership: OrganizationMembership = Depends(require_permission("security.execute")),
    db: AsyncSession = Depends(get_db),
):
    actor_email = getattr(membership.user, "email", "security@launchcomply.io") if membership.user else "security@launchcomply.io"
    try:
        acceptance = await finding_mgr.accept_risk(
            db=db,
            finding_id=finding_id,
            organization_id=membership.organization_id,
            actor_email=actor_email,
            reason=payload.reason,
            justification=payload.justification_details,
            duration_days=payload.duration_days,
        )
        return acceptance
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/findings/{finding_id}/retest", response_model=RetestFindingResponse)
async def retest_finding(
    finding_id: str,
    membership: OrganizationMembership = Depends(require_permission("security.execute")),
    db: AsyncSession = Depends(get_db),
):
    actor_email = getattr(membership.user, "email", "security@launchcomply.io") if membership.user else "security@launchcomply.io"
    try:
        res = await finding_mgr.retest_finding(
            db=db,
            finding_id=finding_id,
            organization_id=membership.organization_id,
            actor_email=actor_email,
        )
        return RetestFindingResponse(
            finding_id=res["finding_id"],
            status=res["status"],
            retest_status=res["retest_status"],
            retest_result=res["retest_result"],
            retested_at=res["retested_at"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================================================================
# 4. AI-ASSISTED REMEDIATION
# =========================================================================

@router.post("/findings/{finding_id}/remediation/generate", response_model=RemediationPullRequestResponse)
async def generate_ai_remediation(
    finding_id: str,
    payload: GenerateRemediationRequest,
    membership: OrganizationMembership = Depends(require_permission("security.execute")),
    db: AsyncSession = Depends(get_db),
):
    actor_email = getattr(membership.user, "email", "security@launchcomply.io") if membership.user else "security@launchcomply.io"
    try:
        pr = await remediation_engine.create_remediation_pull_request(
            db=db,
            finding_id=finding_id,
            organization_id=membership.organization_id,
            actor_email=actor_email,
            target_repo="launchcomply/apps",
            target_branch=payload.target_repo_branch,
        )
        return pr
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/remediation-prs/{pr_id}/review", response_model=RemediationPullRequestResponse)
async def review_remediation_pr(
    pr_id: str,
    payload: ReviewRemediationRequest,
    membership: OrganizationMembership = Depends(require_permission("security.execute")),
    db: AsyncSession = Depends(get_db),
):
    actor_email = getattr(membership.user, "email", "security@launchcomply.io") if membership.user else "security@launchcomply.io"
    try:
        pr = await remediation_engine.review_remediation_pr(
            db=db,
            pr_id=pr_id,
            organization_id=membership.organization_id,
            actor_email=actor_email,
            approved=payload.approved,
            notes=payload.notes or "",
        )
        return pr
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================================================================
# 5. VAPT ENGAGEMENTS
# =========================================================================

@router.post("/vapt/engagements", response_model=VAPTEngagementResponse)
async def request_vapt_engagement(
    payload: VAPTEngagementCreate,
    membership: OrganizationMembership = Depends(require_permission("vapt.request")),
    db: AsyncSession = Depends(get_db),
):
    proj = await vapt_service.request_engagement(
        db=db,
        organization_id=membership.organization_id,
        application_id=payload.application_id or "",
        title=payload.name,
        scope_description=f"Authorized PTES/WSTG assessment for {payload.name}",
        lead_tester=payload.lead_tester,
    )
    return VAPTEngagementResponse(
        id=proj.id,
        organization_id=proj.organization_id,
        application_id=proj.application_id,
        environment_id=None,
        name=proj.title,
        engagement_type=payload.engagement_type,
        status=proj.status,
        start_date=payload.start_date,
        end_date=payload.end_date,
        lead_tester=payload.lead_tester,
        methodology=payload.methodology,
        report_hash=proj.report_hash,
        created_at=proj.created_at,
        updated_at=proj.updated_at,
    )


@router.get("/vapt/engagements", response_model=List[VAPTEngagementResponse])
async def list_vapt_engagements(
    membership: OrganizationMembership = Depends(require_permission("vapt.read")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(VAPTProject).where(
        VAPTProject.organization_id == membership.organization_id
    ).order_by(VAPTProject.created_at.desc())
    res = await db.execute(stmt)
    projects = res.scalars().all()
    return [
        VAPTEngagementResponse(
            id=p.id,
            organization_id=p.organization_id,
            application_id=p.application_id,
            environment_id=None,
            name=p.title,
            engagement_type="EXTERNAL_BLACK_BOX",
            status=p.status,
            start_date=p.created_at,
            end_date=p.updated_at,
            lead_tester="LaunchComply Security Team",
            methodology=p.methodology,
            report_hash=p.report_hash,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in projects
    ]


@router.post("/vapt/engagements/{project_id}/report")
async def generate_vapt_report(
    project_id: str,
    membership: OrganizationMembership = Depends(require_permission("vapt.execute")),
    db: AsyncSession = Depends(get_db),
):
    try:
        report = await vapt_service.generate_audit_report(
            db=db,
            project_id=project_id,
            organization_id=membership.organization_id,
        )
        return report
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================================================================
# 6. DISASTER RECOVERY & CROSS-REGION DRILLS
# =========================================================================

@router.get("/dr/plan", response_model=DisasterRecoveryPlanResponse)
async def get_dr_plan(
    environment_id: str = Query(...),
    membership: OrganizationMembership = Depends(require_permission("dr.read")),
    db: AsyncSession = Depends(get_db),
):
    plan = await dr_engine.get_or_create_plan(
        db=db,
        organization_id=membership.organization_id,
        application_id="",
        environment_id=environment_id,
    )
    return plan


@router.post("/dr/drills", response_model=DisasterRecoveryDrillResponse)
async def trigger_dr_drill(
    plan_id: str,
    payload: TriggerDRDrillRequest,
    membership: OrganizationMembership = Depends(require_permission("dr.execute")),
    db: AsyncSession = Depends(get_db),
):
    actor_email = getattr(membership.user, "email", "security@launchcomply.io") if membership.user else "security@launchcomply.io"
    try:
        drill = await dr_engine.execute_dr_drill(
            db=db,
            plan_id=plan_id,
            organization_id=membership.organization_id,
            actor_email=actor_email,
            drill_type=payload.drill_type,
        )
        return drill
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/dr/drills", response_model=List[DisasterRecoveryDrillResponse])
async def list_dr_drills(
    plan_id: Optional[str] = Query(None),
    membership: OrganizationMembership = Depends(require_permission("dr.read")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(DisasterRecoveryDrill).where(
        DisasterRecoveryDrill.organization_id == membership.organization_id
    )
    if plan_id:
        stmt = stmt.where(DisasterRecoveryDrill.plan_id == plan_id)
    stmt = stmt.order_by(DisasterRecoveryDrill.started_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


# =========================================================================
# 7. AUDITOR ACCESS GRANTS & PORTAL
# =========================================================================

@router.post("/auditor/grants", response_model=AuditorAccessGrantWithTokenResponse)
async def create_auditor_grant(
    payload: AuditorAccessGrantCreate,
    membership: OrganizationMembership = Depends(require_permission("auditor.grant")),
    db: AsyncSession = Depends(get_db),
):
    actor_email = getattr(membership.user, "email", "compliance@launchcomply.io") if membership.user else "compliance@launchcomply.io"
    grant, raw_token = await auditor_service.create_access_grant(
        db=db,
        organization_id=membership.organization_id,
        auditor_name=payload.auditor_name,
        auditor_email=payload.auditor_email,
        auditing_firm=payload.auditing_firm,
        scope_description=payload.scope_description,
        created_by_user_id=membership.user_id,
        created_by_email=actor_email,
        duration_days=payload.duration_days,
        allowed_frameworks=payload.allowed_frameworks,
        nda_signed=payload.nda_signed,
        nda_reference=payload.nda_reference,
    )
    res_dict = {
        "id": grant.id,
        "organization_id": grant.organization_id,
        "auditor_name": grant.auditor_name,
        "auditor_email": grant.auditor_email,
        "auditing_firm": grant.auditing_firm,
        "scope_description": grant.scope_description,
        "expires_at": grant.expires_at,
        "allowed_frameworks": grant.allowed_frameworks,
        "nda_signed": grant.nda_signed,
        "nda_reference": grant.nda_reference,
        "is_active": grant.is_active,
        "last_accessed_at": grant.last_accessed_at,
        "created_at": grant.created_at,
        "raw_access_token": raw_token,
    }
    return AuditorAccessGrantWithTokenResponse(**res_dict)


@router.get("/auditor/grants", response_model=List[AuditorAccessGrantResponse])
async def list_auditor_grants(
    membership: OrganizationMembership = Depends(require_permission("auditor.grant")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AuditorAccessGrant).where(
        AuditorAccessGrant.organization_id == membership.organization_id
    ).order_by(AuditorAccessGrant.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.delete("/auditor/grants/{grant_id}")
async def revoke_auditor_grant(
    grant_id: str,
    reason: str = Query("Auditor access engagement completed"),
    membership: OrganizationMembership = Depends(require_permission("auditor.grant")),
    db: AsyncSession = Depends(get_db),
):
    actor_email = getattr(membership.user, "email", "compliance@launchcomply.io") if membership.user else "compliance@launchcomply.io"
    try:
        grant = await auditor_service.revoke_grant(
            db=db,
            grant_id=grant_id,
            revoked_by_user_id=membership.user_id,
            revoked_by_email=actor_email,
            reason=reason,
        )
        return {"status": "REVOKED", "grant_id": grant.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/auditor/portal/{raw_token}")
async def view_auditor_portal(
    raw_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Scoped, read-only auditor portal access. Secrets permanently redacted."""
    try:
        grant = await auditor_service.validate_grant_token(db, raw_token)
        package = await auditor_service.get_auditor_evidence_package(db, grant)
        return package
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/auditor/portal/{raw_token}/requests", response_model=AuditorEvidenceRequestResponse)
async def submit_auditor_evidence_request(
    raw_token: str,
    payload: AuditorEvidenceRequestCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        grant = await auditor_service.validate_grant_token(db, raw_token)
        req = await auditor_service.request_evidence(
            db=db,
            grant=grant,
            title=payload.title,
            description=payload.description,
            framework_control=payload.framework_control,
        )
        return req
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/auditor/requests/{request_id}/fulfill", response_model=AuditorEvidenceRequestResponse)
async def fulfill_auditor_evidence_request(
    request_id: str,
    payload: FulfillEvidenceRequest,
    membership: OrganizationMembership = Depends(require_permission("compliance.write")),
    db: AsyncSession = Depends(get_db),
):
    actor_email = getattr(membership.user, "email", "compliance@launchcomply.io") if membership.user else "compliance@launchcomply.io"
    try:
        req = await auditor_service.fulfill_evidence_request(
            db=db,
            request_id=request_id,
            fulfilled_by_user_id=membership.user_id,
            fulfilled_by_email=actor_email,
            response_notes=payload.response_notes,
            evidence_file_id=payload.evidence_file_id,
        )
        return req
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =========================================================================
# 8. TRUST CENTER & QUESTIONNAIRES
# =========================================================================

@router.get("/trust/profile", response_model=TrustCenterProfileResponse)
async def get_trust_profile(
    membership: OrganizationMembership = Depends(require_permission("security.read")),
    db: AsyncSession = Depends(get_db),
):
    profile = await trust_service.get_or_create_profile(db, membership.organization_id)
    return profile


@router.put("/trust/profile", response_model=TrustCenterProfileResponse)
async def update_trust_profile(
    payload: TrustCenterProfileUpdate,
    membership: OrganizationMembership = Depends(require_permission("security.write")),
    db: AsyncSession = Depends(get_db),
):
    actor_email = getattr(membership.user, "email", "security@launchcomply.io") if membership.user else "security@launchcomply.io"
    updates = payload.model_dump(exclude_unset=True)
    profile = await trust_service.update_profile(
        db=db,
        organization_id=membership.organization_id,
        user_id=membership.user_id,
        user_email=actor_email,
        updates=updates,
    )
    return profile


@router.get("/trust/public/{slug}")
async def get_public_trust_center(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Public unauthenticated endpoint displaying sanitized enterprise trust center data."""
    try:
        return await trust_service.get_public_trust_data(db, slug)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/trust/questionnaires", response_model=List[SecurityQuestionnaireResponse])
async def list_questionnaires(
    membership: OrganizationMembership = Depends(require_permission("security.read")),
    db: AsyncSession = Depends(get_db),
):
    return await trust_service.list_questionnaires(db, membership.organization_id)


@router.post("/trust/questionnaires", response_model=SecurityQuestionnaireResponse)
async def create_questionnaire(
    payload: SecurityQuestionnaireCreate,
    membership: OrganizationMembership = Depends(require_permission("security.write")),
    db: AsyncSession = Depends(get_db),
):
    q = await trust_service.create_or_update_questionnaire(
        db=db,
        organization_id=membership.organization_id,
        title=payload.title or payload.framework_type,
        framework_type=payload.framework_type,
        created_by_user_id=membership.user_id,
        answers=payload.answers,
    )
    return q
