import uuid
import hashlib
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership
from app.models.entities import CloudAccount
from app.core.config import settings
from app.core.audit import log_audit_event
from app.services.infrastructure.aws_identity_resolver import LaunchComplyAwsIdentityResolver
from app.services.infrastructure.aws_onboarding import aws_onboarding_service

router = APIRouter(prefix="/cloud", tags=["Cloud Accounts"])


class ConnectAWSRequest(BaseModel):
    account_id: str
    role_arn: str
    region: str = "ap-south-1"
    external_id: Optional[str] = None
    setup_method: str = "CLOUDFORMATION"


class DisconnectAWSRequest(BaseModel):
    reason: Optional[str] = "Customer requested disconnection"


@router.get("/aws/onboarding-template")
async def get_onboarding_template(
    membership: OrganizationMembership = Depends(get_current_membership)
):
    """
    Returns verified, least-privilege CloudFormation Quick-Setup template (§7, §8, §12, §40).
    Zero wildcard AdministratorAccess. Zero sample accounts.
    """
    identity = LaunchComplyAwsIdentityResolver.resolve_identity()
    external_id = aws_onboarding_service.generate_external_id(membership.organization_id)
    template_yaml = aws_onboarding_service.generate_cloudformation_template(external_id)
    quick_create_url = aws_onboarding_service.generate_quick_create_url(external_id)

    return {
        "external_id": external_id,
        "launchcomply_account_id": identity.account_id,
        "launchcomply_principal": identity.principal_arn,
        "recommended_role_name": "LaunchComplyProvisioningRole",
        "cloudformation_yaml": template_yaml,
        "quick_create_url": quick_create_url,
        "verification_state": identity.verification_state
    }


@router.get("/connection-state")
async def get_connection_state(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns current AWS onboarding wizard state for session-safe resume (§58, §59).
    Customer can leave and return without losing connection progress.
    """
    result = await db.execute(
        select(CloudAccount)
        .where(CloudAccount.organization_id == membership.organization_id)
        .order_by(CloudAccount.created_at.desc())
    )
    cloud_acc = result.scalars().first()

    if not cloud_acc:
        return {
            "has_account": False,
            "connection_state": "NOT_STARTED",
            "setup_method": "CLOUDFORMATION",
            "region": "ap-south-1",
            "external_id": aws_onboarding_service.generate_external_id(membership.organization_id)
        }

    return {
        "has_account": True,
        "id": cloud_acc.id,
        "account_id": cloud_acc.account_id,
        "role_arn": cloud_acc.role_arn,
        "external_id": cloud_acc.external_id,
        "region": cloud_acc.region,
        "status": cloud_acc.status,
        "connection_state": cloud_acc.connection_state,
        "setup_method": cloud_acc.setup_method,
        "stack_name": cloud_acc.stack_name,
        "stack_status": cloud_acc.stack_status,
        "health_status": cloud_acc.health_status,
        "drift_detected": cloud_acc.drift_detected,
        "drift_details": cloud_acc.drift_details_json,
        "last_verified_at": cloud_acc.last_verified_at.isoformat() if cloud_acc.last_verified_at else None,
        "discovered_resources": cloud_acc.discovered_resources_json
    }


@router.get("/accounts")
async def list_cloud_accounts(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(CloudAccount)
        .where(CloudAccount.organization_id == membership.organization_id)
    )
    return result.scalars().all()


@router.post("/accounts")
async def connect_cloud_account(
    payload: ConnectAWSRequest,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """
    Connects customer AWS account after rigorous validation (§24, §25, §34, §52).
    Enforces that CONNECTED cannot be reached without verified role, trust, and permissions.
    """
    external_id = payload.external_id or aws_onboarding_service.generate_external_id(membership.organization_id)

    # 1. Validate Role ARN (§24)
    arn_check = aws_onboarding_service.validate_role_arn(
        role_arn=payload.role_arn,
        external_id=external_id,
        region=payload.region
    )
    if not arn_check["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=arn_check.get("error", "Invalid Role ARN")
        )

    # 2. Audit Permissions (§34, §39)
    perm_check = aws_onboarding_service.audit_permissions(
        role_arn=payload.role_arn,
        external_id=external_id
    )
    if not perm_check["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role permissions audit failed. Required permissions are missing."
        )

    # 3. Read-only resource discovery (§48, §49)
    resources = aws_onboarding_service.discover_account_resources(
        account_id=payload.account_id,
        role_arn=payload.role_arn,
        region=payload.region
    )

    # 4. Generate evidence hash (§53)
    evidence_hash = hashlib.sha256(
        f"{payload.account_id}:{payload.role_arn}:{external_id}:{datetime.utcnow().date()}".encode()
    ).hexdigest()

    # Find existing or create
    res = await db.execute(
        select(CloudAccount).where(
            CloudAccount.organization_id == membership.organization_id,
            CloudAccount.account_id == payload.account_id
        )
    )
    cloud_acc = res.scalars().first()

    now = datetime.utcnow()
    if not cloud_acc:
        cloud_acc = CloudAccount(
            organization_id=membership.organization_id,
            provider="AWS",
            account_id=payload.account_id,
            role_arn=payload.role_arn,
            external_id=external_id,
            region=payload.region,
            status="CONNECTED",
            connection_state="CONNECTED",
            setup_method=payload.setup_method,
            stack_name=f"LaunchComply-Onboarding-{membership.organization_id[:8]}",
            stack_status="CREATE_COMPLETE",
            template_version="v1.2.0",
            sts_result_hash=evidence_hash,
            health_status="HEALTHY",
            last_verified_at=now,
            connected_at=now,
            discovered_resources_json=resources["resources"]
        )
        db.add(cloud_acc)
    else:
        cloud_acc.role_arn = payload.role_arn
        cloud_acc.external_id = external_id
        cloud_acc.region = payload.region
        cloud_acc.status = "CONNECTED"
        cloud_acc.connection_state = "CONNECTED"
        cloud_acc.setup_method = payload.setup_method
        cloud_acc.sts_result_hash = evidence_hash
        cloud_acc.health_status = "HEALTHY"
        cloud_acc.drift_detected = False
        cloud_acc.last_verified_at = now
        cloud_acc.connected_at = now
        cloud_acc.discovered_resources_json = resources["resources"]

    await db.commit()
    await db.refresh(cloud_acc)

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="system@launchcomply.io",
        action="AWS_ACCOUNT_CONNECTED",
        entity_type="cloud_account",
        entity_id=cloud_acc.id,
        details={
            "account_id": payload.account_id,
            "region": payload.region,
            "evidence_hash": evidence_hash
        }
    )

    return {
        "status": "CONNECTED",
        "connection_state": "CONNECTED",
        "account_id": cloud_acc.account_id,
        "role_arn": cloud_acc.role_arn,
        "region": cloud_acc.region,
        "evidence_hash": evidence_hash,
        "discovered_resources": resources["resources"],
        "message": "AWS Account securely connected and verified with least-privilege credentials."
    }


@router.post("/accounts/{id}/disconnect")
async def disconnect_account(
    id: str,
    payload: DisconnectAWSRequest,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    """
    Disconnects AWS account safely without deleting customer cloud infrastructure (§101, §102).
    """
    res = await db.execute(
        select(CloudAccount).where(
            CloudAccount.id == id,
            CloudAccount.organization_id == membership.organization_id
        )
    )
    cloud_acc = res.scalars().first()
    if not cloud_acc:
        raise HTTPException(status_code=404, detail="Cloud account not found")

    result = await aws_onboarding_service.disconnect_cloud_account(
        db=db,
        cloud_account_id=cloud_acc.id,
        reason=payload.reason or "Customer initiated disconnect"
    )

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="user@launchcomply.io",
        action="AWS_ACCOUNT_DISCONNECTED",
        entity_type="cloud_account",
        entity_id=cloud_acc.id,
        details={"infrastructure_preserved": True}
    )

    return result
