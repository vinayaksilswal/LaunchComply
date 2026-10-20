"""Source eligibility lives outside immutable architecture snapshots.

Writers must first lock the tenant's Application row. During the A02 cutover
latest-version queries remain authoritative; head pointers are reconciled on write.
"""
from sqlalchemy import select

from app.models.architecture_state import ArchitectureWorkspaceState
from .version_activity import snapshot_spec, write_activity
from .saved_designs import latest_saved
from .design_view import saved_view


async def read_state(db, organization_id, application_id):
    return (await db.execute(select(ArchitectureWorkspaceState).where(
        ArchitectureWorkspaceState.organization_id == organization_id,
        ArchitectureWorkspaceState.application_id == application_id,
        ArchitectureWorkspaceState.environment_id.is_(None),
    ).execution_options(populate_existing=True))).scalar_one_or_none()


def source_stale(state):
    return state is not None and state.analyzed_source_epoch != state.source_epoch


def version_spec(architecture):
    """Saved intent and version activity, without current eligibility overlays."""
    spec = saved_view(architecture)
    activity = getattr(architecture, "_version_activity", None)
    if activity is not None:
        spec = {**snapshot_spec(spec), **activity}
    if spec.get("read_only"):
        # This legacy projection cannot prove native approval/proposal semantics.
        spec = {key: value for key, value in spec.items() if key not in {
            "design_approval", "superseded_design_approval", "aws_references", "ai_request", "last_ai_questions"}}
        spec["proposal"] = None
    return {"messages": [], "proposal": None, **spec}


def effective_spec(architecture):
    """Apply current eligibility without assigning to the ORM's stored JSON."""
    spec = version_spec(architecture)
    if not getattr(architecture, "_workspace_source_changed", False):
        return spec
    proposal = spec.get("proposal") or {}
    current_refresh = proposal.get("kind") == "SOURCE_REFRESH" and proposal.get("base_source_epoch") == getattr(architecture, "_workspace_source_epoch", None)
    result = {**spec, "source_changed": True, "proposal": proposal if current_refresh else None}
    if result.get("design_approval"):
        result["superseded_design_approval"] = {**result["design_approval"], "invalidated_reason": "SOURCE_LINKS_CHANGED"}
    result.pop("design_approval", None)
    result.pop("aws_references", None)
    return result


async def ensure_state(db, app):
    state = await read_state(db, app.organization_id, app.id)
    head = await latest_saved(db, app)
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
