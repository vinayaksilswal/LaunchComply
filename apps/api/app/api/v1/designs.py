"""Read-only canonical projection. Native writers deliberately remain gated."""
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.entities import Architecture
from app.api.v1.architecture_workspace import member, editor, application
from app.services.architecture.design_spec import Design
from app.services.architecture.design_adapter import read_design, fingerprints, UnsupportedDesign
from app.services.architecture.workspace_state import read_state, source_stale
from app.services.architecture.saved_designs import latest_saved
from app.services.architecture.design_view import saved_view

router = APIRouter(prefix="/architecture/designs", tags=["Canonical design"])


@lru_cache(maxsize=1)
def design_schema():
    return Design.model_json_schema()


@router.get("/schema")
async def schema(membership=Depends(member)):
    return {"format": "launchcomply-design", "schema_version": 2, "writes_enabled": False,
            "limits": {"resources": 80, "declared_connections": 160, "bytes": 2097152}, "schema": design_schema()}


@router.get("/{application_id}")
async def inspect_design(application_id: str, expected_id: str | None = Query(default=None, max_length=36),
                         version_id: str | None = Query(default=None, max_length=36),
                         membership=Depends(member), db: AsyncSession = Depends(get_db)):
    app = await application(db, application_id, membership)
    head = await latest_saved(db, app)
    if expected_id and (head is None or head.id != expected_id):
        raise HTTPException(409, {"code": "DESIGN_CHANGED", "message": "The saved design changed. Reload before inspecting or downloading it."})
    arch = head
    if version_id:
        arch = (await db.execute(select(Architecture).where(Architecture.id == version_id,
            Architecture.organization_id == app.organization_id, Architecture.application_id == app.id))).scalar_one_or_none()
    if arch is None:
        raise HTTPException(404, "Saved design not found in this business asset.")
    try:
        design = read_design(arch.spec_json, revision_id=arch.id, organization_id=app.organization_id, application_id=app.id)
    except UnsupportedDesign as error:
        raise HTTPException(409, {"code": "DESIGN_FORMAT_UNSUPPORTED", "message": str(error)}) from None
    except (ValueError, TypeError, KeyError):
        raise HTTPException(422, {"code": "DESIGN_PROJECTION_UNAVAILABLE", "message": "This saved design needs compatibility review. Its original data is unchanged; use version history."}) from None
    state = await read_state(db, app.organization_id, app.id)
    current = bool(head and head.id == arch.id)
    return {"architecture_id": arch.id, "version": arch.version, "source_format": arch.spec_json.get("format"),
        "read_only": True, "native_writes_enabled": False, "design": design.model_dump(mode="json"),
        "fingerprints": fingerprints(design), "eligibility": {"is_current": current,
            "source_changed": bool(current and (source_stale(state) or saved_view(arch).get("source_changed")))},
        "notices": ["This is saved design data, not an AWS deployment artifact or an approval.",
                    "Layout and display changes have a separate identity from infrastructure intent.",
                    "Legacy arrows retain unknown protocol, authentication and execution until explicitly confirmed.",
                    "Unknown legacy metadata is retained for compatibility and never compiled."]}


@router.post("/{application_id}")
async def native_write_gate(application_id: str, membership=Depends(editor), db: AsyncSession = Depends(get_db)):
    await application(db, application_id, membership)
    raise HTTPException(409, {"code": "CANONICAL_WRITES_DISABLED", "message": "Native design writes are not enabled. Continue editing the compatible saved design in the architecture workspace."})
