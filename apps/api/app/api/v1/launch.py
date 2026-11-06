"""Guided launch: take an analyzed app live on Vercel, Render and Neon.

Members can view the plan. Owners/administrators create resources and connect
parts, each only with explicit confirmation; every step is audit-logged
without secret values. Resources are created on free plans in the customer's
own provider accounts.
"""
import re
from typing import Literal
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.architecture_workspace import application, editor, latest, member
from app.api.v1.hosting import audit, overview as hosting_overview
from app.core.database import get_db
from app.models.hosting import HostingProviderConnection
from app.services.architecture.workspace_state import effective_spec
from app.services.hosting import providers, sync, vault
from app.services.hosting.providers import ProviderError
from app.services.launch import plan as planner, provision

router = APIRouter(prefix="/launch", tags=["Guided launch"])
NAME = re.compile(r"^[a-z0-9][a-z0-9-]{1,47}$")
COMMAND = re.compile(r"^[^\r\n\x00]{1,300}$")
SIGNUP = {"VERCEL": "https://vercel.com/signup", "RENDER": "https://dashboard.render.com/register",
          "NEON": "https://console.neon.tech/signup", "CLOUDINARY": "https://cloudinary.com/users/register_free"}
GITHUB_ACCESS = {"VERCEL": "https://vercel.com/account/settings/authentication",
                 "RENDER": "https://dashboard.render.com/select-repo?type=web"}


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9-]+", "-", text.lower()).strip("-")[:40] or "my-app"


async def connections(db, organization_id):
    rows = (await db.execute(select(HostingProviderConnection).where(HostingProviderConnection.organization_id == organization_id,
        HostingProviderConnection.status == "CONNECTED").order_by(HostingProviderConnection.created_at))).scalars().all()
    found = {}
    for row in rows:
        found.setdefault(row.provider, row)
    return found


async def build(db, membership, application_id):
    app = await application(db, application_id, membership)
    arch = await latest(db, app)
    evidence = effective_spec(arch).get("evidence") if arch else None
    plan = planner.build_plan(evidence)
    for part in plan["parts"]:
        if part["role"] == "database":
            part["suggested_name"] = f"{slug(app.name)}-db"
    live = await hosting_overview(membership, db)
    planner.attach_status(plan, live["resources"])
    linked = await connections(db, membership.organization_id)
    needed = sorted({p["provider"] for p in plan["parts"]})
    accounts = [{"provider": p, "label": providers.LABELS[p], "connected": p in linked,
                 "account": (linked[p].account_name or linked[p].account_ref) if p in linked else None,
                 "signup_url": SIGNUP[p], "github_access_url": GITHUB_ACCESS.get(p)} for p in needed]
    parts = plan["parts"]
    if not plan["analyzed"]:
        step = "analyze"
    elif not all(a["connected"] for a in accounts):
        step = "accounts"
    elif not all(p["live"] for p in parts if p["role"] != "media"):
        step = "create"
    else:
        step = "live"
    return app, plan, linked, {"application": {"id": app.id, "name": app.name}, "step": step, "accounts": accounts,
        "parts": parts, "repositories": plan["repositories"], "scope": plan["scope"],
        "regions": {"RENDER": list(provision.RENDER_REGIONS), "NEON": list(provision.NEON_REGIONS)},
        "free_plan_note": "New resources use each provider's free plan. Free Render services sleep after inactivity and wake on the next visit; you can upgrade later at the provider."}


@router.get("/{application_id}")
async def launch_plan(application_id: str, membership=Depends(member), db: AsyncSession = Depends(get_db)):
    return (await build(db, membership, application_id))[3]


class CreatePart(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    confirm: bool = False
    name: str = Field(min_length=2, max_length=48)
    region: str | None = Field(default=None, max_length=40)
    build_command: str | None = Field(default=None, max_length=300)
    start_command: str | None = Field(default=None, max_length=300)


@router.post("/{application_id}/parts/{part_id}")
async def create_part(application_id: str, part_id: str, payload: CreatePart, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app, plan, linked, _ = await build(db, membership, application_id)
    part = next((p for p in plan["parts"] if p["id"] == part_id), None)
    if not part:
        raise HTTPException(404, "That part is not in this app's launch plan. Re-run the code analysis if your app changed.")
    if part["live"]:
        raise HTTPException(409, f"This part is already running as {part['live']['name']}.")
    if part["role"] == "media":
        raise HTTPException(409, "Create a free Cloudinary account and connect it in Providers; there is nothing to create here.")
    if not payload.confirm:
        raise HTTPException(428, "Confirm that LaunchComply may create this on your account.")
    if not NAME.match(payload.name):
        raise HTTPException(422, "Use 2–48 lowercase letters, digits and dashes for the name.")
    for command in (payload.build_command, payload.start_command):
        if command is not None and not COMMAND.match(command):
            raise HTTPException(422, "Commands must be a single line of up to 300 characters.")
    row = linked.get(part["provider"])
    if not row:
        raise HTTPException(409, f"Connect your {providers.LABELS[part['provider']]} account first.")
    try:
        credential = vault.open_sealed(row.credential_encrypted)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from None
    await db.commit()
    try:
        if part["role"] == "frontend":
            result = await provision.create_vercel_project(credential, part, payload.name)
        elif part["role"] == "backend":
            result = await provision.create_render_service(credential, row.account_ref, part, payload.name, payload.region or "singapore",
                                                           payload.build_command or part.get("build_command"), payload.start_command or part.get("start_command"))
        else:
            result = await provision.create_neon_project(credential, payload.name, payload.region or "aws-ap-southeast-1")
    except ProviderError as exc:
        await audit(db, membership, "LAUNCH_PART_FAILED", row.id, {"application_id": app.id, "role": part["role"], "name": payload.name, "error": exc.message})
        await db.commit()
        raise HTTPException(exc.status if 400 <= exc.status < 500 else providers.PROVIDER_FAILED, exc.message) from None
    await audit(db, membership, "LAUNCH_PART_CREATED", row.id, {"application_id": app.id, "role": part["role"], "provider": part["provider"],
        "name": payload.name, "resource_id": result.get("resource_id"), "repo": part.get("repo"), "root_dir": part.get("root_dir")})
    await db.commit()
    await sync.refresh_organization(db, membership.organization_id, 0)
    return {"ok": True, **result}


class ConnectParts(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    confirm: bool = False
    api_url: str | None = Field(default=None, max_length=300)


@router.post("/{application_id}/connect")
async def connect_parts(application_id: str, payload: ConnectParts, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    app, plan, linked, _ = await build(db, membership, application_id)
    if not payload.confirm:
        raise HTTPException(428, "Confirm that LaunchComply may update settings and redeploy your app.")
    parts = {p["role"]: p for p in reversed(plan["parts"])}
    backend, frontend, database, media = (parts.get(r) for r in ("backend", "frontend", "database", "media"))
    live = {r["id"]: r for r in (await hosting_overview(membership, db))["resources"]}
    done, skipped = [], []
    try:
        if backend and backend["live"]:
            service, values = live[backend["live"]["resource_id"]], {}
            if database and database["live"] and "NEON" in linked:
                values[backend["database_url_key"]] = await provision.neon_connection_uri(
                    vault.open_sealed(linked["NEON"].credential_encrypted), database["live"]["resource_id"])
            if media and media["live"] and "CLOUDINARY" in linked:
                values.update(provision.cloudinary_env(vault.open_sealed(linked["CLOUDINARY"].credential_encrypted), backend["env_keys"]))
            if values:
                await provision.set_render_env(vault.open_sealed(linked["RENDER"].credential_encrypted), service["id"], values)
                done.append(f"Gave {service['name']} its " + ", ".join(sorted(values)) + " and started a new deploy.")
            else:
                skipped.append("The backend has nothing to connect yet (no database or media service running).")
        if frontend and frontend["live"] and backend and backend["live"]:
            service, project = live[backend["live"]["resource_id"]], live[frontend["live"]["resource_id"]]
            key = frontend["api_url_key"]
            target = payload.api_url or (service.get("urls") or [None])[0]
            if not key:
                skipped.append("Your website code does not read an API address variable, so nothing was set on Vercel.")
            elif not target:
                skipped.append("The backend has no public address yet. Try again when its first deploy finishes.")
            else:
                host = urlparse(target).hostname
                if urlparse(target).scheme != "https" or not host or not any(providers.host_of(u) == providers.normalize_host(host) for u in service.get("urls") or []):
                    raise HTTPException(422, "The API address must be an https:// address of your Render backend.")
                await provision.set_vercel_env_and_redeploy(vault.open_sealed(linked["VERCEL"].credential_encrypted), project, key, target)
                done.append(f"Set {key} on {project['name']} to {target} and started a new deployment.")
    except ProviderError as exc:
        raise HTTPException(exc.status if 400 <= exc.status < 500 else providers.PROVIDER_FAILED, exc.message) from None
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from None
    await audit(db, membership, "LAUNCH_PARTS_CONNECTED", linked[next(iter(linked))].id if linked else None,
                {"application_id": app.id, "done": done, "skipped": skipped})
    await db.commit()
    return {"ok": True, "done": done, "skipped": skipped}
