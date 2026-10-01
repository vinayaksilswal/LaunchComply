"""
Infrastructure API Endpoints
Handles AWS account onboarding, role validation, stack planning, approval workflows,
provisioning orchestration, cloud resource discovery, drift auditing, and compliance evidence.
"""
from datetime import datetime, timezone
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership, MembershipRole
from app.models.application import Application, Environment
from app.models.entities import CloudAccount
from app.models.infrastructure import (
    InfrastructureStack,
    InfrastructureVersion,
    InfrastructurePlan,
    ProvisioningRun,
    ProvisioningStep,
    CloudResource,
    InfrastructureOutput,
    DriftDetectionRun,
    InfrastructureEvidence,
)
from app.models.audit import AuditEvent
from app.services.infrastructure.spec_compiler import InfrastructureSpecCompiler
from app.services.infrastructure.iac_engine import TerraformOpenTofuEngine
from app.services.infrastructure.policy_engine import InfrastructurePolicyEngine
from app.services.infrastructure.aws_onboarding import AWSOnboardingService
from app.services.infrastructure.provisioning_worker import ProvisioningWorker
from app.services.infrastructure.drift_engine import DriftDetectionEngine

router = APIRouter()

# -----------------
# Request & Response Schemas
# -----------------
class OnboardingTemplateRequest(BaseModel):
    template_type: str = Field(default="cloudformation", description="cloudformation or terraform")

class ValidateRoleRequest(BaseModel):
    role_arn: str
    external_id: str
    region: Optional[str] = "ap-south-1"

class CreateStackRequest(BaseModel):
    application_id: str
    environment_id: str
    architecture_id: Optional[str] = None
    profile: Optional[str] = "BALANCED"
    region: Optional[str] = "ap-south-1"

class GeneratePlanRequest(BaseModel):
    profile: Optional[str] = None
    region: Optional[str] = None
    custom_inputs: Optional[Dict[str, Any]] = None

class PlanApprovalRequest(BaseModel):
    notes: Optional[str] = None

class ApplyPlanRequest(BaseModel):
    enable_real_aws: Optional[bool] = False

# -----------------
# AWS Account Onboarding
# -----------------
@router.post("/aws/onboarding-template")
async def get_aws_onboarding_template(
    payload: OnboardingTemplateRequest,
    membership: OrganizationMembership = Depends(get_current_membership)
):
    external_id = AWSOnboardingService.generate_external_id(membership.organization_id)
    template = AWSOnboardingService.generate_cloudformation_template(external_id)
    return {
        "organization_id": membership.organization_id,
        "external_id": external_id,
        "launchcomply_account_id": AWSOnboardingService.LAUNCHCOMPLY_ACCOUNT_ID,
        "template_type": payload.template_type,
        "cloudformation_template": template
    }

@router.post("/aws/validate-role")
async def validate_aws_role(
    payload: ValidateRoleRequest,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership)
):
    report = AWSOnboardingService.validate_role_arn(payload.role_arn, payload.external_id, payload.region)
    if not report["valid"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=report["error"])

    # Create or update CloudAccount
    res = await db.execute(
        select(CloudAccount).where(
            CloudAccount.organization_id == membership.organization_id,
            CloudAccount.account_id == report["account_id"]
        )
    )
    account = res.scalars().first()
    if not account:
        account = CloudAccount(
            organization_id=membership.organization_id,
            provider="AWS",
            account_id=report["account_id"],
            role_arn=payload.role_arn,
            external_id=payload.external_id,
            region=payload.region or "ap-south-1",
            status="CONNECTED"
        )
        db.add(account)
    else:
        account.role_arn = payload.role_arn
        account.external_id = payload.external_id
        account.status = "CONNECTED"

    # Audit event
    audit = AuditEvent(
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="user@launchcomply.io",
        action="AWS_ACCOUNT_VALIDATED",
        entity_type="cloud_account",
        entity_id=account.id,
        details={"account_id": report["account_id"], "role_arn": payload.role_arn}
    )
    db.add(audit)
    await db.commit()
    await db.refresh(account)

    return {
        "status": "CONNECTED",
        "account_id": account.account_id,
        "role_arn": account.role_arn,
        "report": report
    }

# -----------------
# Infrastructure Stack Lifecycle
# -----------------
@router.post("/stacks")
async def create_or_get_stack(
    payload: CreateStackRequest,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership)
):
    # Verify app belongs to org
    app_res = await db.execute(
        select(Application).where(
            Application.id == payload.application_id,
            Application.organization_id == membership.organization_id
        )
    )
    app = app_res.scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found or unauthorized")

    # Check if stack already exists
    stack_res = await db.execute(
        select(InfrastructureStack).where(
            InfrastructureStack.application_id == payload.application_id,
            InfrastructureStack.environment_id == payload.environment_id,
            InfrastructureStack.organization_id == membership.organization_id
        )
    )
    stack = stack_res.scalars().first()

    if not stack:
        spec = InfrastructureSpecCompiler.compile(
            app_name=app.name,
            env_name="production",
            profile=payload.profile or "BALANCED",
            region=payload.region or "ap-south-1"
        )
        stack = InfrastructureStack(
            organization_id=membership.organization_id,
            application_id=payload.application_id,
            environment_id=payload.environment_id,
            architecture_id=payload.architecture_id,
            provider="AWS",
            region=payload.region or "ap-south-1",
            profile=payload.profile or "BALANCED",
            status="READY_TO_PLAN",
            specification_json=spec,
            current_version="v1.0.0"
        )
        db.add(stack)
        await db.commit()
        await db.refresh(stack)

    return {
        "id": stack.id,
        "application_id": stack.application_id,
        "environment_id": stack.environment_id,
        "provider": stack.provider,
        "region": stack.region,
        "profile": stack.profile,
        "status": stack.status,
        "current_version": stack.current_version
    }

@router.get("/stacks/{id}")
async def get_stack(
    id: str,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership)
):
    res = await db.execute(
        select(InfrastructureStack).where(
            InfrastructureStack.id == id,
            InfrastructureStack.organization_id == membership.organization_id
        )
    )
    stack = res.scalars().first()
    if not stack:
        raise HTTPException(status_code=404, detail="Infrastructure stack not found")

    # Resource count
    res_count_res = await db.execute(
        select(CloudResource).where(CloudResource.infrastructure_stack_id == stack.id)
    )
    resources = res_count_res.scalars().all()

    return {
        "id": stack.id,
        "application_id": stack.application_id,
        "environment_id": stack.environment_id,
        "provider": stack.provider,
        "region": stack.region,
        "profile": stack.profile,
        "status": stack.status,
        "current_version": stack.current_version,
        "specification": stack.specification_json,
        "resource_count": len(resources),
        "created_at": stack.created_at,
        "updated_at": stack.updated_at
    }

# -----------------
# Infrastructure Planning & Policy
# -----------------
@router.post("/stacks/{id}/plan")
async def generate_plan(
    id: str,
    payload: GeneratePlanRequest,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership)
):
    stack_res = await db.execute(
        select(InfrastructureStack).where(
            InfrastructureStack.id == id,
            InfrastructureStack.organization_id == membership.organization_id
        )
    )
    stack = stack_res.scalars().first()
    if not stack:
        raise HTTPException(status_code=404, detail="Infrastructure stack not found")

    app_res = await db.execute(select(Application).where(Application.id == stack.application_id))
    app = app_res.scalars().first()

    # Compile specification
    spec = InfrastructureSpecCompiler.compile(
        app_name=app.name if app else "app",
        env_name="production",
        profile=payload.profile or stack.profile,
        region=payload.region or stack.region,
        custom_inputs=payload.custom_inputs
    )
    stack.specification_json = spec
    stack.status = "PLANNING"
    await db.commit()

    # Generate IaC & Plan
    engine = TerraformOpenTofuEngine()
    plan_data = engine.plan(spec)
    policy_report = InfrastructurePolicyEngine.evaluate(spec, plan_data)

    # Persist Plan
    plan = InfrastructurePlan(
        organization_id=membership.organization_id,
        infrastructure_stack_id=stack.id,
        status="READY" if policy_report["can_approve"] else "BLOCKED",
        plan_key=f"plan-{id[:8]}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        plan_summary_json={
            "plan_data": plan_data,
            "policy_report": policy_report
        },
        resources_add=plan_data["resources_add"],
        resources_change=plan_data["resources_change"],
        resources_destroy=plan_data["resources_destroy"],
        estimated_cost_delta=plan_data["estimated_cost_delta"],
        requested_by=membership.user_id
    )
    db.add(plan)
    stack.status = "PLAN_READY"
    
    # Audit Event
    audit = AuditEvent(
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="user@launchcomply.io",
        action="INFRASTRUCTURE_PLAN_CREATED",
        entity_type="infrastructure_plan",
        entity_id=plan.id,
        details={"resources_add": plan.resources_add, "profile": stack.profile}
    )
    db.add(audit)
    await db.commit()
    await db.refresh(plan)

    return {
        "plan_id": plan.id,
        "status": plan.status,
        "resources_add": plan.resources_add,
        "resources_change": plan.resources_change,
        "resources_destroy": plan.resources_destroy,
        "estimated_cost_delta": plan.estimated_cost_delta,
        "policy_report": policy_report,
        "summary": plan_data["summary"]
    }

@router.get("/plans/{id}")
async def get_plan(
    id: str,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership)
):
    res = await db.execute(
        select(InfrastructurePlan).where(
            InfrastructurePlan.id == id,
            InfrastructurePlan.organization_id == membership.organization_id
        )
    )
    plan = res.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Infrastructure plan not found")

    return {
        "id": plan.id,
        "stack_id": plan.infrastructure_stack_id,
        "status": plan.status,
        "plan_key": plan.plan_key,
        "resources_add": plan.resources_add,
        "resources_change": plan.resources_change,
        "resources_destroy": plan.resources_destroy,
        "estimated_cost_delta": plan.estimated_cost_delta,
        "details": plan.plan_summary_json,
        "approved_by": plan.approved_by,
        "approved_at": plan.approved_at,
        "created_at": plan.created_at
    }

@router.post("/plans/{id}/approve")
async def approve_plan(
    id: str,
    payload: PlanApprovalRequest,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership)
):
    # RBAC check: only OWNER, ADMIN, DEVOPS can approve infrastructure
    if membership.role not in [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Requires OWNER, ADMIN, or DEVOPS role to approve infrastructure"
        )

    res = await db.execute(
        select(InfrastructurePlan).where(
            InfrastructurePlan.id == id,
            InfrastructurePlan.organization_id == membership.organization_id
        )
    )
    plan = res.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Infrastructure plan not found")

    # Check if blocked by security policies
    summary = plan.plan_summary_json or {}
    policy_report = summary.get("policy_report", {})
    if policy_report.get("overall_status") == "BLOCK":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve plan: Critical security policy BLOCK violations exist."
        )

    plan.status = "APPROVED"
    plan.approved_by = membership.user_id
    plan.approved_at = datetime.now(timezone.utc)

    # Update stack status
    stack_res = await db.execute(select(InfrastructureStack).where(InfrastructureStack.id == plan.infrastructure_stack_id))
    stack = stack_res.scalars().first()
    if stack:
        stack.status = "APPROVED"

    audit = AuditEvent(
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="user@launchcomply.io",
        action="INFRASTRUCTURE_PLAN_APPROVED",
        entity_type="infrastructure_plan",
        entity_id=plan.id,
        details={"approved_by": membership.user_id, "notes": payload.notes}
    )
    db.add(audit)
    await db.commit()

    return {
        "status": "APPROVED",
        "plan_id": plan.id,
        "approved_by": plan.approved_by,
        "approved_at": plan.approved_at
    }

# -----------------
# Apply & Provisioning Orchestration
# -----------------
@router.post("/plans/{id}/apply")
async def apply_plan(
    id: str,
    payload: ApplyPlanRequest,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership)
):
    if membership.role not in [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Requires OWNER, ADMIN, or DEVOPS role to execute apply"
        )

    plan_res = await db.execute(
        select(InfrastructurePlan).where(
            InfrastructurePlan.id == id,
            InfrastructurePlan.organization_id == membership.organization_id
        )
    )
    plan = plan_res.scalars().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Infrastructure plan not found")

    if plan.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan must be APPROVED before executing apply."
        )

    stack_res = await db.execute(select(InfrastructureStack).where(InfrastructureStack.id == plan.infrastructure_stack_id))
    stack = stack_res.scalars().first()
    if not stack:
        raise HTTPException(status_code=404, detail="Infrastructure stack not found")

    # Create ProvisioningRun
    run = ProvisioningRun(
        organization_id=membership.organization_id,
        infrastructure_stack_id=stack.id,
        infrastructure_plan_id=plan.id,
        status="QUEUED",
        worker_job_id=f"job-{uuid.uuid4().hex[:8]}",
        triggered_by=membership.user_id
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    # Execute isolated provisioning worker
    completed_run = await ProvisioningWorker.execute_run(
        db=db,
        run_id=run.id,
        enable_real_aws=payload.enable_real_aws or False
    )

    # Audit event
    audit = AuditEvent(
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="user@launchcomply.io",
        action="PROVISIONING_COMPLETED" if completed_run.status == "COMPLETED" else "PROVISIONING_FAILED",
        entity_type="provisioning_run",
        entity_id=completed_run.id,
        details={"status": completed_run.status, "stack_id": stack.id}
    )
    db.add(audit)
    await db.commit()

    return {
        "run_id": completed_run.id,
        "status": completed_run.status,
        "stack_status": stack.status,
        "started_at": completed_run.started_at,
        "completed_at": completed_run.completed_at
    }

@router.get("/runs/{id}")
async def get_run_details(
    id: str,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership)
):
    res = await db.execute(
        select(ProvisioningRun).where(
            ProvisioningRun.id == id,
            ProvisioningRun.organization_id == membership.organization_id
        )
    )
    run = res.scalars().first()
    if not run:
        raise HTTPException(status_code=404, detail="Provisioning run not found")

    steps_res = await db.execute(
        select(ProvisioningStep).where(ProvisioningStep.provisioning_run_id == run.id).order_by(ProvisioningStep.started_at)
    )
    steps = steps_res.scalars().all()

    return {
        "id": run.id,
        "status": run.status,
        "started_at": run.started_at,
        "completed_at": run.completed_at,
        "failure_reason": run.failure_reason,
        "steps": [
            {
                "step": s.step,
                "status": s.status,
                "message": s.message,
                "completed_at": s.completed_at
            }
            for s in steps
        ]
    }

# -----------------
# Cloud Resources & Drift
# -----------------
@router.get("/stacks/{id}/resources")
async def list_stack_resources(
    id: str,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership)
):
    res = await db.execute(
        select(CloudResource).where(
            CloudResource.infrastructure_stack_id == id,
            CloudResource.organization_id == membership.organization_id
        )
    )
    resources = res.scalars().all()
    return [
        {
            "id": r.id,
            "provider_resource_id": r.provider_resource_id,
            "provider_resource_arn": r.provider_resource_arn,
            "resource_type": r.resource_type,
            "category": r.category,
            "region": r.region,
            "availability_zone": r.availability_zone,
            "status": r.status,
            "managed_by": r.managed_by_launchcomply,
            "architecture_node_id": r.architecture_node_id,
            "tags": r.tags_json,
            "last_verified_at": r.last_verified_at
        }
        for r in resources
    ]

@router.get("/stacks/{id}/drift")
async def check_drift(
    id: str,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership)
):
    drift_run = await DriftDetectionEngine.run_scan(db, id)
    return {
        "run_id": drift_run.id,
        "status": drift_run.status,
        "drift_count": drift_run.drift_count,
        "summary": drift_run.summary_json,
        "completed_at": drift_run.completed_at
    }

@router.get("/stacks/{id}/export")
async def export_infrastructure_package(
    id: str,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership)
):
    res = await db.execute(
        select(InfrastructureStack).where(
            InfrastructureStack.id == id,
            InfrastructureStack.organization_id == membership.organization_id
        )
    )
    stack = res.scalars().first()
    if not stack:
        raise HTTPException(status_code=404, detail="Infrastructure stack not found")

    engine = TerraformOpenTofuEngine()
    spec = stack.specification_json or {}
    files = engine.generate_configuration(spec)

    # Sanitize and never expose state or temporary credentials
    return {
        "engine": "OpenTofu / Terraform v1.6+",
        "region": stack.region,
        "profile": stack.profile,
        "specification": spec,
        "iac_files": files
    }

@router.get("/stacks/{id}/evidence")
async def list_infrastructure_evidence(
    id: str,
    db: AsyncSession = Depends(get_db),
    membership: OrganizationMembership = Depends(get_current_membership)
):
    res = await db.execute(
        select(InfrastructureEvidence).where(
            InfrastructureEvidence.infrastructure_stack_id == id,
            InfrastructureEvidence.organization_id == membership.organization_id
        )
    )
    evidences = res.scalars().all()
    return [
        {
            "id": e.id,
            "evidence_type": e.evidence_type,
            "control_code": e.control_code,
            "framework": e.framework,
            "title": e.title,
            "sha256_hash": e.sha256_hash,
            "snapshot": e.raw_snapshot_json,
            "verified_at": e.verified_at
        }
        for e in evidences
    ]
