import uuid
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.config import settings
from app.core.permissions import get_current_membership
from app.models.auth import OrganizationMembership
from app.models.source_control import (
    SourceControlConnection,
    SourceControlProviderType,
    ConnectionStatus,
    Repository,
    RepositoryBranch,
)
from app.services.source_control.github import github_provider
from app.core.audit import log_audit_event
from app.services.source_control.github_app import configured as github_configured

router = APIRouter(prefix="/source-control", tags=["Source Control & GitHub App"])

def require_fixture_provider_environment():
    if settings.ENVIRONMENT in ("staging", "production") or not settings.DEMO_MODE:
        raise HTTPException(status_code=503, detail="Real GitHub integration is not implemented. The fixture adapter is unavailable in this environment.")

class CallbackPayload(BaseModel):
    installation_id: str
    code: Optional[str] = None
    state: Optional[str] = None

@router.get("/providers")
async def list_providers():
    return [
        {"name": "GitHub App", "code": "GITHUB", "status": "CONFIGURED" if github_configured() else "SIMULATED" if settings.DEMO_MODE and settings.ENVIRONMENT not in ("staging", "production") else "NOT_CONFIGURED", "description": "GitHub App authorization and permitted repository metadata; connection is verified during authorization."},
        {"name": "GitLab", "code": "GITLAB", "status": "COMING_SOON", "description": "Self-managed and GitLab.com integration."},
        {"name": "Bitbucket", "code": "BITBUCKET", "status": "COMING_SOON", "description": "Atlassian Bitbucket Cloud and Data Center."}
    ]

@router.get("/github/install-url", dependencies=[Depends(require_fixture_provider_environment)])
async def get_github_install_url(membership: OrganizationMembership = Depends(get_current_membership)):
    csrf_state = f"{membership.organization_id}:{uuid.uuid4().hex[:12]}"
    url = github_provider.get_installation_url(csrf_state)
    return {"install_url": url, "state": csrf_state}

@router.post("/github/callback", dependencies=[Depends(require_fixture_provider_environment)])
async def github_callback(
    payload: CallbackPayload,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    # Check if connection already registered
    result = await db.execute(
        select(SourceControlConnection).where(
            SourceControlConnection.organization_id == membership.organization_id,
            SourceControlConnection.installation_id == payload.installation_id
        )
    )
    conn = result.scalars().first()
    if not conn:
        conn = SourceControlConnection(
            organization_id=membership.organization_id,
            provider=SourceControlProviderType.GITHUB,
            provider_account_id=f"gh_acc_{payload.installation_id}",
            provider_account_name="AcmeCloud GitHub Org",
            installation_id=payload.installation_id,
            status=ConnectionStatus.ACTIVE,
            connected_by_user_id=membership.user_id,
        )
        db.add(conn)
        await db.flush()

        # Fetch and persist initial repositories
        repos_data = await github_provider.list_repositories(payload.installation_id)
        for r in repos_data:
            repo = Repository(
                organization_id=membership.organization_id,
                source_control_connection_id=conn.id,
                provider_repository_id=r["id"],
                name=r["name"],
                full_name=r["full_name"],
                owner=r["owner"],
                default_branch=r["default_branch"],
                visibility=r["visibility"],
                html_url=r["html_url"],
                language=r["language"],
                archived=r["archived"]
            )
            db.add(repo)
            await db.flush()

            # Seed default branches
            branches = await github_provider.list_branches(payload.installation_id, r["owner"], r["name"])
            for b in branches:
                db.add(RepositoryBranch(
                    organization_id=membership.organization_id,
                    repository_id=repo.id,
                    name=b["name"],
                    commit_sha=b["commit_sha"],
                    is_default=b["is_default"]
                ))

        await db.commit()
        await db.refresh(conn)

        await log_audit_event(
            db=db,
            organization_id=membership.organization_id,
            actor_id=membership.user_id,
            actor_email="user@launchcomply.io",
            action="SOURCE_CONTROL_CONNECTED",
            entity_type="source_control_connection",
            entity_id=conn.id,
            details={"provider": "GITHUB", "installation_id": payload.installation_id}
        )

    return {
        "id": conn.id,
        "provider": conn.provider.value,
        "installation_id": conn.installation_id,
        "status": conn.status.value,
        "connected_at": conn.connected_at.isoformat()
    }

@router.get("/connections")
async def list_connections(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SourceControlConnection).where(
            SourceControlConnection.organization_id == membership.organization_id,
            SourceControlConnection.status == ConnectionStatus.ACTIVE
        )
    )
    return result.scalars().all()

@router.delete("/connections/{connection_id}")
async def disconnect(
    connection_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(SourceControlConnection).where(
            SourceControlConnection.id == connection_id,
            SourceControlConnection.organization_id == membership.organization_id
        )
    )
    conn = result.scalars().first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    conn.status = ConnectionStatus.REVOKED
    await db.commit()

    await log_audit_event(
        db=db,
        organization_id=membership.organization_id,
        actor_id=membership.user_id,
        actor_email="user@launchcomply.io",
        action="SOURCE_CONTROL_DISCONNECTED",
        entity_type="source_control_connection",
        entity_id=conn.id
    )
    return {"status": "DISCONNECTED"}

@router.get("/repositories")
async def list_repositories(
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Repository).where(
            Repository.organization_id == membership.organization_id,
            Repository.selected == True,
            SourceControlConnection.status == ConnectionStatus.ACTIVE,
            SourceControlConnection.organization_id == membership.organization_id,
            Repository.source_control_connection_id == SourceControlConnection.id,
        ).order_by(Repository.name.asc())
    )
    return result.scalars().all()

@router.get("/repositories/{repository_id}/branches")
async def list_branches(
    repository_id: str,
    membership: OrganizationMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(RepositoryBranch).where(
            RepositoryBranch.repository_id == repository_id,
            RepositoryBranch.organization_id == membership.organization_id
        ).order_by(RepositoryBranch.is_default.desc(), RepositoryBranch.name.asc())
    )
    return result.scalars().all()

@router.post("/github/webhook", dependencies=[Depends(require_fixture_provider_environment)])
async def github_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
    x_github_event: Optional[str] = Header(None, alias="X-GitHub-Event")
):
    body_bytes = await request.body()
    if not x_hub_signature_256 or not github_provider.verify_webhook_signature(body_bytes, x_hub_signature_256):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid HMAC-SHA256 signature header")

    payload = await request.json()
    result = await github_provider.handle_webhook(x_github_event or "unknown", payload)
    return {"status": "PROCESSED", "details": result}
