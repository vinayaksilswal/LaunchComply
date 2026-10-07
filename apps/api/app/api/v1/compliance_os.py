"""Phase 7 Enterprise Compliance Operating System FastAPI Router."""
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.permissions import get_current_membership, require_permission
from app.core.audit import log_audit_event
from app.models.auth import OrganizationMembership
from app.models.compliance_framework import (
    FrameworkVersion,
    CanonicalControl,
    ControlImplementation,
)
from app.models.compliance_privacy import PrivacyRequest
from app.schemas.compliance_os import (
    ControlImplementationUpdate,
    RiskCreate,
    RiskAcceptanceRequest,
    RiskTreatmentCreate,
    ISMSScopeUpdate,
    SoAApprovalRequest,
    PolicyCreate,
    PrivacyRequestCreate,
    PrivacyRequestStatusUpdate,
    AuditPackageGenerateRequest,
    ExternalAssuranceRecordCreate,
)
from app.services.compliance.framework_engine import framework_engine
from app.services.compliance.risk_service import risk_service
from app.services.compliance.iso27001_service import iso27001_service
from app.services.compliance.policy_service import policy_service
from app.services.compliance.soc2_engine import soc2_engine
from app.services.compliance.privacy_service import privacy_service
from app.services.compliance.vendor_risk_service import vendor_risk_service
from app.services.compliance.audit_capa_service import audit_capa_service
from app.services.compliance.audit_package_service import audit_package_service
from app.services.compliance.external_assurance_service import external_assurance_service
from app.services.compliance.operations_compliance_service import operations_compliance_service

router = APIRouter(prefix="/compliance-os", tags=["Compliance Operating System"])


# ============================================================================
# 1. Frameworks & Canonical Controls
# ============================================================================

@router.get("/frameworks")
async def list_frameworks(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    await framework_engine.ensure_canonical_library(db)
    stmt = select(FrameworkVersion).order_by(FrameworkVersion.code.asc())
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/controls")
async def list_canonical_controls(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    await framework_engine.ensure_canonical_library(db)
    stmt = select(CanonicalControl).order_by(CanonicalControl.control_code.asc())
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/implementations")
async def list_control_implementations(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    await framework_engine.ensure_organization_controls(db, membership.organization_id)
    stmt = (
        select(ControlImplementation)
        .where(ControlImplementation.organization_id == membership.organization_id)
    )
    res = await db.execute(stmt)
    return res.scalars().all()


@router.patch("/controls/{id}/implementation")
async def update_control_implementation(
    id: str,
    payload: ControlImplementationUpdate,
    membership: OrganizationMembership = Depends(require_permission("compliance.control.manage")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ControlImplementation).where(
        ControlImplementation.organization_id == membership.organization_id,
        ControlImplementation.id == id,
    )
    res = await db.execute(stmt)
    impl = res.scalars().first()
    if not impl:
        raise HTTPException(status_code=404, detail="Control implementation not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(impl, field, val)

    impl.last_reviewed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(impl)

    actor_email = getattr(membership.user, "email", "compliance@launchcomply.io") if membership.user else "compliance@launchcomply.io"
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="CONTROL_IMPLEMENTATION_UPDATED",
        entity_type="control_implementation",
        entity_id=impl.id,
        details={"status": impl.status, "applicable": impl.applicable}
    )
    return impl


@router.get("/readiness/{framework_code}")
async def get_framework_readiness(
    framework_code: str,
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    return await framework_engine.calculate_framework_readiness(
        db, membership.organization_id, framework_code
    )


# ============================================================================
# 2. Risk Management
# ============================================================================

@router.get("/risks")
async def list_risks(
    status: Optional[str] = None,
    membership: OrganizationMembership = Depends(require_permission("risk.read")),
    db: AsyncSession = Depends(get_db),
):
    return await risk_service.list_risks(db, membership.organization_id, status=status)


@router.get("/risks/heatmap")
async def get_risk_heatmap(
    membership: OrganizationMembership = Depends(require_permission("risk.read")),
    db: AsyncSession = Depends(get_db),
):
    return await risk_service.get_risk_heatmap(db, membership.organization_id)


@router.get("/risks/{id}")
async def get_risk(
    id: str,
    membership: OrganizationMembership = Depends(require_permission("risk.read")),
    db: AsyncSession = Depends(get_db),
):
    risk = await risk_service.get_risk(db, membership.organization_id, id)
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    return risk


@router.post("/risks")
async def create_risk(
    payload: RiskCreate,
    membership: OrganizationMembership = Depends(require_permission("risk.manage")),
    db: AsyncSession = Depends(get_db),
):
    risk = await risk_service.create_risk(
        db=db,
        organization_id=membership.organization_id,
        risk_code=payload.risk_id,
        title=payload.title,
        category=payload.category,
        asset=payload.asset,
        threat=payload.threat,
        vulnerability=payload.vulnerability,
        likelihood=payload.likelihood,
        impact=payload.impact,
        owner=payload.owner,
        existing_controls=payload.existing_controls,
        residual_likelihood=payload.residual_likelihood,
        residual_impact=payload.residual_impact,
        treatment=payload.treatment,
        source_type=payload.source_type,
        source_id=payload.source_id,
    )
    actor_email = getattr(membership.user, "email", "risk@launchcomply.io") if membership.user else "risk@launchcomply.io"
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="RISK_CREATED",
        entity_type="risk",
        entity_id=risk.id,
        details={"risk_id": risk.risk_id, "score": risk.inherent_score}
    )
    return risk


@router.post("/risks/{id}/accept")
async def accept_risk(
    id: str,
    payload: RiskAcceptanceRequest,
    membership: OrganizationMembership = Depends(require_permission("risk.accept")),
    db: AsyncSession = Depends(get_db),
):
    risk = await risk_service.accept_risk(
        db=db,
        organization_id=membership.organization_id,
        risk_id=id,
        justification=payload.justification,
        approver=payload.approver,
        expires_days=payload.expires_days,
    )
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")

    actor_email = getattr(membership.user, "email", "risk@launchcomply.io") if membership.user else "risk@launchcomply.io"
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="RISK_ACCEPTED",
        entity_type="risk",
        entity_id=risk.id,
        details={"approver": payload.approver, "expires_days": payload.expires_days}
    )
    return risk


@router.post("/risks/{id}/treatment")
async def add_risk_treatment(
    id: str,
    payload: RiskTreatmentCreate,
    membership: OrganizationMembership = Depends(require_permission("risk.manage")),
    db: AsyncSession = Depends(get_db),
):
    risk = await risk_service.get_risk(db, membership.organization_id, id)
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")

    treatment = await risk_service.add_treatment_action(
        db=db,
        organization_id=membership.organization_id,
        risk_id=id,
        action=payload.action,
        owner=payload.owner,
        due_date=payload.due_date,
        linked_control_code=payload.linked_control_code,
        linked_task_id=payload.linked_task_id,
    )
    return treatment


# ============================================================================
# 3. ISO 27001 ISMS & Statement of Applicability
# ============================================================================

@router.get("/iso27001/scope")
async def get_isms_scope(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    return await iso27001_service.get_or_create_scope(db, membership.organization_id)


@router.post("/iso27001/scope")
async def update_isms_scope(
    payload: ISMSScopeUpdate,
    membership: OrganizationMembership = Depends(require_permission("compliance.control.manage")),
    db: AsyncSession = Depends(get_db),
):
    scope = await iso27001_service.get_or_create_scope(db, membership.organization_id)
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(scope, field, val)
    await db.commit()
    await db.refresh(scope)
    return scope


@router.get("/iso27001/soa")
async def get_soa(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    return await iso27001_service.ensure_soa(db, membership.organization_id)


@router.post("/iso27001/soa/approve")
async def approve_soa(
    payload: SoAApprovalRequest,
    membership: OrganizationMembership = Depends(require_permission("compliance.control.manage")),
    db: AsyncSession = Depends(get_db),
):
    res = await iso27001_service.approve_soa(db, membership.organization_id, payload.approver)
    actor_email = getattr(membership.user, "email", "compliance@launchcomply.io") if membership.user else "compliance@launchcomply.io"
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="SOA_APPROVED",
        entity_type="soa",
        details=res
    )
    return res


# ============================================================================
# 4. Policies
# ============================================================================

@router.get("/policies")
async def list_policies(
    membership: OrganizationMembership = Depends(require_permission("policy.read")),
    db: AsyncSession = Depends(get_db),
):
    return await policy_service.list_policies(db, membership.organization_id)


@router.get("/policies/{id}")
async def get_policy(
    id: str,
    membership: OrganizationMembership = Depends(require_permission("policy.read")),
    db: AsyncSession = Depends(get_db),
):
    policy = await policy_service.get_policy(db, membership.organization_id, id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


@router.post("/policies")
async def create_policy(
    payload: PolicyCreate,
    membership: OrganizationMembership = Depends(require_permission("policy.manage")),
    db: AsyncSession = Depends(get_db),
):
    actor_email = getattr(membership.user, "email", "compliance@launchcomply.io") if membership.user else "compliance@launchcomply.io"
    policy = await policy_service.create_policy(
        db=db,
        organization_id=membership.organization_id,
        title=payload.title,
        slug=payload.slug,
        category=payload.category,
        description=payload.description,
        content_markdown=payload.content_markdown,
        author=actor_email,
    )
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="POLICY_CREATED",
        entity_type="policy",
        entity_id=policy.id,
        details={"title": policy.title}
    )
    return policy


# ============================================================================
# 5. SOC 2 Operating Period
# ============================================================================

@router.get("/soc2/status")
async def get_soc2_status(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    return await soc2_engine.get_soc2_status(db, membership.organization_id)


# ============================================================================
# 6. Privacy & DPDP Operations
# ============================================================================

@router.get("/privacy/data-inventory")
async def list_data_inventory(
    membership: OrganizationMembership = Depends(require_permission("privacy.inventory.read")),
    db: AsyncSession = Depends(get_db),
):
    return await privacy_service.list_data_inventory(db, membership.organization_id)


@router.get("/privacy/processing-activities")
async def list_processing_activities(
    membership: OrganizationMembership = Depends(require_permission("privacy.inventory.read")),
    db: AsyncSession = Depends(get_db),
):
    return await privacy_service.list_processing_activities(db, membership.organization_id)


@router.get("/privacy/requests")
async def list_privacy_requests(
    membership: OrganizationMembership = Depends(require_permission("privacy.request.read")),
    db: AsyncSession = Depends(get_db),
):
    return await privacy_service.list_privacy_requests(db, membership.organization_id)


@router.post("/privacy/requests")
async def create_privacy_request(
    payload: PrivacyRequestCreate,
    membership: OrganizationMembership = Depends(require_permission("privacy.request.manage")),
    db: AsyncSession = Depends(get_db),
):
    req = await privacy_service.create_privacy_request(
        db=db,
        organization_id=membership.organization_id,
        request_type=payload.request_type,
        data_principal_name=payload.data_principal_name,
        data_principal_email=payload.data_principal_email,
        sla_days=payload.sla_days,
    )
    actor_email = getattr(membership.user, "email", "privacy@launchcomply.io") if membership.user else "privacy@launchcomply.io"
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="PRIVACY_REQUEST_RECEIVED",
        entity_type="privacy_request",
        entity_id=req.id,
        details={"type": req.request_type, "request_number": req.request_number}
    )
    return req


@router.patch("/privacy/requests/{id}/status")
async def update_privacy_request_status(
    id: str,
    payload: PrivacyRequestStatusUpdate,
    membership: OrganizationMembership = Depends(require_permission("privacy.request.manage")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(PrivacyRequest).where(
        PrivacyRequest.organization_id == membership.organization_id,
        PrivacyRequest.id == id,
    )
    res = await db.execute(stmt)
    req = res.scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Privacy request not found")

    req.status = payload.status
    if payload.response_notes:
        req.response_notes = payload.response_notes
    if payload.rejection_reason:
        req.rejection_reason = payload.rejection_reason
    if payload.status in ("COMPLETED", "CLOSED", "REJECTED_WITH_REASON"):
        req.completed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(req)
    return req


# ============================================================================
# 7. Vendors
# ============================================================================

@router.get("/vendors")
async def list_vendors(
    membership: OrganizationMembership = Depends(require_permission("vendor.read")),
    db: AsyncSession = Depends(get_db),
):
    return await vendor_risk_service.list_vendors(db, membership.organization_id)


@router.get("/vendors/{id}")
async def get_vendor(
    id: str,
    membership: OrganizationMembership = Depends(require_permission("vendor.read")),
    db: AsyncSession = Depends(get_db),
):
    vendor = await vendor_risk_service.get_vendor(db, membership.organization_id, id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


# ============================================================================
# 8. Internal Audits & CAPA
# ============================================================================

@router.get("/audits")
async def list_audits(
    membership: OrganizationMembership = Depends(require_permission("audit.internal.read")),
    db: AsyncSession = Depends(get_db),
):
    return await audit_capa_service.list_internal_audits(db, membership.organization_id)


@router.get("/corrective-actions")
async def list_corrective_actions(
    membership: OrganizationMembership = Depends(require_permission("corrective_action.read")),
    db: AsyncSession = Depends(get_db),
):
    return await audit_capa_service.list_corrective_actions(db, membership.organization_id)


@router.get("/management-reviews")
async def list_management_reviews(
    membership: OrganizationMembership = Depends(require_permission("management_review.read")),
    db: AsyncSession = Depends(get_db),
):
    return await audit_capa_service.list_management_reviews(db, membership.organization_id)


# ============================================================================
# 9. Audit Packages
# ============================================================================

@router.get("/audit-packages")
async def list_audit_packages(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    return await audit_package_service.list_packages(db, membership.organization_id)


@router.post("/audit-packages/generate")
async def generate_audit_package(
    payload: AuditPackageGenerateRequest,
    membership: OrganizationMembership = Depends(require_permission("audit_package.generate")),
    db: AsyncSession = Depends(get_db),
):
    actor_email = getattr(membership.user, "email", "compliance@launchcomply.io") if membership.user else "compliance@launchcomply.io"
    pkg = await audit_package_service.generate_audit_package(
        db=db,
        organization_id=membership.organization_id,
        title=payload.title,
        framework=payload.framework,
        evaluation_period=payload.evaluation_period,
        generated_by=actor_email,
    )
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="AUDIT_PACKAGE_GENERATED",
        entity_type="audit_package",
        entity_id=pkg.id,
        details={"package_number": pkg.package_number, "manifest_hash": pkg.manifest_hash}
    )
    return pkg


# ============================================================================
# 10. External Assurance Records & Trust Badges
# ============================================================================

@router.get("/external-assurance")
async def list_external_assurance(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    return await external_assurance_service.list_assurance_records(db, membership.organization_id)


@router.post("/external-assurance")
async def create_external_assurance(
    payload: ExternalAssuranceRecordCreate,
    membership: OrganizationMembership = Depends(require_permission("compliance.control.manage")),
    db: AsyncSession = Depends(get_db),
):
    actor_email = getattr(membership.user, "email", "compliance@launchcomply.io") if membership.user else "compliance@launchcomply.io"
    record = await external_assurance_service.add_assurance_record(
        db=db,
        organization_id=membership.organization_id,
        assurance_type=payload.assurance_type,
        framework=payload.framework,
        issuer_auditor=payload.issuer_auditor,
        document_reference=payload.document_reference,
        expires_at=payload.expires_at,
        verified_by=actor_email,
    )
    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email=actor_email,
        action="EXTERNAL_ASSURANCE_ADDED",
        entity_type="external_assurance_record",
        entity_id=record.id,
        details={"framework": record.framework, "issuer": record.issuer_auditor}
    )
    return record


@router.get("/trust-badges")
async def get_trust_badges(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    return await external_assurance_service.get_verified_badge_status(db, membership.organization_id)


# ============================================================================
# 11. Tasks, Assets, BCP, Contracts, Packs & Business Readiness
# ============================================================================

@router.get("/tasks")
async def list_tasks(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    return await operations_compliance_service.list_tasks(db, membership.organization_id)


@router.get("/assets")
async def list_assets(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    return await operations_compliance_service.list_assets(db, membership.organization_id)


@router.get("/access-reviews")
async def list_access_reviews(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    return await operations_compliance_service.list_access_reviews(db, membership.organization_id)


@router.get("/bcp-bia")
async def get_bcp_and_bia(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    return await operations_compliance_service.get_bcp_and_bia(db, membership.organization_id)


@router.get("/contracts")
async def list_contracts(
    membership: OrganizationMembership = Depends(require_permission("contracts.read")),
    db: AsyncSession = Depends(get_db),
):
    return await operations_compliance_service.list_contracts(db, membership.organization_id)


@router.get("/business-readiness")
async def get_business_readiness(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
):
    return await operations_compliance_service.get_business_readiness_checklist(membership.organization_id)


@router.get("/packs")
async def get_compliance_packs(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
):
    return await operations_compliance_service.get_application_compliance_packs(membership.organization_id)


@router.get("/service-projects")
async def list_service_projects(
    membership: OrganizationMembership = Depends(require_permission("compliance.framework.read")),
    db: AsyncSession = Depends(get_db),
):
    return await operations_compliance_service.list_service_projects(db, membership.organization_id)
