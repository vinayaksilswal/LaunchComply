"""Refresh one business's hosting connections: inventory, links, probes, alerts.

Used by the on-demand API and the background monitor. Provider calls happen
outside any database transaction, and a business is refreshed by at most one
task per process at a time.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditEvent
from app.models.hosting import HostingProviderConnection
from app.services.hosting import monitoring, providers, vault
from app.services.hosting.providers import ProviderError

MONITOR_ACTOR_ID = "hosting-monitor"
MONITOR_ACTOR_EMAIL = "monitor@launchcomply.system"
_locks: dict[str, asyncio.Lock] = {}


def aware(value):
    return value.replace(tzinfo=timezone.utc) if value and value.tzinfo is None else value


async def _collect(row_id, provider, credential, account_ref):
    try:
        async with asyncio.timeout(90):
            return row_id, await providers.inventory(provider, credential, account_ref), None
    except ProviderError as exc:
        return row_id, None, exc.message
    except TimeoutError:
        return row_id, None, f"{providers.LABELS[provider]} inventory timed out."


def _notifiable(alert: dict) -> bool:
    return alert["severity"] == "critical" or (alert["severity"] == "warning" and alert.get("kind") in ("status", "usage"))


def _alert_key(alert: dict) -> str:
    return f"{alert.get('resource_id')}|{alert.get('kind')}"


def alert_transitions(previous: list[dict], current: list[dict]) -> tuple[list[dict], list[dict]]:
    """Alerts that started and alerts that cleared since the previous check."""
    before = {_alert_key(a): a for a in previous if _notifiable(a)}
    after = {_alert_key(a): a for a in current if _notifiable(a)}
    return [a for k, a in after.items() if k not in before], [a for k, a in before.items() if k not in after]


async def refresh_organization(db: AsyncSession, organization_id: str, min_age_seconds: int) -> dict:
    lock = _locks.setdefault(organization_id, asyncio.Lock())
    if lock.locked():
        return {"refreshed": False, "reason": "A refresh is already running."}
    async with lock:
        rows = (await db.execute(select(HostingProviderConnection).where(
            HostingProviderConnection.organization_id == organization_id))).scalars().all()
        if not rows:
            return {"refreshed": False, "reason": "No hosting providers connected."}
        now = datetime.now(timezone.utc)
        if all(r.last_synced_at and (now - aware(r.last_synced_at)).total_seconds() < min_age_seconds for r in rows):
            return {"refreshed": False, "reason": f"Refreshed less than {min_age_seconds}s ago."}
        jobs = []
        for row in rows:
            try:
                jobs.append((row.id, row.provider, vault.open_sealed(row.credential_encrypted), row.account_ref))
            except ValueError as exc:
                row.status, row.last_error = "ERROR", str(exc)
        previous = {r.id: (r.inventory_json, r.health_json) for r in rows}
        await db.commit()  # Never hold a transaction open across provider calls.

        results = await asyncio.gather(*(_collect(*job) for job in jobs))
        fresh = {row_id: inventory for row_id, inventory, _ in results if inventory is not None}
        errors = {row_id: error for row_id, _, error in results if error}
        everything = [r for inventory in fresh.values() for r in inventory]
        for row_id, (inventory, _) in previous.items():
            if row_id not in fresh:  # Unrefreshed connections still serve as link targets.
                everything += [dict(r) for r in inventory or []]
        monitoring.link_resources(everything)
        refreshed = [r for inventory in fresh.values() for r in inventory]
        try:
            async with asyncio.timeout(60):
                probes = await monitoring.check(refreshed)
        except TimeoutError:
            probes = []
        monitoring.apply_probe_status(refreshed, probes)

        opened, resolved = [], []
        for row in (await db.execute(select(HostingProviderConnection).where(
                HostingProviderConnection.organization_id == organization_id).with_for_update())).scalars().all():
            if row.id in fresh:
                ids = {r["id"] for r in fresh[row.id]}
                old_health = previous.get(row.id, (None, None))[1] or {}
                row.inventory_json = fresh[row.id]
                row.health_json = monitoring.health_record(old_health, fresh[row.id], [p for p in probes if p["resource_id"] in ids])
                if old_health:  # The first check establishes a baseline instead of alerting.
                    started, cleared = alert_transitions(old_health.get("alerts") or [], row.health_json["alerts"])
                    opened += [(row, a) for a in started]
                    resolved += [(row, a) for a in cleared]
                row.status, row.last_error, row.last_synced_at = "CONNECTED", None, datetime.now(timezone.utc)
            elif row.id in errors:
                row.status, row.last_error = "ERROR", errors[row.id]
        for row, alert in opened + resolved:
            is_open = (row, alert) in opened
            db.add(AuditEvent(organization_id=organization_id, actor_id=MONITOR_ACTOR_ID, actor_email=MONITOR_ACTOR_EMAIL,
                action="HOSTING_ALERT_OPENED" if is_open else "HOSTING_ALERT_RESOLVED", entity_type="hosting_connection",
                entity_id=row.id, details={"provider": alert["provider"], "resource_id": alert.get("resource_id"),
                    "resource": alert["resource"], "severity": alert["severity"], "message": alert["message"]}))
        await db.commit()
        return {"refreshed": True, "errors": [{"connection_id": k, "message": v} for k, v in errors.items()],
                "alerts_opened": len(opened), "alerts_resolved": len(resolved)}
