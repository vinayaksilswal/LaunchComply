"""Business-scoped source links shared by onboarding and architecture inspection."""
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.source_control import Repository, ApplicationRepository, SourceControlConnection, ConnectionStatus

MAX_REPOSITORIES = 6

async def accessible_repositories(db, organization_id, identifiers):
    if not identifiers or len(identifiers) > MAX_REPOSITORIES or len(set(identifiers)) != len(identifiers):
        raise HTTPException(422, "Choose between one and six different repositories.")
    records = (await db.execute(select(Repository).join(SourceControlConnection).where(
        Repository.id.in_(identifiers), Repository.organization_id == organization_id,
        Repository.selected == True, Repository.archived == False,
        SourceControlConnection.organization_id == organization_id,
        SourceControlConnection.status == ConnectionStatus.ACTIVE))).scalars().all()
    lookup = {record.id: record for record in records}
    if len(lookup) != len(identifiers):
        raise HTTPException(404, "Choose accessible repositories from your connected GitHub accounts.")
    return [lookup[identifier] for identifier in identifiers]

async def linked_repositories(db, application_id, organization_id):
    return (await db.execute(select(Repository).options(selectinload(Repository.connection))
        .join(ApplicationRepository, ApplicationRepository.repository_id == Repository.id)
        .where(ApplicationRepository.application_id == application_id,
            ApplicationRepository.organization_id == organization_id, Repository.organization_id == organization_id)
        .order_by(ApplicationRepository.is_primary.desc(), Repository.full_name))).scalars().all()

def repository_summary(repository):
    return {"id": repository.id, "full_name": repository.full_name, "url": repository.html_url,
        "branch": repository.default_branch, "visibility": repository.visibility,
        "last_synced_at": repository.last_synced_at, "archived": repository.archived,
        "accessible": bool(repository.selected and not repository.archived and repository.connection.status == ConnectionStatus.ACTIVE)}
