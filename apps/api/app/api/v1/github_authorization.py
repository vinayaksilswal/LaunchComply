import secrets
from cryptography.fernet import InvalidToken
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership, MembershipRole, User
from app.models.audit import AuditEvent
from app.models.source_control import SourceControlOAuthState, SourceControlConnection, SourceControlProviderType, ConnectionStatus, Repository
from app.services.source_control import github_app

router = APIRouter(prefix="/source-control/github", tags=["GitHub Authorization"])

async def authorized_member(request: Request, membership: OrganizationMembership = Depends(get_current_membership)):
    requested_org = request.headers.get("X-Organization-ID")
    if requested_org and requested_org != membership.organization_id:
        raise HTTPException(403, "You are not a member of this organization.")
    if membership.role not in (MembershipRole.OWNER, MembershipRole.ADMIN):
        raise HTTPException(403, "An organization owner or administrator must connect GitHub.")
    return membership

class AuthorizationCallback(BaseModel):
    code: str = Field(min_length=1, max_length=512)
    state: str = Field(min_length=32, max_length=128)

@router.post("/authorize")
async def authorize(membership: OrganizationMembership = Depends(authorized_member), db: AsyncSession = Depends(get_db)):
    github_app.require_configuration()
    now = datetime.now(timezone.utc)
    await db.execute(delete(SourceControlOAuthState).where(SourceControlOAuthState.user_id == membership.user_id, SourceControlOAuthState.expires_at < now))
    state, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(64)
    db.add(SourceControlOAuthState(organization_id=membership.organization_id, user_id=membership.user_id,
        state_hash=github_app.state_hash(state), verifier_encrypted=github_app.verifier_cipher().encrypt(verifier.encode()).decode(),
        expires_at=now + timedelta(minutes=10)))
    await db.commit()
    return {"authorization_url": github_app.authorization_url(state, verifier)}

@router.post("/complete")
async def complete(payload: AuthorizationCallback, membership: OrganizationMembership = Depends(authorized_member), db: AsyncSession = Depends(get_db)):
    github_app.require_configuration()
    now = datetime.now(timezone.utc)
    condition = (SourceControlOAuthState.state_hash == github_app.state_hash(payload.state),
        SourceControlOAuthState.user_id == membership.user_id, SourceControlOAuthState.organization_id == membership.organization_id,
        SourceControlOAuthState.consumed_at.is_(None), SourceControlOAuthState.expires_at > now)
    pending = (await db.execute(select(SourceControlOAuthState).where(*condition))).scalar_one_or_none()
    if not pending:
        raise HTTPException(400, "GitHub authorization expired or was already used. Please reconnect.")
    consumed = await db.execute(update(SourceControlOAuthState).where(*condition).values(consumed_at=now).execution_options(synchronize_session=False))
    if consumed.rowcount != 1:
        await db.rollback()
        raise HTTPException(400, "GitHub authorization was already used. Please reconnect.")
    encrypted = pending.verifier_encrypted
    await db.commit()  # Claim state before contacting GitHub; replay cannot create another connection.
    try:
        verifier = github_app.verifier_cipher().decrypt(encrypted.encode()).decode()
    except InvalidToken:
        raise HTTPException(400, "GitHub authorization expired. Please reconnect.") from None
    installations = await github_app.github_app_client.authorized_installations(payload.code, verifier)
    if not installations:
        return {"status": "INSTALLATION_REQUIRED", "installation_url": github_app.installation_url()}
    user = await db.get(User, membership.user_id)
    for item in installations:
        connection = (await db.execute(select(SourceControlConnection).where(
            SourceControlConnection.organization_id == membership.organization_id,
            SourceControlConnection.provider == SourceControlProviderType.GITHUB,
            SourceControlConnection.installation_id == item["installation_id"]))).scalar_one_or_none()
        if not connection:
            connection = SourceControlConnection(organization_id=membership.organization_id,
                provider=SourceControlProviderType.GITHUB, installation_id=item["installation_id"])
            db.add(connection)
        connection.provider_account_id = str(item["account"]["id"])
        connection.provider_account_name = item["account"]["login"]
        connection.connected_by_user_id = membership.user_id
        connection.status = ConnectionStatus.ACTIVE
        connection.last_sync_at = now
        await db.flush()
        # Refresh metadata atomically; repositories no longer authorized are hidden.
        existing = (await db.execute(select(Repository).where(Repository.source_control_connection_id == connection.id,
            Repository.organization_id == membership.organization_id))).scalars().all()
        by_id = {repo.provider_repository_id: repo for repo in existing}
        for repo in existing:
            repo.selected = False
        for item_repo in item["repositories"]:
            repo = by_id.get(str(item_repo["id"]))
            if not repo:
                repo = Repository(organization_id=membership.organization_id, source_control_connection_id=connection.id,
                    provider_repository_id=str(item_repo["id"]))
                db.add(repo)
            repo.name = item_repo["name"]
            repo.full_name = item_repo["full_name"]
            repo.owner = item_repo["owner"]["login"]
            repo.default_branch = item_repo.get("default_branch") or "main"
            repo.visibility = "private" if item_repo.get("private") else "public"
            repo.html_url = f"https://github.com/{repo.full_name}"
            repo.language = item_repo.get("language")
            repo.archived = bool(item_repo.get("archived"))
            repo.selected = True
            repo.last_synced_at = now
        db.add(AuditEvent(organization_id=membership.organization_id, actor_id=membership.user_id,
            actor_email=user.email, action="SOURCE_CONTROL_CONNECTED", entity_type="source_control_connection",
            entity_id=connection.id, details={"provider": "GITHUB", "installation_id": connection.installation_id}))
    await db.commit()
    return {"status": "CONNECTED", "installation_count": len(installations)}
