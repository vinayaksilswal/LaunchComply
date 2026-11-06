"""Manage and monitor a business's Vercel, Render, Neon and Cloudinary hosting.

Members can view and refresh. Owners/administrators connect providers and run
actions. Every action is explicitly confirmed (HIGH risk requires typing the
resource name) and audit-logged without secret values. Credentials are write-only.
"""
import asyncio
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.architecture_workspace import editor, member
from app.core.database import get_db
from app.models.audit import AuditEvent
from app.models.auth import Organization, User
from app.models.hosting import HostingProviderConnection
from app.models.application import Application
from app.models.source_control import ApplicationRepository, Repository
from app.services.hosting import monitoring, providers, vault
from app.services.hosting.providers import ProviderError

router = APIRouter(prefix="/hosting", tags=["Hosting providers"])
Provider = Literal["VERCEL", "RENDER", "NEON", "CLOUDINARY"]
REFRESH_SECONDS = 20
SCOPE = ("Provider state is read from each provider's API at the last refresh. Health checks are point-in-time HTTPS "
         "requests, not uptime monitoring. Actions run against your real accounts and may change your provider bill.")


def aware(value):
    return value.replace(tzinfo=timezone.utc) if value and value.tzinfo is None else value


def connection_output(row: HostingProviderConnection) -> dict:
    return {"id": row.id, "provider": row.provider, "label": row.label, "account_ref": row.account_ref,
            "account_name": row.account_name, "credential_hint": row.credential_hint, "status": row.status,
            "last_error": row.last_error, "last_verified_at": aware(row.last_verified_at), "last_synced_at": aware(row.last_synced_at),
            "resource_count": len(row.inventory_json or [])}


def failure(exc: ProviderError) -> HTTPException:
    return HTTPException(exc.status if 400 <= exc.status < 500 else providers.PROVIDER_FAILED, exc.message)


async def bounded(coroutine, seconds=60):
    try:
        async with asyncio.timeout(seconds):
            return await coroutine
    except TimeoutError:
        raise HTTPException(providers.PROVIDER_FAILED, "The provider request timed out. LaunchComply did not record a result.") from None


async def audit(db, membership, action, entity_id, details):
    user = await db.get(User, membership.user_id)
    db.add(AuditEvent(organization_id=membership.organization_id, actor_id=membership.user_id, actor_email=user.email,
                      action=action, entity_type="hosting_connection", entity_id=entity_id, details=details))


async def owned(db, membership, connection_id, lock=False):
    query = select(HostingProviderConnection).where(HostingProviderConnection.id == connection_id,
                                                    HostingProviderConnection.organization_id == membership.organization_id)
    if lock:
        query = query.with_for_update()
    row = (await db.execute(query)).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Hosting connection not found in your business.")
    return row


def clean_credentials(provider: str, values: dict[str, Any]) -> dict:
    fields = providers.CREDENTIAL_FIELDS[provider]
    unknown = set(values) - set(fields)
    if unknown:
        raise HTTPException(422, "Unexpected credential field: " + ", ".join(sorted(unknown)))
    clean = {}
    for name, kind in fields.items():
        value = values.get(name)
        if isinstance(value, str):
            value = value.strip()
        if not value:
            if kind != "optional":
                raise HTTPException(422, f"{name} is required for {providers.LABELS[provider]}.")
            continue
        if not isinstance(value, str) or len(value) > 512 or any(c.isspace() for c in value):
            raise HTTPException(422, f"{name} must be a single value without spaces.")
        clean[name] = value
    return clean


def secret_hint(provider: str, credential: dict) -> str:
    secret = next(credential[n] for n, kind in providers.CREDENTIAL_FIELDS[provider].items() if kind == "secret")
    return vault.hint(secret)


@router.get("/providers")
async def catalog(membership=Depends(member)):
    return {"providers": [{"provider": key, "label": providers.LABELS[key], "credential_fields": providers.CREDENTIAL_FIELDS[key],
                           "actions": [a.public() for a in impl.actions.values()]} for key, impl in providers.PROVIDERS.items()],
            "scope": SCOPE}


async def linked_applications(db, organization_id):
    """LaunchComply applications with the GitHub repositories (and folders) they track."""
    rows = (await db.execute(select(Application.id, Application.name, Application.repo_url, Repository.full_name,
                                    ApplicationRepository.root_path)
        .outerjoin(ApplicationRepository, (ApplicationRepository.application_id == Application.id)
                   & (ApplicationRepository.organization_id == organization_id))
        .outerjoin(Repository, (Repository.id == ApplicationRepository.repository_id) & (Repository.organization_id == organization_id))
        .where(Application.organization_id == organization_id))).all()
    apps = {}
    for app_id, name, repo_url, full_name, root_path in rows:
        app = apps.setdefault(app_id, {"id": app_id, "name": name, "repos": []})
        if full_name:
            app["repos"].append({"full_name": full_name, "root_path": root_path})
        fallback, _ = providers.repo_identity(repo_url)
        if fallback and fallback.count("/") == 1 and all(r["full_name"].lower() != fallback.lower() for r in app["repos"]):
            app["repos"].append({"full_name": fallback, "root_path": None})
    return list(apps.values())


@router.get("/overview")
async def overview(membership=Depends(member), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(HostingProviderConnection).where(
        HostingProviderConnection.organization_id == membership.organization_id).order_by(HostingProviderConnection.created_at))).scalars().all()
    resources, alerts, probes, history = [], [], [], []
    for row in rows:
        for resource in row.inventory_json or []:
            resources.append({**resource, "connection_id": row.id})
        health = row.health_json or {}
        alerts += health.get("alerts") or []
        probes += health.get("probes") or []
        history += [{"connection_id": row.id, **point} for point in health.get("history") or []]
        if row.status == "ERROR":
            alerts.append({"severity": "warning", "provider": row.provider, "resource_id": None, "resource": row.label,
                           "message": row.last_error or "Last refresh failed"})
    synced = [aware(r.last_synced_at) for r in rows if r.last_synced_at]
    projects = monitoring.group_projects(resources, await linked_applications(db, membership.organization_id))
    return {"connections": [connection_output(r) for r in rows], "resources": resources, "projects": projects,
            "alerts": alerts, "probes": probes,
            "history": history, "last_synced_at": min(synced) if synced else None,
            "summary": {status: sum(1 for r in resources if r["status"] == status)
                        for status in ("HEALTHY", "DEPLOYING", "DEGRADED", "FAILED", "SUSPENDED", "UNKNOWN")},
            "scope": SCOPE}


class Connect(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    provider: Provider
    label: str = Field(min_length=1, max_length=120)
    credentials: dict[str, Any]


@router.post("/connections")
async def connect(payload: Connect, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    credential = clean_credentials(payload.provider, payload.credentials)
    try:
        account = await bounded(providers.verify(payload.provider, credential), 30)
    except ProviderError as exc:
        raise failure(exc) from None
    await db.execute(select(Organization).where(Organization.id == membership.organization_id).with_for_update())
    existing = (await db.execute(select(HostingProviderConnection).where(
        HostingProviderConnection.organization_id == membership.organization_id, HostingProviderConnection.provider == payload.provider,
        HostingProviderConnection.account_ref == account["account_ref"]))).scalar_one_or_none()
    if existing:
        raise HTTPException(409, "This provider account is already connected. Rotate its credential instead.")
    row = HostingProviderConnection(organization_id=membership.organization_id, provider=payload.provider, label=payload.label,
        account_ref=account["account_ref"], account_name=account.get("account_name"), credential_encrypted=vault.seal(credential),
        credential_hint=secret_hint(payload.provider, credential), status="CONNECTED",
        last_verified_at=datetime.now(timezone.utc), created_by=membership.user_id)
    db.add(row)
    await db.flush()
    await audit(db, membership, "HOSTING_CONNECTED", row.id, {"provider": row.provider, "account": row.account_name or row.account_ref})
    await db.commit()
    return connection_output(row)


class Rotate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    credentials: dict[str, Any]


@router.put("/connections/{connection_id}/credentials")
async def rotate(connection_id: str, payload: Rotate, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    row = await owned(db, membership, connection_id)
    credential = clean_credentials(row.provider, payload.credentials)
    provider, previous_ref = row.provider, row.account_ref
    await db.commit()
    try:
        account = await bounded(providers.verify(provider, credential), 30)
    except ProviderError as exc:
        raise failure(exc) from None
    if account["account_ref"] != previous_ref:
        raise HTTPException(409, "The new credential belongs to a different account. Connect it separately.")
    row = await owned(db, membership, connection_id, lock=True)
    row.credential_encrypted, row.credential_hint = vault.seal(credential), secret_hint(provider, credential)
    row.status, row.last_error, row.last_verified_at = "CONNECTED", None, datetime.now(timezone.utc)
    await audit(db, membership, "HOSTING_CREDENTIAL_ROTATED", row.id, {"provider": provider})
    await db.commit()
    return connection_output(row)


@router.delete("/connections/{connection_id}")
async def disconnect(connection_id: str, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    row = await owned(db, membership, connection_id, lock=True)
    await audit(db, membership, "HOSTING_DISCONNECTED", row.id, {"provider": row.provider, "account": row.account_name or row.account_ref})
    await db.delete(row)
    await db.commit()
    return {"disconnected": True, "note": "LaunchComply deleted its stored credential and snapshot. Nothing was changed at the provider; revoke the token there too."}


async def collect(row_id, provider, credential, account_ref):
    try:
        return row_id, await bounded(providers.inventory(provider, credential, account_ref), 90), None
    except ProviderError as exc:
        return row_id, None, exc.message
    except HTTPException as exc:
        return row_id, None, exc.detail


@router.post("/refresh")
async def refresh(membership=Depends(member), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(HostingProviderConnection).where(
        HostingProviderConnection.organization_id == membership.organization_id))).scalars().all()
    if not rows:
        raise HTTPException(409, "Connect a hosting provider first.")
    current = datetime.now(timezone.utc)
    if all(r.last_synced_at and (current - aware(r.last_synced_at)).total_seconds() < REFRESH_SECONDS for r in rows):
        return {"refreshed": False, "reason": f"Refreshed less than {REFRESH_SECONDS}s ago."}
    jobs = []
    for row in rows:
        try:
            jobs.append((row.id, row.provider, vault.open_sealed(row.credential_encrypted), row.account_ref))
        except ValueError as exc:
            row.status, row.last_error = "ERROR", str(exc)
    previous = {r.id: (r.inventory_json, r.health_json) for r in rows}
    await db.commit()  # Do not hold a transaction open across provider calls.

    results = await asyncio.gather(*(collect(*job) for job in jobs))
    fresh = {row_id: inventory for row_id, inventory, error in results if inventory is not None}
    everything = [res for inventory in fresh.values() for res in inventory]
    # Unrefreshed connections keep their last snapshot as link targets.
    for row_id, (inventory, _) in previous.items():
        if row_id not in fresh:
            everything += [dict(r) for r in inventory or []]
    monitoring.link_resources(everything)
    probes = await bounded(monitoring.check([r for inventory in fresh.values() for r in inventory]), 60)
    monitoring.apply_probe_status([r for inventory in fresh.values() for r in inventory], probes)

    errors = {row_id: error for row_id, inventory, error in results if error}
    for row in (await db.execute(select(HostingProviderConnection).where(
            HostingProviderConnection.organization_id == membership.organization_id).with_for_update())).scalars().all():
        if row.id in fresh:
            ids = {r["id"] for r in fresh[row.id]}
            row.inventory_json = fresh[row.id]
            row.health_json = monitoring.health_record(previous.get(row.id, (None, None))[1], fresh[row.id],
                                                       [p for p in probes if p["resource_id"] in ids])
            row.status, row.last_error, row.last_synced_at = "CONNECTED", None, datetime.now(timezone.utc)
        elif row.id in errors:
            row.status, row.last_error = "ERROR", errors[row.id]
    await db.commit()
    return {"refreshed": True, "errors": [{"connection_id": k, "message": v} for k, v in errors.items()]}


class RunAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    resource_id: str = Field(min_length=1, max_length=120)
    action: str = Field(min_length=1, max_length=40)
    params: dict[str, Any] = Field(default_factory=dict)
    confirm: bool = False
    confirm_name: str | None = Field(default=None, max_length=255)


@router.post("/connections/{connection_id}/actions")
async def run_action(connection_id: str, payload: RunAction, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    row = await owned(db, membership, connection_id)
    impl = providers.PROVIDERS[row.provider]
    action = impl.actions.get(payload.action)
    if not action:
        raise HTTPException(422, f"{providers.LABELS[row.provider]} has no action named {payload.action}.")
    resource = next((r for r in row.inventory_json or [] if r.get("id") == payload.resource_id), None)
    if not resource:
        raise HTTPException(404, "Resource not found in the last refresh. Refresh and try again.")
    if resource["kind"] not in action.kinds:
        raise HTTPException(422, f"{action.label} does not apply to this {resource['kind'].replace('_', ' ')}.")
    if not payload.confirm:
        raise HTTPException(428, "Confirm this action before LaunchComply sends it to the provider.")
    if action.risk == "HIGH" and payload.confirm_name != resource["name"]:
        raise HTTPException(428, f"Type the resource name exactly ({resource['name']}) to confirm this high-risk action.")
    try:
        params = providers.validate(action, payload.params)
        credential = vault.open_sealed(row.credential_encrypted)
    except ProviderError as exc:
        raise failure(exc) from None
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from None
    provider, label = row.provider, row.label
    await db.commit()
    details = {"provider": provider, "resource_id": resource["id"], "resource": resource["name"], "action": action.name,
               "risk": action.risk, "params": {k: v for k, v in params.items() if k != "value"}}
    try:
        result = await bounded(providers.execute(provider, credential, action.name, resource, params), 60)
    except ProviderError as exc:
        await audit(db, membership, "HOSTING_ACTION_FAILED", connection_id, {**details, "error": exc.message})
        await db.commit()
        raise failure(exc) from None
    await audit(db, membership, "HOSTING_ACTION", connection_id, {**details, "result": result.get("message")})
    await db.commit()
    return {"ok": True, "connection": label, **result}
