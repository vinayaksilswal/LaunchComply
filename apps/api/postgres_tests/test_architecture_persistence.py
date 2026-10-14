"""Real PostgreSQL API isolation/persistence, not AWS execution or RLS acceptance."""
import os
import uuid

import httpx
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.main import app
from app.core.database import engine


@pytest.mark.asyncio
async def test_migrated_non_superuser_database_and_architecture_history():
    try:
        async with engine.connect() as connection:
            role = (await connection.execute(text("SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname=current_user"))).one()
            assert tuple(role) == (False, False, False, False)
            assert (await connection.execute(text("SELECT email FROM users WHERE id='migration-user'"))).scalar_one() == "migration@example.invalid"
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            owners = []
            for label in ("alpha", "beta"):
                response = await client.post("/api/v1/auth/register", json={
                    "email": f"{label}-{uuid.uuid4().hex}@example.com", "password": "TestOnlyPassword123!",
                    "full_name": label, "organization_name": label + uuid.uuid4().hex})
                assert response.status_code == 200, response.text
                account = response.json()
                owners.append({"Authorization": f"Bearer {account['access_token']}", "X-Organization-ID": account["organization_id"]})
            created = await client.post("/api/v1/applications/", headers=owners[0], json={"name": "PostgreSQL architecture fixture"})
            assert created.status_code == 200, created.text
            path = f"/api/v1/architecture/workspace/{created.json()['id']}"
            initialized = await client.post(path + "/initialize", headers=owners[0])
            assert initialized.status_code == 200, initialized.text
            first = initialized.json()
            graph = {"nodes": [{"id": "logs", "label": "Test logs", "service": "AWS::Logs::LogGroup", "zone": "SUPPORT", "description": "Synthetic", "x": 100, "y": 100}], "edges": []}
            saved = await client.post(path + "/save", headers=owners[0], json={"expected_id": first["id"], "graph": graph})
            assert saved.status_code == 200, saved.text
            assert (await client.post(path + "/save", headers=owners[0], json={"expected_id": first["id"], "graph": graph})).status_code == 409
            assert (await client.get(path, headers=owners[1])).status_code == 404
            assert (await client.get(path, headers=owners[1] | {"X-Organization-ID": owners[0]["X-Organization-ID"]})).status_code == 403
            assert (await client.post(path + "/save", headers=owners[1], json={"expected_id": saved.json()["id"], "graph": graph})).status_code == 404
            old = await client.get(path + "/versions/" + first["id"], headers=owners[0])
            assert old.status_code == 200
            assert old.json()["graph"] == first["graph"]
            current = (await client.get(path, headers=owners[0])).json()["architecture"]
            assert current["graph"] == graph
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_postgres_row_lock_blocks_a_second_writer_until_commit():
    # Harness capability proof. Future head-transition tests must use real domain rows.
    db = create_async_engine(os.environ["DATABASE_URL"])
    try:
        async with db.begin() as connection:
            await connection.execute(text("CREATE TABLE harness_lock (id integer PRIMARY KEY, value integer NOT NULL)"))
            await connection.execute(text("INSERT INTO harness_lock VALUES (1,0)"))
        async with db.connect() as first, db.connect() as second:
            await first.execute(text("SELECT * FROM harness_lock WHERE id=1 FOR UPDATE"))
            await second.execute(text("SET LOCAL lock_timeout='150ms'"))
            from sqlalchemy.exc import DBAPIError
            with pytest.raises(DBAPIError) as error:
                await second.execute(text("UPDATE harness_lock SET value=1 WHERE id=1"))
            assert error.value.orig.sqlstate == "55P03"
            await second.rollback()
            await first.commit()
            await second.execute(text("UPDATE harness_lock SET value=1 WHERE id=1"))
            await second.commit()
    finally:
        await db.dispose()


@pytest.mark.asyncio
async def test_workspace_initialization_race_has_one_unassigned_winner():
    from sqlalchemy import insert
    from sqlalchemy.exc import DBAPIError, IntegrityError
    from app.models import Application, ArchitectureWorkspaceState
    asset_id = str(uuid.uuid4())
    db = create_async_engine(os.environ["DATABASE_URL"])
    try:
        async with db.begin() as connection:
            await connection.execute(insert(Application).values(
                id=asset_id, organization_id="state-org-a", name="Concurrent initialization", slug=asset_id))
        values = dict(organization_id="state-org-a", application_id=asset_id)
        async with db.connect() as first, db.connect() as second:
            await first.execute(insert(ArchitectureWorkspaceState).values(**values))
            await second.execute(text("SET LOCAL lock_timeout='150ms'"))
            with pytest.raises(DBAPIError) as error:
                await second.execute(insert(ArchitectureWorkspaceState).values(**values))
            assert error.value.orig.sqlstate == "55P03"
            await second.rollback()
            # A failed initializer does not strand the workspace identity.
            await first.rollback()
            await second.execute(insert(ArchitectureWorkspaceState).values(**values))
            await second.commit()
            with pytest.raises(IntegrityError):
                await first.execute(insert(ArchitectureWorkspaceState).values(**values))
            await first.rollback()
    finally:
        await db.dispose()
