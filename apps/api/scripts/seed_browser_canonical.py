"""Install one native-format fixture in a disposable Playwright SQLite database.

No HTTP endpoint; refuses every database outside the owned local fixture path.
"""
import argparse
import asyncio
import os
from pathlib import Path
import re
import uuid

API = Path(__file__).resolve().parents[1]


def test_database(value):
    path = Path(value).resolve()
    if (path.parent != (API / ".test_tmp").resolve() or
        not re.fullmatch(r"playwright-[a-f0-9-]{36}\.db", path.name) or not path.is_file()):
        raise ValueError("Only an existing isolated Playwright database is allowed")
    if os.environ.get("ENVIRONMENT") != "test" or os.environ.get("DEMO_MODE") != "true":
        raise ValueError("Explicit browser test environment is required")
    return path


async def seed(base_id, *, future=False):
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal, engine
    from app.models import Architecture, Application
    from app.services.architecture.design_adapter import from_legacy
    from app.services.architecture.workspace_state import record_head
    from app.services.architecture.saved_designs import latest_saved
    try:
        async with AsyncSessionLocal() as db:
            base = await db.get(Architecture, base_id)
            if not base: raise ValueError("Fixture base not found")
            app = (await db.execute(select(Application).where(Application.id == base.application_id).with_for_update())).scalar_one()
            if (await latest_saved(db, app)).id != base_id:
                raise ValueError("Fixture head changed")
            identifier = str(uuid.uuid4())
            design = from_legacy(base.spec_json, revision_id=identifier, organization_id=base.organization_id,
                application_id=base.application_id, parent_revision_id=base.id).model_dump(mode="json")
            first = design["view_state"]["node_order"][0]
            design["view_state"]["node_positions"][first]["pinned"] = True
            design["resources_by_id"][first]["label"] = "Native business network"
            design["extensions"]["customer.notes"] = {"version": 7, "data": {"keep": "Browser fixture"}}
            if future: design["schema_version"] = 99
            arch = Architecture(id=identifier, application_id=base.application_id, organization_id=base.organization_id,
                name=base.name, version=f"v{int(base.version.removeprefix('v')) + 1}", status="DRAFT", spec_json=design)
            db.add(arch)
            await record_head(db, app, arch)
            await db.commit()
    finally:
        await engine.dispose()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("database")
    parser.add_argument("base_id", type=uuid.UUID)
    parser.add_argument("--future", action="store_true")
    args = parser.parse_args()
    path = test_database(args.database)  # Validate before importing runtime config/database.
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{path.as_posix()}"
    asyncio.run(seed(str(args.base_id), future=args.future))


if __name__ == "__main__":
    main()
