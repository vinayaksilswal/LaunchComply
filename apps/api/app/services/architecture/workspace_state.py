"""Source eligibility lives outside immutable architecture snapshots.

Writers must first lock the tenant's Application row. During the A02 cutover
latest-version queries remain authoritative; head pointers are reconciled on write.
"""
from sqlalchemy import select

from app.models.architecture_state import ArchitectureWorkspaceState
from app.models.entities import Architecture
from .version_activity import snapshot_spec, write_activity


async def read_state(db, organization_id, application_id):
    return (await db.execute(select(ArchitectureWorkspaceState).where(
        ArchitectureWorkspaceState.organization_id == organization_id,
        ArchitectureWorkspaceState.application_id == application_id,
        ArchitectureWorkspaceState.environment_id.is_(None),
    ).execution_options(populate_existing=True))).scalar_one_or_none()


def source_stale(state):
    return state is not None and state.analyzed_source_epoch != state.source_epoch


def effective_spec(architecture):
    """Apply current eligibility without assigning to the ORM's stored JSON."""
    spec = architecture.spec_json or {}
    activity = getattr(architecture, "_version_activity", None)
    if activity is not None:
        spec = {**snapshot_spec(spec), **activity}
    spec = {"messages": [], "proposal": None, **spec}
    if not getattr(architecture, "_workspace_source_changed", False):
        return spec
    result = {**spec, "source_changed": True, "proposal": None}
    if result.get("design_approval"):
        result["superseded_design_approval"] = {**result["design_approval"], "invalidated_reason": "SOURCE_LINKS_CHANGED"}
    result.pop("design_approval", None)
    result.pop("aws_references", None)
    return result


async def ensure_state(db, app):
    state = await read_state(db, app.organization_id, app.id)
    head = (await db.execute(select(Architecture).where(
        Architecture.organization_id == app.organization_id, Architecture.application_id == app.id,
        Architecture.spec_json["format"].as_string() == "repository-draft-v1",
    ).order_by(Architecture.created_at.desc(), Architecture.id.desc()).limit(1))).scalar_one_or_none()
    if state is None:
        stale = bool(head and (head.spec_json or {}).get("source_changed"))
        state = ArchitectureWorkspaceState(organization_id=app.organization_id, application_id=app.id,
            head_architecture_id=head.id if head else None, source_epoch=1 if stale else 0,
            analyzed_source_epoch=None if stale else 0, state_version=0)
        db.add(state)
        await db.flush()
    else:
        # Reconcile writes made after backfill by the previous application version.
        # Never make a stale epoch fresh merely because a newer head exists.
        state.head_architecture_id = head.id if head else None
    return state


async def invalidate_sources(db, app):
    state = await ensure_state(db, app)
    state.source_epoch += 1
    state.state_version += 1
    if state.head_architecture_id is None:
        state.analyzed_source_epoch = state.source_epoch


async def record_head(db, app, architecture, *, source_refreshed=False):
    original = architecture.spec_json
    architecture.spec_json = snapshot_spec(original)
    await db.flush()  # Assign the new architecture ID before the composite FK.
    await write_activity(db, architecture, original)
    state = await ensure_state(db, app)
    state.head_architecture_id = architecture.id
    state.state_version += 1
    if source_refreshed:
        state.analyzed_source_epoch = state.source_epoch
