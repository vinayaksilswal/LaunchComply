"""Background hosting monitor: refresh every connected business on an interval.

Runs inside the API process. With several instances, a transaction-scoped
PostgreSQL advisory lock lets only one instance run a cycle; transaction scope
keeps the lock valid behind PgBouncer-style transaction pooling (Neon's pooler).
Disable with HOSTING_MONITOR_INTERVAL_SECONDS=0.
"""
from __future__ import annotations

import asyncio
import logging
import os
import random

from sqlalchemy import select, text

from app.core.database import AsyncSessionLocal, engine
from app.models.hosting import HostingProviderConnection
from app.services.hosting import sync

log = logging.getLogger("launchcomply.hosting.monitor")
LOCK_KEY = 0x4C43_484D  # "LCHM"


def interval_seconds() -> int:
    try:
        value = int(os.getenv("HOSTING_MONITOR_INTERVAL_SECONDS", "300"))
    except ValueError:
        return 300
    return 0 if value <= 0 else max(60, value)


async def run_cycle(interval: int) -> int:
    """Refresh every business whose snapshot is older than the interval. Returns businesses refreshed."""
    async with AsyncSessionLocal() as db:
        organizations = (await db.execute(select(HostingProviderConnection.organization_id).distinct())).scalars().all()
    refreshed = 0
    for organization_id in organizations:
        try:
            async with AsyncSessionLocal() as db:
                result = await sync.refresh_organization(db, organization_id, max(30, interval - 30))
            refreshed += bool(result.get("refreshed"))
        except Exception:  # One business's failure must not stop monitoring for others.
            log.exception("Hosting refresh failed for one organization")
    return refreshed


async def _cycle_with_lock(interval: int) -> None:
    if engine.dialect.name != "postgresql":
        await run_cycle(interval)
        return
    async with engine.connect() as conn:
        async with conn.begin():
            if not (await conn.execute(text("SELECT pg_try_advisory_xact_lock(:key)"), {"key": LOCK_KEY})).scalar():
                return  # Another instance is running this cycle.
            await run_cycle(interval)


async def run_forever() -> None:
    interval = interval_seconds()
    if not interval:
        return
    await asyncio.sleep(random.uniform(15, 45))  # Let startup finish; spread instances apart.
    while True:
        try:
            await _cycle_with_lock(interval)
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("Hosting monitor cycle failed")
        await asyncio.sleep(interval + random.uniform(-10, 10))
