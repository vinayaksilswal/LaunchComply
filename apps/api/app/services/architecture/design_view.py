"""Read-only projections for the legacy canvas. Never use these as write input."""
from copy import deepcopy
from fastapi import HTTPException
from .design_adapter import read_design, UnsupportedDesign

READ_ONLY_REASON = "This design uses the new saved format. You can inspect, export and compare it; editing and restoring require the compatible writer. The original saved data is preserved."


def canonical_record(architecture):
    try:
        return read_design(architecture.spec_json, revision_id=architecture.id,
            organization_id=architecture.organization_id, application_id=architecture.application_id)
    except UnsupportedDesign as error:
        raise HTTPException(409, {"code": "DESIGN_FORMAT_UNSUPPORTED", "message": str(error)}) from None
    except (ValueError, TypeError, KeyError):
        raise HTTPException(422, {"code": "DESIGN_PROJECTION_UNAVAILABLE",
            "message": "This saved design needs compatibility review. Its original data is unchanged; use version history."}) from None


def require_legacy_writer(architecture):
    if architecture is not None and (architecture.spec_json or {}).get("format") != "repository-draft-v1":
        raise HTTPException(409, {"code": "CANONICAL_EDITOR_REQUIRED", "message": READ_ONLY_REASON})


def saved_view(architecture):
    raw = architecture.spec_json or {}
    if raw.get("format") == "repository-draft-v1":
        return raw
    design = canonical_record(architecture)
    # Expose explicit canonical owners only. Opaque analysis/extensions are not
    # trusted as legacy provenance, activity or deployment approval.
    source = design.source_identity
    refs = source.repository_refs
    evidence = {"repository": ", ".join(ref.repository for ref in refs), "branch": "Saved source references",
        "commit": source.legacy_commit or "", "files": [], "components": [],
        "repositories": [{"id": ref.repository_id, "full_name": ref.repository, "branch": ref.branch,
            "root_path": ref.root_path, "commit": ref.commit} for ref in refs],
        "scope": "Saved source identity only. Inspect canonical data for evidence references; this view does not verify runtime usage."}
    legacy = design.extensions.get("launchcomply.legacy")
    metadata = legacy.data.get("metadata", {}) if legacy else {}
    metadata = metadata if isinstance(metadata, dict) else {}
    try:
        revision = int(architecture.version.removeprefix("v"))
    except (TypeError, ValueError):
        revision = 1
    return {"format": "repository-draft-v1", "saved_format": design.format, "read_only": True,
        "read_only_reason": READ_ONLY_REASON, "revision": revision,
        "graph": {"nodes": [{"id": key, "label": design.resources_by_id[key].label,
            "service": design.resources_by_id[key].legacy_service, "zone": design.resources_by_id[key].layer,
            "description": design.resources_by_id[key].description,
            "x": design.view_state.node_positions[key].x, "y": design.view_state.node_positions[key].y}
            for key in design.view_state.node_order],
            "edges": [{"source": design.connections_by_id[key].source, "target": design.connections_by_id[key].target,
                "label": design.connections_by_id[key].label} for key in design.view_state.edge_order]},
        "resource_schema_version": 1,
        "resource_configurations": {key: resource.configuration.model_dump() for key, resource in design.resources_by_id.items() if resource.configuration},
        "requirements": design.requirements.model_dump(exclude_none=True) if design.requirements else None,
        "evidence": evidence, "source_changed": metadata.get("source_changed") is True,
        "restored_from": deepcopy(metadata.get("restored_from")) if isinstance(metadata.get("restored_from"), dict) else None,
        "deployment_status": "NOT_DEPLOYED"}


def version_summary(architecture):
    raw = architecture.spec_json or {}
    base = {"id": architecture.id, "version": architecture.version, "created_at": architecture.created_at,
        "saved_format": raw.get("format"), "read_only": raw.get("format") != "repository-draft-v1"}
    try:
        spec = saved_view(architecture)
        return {**base, "preview_available": True, "components": len(spec["graph"]["nodes"]),
            "configured_resources": len(spec.get("resource_configurations", {})),
            "source_commit": (spec.get("evidence") or {}).get("commit"), "restored_from": spec.get("restored_from")}
    except HTTPException:
        return {**base, "preview_available": False, "components": 0, "configured_resources": 0,
            "source_commit": None, "restored_from": None}
