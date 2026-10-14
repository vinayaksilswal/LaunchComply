"""Synthetic migration rehearsal shared by disposable SQLite/PostgreSQL tests."""
from datetime import datetime, timezone

from sqlalchemy import insert, select, text
from sqlalchemy.exc import IntegrityError

from app.models import Application, Architecture, ArchitectureWorkspaceState, Environment, Organization


def seed_legacy_architectures(connection):
    for suffix in ("a", "b"):
        connection.execute(insert(Organization).values(id=f"state-org-{suffix}", name="Migration fixture", slug=f"state-org-{suffix}"))
    for suffix, org in (("a", "a"), ("b", "b"), ("empty", "a")):
        connection.execute(insert(Application).values(id=f"state-app-{suffix}", organization_id=f"state-org-{org}", name="Fixture", slug=f"state-app-{suffix}"))
        connection.execute(insert(Environment).values(id=f"state-env-{suffix}", organization_id=f"state-org-{org}", application_id=f"state-app-{suffix}", name="Fixture", slug="test"))
    timestamp = datetime(2026, 1, 1, tzinfo=timezone.utc)
    for identifier, org, asset, spec in (
        ("state-arch-a1", "a", "a", {"format": "repository-draft-v1", "graph": {"nodes": [{"id": "manual"}], "edges": []}, "resource_configurations": {"manual": {"preserve": True}}}),
        ("state-arch-a2", "a", "a", {"format": "repository-draft-v1", "graph": {"nodes": [], "edges": []}, "design_approval": {"historical": True}}),
        ("state-arch-a3", "a", "a", {"format": "unsupported", "graph": {}}),
        ("state-arch-b1", "b", "b", {"format": "repository-draft-v1", "source_changed": True, "graph": {"nodes": [], "edges": []}}),
        # A malformed legacy tenant link must never become a workspace head.
        ("state-arch-invalid", "b", "a", {"format": "repository-draft-v1", "graph": {}}),
    ):
        connection.execute(insert(Architecture).values(id=identifier, application_id=f"state-app-{asset}", organization_id=f"state-org-{org}", spec_json=spec, created_at=timestamp, updated_at=timestamp))
    return snapshot(connection)


def snapshot(connection):
    # Raw JSON/text and timestamps: migration must not reserialize history.
    return list(connection.execute(text("SELECT id, CAST(spec_json AS TEXT), created_at, updated_at FROM architectures WHERE id LIKE 'state-arch-%' ORDER BY id")).all())


def assert_workspace_backfill(connection, before):
    assert snapshot(connection) == before
    rows = connection.execute(select(ArchitectureWorkspaceState.__table__).where(
        ArchitectureWorkspaceState.application_id.like("state-app-%"))).mappings().all()
    assert len(rows) == 2
    states = {row["application_id"]: row for row in rows}
    assert states["state-app-a"]["head_architecture_id"] == "state-arch-a2"
    assert states["state-app-a"]["analyzed_source_epoch"] == 0
    assert states["state-app-b"]["head_architecture_id"] == "state-arch-b1"
    assert states["state-app-b"]["source_epoch"] == 1
    assert states["state-app-b"]["analyzed_source_epoch"] is None
    assert all(row["environment_id"] is None and row["state_version"] == 0 for row in rows)


def assert_workspace_constraints(connection):
    table = ArchitectureWorkspaceState.__table__
    valid = dict(organization_id="state-org-a", application_id="state-app-empty", analyzed_source_epoch=0)
    # Every failure is isolated in a savepoint; PostgreSQL transactions remain usable.
    invalid = [
        dict(organization_id="state-org-b", application_id="state-app-empty"),
        valid | {"head_architecture_id": "state-arch-a2"},  # wrong application, same business
        valid | {"head_architecture_id": "state-arch-b1"},  # wrong business
        valid | {"environment_id": "state-env-b"},
        valid | {"environment_id": "state-env-a"},
        valid | {"source_epoch": -1},
        valid | {"analyzed_source_epoch": 1},
        valid | {"state_version": -1},
        dict(organization_id="state-org-a", application_id="state-app-a"),  # NULL environment uniqueness
    ]
    for values in invalid:
        try:
            with connection.begin_nested():
                connection.execute(insert(table).values(**values))
        except IntegrityError:
            continue
        raise AssertionError(f"Constraint accepted invalid workspace fields: {sorted(values)}")
    connection.execute(insert(table).values(**(valid | {"environment_id": "state-env-empty"})))
    try:
        with connection.begin_nested():
            connection.execute(insert(table).values(**(valid | {"environment_id": "state-env-empty"})))
    except IntegrityError:
        pass
    else:
        raise AssertionError("Duplicate assigned environment was accepted")
    # Assigned and unassigned planning workspaces may coexist, once each.
    connection.execute(insert(table).values(**valid))
