"""Compatibility adapter for mutable version activity.

Call writers only while holding the tenant Application lock. Legacy embedded
metadata remains readable and is never rewritten by this adapter.
"""
from copy import deepcopy
from sqlalchemy import select
from app.models.architecture_state import ArchitectureVersionActivity

ACTIVITY_KEYS = frozenset({
    "messages", "proposal", "design_approval", "superseded_design_approval",
    "aws_references", "ai_request", "last_ai_at", "last_ai_failure",
    "last_ai_questions", "last_ai_scope", "last_ai_intent", "last_ai_model",
    "last_ai_workflow", "last_ai_diagnostics",
})


def snapshot_spec(spec):
    return {key: value for key, value in spec.items() if key not in ACTIVITY_KEYS}


async def activity_record(db, architecture):
    return (await db.execute(select(ArchitectureVersionActivity).where(
        ArchitectureVersionActivity.organization_id == architecture.organization_id,
        ArchitectureVersionActivity.application_id == architecture.application_id,
        ArchitectureVersionActivity.architecture_id == architecture.id,
    ).execution_options(populate_existing=True))).scalar_one_or_none()


async def load_activity(db, architecture):
    record = await activity_record(db, architecture)
    architecture._version_activity = deepcopy(record.payload) if record else None


async def write_activity(db, architecture, spec):
    record = await activity_record(db, architecture)
    payload = deepcopy({key: value for key, value in spec.items() if key in ACTIVITY_KEYS})
    if record is None:
        record = ArchitectureVersionActivity(organization_id=architecture.organization_id,
            application_id=architecture.application_id, architecture_id=architecture.id, payload=payload)
        db.add(record)
    else:
        record.payload = payload
    architecture._version_activity = deepcopy(payload)
