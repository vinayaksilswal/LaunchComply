import asyncio
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.v1.architecture_workspace import member, editor, application, latest, design_is_approved
from app.models.auth import Organization, User
from app.models.entities import CloudAccount
from app.models.audit import AuditEvent
from app.services.infrastructure import aws_account_connection as service
from app.services.infrastructure import aws_security_observation as security

router = APIRouter(prefix="/aws-account-connection", tags=["Verified AWS Account Connection"])


def output(account):
    details = account.permission_profiles_json or {}
    verified = details.get("verification_source") == "AWS_STS_API" and account.status == "CONNECTED"
    checked_at = account.last_verified_at
    if checked_at and checked_at.tzinfo is None:
        checked_at = checked_at.replace(tzinfo=timezone.utc)
    return {"id": account.id, "account_id": account.account_id, "region": account.region, "role_arn": account.role_arn,
        "status": "ACCESS_VERIFIED" if verified else "SETUP_REQUIRED", "last_verified_at": checked_at if verified else None,
        "resources": account.discovered_resources_json or [] if verified else [],
        "observations": details.get("observations", []) if verified else [],
        "scope": "AWS role access only. Deployment, monitoring and costs require separate integrations."}


async def bounded(function, *args):
    try:
        async with asyncio.timeout(60):
            return await asyncio.to_thread(function, *args)
    except TimeoutError:
        raise HTTPException(504, "The AWS read timed out. No new observation or connection result was saved.") from None


@router.get("")
async def accounts(membership=Depends(member), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(CloudAccount).where(CloudAccount.organization_id == membership.organization_id,
        CloudAccount.provider == "AWS").order_by(CloudAccount.created_at.desc()).limit(50))).scalars().all()
    return {"available": service.configured(), "accounts": [output(account) for account in rows]}


@router.get("/security")
async def security_observations(membership=Depends(member), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(CloudAccount).where(CloudAccount.organization_id == membership.organization_id,
        CloudAccount.provider == "AWS", CloudAccount.status == "CONNECTED").order_by(CloudAccount.created_at.desc()).limit(50))).scalars().all()
    return {"available": service.configured(), "required_read_actions": security.SECURITY_READ_ACTIONS,
        "accounts": [{"id": row.id, "account_id": row.account_id, "region": row.region,
            "snapshot": (row.permission_profiles_json or {}).get("security_snapshot")}
            for row in rows if (row.permission_profiles_json or {}).get("verification_source") == "AWS_STS_API"],
        "scope": "AWS account findings are separate from application assessments and compliance services. Refresh contacts AWS; stored results are not a real-time stream."}


@router.post("/{connection_id}/security/refresh")
async def refresh_security(connection_id: str, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    account = (await db.execute(select(CloudAccount).where(CloudAccount.id == connection_id,
        CloudAccount.organization_id == membership.organization_id, CloudAccount.provider == "AWS").with_for_update())).scalar_one_or_none()
    if not account: raise HTTPException(404, "AWS connection not found in your business.")
    details = account.permission_profiles_json or {}
    if account.status != "CONNECTED" or details.get("verification_source") != "AWS_STS_API":
        raise HTTPException(409, "Verify this customer AWS connection before reading security findings.")
    previous = details.get("security_snapshot") or {}
    try:
        checked = datetime.fromisoformat(previous.get("checked_at", ""))
        if checked.tzinfo and (datetime.now(timezone.utc) - checked).total_seconds() < 60:
            return {"snapshot": previous, "cached": True}
    except (ValueError, TypeError):
        pass
    snapshot = await bounded(security.observe, account.account_id, account.role_arn, account.external_id, account.region)
    account.permission_profiles_json = {**details, "security_snapshot": snapshot}
    user = await db.get(User, membership.user_id)
    db.add(AuditEvent(organization_id=membership.organization_id, actor_id=membership.user_id, actor_email=user.email,
        action="AWS_SECURITY_OBSERVED", entity_type="cloud_account", entity_id=account.id,
        details={"region": account.region, "sources": snapshot["sources"]}))
    await db.commit()
    return {"snapshot": snapshot, "cached": False}


class Setup(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    application_id: str = Field(min_length=1, max_length=36)
    account_id: str = Field(pattern=r"^\d{12}$")
    region: str = Field(pattern=r"^[a-z]{2}-[a-z]+-\d$", max_length=50)


@router.post("/setup")
async def setup(payload: Setup, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app = await application(db, payload.application_id, membership, lock=True)
    arch = await latest(db, app)
    if not design_is_approved(arch):
        raise HTTPException(409, "Approve your saved app design before starting AWS account setup.")
    # Serialize account creation for this tenant even across different applications.
    await db.execute(select(Organization).where(Organization.id == membership.organization_id).with_for_update())
    account = (await db.execute(select(CloudAccount).where(CloudAccount.organization_id == membership.organization_id,
        CloudAccount.provider == "AWS", CloudAccount.account_id == payload.account_id).order_by(CloudAccount.created_at.desc()).limit(1).with_for_update())).scalar_one_or_none()
    if account and account.status == "CONNECTED" and account.region != payload.region:
        raise HTTPException(409, "Disconnect the existing regional connection before selecting another region.")
    external_id = account.external_id if account and (account.permission_profiles_json or {}).get("setup_source") == "AWS_ROLE_SETUP" else "lc-" + secrets.token_hex(32)
    template = await bounded(service.setup_template, payload.account_id, external_id, payload.region)
    if not account:
        account = CloudAccount(organization_id=membership.organization_id, provider="AWS", account_id=payload.account_id,
            role_arn=f"arn:aws:iam::{payload.account_id}:role/LaunchComplyObserver", external_id=external_id,
            region=payload.region, status="SETUP_PENDING", connection_state="NOT_STARTED", health_status="UNKNOWN")
        db.add(account)
        await db.flush()
    if (account.permission_profiles_json or {}).get("verification_source") != "AWS_STS_API":
        account.external_id = external_id
        account.region = payload.region
        account.status, account.connection_state, account.health_status = "SETUP_PENDING", "NOT_STARTED", "UNKNOWN"
        account.permission_profiles_json = {"setup_source": "AWS_ROLE_SETUP"}
    await db.commit()
    return {"connection_id": account.id, "external_id": account.external_id, "template": template,
            "recommended_role_arn": f"arn:aws:iam::{payload.account_id}:role/LaunchComplyObserver"}


class Verify(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    role_arn: str = Field(min_length=20, max_length=500)


@router.post("/{connection_id}/verify")
async def verify(connection_id: str, payload: Verify, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    account = (await db.execute(select(CloudAccount).where(CloudAccount.id == connection_id,
        CloudAccount.organization_id == membership.organization_id, CloudAccount.provider == "AWS").with_for_update())).scalar_one_or_none()
    if not account: raise HTTPException(404, "AWS connection not found in your business.")
    if (account.permission_profiles_json or {}).get("setup_source") != "AWS_ROLE_SETUP":
        raise HTTPException(409, "Start account setup to generate a persistent customer ExternalId first.")
    result = await bounded(service.verify, account.account_id, payload.role_arn, account.external_id, account.region)
    now = datetime.utcnow()
    account.role_arn, account.status, account.connection_state = payload.role_arn, "CONNECTED", "CONNECTED"
    account.health_status = "UNKNOWN"
    account.last_verified_at, account.connected_at = now, now
    account.assumed_role_arn = result["assumed_role_arn"]
    account.discovered_resources_json = result["resources"]
    account.permission_profiles_json = {"setup_source": "AWS_ROLE_SETUP", "verification_source": "AWS_STS_API",
        "scope": result["scope"], "observations": result["observations"]}
    user = await db.get(User, membership.user_id)
    db.add(AuditEvent(organization_id=membership.organization_id, actor_id=membership.user_id, actor_email=user.email,
        action="AWS_ROLE_ACCESS_VERIFIED", entity_type="cloud_account", entity_id=account.id,
        details={"account_id": account.account_id, "region": account.region, "scope": "CONNECTION_ONLY"}))
    await db.commit()
    return output(account)


@router.post("/{connection_id}/disconnect")
async def disconnect(connection_id: str, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    account = (await db.execute(select(CloudAccount).where(CloudAccount.id == connection_id,
        CloudAccount.organization_id == membership.organization_id).with_for_update())).scalar_one_or_none()
    if not account: raise HTTPException(404, "AWS connection not found in your business.")
    account.status, account.connection_state, account.health_status = "DISCONNECTED", "REVOKED", "UNKNOWN"
    account.discovered_resources_json = None
    account.permission_profiles_json = {"setup_source": "AWS_ROLE_SETUP"}
    user = await db.get(User, membership.user_id)
    db.add(AuditEvent(organization_id=membership.organization_id, actor_id=membership.user_id, actor_email=user.email,
        action="AWS_ROLE_DISCONNECTED", entity_type="cloud_account", entity_id=account.id,
        details={"account_id": account.account_id}))
    await db.commit()
    return {"status": "DISCONNECTED", "message": "LaunchComply stopped using this connection. Remove its IAM role in AWS to revoke access; resources are not deleted."}
