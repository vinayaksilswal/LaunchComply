"""Guided launch: take an analyzed app live on Vercel, Render and Neon.

Members can view the plan. Owners/administrators create resources and connect
parts, each only with explicit confirmation of the exact reviewed plan.

Creation is retry-safe: a LaunchStep row is committed before a provider is
contacted. A timeout or crash leaves an AMBIGUOUS/CREATING row that is
reconciled against the provider (by the exact requested name) before any new
attempt, so a resource is never created twice. Secret values are moved
provider-to-provider server-side and redacted from any error text.
"""
import asyncio
import re
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.architecture_workspace import application, editor, latest, member
from app.api.v1.hosting import audit, overview as hosting_overview
from app.core.database import get_db
from app.models.hosting import HostingProviderConnection
from app.models.launch import LaunchStep
from app.services.architecture.workspace_state import effective_spec
from app.services.hosting import providers, sync, vault
from app.services.hosting.providers import ProviderError
from app.services.launch import plan as planner, provision

router = APIRouter(prefix="/launch", tags=["Guided launch"])
NAME = re.compile(r"^[a-z0-9][a-z0-9-]{1,47}$")
COMMAND = re.compile(r"^[^\r\n\x00]{1,300}$")
STALE_ATTEMPT = timedelta(minutes=5)
CREATE_BUDGET_SECONDS = 90
SIGNUP = {"VERCEL": "https://vercel.com/signup", "RENDER": "https://dashboard.render.com/register",
          "NEON": "https://console.neon.tech/signup", "CLOUDINARY": "https://cloudinary.com/users/register_free"}
GITHUB_ACCESS = {"VERCEL": "https://vercel.com/account/settings/authentication",
                 "RENDER": "https://dashboard.render.com/select-repo?type=web"}


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9-]+", "-", text.lower()).strip("-")[:40] or "my-app"


def aware(value):
    return value.replace(tzinfo=timezone.utc) if value and value.tzinfo is None else value


async def provider_accounts(db, organization_id) -> dict[str, list[HostingProviderConnection]]:
    rows = (await db.execute(select(HostingProviderConnection).where(HostingProviderConnection.organization_id == organization_id,
        HostingProviderConnection.status == "CONNECTED").order_by(HostingProviderConnection.created_at))).scalars().all()
    found: dict[str, list] = {}
    for row in rows:
        found.setdefault(row.provider, []).append(row)
    return found


def step_output(step: LaunchStep | None):
    if not step:
        return None
    status = step.status
    if status == "CREATING" and datetime.now(timezone.utc) - aware(step.attempt_started_at) > STALE_ATTEMPT:
        status = "AMBIGUOUS"
    return {"status": status, "name": step.resource_name, "provider_resource_id": step.provider_resource_id,
            "error": step.error, "connection_id": step.connection_id, "updated_at": aware(step.updated_at)}


async def build(db, membership, application_id):
    app = await application(db, application_id, membership)
    arch = await latest(db, app)
    evidence = effective_spec(arch).get("evidence") if arch else None
    source_changed = bool(arch and getattr(arch, "_workspace_source_changed", False))
    plan = planner.build_plan(evidence)
    for part in plan["parts"]:
        if part["role"] == "database":
            part["suggested_name"] = f"{slug(app.name)}-db"
    live = await hosting_overview(membership, db)
    steps = {s.part_id: s for s in (await db.execute(select(LaunchStep).where(LaunchStep.organization_id == membership.organization_id,
        LaunchStep.application_id == app.id))).scalars().all()}
    # A recorded provider ID is the strongest link between a part and a running resource.
    resources = live["resources"]
    for part in plan["parts"]:
        step = steps.get(part["id"])
        recorded = step and step.status == "CREATED" and next((r for r in resources if r["id"] == step.provider_resource_id), None)
        if recorded:
            part["_recorded"] = recorded
    planner.attach_status(plan, resources)
    for part in plan["parts"]:
        recorded = part.pop("_recorded", None)
        if recorded and not part["live"]:
            part["live"] = {"resource_id": recorded["id"], "connection_id": recorded.get("connection_id"), "name": recorded["name"],
                            "status": recorded["status"], "status_detail": recorded.get("status_detail"), "urls": recorded.get("urls") or [],
                            "uptime_24h": recorded.get("uptime_24h")}
    accounts_by_provider = await provider_accounts(db, membership.organization_id)
    needed = sorted({p["provider"] for p in plan["parts"]})
    accounts = [{"provider": p, "label": providers.LABELS[p], "connected": bool(accounts_by_provider.get(p)),
                 "account": (accounts_by_provider[p][0].account_name or accounts_by_provider[p][0].account_ref) if accounts_by_provider.get(p) else None,
                 "connections": [{"id": c.id, "label": c.label, "account": c.account_name or c.account_ref} for c in accounts_by_provider.get(p, [])],
                 "signup_url": SIGNUP[p], "github_access_url": GITHUB_ACCESS.get(p)} for p in needed]
    for part in plan["parts"]:
        options = accounts_by_provider.get(part["provider"], [])
        default = options[0].id if len(options) == 1 else None
        part["connection_id"] = default
        part["fingerprint"] = planner.fingerprint(part, default)
        part["blockers"], part["warnings"] = planner.readiness(part, plan["parts"], source_changed)
        part["step"] = step_output(steps.get(part["id"]))
    parts = plan["parts"]
    if not plan["analyzed"]:
        step = "analyze"
    elif not all(a["connected"] for a in accounts):
        step = "accounts"
    elif not all(p["live"] for p in parts if p["role"] != "media"):
        step = "create"
    else:
        step = "live"
    return app, plan, accounts_by_provider, steps, {"application": {"id": app.id, "name": app.name}, "step": step, "accounts": accounts,
        "parts": parts, "repositories": plan["repositories"], "scope": plan["scope"], "source_changed": source_changed,
        "regions": {"RENDER": list(provision.RENDER_REGIONS), "NEON": list(provision.NEON_REGIONS)},
        "free_plan_note": "New resources start on each provider's free plan where one exists. Free plans have limits (Render free services sleep "
                          "when idle and wake on the next visit). Check them before relying on them for paying customers; upgrades happen only at the provider."}


@router.get("/{application_id}")
async def launch_plan(application_id: str, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    return (await build(db, membership, application_id))[4]


class CreatePart(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    confirm: bool = False
    fingerprint: str = Field(min_length=64, max_length=64)
    connection_id: str | None = Field(default=None, max_length=36)
    name: str = Field(min_length=2, max_length=48)
    region: str | None = Field(default=None, max_length=40)
    build_command: str | None = Field(default=None, max_length=300)
    start_command: str | None = Field(default=None, max_length=300)


async def _create(part, credential, row, payload):
    if part["role"] == "frontend":
        return await provision.create_vercel_project(credential, part, payload.name)
    if part["role"] == "backend":
        return await provision.create_render_service(credential, row.account_ref, part, payload.name, payload.region or "singapore",
                                                     payload.build_command or part.get("build_command"), payload.start_command or part.get("start_command"))
    return await provision.create_neon_project(credential, payload.name, payload.region or "aws-ap-southeast-1")


def _http(exc: ProviderError) -> HTTPException:
    return HTTPException(exc.status if 400 <= exc.status < 500 else providers.PROVIDER_FAILED, exc.message)


@router.post("/{application_id}/parts/{part_id}")
async def create_part(application_id: str, part_id: str, payload: CreatePart, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app, plan, accounts, steps, view = await build(db, membership, application_id)
    part = next((p for p in plan["parts"] if p["id"] == part_id), None)
    if not part:
        raise HTTPException(404, "That part is not in this app's launch plan. Run the code analysis again if your app changed.")
    if part["role"] == "media":
        raise HTTPException(409, "Create a free Cloudinary account and connect it in step 2; there is nothing to create here.")
    if part["live"]:
        raise HTTPException(409, f"This part is already running as {part['live']['name']}.")
    if not payload.confirm:
        raise HTTPException(428, "Confirm that LaunchComply may create this on your account.")
    options = accounts.get(part["provider"], [])
    row = next((c for c in options if c.id == payload.connection_id), None) if payload.connection_id else (options[0] if len(options) == 1 else None)
    if not options:
        raise HTTPException(409, f"Connect your {providers.LABELS[part['provider']]} account first.")
    if not row:
        raise HTTPException(422, f"Choose which {providers.LABELS[part['provider']]} account to use.")
    # The fingerprint the owner saw must match what would be created now (source, target, account set).
    if payload.fingerprint != part["fingerprint"]:
        raise HTTPException(409, "The launch plan changed since you reviewed it. Reload the page and check it again.")
    if not NAME.match(payload.name):
        raise HTTPException(422, "Use 2–48 lowercase letters, digits and dashes for the name.")
    for command in (payload.build_command, payload.start_command):
        if command is not None and not COMMAND.match(command):
            raise HTTPException(422, "Commands must be a single line of up to 300 characters.")
    blockers, _ = planner.readiness(part, plan["parts"], view["source_changed"], payload.start_command or part.get("start_command"))
    if blockers:
        raise HTTPException(409, blockers[0])
    try:
        credential = vault.open_sealed(row.credential_encrypted)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from None

    step = steps.get(part["id"])
    now = datetime.now(timezone.utc)
    if step and step.status == "CREATING" and now - aware(step.attempt_started_at) <= STALE_ATTEMPT:
        raise HTTPException(409, "This part is being created right now. Wait a moment, then reload.")
    if step and (step.status in ("AMBIGUOUS", "CREATING") or step.status == "CREATED"):
        # Reconcile before any new attempt: the earlier request may have succeeded.
        found = await _lookup(part["provider"], credential, row.account_ref, step.resource_name)
        if found:
            step.status, step.provider_resource_id, step.error = "CREATED", found, None
            await db.commit()
            await sync.refresh_organization(db, membership.organization_id, 0)
            return {"ok": True, "reconciled": True, "resource_id": found,
                    "message": f"{step.resource_name} already exists from your earlier attempt, so nothing new was created."}
    try:
        taken = await provision.find_by_name(part["provider"], credential, row.account_ref, payload.name)
    except ProviderError as exc:
        raise _http(exc) from None
    if taken:
        raise HTTPException(409, f"Your {providers.LABELS[part['provider']]} account already has something named {payload.name}. "
                                 "Choose another name. To use the existing one, open Current hosting instead.")

    fingerprint = planner.fingerprint(part, row.id)
    if step:
        step.status, step.resource_name, step.connection_id, step.fingerprint = "CREATING", payload.name, row.id, fingerprint
        step.provider_resource_id, step.error, step.attempt_started_at, step.created_by = None, None, now, membership.user_id
    else:
        step = LaunchStep(organization_id=membership.organization_id, application_id=app.id, part_id=part["id"], role=part["role"],
            provider=part["provider"], connection_id=row.id, resource_name=payload.name, fingerprint=fingerprint, status="CREATING",
            attempt_started_at=now, created_by=membership.user_id)
        db.add(step)
    try:
        await db.commit()  # Durable intent before any provider call.
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "This part is being created right now. Wait a moment, then reload.") from None
    step_id = step.id

    try:
        async with asyncio.timeout(CREATE_BUDGET_SECONDS):
            result = await _create(part, credential, row, payload)
        outcome, error = "CREATED", None
    except TimeoutError:
        result, outcome, error = None, "AMBIGUOUS", "The provider took too long to answer. LaunchComply will check before trying again."
    except ProviderError as exc:
        result = None
        outcome, error = ("AMBIGUOUS", exc.message + " LaunchComply will check before trying again.") if exc.ambiguous else ("FAILED", exc.message)

    step = await db.get(LaunchStep, step_id)
    step.status, step.error = outcome, error
    if result:
        step.provider_resource_id = result.get("resource_id")
    action = {"CREATED": "LAUNCH_PART_CREATED", "FAILED": "LAUNCH_PART_FAILED", "AMBIGUOUS": "LAUNCH_PART_UNCONFIRMED"}[outcome]
    await audit(db, membership, action, row.id, {"application_id": app.id, "role": part["role"], "provider": part["provider"],
        "name": payload.name, "resource_id": step.provider_resource_id, "repo": part.get("repo"), "root_dir": part.get("root_dir"),
        **({"error": error} if error else {})})
    await db.commit()
    if outcome == "FAILED":
        raise HTTPException(422 if "refused" in (error or "") or "rejected" in (error or "") else providers.PROVIDER_FAILED, error)
    if outcome == "AMBIGUOUS":
        return JSONResponse(status_code=202, content={"ok": False, "status": "AMBIGUOUS", "message": error})
    await sync.refresh_organization(db, membership.organization_id, 0)
    return {"ok": True, "status": "CREATED", **result}


async def _lookup(provider, credential, owner_id, name):
    try:
        return await provision.find_by_name(provider, credential, owner_id, name)
    except ProviderError as exc:
        raise _http(exc) from None


@router.post("/{application_id}/parts/{part_id}/check")
async def check_part(application_id: str, part_id: str, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    """Resolve an unconfirmed create by asking the provider whether it exists."""
    app, plan, accounts, steps, _ = await build(db, membership, application_id)
    step = steps.get(part_id)
    if not step or step.status not in ("AMBIGUOUS", "CREATING"):
        raise HTTPException(409, "There is nothing to check for this part.")
    row = next((c for options in accounts.values() for c in options if c.id == step.connection_id), None)
    if not row:
        raise HTTPException(409, "The account used for this step is no longer connected. Reconnect it, then check again.")
    try:
        credential = vault.open_sealed(row.credential_encrypted)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from None
    found = await _lookup(step.provider, credential, row.account_ref, step.resource_name)
    step = await db.get(LaunchStep, step.id)
    if found:
        step.status, step.provider_resource_id, step.error = "CREATED", found, None
        message = f"{step.resource_name} was created. You can continue."
    else:
        step.status, step.error = "FAILED", "It was not created. You can try again safely."
        message = step.error
    await audit(db, membership, "LAUNCH_PART_RECONCILED", row.id, {"application_id": app.id, "part_id": part_id, "found": bool(found)})
    await db.commit()
    if found:
        await sync.refresh_organization(db, membership.organization_id, 0)
    return {"ok": bool(found), "status": step.status, "message": message}


class ConnectParts(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    confirm: bool = False
    api_url: str | None = Field(default=None, max_length=300)


@router.post("/{application_id}/connect")
async def connect_parts(application_id: str, payload: ConnectParts, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app, plan, accounts, _, _ = await build(db, membership, application_id)
    if not payload.confirm:
        raise HTTPException(428, "Confirm that LaunchComply may update settings and redeploy your app.")
    parts = {p["role"]: p for p in reversed(plan["parts"])}
    backend, frontend, database, media = (parts.get(r) for r in ("backend", "frontend", "database", "media"))
    live = {r["id"]: r for r in (await hosting_overview(membership, db))["resources"]}

    def account(provider, resource_part):
        connection_id = (resource_part or {}).get("live", {}).get("connection_id") if resource_part and resource_part.get("live") else None
        options = accounts.get(provider, [])
        return next((c for c in options if c.id == connection_id), options[0] if options else None)

    done, skipped, secrets = [], [], []
    try:
        if backend and backend["live"]:
            service, values = live[backend["live"]["resource_id"]], {}
            neon = account("NEON", database)
            if database and database["live"] and neon:
                uri = await provision.neon_connection_uri(vault.open_sealed(neon.credential_encrypted), database["live"]["resource_id"])
                secrets.append(uri)
                values[backend["database_url_key"]] = uri
            cloud = account("CLOUDINARY", media)
            if media and media["live"] and cloud:
                cloud_values = provision.cloudinary_env(vault.open_sealed(cloud.credential_encrypted), backend["env_keys"])
                secrets.extend(cloud_values.values())
                values.update(cloud_values)
            if values:
                await provision.set_render_env(vault.open_sealed(account("RENDER", backend).credential_encrypted), service["id"], values)
                done.append(f"Gave {service['name']} its " + ", ".join(sorted(values)) + " and started a new deploy.")
            else:
                skipped.append("The backend has nothing to connect yet (no database or media service running).")
        if frontend and frontend["live"] and backend and backend["live"]:
            service, project = live[backend["live"]["resource_id"]], live[frontend["live"]["resource_id"]]
            key = frontend["api_url_key"]
            target = payload.api_url or (service.get("urls") or [None])[0]
            if not key:
                skipped.append("Your website code does not read an API address setting, so nothing was set on Vercel.")
            elif not target:
                skipped.append("The backend has no public address yet. Try again when its first deploy finishes.")
            else:
                host = urlparse(target).hostname
                if urlparse(target).scheme != "https" or not host or not any(providers.host_of(u) == providers.normalize_host(host) for u in service.get("urls") or []):
                    raise HTTPException(422, "The API address must be an https:// address of your Render backend.")
                await provision.set_vercel_env_and_redeploy(vault.open_sealed(account("VERCEL", frontend).credential_encrypted), project, key, target)
                done.append(f"Set {key} on {project['name']} to {target} and started a new deployment.")
    except ProviderError as exc:
        raise HTTPException(exc.status if 400 <= exc.status < 500 else providers.PROVIDER_FAILED, provision.redact(exc.message, secrets)) from None
    except ValueError as exc:
        raise HTTPException(409, provision.redact(str(exc), secrets)) from None
    first = next((c for options in accounts.values() for c in options), None)
    await audit(db, membership, "LAUNCH_PARTS_CONNECTED", first.id if first else None, {"application_id": app.id, "done": done, "skipped": skipped})
    await db.commit()
    return {"ok": True, "done": done, "skipped": skipped}
