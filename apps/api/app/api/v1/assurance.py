"""Phase 11 Continuous Assurance, Audit Bots, Evidence Pipeline, Partner White-Label & Auditor Workpapers API."""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, desc

from app.core.database import get_db
from app.core.permissions import get_current_user, get_current_membership, require_permission
from app.models.auth import User, OrganizationMembership
from app.models.assurance import (
    AuditBot,
    AuditBotRun,
    AuditBotObservation,
    ContinuousControlMonitor,
    ContinuousControlStatus,
    ControlEvaluationHistory,
    EvidenceObservation,
    EvidenceIntegrityChain,
    PartnerCustomDomain,
    AuditorWorkpaper,
    EvidenceReviewThread,
    AuditorReviewStatus,
)
from app.models.compliance_framework import ControlException
from app.services.assurance import (
    AuditBotService,
    ContinuousControlService,
    EvidencePipelineService,
    PartnerWhiteLabelService,
    AuditorWorkspaceService,
)

router = APIRouter(prefix="/assurance", tags=["Continuous Assurance"])


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class EvaluateControlRequest(BaseModel):
    control_code: str
    status: ContinuousControlStatus
    reason: str
    evidence_code: Optional[str] = None
    trigger_event: str = "MANUAL_EVALUATION"


class RunBotRequest(BaseModel):
    simulated_failure: bool = False


class RegisterCustomDomainRequest(BaseModel):
    partner_id: str
    domain_name: str


class UpdateBrandingRequest(BaseModel):
    partner_id: str
    brand_name: str
    logo_url: Optional[str] = None
    primary_accent_color: str = "#06B6D4"


class CreateWorkpaperRequest(BaseModel):
    grant_id: str
    control_code: str
    workpaper_number: str
    framework: str = "SOC2"
    sampling_notes: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class UpdateWorkpaperStatusRequest(BaseModel):
    status: AuditorReviewStatus
    findings_notes: Optional[str] = None
    evidence_references: Optional[List[str]] = None


class AddReviewMessageRequest(BaseModel):
    author_role: str = "AUDITOR"
    message: str
    evidence_reference: Optional[str] = None


# ==========================================
# 1. CONTINUOUS ASSURANCE SUMMARY & MONITORS
# ==========================================

@router.get("/summary")
async def get_assurance_summary(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve aggregate continuous assurance posture, effectiveness percentage, and exception window metrics."""
    service = ContinuousControlService(db)
    return await service.get_assurance_summary(membership.organization_id)


@router.get("/controls")
async def get_monitored_controls(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """List all continuous control monitors with live effectiveness status and causal explanations."""
    result = await db.execute(
        select(ContinuousControlMonitor)
        .where(ContinuousControlMonitor.organization_id == membership.organization_id)
        .order_by(ContinuousControlMonitor.control_code)
    )
    monitors = result.scalars().all()
    return monitors


@router.post("/controls/evaluate")
async def evaluate_control(
    payload: EvaluateControlRequest,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Evaluate continuous control state and automatically update exception window and history."""
    service = ContinuousControlService(db)
    monitor, history, exc = await service.evaluate_control(
        organization_id=membership.organization_id,
        control_code=payload.control_code,
        new_status=payload.status,
        reason=payload.reason,
        evidence_code=payload.evidence_code,
        trigger_event=payload.trigger_event,
    )
    return {
        "monitor": monitor,
        "history_recorded": history is not None,
        "exception_id": exc.id if exc else None,
        "exception_status": exc.status if exc else None,
    }


@router.get("/controls/{control_code}/history")
async def get_control_history(
    control_code: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve immutable chronological audit trail of status transitions for a specific control."""
    result = await db.execute(
        select(ControlEvaluationHistory)
        .where(
            and_(
                ControlEvaluationHistory.organization_id == membership.organization_id,
                ControlEvaluationHistory.control_code == control_code,
            )
        )
        .order_by(desc(ControlEvaluationHistory.evaluated_at))
    )
    return result.scalars().all()


@router.get("/exceptions")
async def list_control_exceptions(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve historical and open exception windows detailing control failure periods and remediations."""
    result = await db.execute(
        select(ControlException)
        .where(ControlException.organization_id == membership.organization_id)
        .order_by(desc(ControlException.detected_at))
    )
    return result.scalars().all()


# ==========================================
# 2. CONTINUOUS AUDIT BOTS
# ==========================================

@router.get("/bots")
async def list_audit_bots(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """List all continuous audit bots configured for the organization."""
    service = AuditBotService(db)
    return await service.get_bots(membership.organization_id)


@router.post("/bots/{bot_id}/run")
async def execute_audit_bot(
    bot_id: str,
    payload: RunBotRequest = RunBotRequest(),
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Trigger on-demand execution of an audit bot with cryptographic evidence generation."""
    service = AuditBotService(db)
    ctrl_service = ContinuousControlService(db)

    run, observations, evidence = await service.run_bot(
        organization_id=membership.organization_id,
        bot_id=bot_id,
        simulated_failure=payload.simulated_failure,
    )

    # Automatically evaluate control monitor
    bot_res = await db.execute(select(AuditBot).where(AuditBot.id == bot_id))
    bot = bot_res.scalar_one_or_none()
    if bot:
        new_status = ContinuousControlStatus.PASS if run.status == "PASS" else ContinuousControlStatus.FAIL
        await ctrl_service.evaluate_control(
            organization_id=membership.organization_id,
            control_code=bot.target_control_code,
            new_status=new_status,
            reason=run.summary,
            evidence_observation_id=evidence.id,
            evidence_code=evidence.evidence_code,
            trigger_event="BOT_RUN",
        )

    return {
        "run": run,
        "observations_count": len(observations),
        "evidence_code": evidence.evidence_code,
        "raw_payload_hash": evidence.raw_payload_hash,
    }


@router.get("/bots/{bot_id}/runs")
async def list_bot_runs(
    bot_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Fetch past run telemetry and observation history for an audit bot."""
    result = await db.execute(
        select(AuditBotRun)
        .where(
            and_(
                AuditBotRun.organization_id == membership.organization_id,
                AuditBotRun.bot_id == bot_id,
            )
        )
        .order_by(desc(AuditBotRun.started_at))
    )
    return result.scalars().all()


# ==========================================
# 3. EVIDENCE PIPELINE & INTEGRITY CHAIN
# ==========================================

@router.get("/evidence")
async def search_evidence(
    control_code: Optional[str] = Query(None),
    source_provider: Optional[str] = Query(None),
    authenticity_status: Optional[str] = Query(None),
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Query structured evidence observations with cryptographic provenance tags."""
    service = EvidencePipelineService(db)
    return await service.search_evidence(
        organization_id=membership.organization_id,
        control_code=control_code,
        source_provider=source_provider,
        authenticity_status=authenticity_status,
    )


@router.get("/evidence/chain/verify")
async def verify_evidence_hash_chain(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Cryptographically verify the tamper-evident hash chain for all tenant evidence."""
    service = EvidencePipelineService(db)
    is_valid, count, violations = await service.verify_chain_integrity(membership.organization_id)
    return {
        "chain_valid": is_valid,
        "total_records_verified": count,
        "integrity_status": "VERIFIED_TAMPER_EVIDENT" if is_valid else "CHAIN_CORRUPTED",
        "violations": violations,
    }


@router.post("/evidence/freshness/evaluate")
async def evaluate_evidence_freshness(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Re-evaluate evidence freshness policies and flag expiring or stale records."""
    service = EvidencePipelineService(db)
    return await service.evaluate_freshness(membership.organization_id)


# ==========================================
# 4. PARTNER WHITE-LABEL & CUSTOM DOMAINS
# ==========================================

@router.post("/partner/domain/register")
async def register_custom_domain(
    payload: RegisterCustomDomainRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register custom vanity domain for an MSP partner organization."""
    service = PartnerWhiteLabelService(db)
    domain = await service.register_custom_domain(
        partner_id=payload.partner_id,
        domain_name=payload.domain_name,
    )
    return domain


@router.post("/partner/domain/{domain_id}/verify")
async def verify_custom_domain(
    domain_id: str,
    partner_id: str = Query(...),
    simulated_dns_valid: bool = Query(True),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Verify DNS TXT ownership and issue managed TLS certificate."""
    service = PartnerWhiteLabelService(db)
    return await service.verify_custom_domain(
        partner_id=partner_id,
        domain_id=domain_id,
        simulated_dns_valid=simulated_dns_valid,
    )


@router.get("/partner/branding/resolve")
async def resolve_partner_branding(
    host: Optional[str] = Header(None),
    hostname: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Resolve active partner white-label branding based on incoming hostname with strict validation."""
    query_host = hostname or host or ""
    service = PartnerWhiteLabelService(db)
    branding = await service.resolve_partner_by_hostname(query_host)
    if not branding:
        return {"is_white_labeled": False, "brand_name": "LaunchComply"}
    return branding


@router.post("/partner/branding")
async def update_partner_branding(
    payload: UpdateBrandingRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update visual branding elements for white-label portal presentation."""
    service = PartnerWhiteLabelService(db)
    return await service.update_partner_branding(
        partner_id=payload.partner_id,
        brand_name=payload.brand_name,
        logo_url=payload.logo_url,
        primary_accent_color=payload.primary_accent_color,
    )


# ==========================================
# 5. AUDITOR WORKSPACE & WORKPAPERS
# ==========================================

@router.get("/auditor/workpapers")
async def list_workpapers(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """List all workpapers for an organization."""
    service = AuditorWorkspaceService(db)
    return await service.get_workpapers(membership.organization_id)


@router.post("/auditor/workpapers")
async def create_workpaper(
    payload: CreateWorkpaperRequest,
    user: User = Depends(get_current_user),
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Create an auditor examination workpaper."""
    service = AuditorWorkspaceService(db)
    return await service.create_workpaper(
        organization_id=membership.organization_id,
        grant_id=payload.grant_id,
        control_code=payload.control_code,
        workpaper_number=payload.workpaper_number,
        auditor_email=user.email,
        framework=payload.framework,
        sampling_notes=payload.sampling_notes,
        period_start=payload.period_start,
        period_end=payload.period_end,
    )


@router.post("/auditor/workpapers/{workpaper_id}/status")
async def update_workpaper_status(
    workpaper_id: str,
    payload: UpdateWorkpaperStatusRequest,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Update auditor review status for a workpaper."""
    service = AuditorWorkspaceService(db)
    return await service.update_workpaper_status(
        organization_id=membership.organization_id,
        workpaper_id=workpaper_id,
        status=payload.status,
        findings_notes=payload.findings_notes,
        evidence_references=payload.evidence_references,
    )


@router.post("/auditor/workpapers/{workpaper_id}/messages")
async def add_workpaper_message(
    workpaper_id: str,
    payload: AddReviewMessageRequest,
    user: User = Depends(get_current_user),
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Post collaborative threaded note or auditee clarification response."""
    service = AuditorWorkspaceService(db)
    return await service.add_review_thread_message(
        organization_id=membership.organization_id,
        workpaper_id=workpaper_id,
        author_email=user.email,
        author_role=payload.author_role,
        message=payload.message,
        evidence_reference=payload.evidence_reference,
    )


# ==========================================
# 6. PUBLIC ENTERPRISE ASSURANCE API (/api/public/v1/assurance/...)
# ==========================================

public_assurance_router = APIRouter(prefix="/public/v1/assurance", tags=["Public Enterprise Assurance API"])


@public_assurance_router.get("/summary")
async def public_get_assurance_summary(
    x_organization_id: str = Header(..., alias="X-Organization-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Public Enterprise API: Retrieve continuous assurance posture summary."""
    service = ContinuousControlService(db)
    return await service.get_assurance_summary(x_organization_id)


@public_assurance_router.get("/controls")
async def public_get_monitored_controls(
    x_organization_id: str = Header(..., alias="X-Organization-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Public Enterprise API: Retrieve continuously monitored control health."""
    result = await db.execute(
        select(ContinuousControlMonitor)
        .where(ContinuousControlMonitor.organization_id == x_organization_id)
        .order_by(ContinuousControlMonitor.control_code)
    )
    return result.scalars().all()


@public_assurance_router.get("/evidence")
async def public_get_evidence(
    x_organization_id: str = Header(..., alias="X-Organization-Id"),
    control_code: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Public Enterprise API: Retrieve evidence observations with hash provenance."""
    service = EvidencePipelineService(db)
    return await service.search_evidence(
        organization_id=x_organization_id,
        control_code=control_code,
    )


@public_assurance_router.get("/exceptions")
async def public_get_exceptions(
    x_organization_id: str = Header(..., alias="X-Organization-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Public Enterprise API: Retrieve control exception windows."""
    result = await db.execute(
        select(ControlException)
        .where(ControlException.organization_id == x_organization_id)
        .order_by(desc(ControlException.detected_at))
    )
    return result.scalars().all()
