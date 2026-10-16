"""Real PostgreSQL API isolation/persistence, not AWS execution or RLS acceptance."""
import os
import asyncio
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


@pytest.mark.asyncio
async def test_concurrent_repository_edits_have_one_winner_and_preserve_snapshot():
    from sqlalchemy import insert, select, cast, String
    from app.models import Architecture, ArchitectureWorkspaceState, SourceControlConnection, Repository
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            registered = await client.post("/api/v1/auth/register", json={
                "email": f"source-race-{uuid.uuid4().hex}@example.com", "password": "TestOnlyPassword123!",
                "full_name": "Source race", "organization_name": f"Source race {uuid.uuid4().hex}"})
            assert registered.status_code == 200, registered.text
            account = registered.json()
            org = account["organization_id"]
            headers = {"Authorization": f"Bearer {account['access_token']}", "X-Organization-ID": org}
            created = await client.post("/api/v1/applications/", headers=headers, json={"name": "Source race fixture"})
            assert created.status_code == 200, created.text
            asset = created.json()["id"]
            initialized = await client.post(f"/api/v1/architecture/workspace/{asset}/initialize", headers=headers)
            assert initialized.status_code == 200, initialized.text
            connection_id = str(uuid.uuid4())
            repository_ids = [str(uuid.uuid4()), str(uuid.uuid4())]
            snapshot_query = select(cast(Architecture.spec_json, String), Architecture.updated_at).where(Architecture.id == initialized.json()["id"])
            async with engine.begin() as db:
                await db.execute(insert(SourceControlConnection).values(id=connection_id, organization_id=org,
                    provider_account_id="synthetic", provider_account_name="Synthetic", installation_id=connection_id))
                for identifier in repository_ids:
                    await db.execute(insert(Repository).values(id=identifier, organization_id=org,
                        source_control_connection_id=connection_id, provider_repository_id=identifier,
                        name=identifier, full_name=f"synthetic/{identifier}", owner="synthetic", html_url="https://example.invalid/source"))
                before = (await db.execute(snapshot_query)).one()
            responses = await asyncio.gather(*[
                client.put(f"/api/v1/applications/{asset}/repositories", headers=headers,
                    json={"repository_ids": [identifier], "expected_repository_ids": []}) for identifier in repository_ids])
            assert sorted(response.status_code for response in responses) == [200, 409]
            async with engine.connect() as db:
                assert (await db.execute(snapshot_query)).one() == before
                state = (await db.execute(select(ArchitectureWorkspaceState.source_epoch,
                    ArchitectureWorkspaceState.analyzed_source_epoch).where(
                    ArchitectureWorkspaceState.organization_id == org, ArchitectureWorkspaceState.application_id == asset))).one()
                assert tuple(state) == (1, 0)
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_concurrent_design_approvals_share_activity_without_mutating_snapshot():
    from sqlalchemy import select, cast, String
    from app.models import Architecture, ArchitectureVersionActivity
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            registered = await client.post("/api/v1/auth/register", json={
                "email": f"approval-race-{uuid.uuid4().hex}@example.com", "password": "TestOnlyPassword123!",
                "full_name": "Approval race", "organization_name": f"Approval race {uuid.uuid4().hex}"})
            assert registered.status_code == 200, registered.text
            account = registered.json()
            headers = {"Authorization": f"Bearer {account['access_token']}", "X-Organization-ID": account["organization_id"]}
            asset = (await client.post("/api/v1/applications/", headers=headers, json={"name": "Approval race"})).json()["id"]
            path = f"/api/v1/architecture/workspace/{asset}"
            initialized = (await client.post(path + "/initialize", headers=headers)).json()
            graph = {"nodes": [{"id": "logs", "label": "Logs", "service": "Amazon CloudWatch", "zone": "SUPPORT", "description": "Test", "x": 120, "y": 180}], "edges": []}
            saved = await client.post(path + "/save", headers=headers, json={"expected_id": initialized["id"], "graph": graph})
            assert saved.status_code == 200, saved.text
            planned = await client.post(path + "/requirements", headers=headers, json={"expected_id": saved.json()["id"],
                "region": "ap-south-1", "availability": "MULTI_AZ", "peak_requests_per_minute": 500, "concurrent_users": 100})
            assert planned.status_code == 200, planned.text
            identifier = planned.json()["id"]
            query = select(cast(Architecture.spec_json, String), Architecture.updated_at).where(Architecture.id == identifier)
            async with engine.connect() as db:
                before = (await db.execute(query)).one()
            approvals = await asyncio.gather(*[client.post(path + "/approve-design", headers=headers,
                json={"expected_id": identifier}) for _ in range(2)])
            assert all(response.status_code == 200 for response in approvals), [r.text for r in approvals]
            assert approvals[0].json()["design_approval"] == approvals[1].json()["design_approval"]
            async with engine.connect() as db:
                assert (await db.execute(query)).one() == before
                activity = (await db.execute(select(ArchitectureVersionActivity.payload).where(
                    ArchitectureVersionActivity.architecture_id == identifier))).scalar_one()
                assert activity["design_approval"] == approvals[0].json()["design_approval"]
    finally:
        await engine.dispose()
