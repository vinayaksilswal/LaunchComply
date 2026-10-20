"""One saved-head selector for every design reader, including future schema majors."""
from sqlalchemy import select
from app.models.entities import Architecture

DESIGN_FORMATS = ("repository-draft-v1", "launchcomply-design")


def design_record_filter():
    return Architecture.spec_json["format"].as_string().in_(DESIGN_FORMATS)


async def latest_saved(db, app):
    return (await db.execute(select(Architecture).where(
        Architecture.organization_id == app.organization_id,
        Architecture.application_id == app.id, design_record_filter(),
    ).order_by(Architecture.created_at.desc(), Architecture.id.desc()).limit(1)
      .execution_options(populate_existing=True))).scalar_one_or_none()
