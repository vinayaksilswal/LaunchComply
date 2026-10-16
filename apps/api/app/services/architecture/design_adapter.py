"""Pure reader-first compatibility. Never writes a snapshot or calls a provider."""
from copy import deepcopy
import hashlib
import json
import re
import uuid

from .design_spec import (Design, Resource, Workload, Connection, Requirements, SourceIdentity, MAX_DESIGN_BYTES,
    Target, ViewState, Position, Extension, configuration_links, canonical_json, bounded_json)
from .graph_spec import Graph
from .resource_configuration import ADAPTER, MODELS, matches_service, logical_id


class UnsupportedDesign(ValueError):
    """Fixed public message; never attach arbitrary stored payloads to errors."""


def read_design_json(raw, **identity):
    if len(raw.encode("utf-8") if isinstance(raw, str) else raw) > MAX_DESIGN_BYTES:
        raise ValueError("Design exceeds the supported payload limit")
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError("Duplicate JSON object key")
            result[key] = value
        return result
    def nonfinite(value):
        raise ValueError("Non-finite JSON number")
    try:
        spec = json.loads(raw, object_pairs_hook=unique, parse_constant=nonfinite)
    except (RecursionError, UnicodeError):
        raise ValueError("Invalid or excessively nested design JSON") from None
    if not isinstance(spec, dict):
        raise ValueError("Design JSON must be an object")
    return read_design(spec, **identity)


def legacy_connection_id(revision_id, index):
    return "legacy_" + hashlib.sha256(canonical_json([revision_id, index]).encode()).hexdigest()[:40]


def _commit(value):
    if value is None or value == "":
        return None
    if isinstance(value, str) and re.fullmatch(r"[a-fA-F0-9]{40,64}", value):
        return value
    raise ValueError("Legacy source identity is not a supported pinned commit")


def _source_identity(evidence):
    refs = [{"repository_id": item.get("id"), "repository": item.get("repository", item.get("full_name", "")),
             "branch": item.get("branch", ""), "root_path": item.get("root_path", "/"), "commit": _commit(item.get("commit"))}
            for item in evidence.get("repositories", [])]
    bindings = [{key: item[key] for key in ("name", "source", "target", "protocol", "execution") if key in item}
                for item in evidence.get("environment_connections", [])]
    return SourceIdentity(legacy_commit=_commit(evidence.get("commit")), repository_refs=refs, declared_bindings=bindings)


def from_legacy(spec, *, revision_id, organization_id, application_id, environment_id=None, parent_revision_id=None):
    bounded_json(spec)
    if not isinstance(spec, dict) or spec.get("format") != "repository-draft-v1":
        raise UnsupportedDesign("This design format needs a compatible reader. The original saved version is unchanged.")
    if spec.get("resource_schema_version", 1) != 1:
        raise UnsupportedDesign("This resource schema needs an explicit compatibility migration. Use the original saved version.")
    graph = Graph.model_validate(spec["graph"]).model_dump()
    configurations = spec.get("resource_configurations", {})
    if not isinstance(configurations, dict):
        raise ValueError("Legacy configurations must be a resource map")
    if not set(configurations) <= {node["id"] for node in graph["nodes"]}:
        raise ValueError("Configured resource is missing from the graph")
    evidence = deepcopy(spec.get("evidence", {}))
    requirements = spec.get("requirements")
    if not isinstance(evidence, dict) or (requirements is not None and not isinstance(requirements, dict)):
        raise ValueError("Legacy evidence and requirements need compatibility review")
    known_requirements = {key: value for key, value in (requirements or {}).items() if key in Requirements.model_fields}
    region = known_requirements.get("region")
    resources, workloads = {}, {}
    for node in graph["nodes"]:
        config = ADAPTER.validate_python(configurations[node["id"]]) if node["id"] in configurations else None
        kinds = [kind for kind in MODELS if matches_service(node["service"], kind)]
        kind = config.resource_type if config else kinds[0] if len(kinds) == 1 else None
        if config and not matches_service(node["service"], config.resource_type):
            raise ValueError("Configured type differs from its saved component")
        resources[node["id"]] = Resource(id=node["id"], label=node["label"], legacy_service=node["service"],
            description=node["description"], layer=node["zone"], catalog_type=kind, compiler_logical_id=logical_id(node["id"]),
            configuration=config, target=Target(scope="REGIONAL" if kind else "UNKNOWN", region=region, environment_id=environment_id))
        if node["zone"] == "APPLICATION":
            # A visual application layer does not prove browser/server execution.
            workloads[node["id"]] = Workload(id=node["id"], resource_ids=[node["id"]])
    connections = {}
    for index, edge in enumerate(graph["edges"]):
        identifier = legacy_connection_id(revision_id, index)
        connections[identifier] = Connection(id=identifier, **edge, origin="LEGACY")
    edge_order = list(connections)
    connections.update(configuration_links(resources))
    owners = {"graph", "resource_configurations", "requirements", "evidence"}
    receipt = {"root_fields": sorted(spec), "metadata": deepcopy({key: value for key, value in spec.items() if key not in owners}),
        "configuration_property_fields": {key: sorted(value.get("properties", {})) for key, value in configurations.items()},
        "requirement_fields": sorted(requirements or {}),
        "unknown_requirements": deepcopy({key: value for key, value in (requirements or {}).items() if key not in Requirements.model_fields})}
    design_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"launchcomply:design:{organization_id}:{application_id}:{environment_id or 'unassigned'}"))
    return Design(design_id=design_id, revision_id=revision_id, parent_revision_id=parent_revision_id,
        organization_id=organization_id, application_id=application_id, environment_id=environment_id,
        source_identity=_source_identity(evidence), resources_by_id=resources, workloads_by_id=workloads,
        connections_by_id=connections, requirements=Requirements.model_validate(known_requirements) if requirements is not None else None,
        view_state=ViewState(node_positions={node["id"]: Position(x=node["x"], y=node["y"]) for node in graph["nodes"]},
            node_order=[node["id"] for node in graph["nodes"]], edge_order=edge_order),
        analysis_metadata={"legacy_evidence": evidence}, extensions={"launchcomply.legacy": Extension(version=1, data=receipt)})


def read_design(spec, **identity):
    if not isinstance(spec, dict):
        raise UnsupportedDesign("This saved design needs a compatible object-format reader.")
    if spec.get("format") == "repository-draft-v1":
        return from_legacy(spec, **identity)
    if spec.get("format") != "launchcomply-design" or spec.get("schema_version") != 2:
        raise UnsupportedDesign("This design version is unsupported. Keep its original export and use a compatible reader.")
    design = Design.model_validate(spec)
    if any(getattr(design, key) != value for key, value in identity.items() if key != "parent_revision_id"):
        raise ValueError("Canonical identity does not match the server-owned saved version")
    return design


def to_legacy(design):
    """Only lossless legacy projections are allowed; native v2 data cannot vanish."""
    if not isinstance(design, Design):
        design = Design.model_validate(design)
    extension = design.extensions.get("launchcomply.legacy")
    if extension is None or extension.version != 1:
        raise UnsupportedDesign("This native design cannot be represented by the legacy editor without an explicit migration.")
    receipt = extension.data
    try:
        fields = set(receipt["root_fields"])
        result = deepcopy(receipt["metadata"])
        result["graph"] = {"nodes": [{"id": key, "label": design.resources_by_id[key].label,
            "service": design.resources_by_id[key].legacy_service, "zone": design.resources_by_id[key].layer,
            "description": design.resources_by_id[key].description, "x": design.view_state.node_positions[key].x,
            "y": design.view_state.node_positions[key].y} for key in design.view_state.node_order],
            "edges": [{"source": design.connections_by_id[key].source, "target": design.connections_by_id[key].target,
                       "label": design.connections_by_id[key].label} for key in design.view_state.edge_order]}
        if "evidence" in fields:
            result["evidence"] = deepcopy(design.analysis_metadata["legacy_evidence"])
        if "requirements" in fields:
            values = design.requirements.model_dump() if design.requirements else {}
            result["requirements"] = {**deepcopy(receipt["unknown_requirements"]),
                **{key: values[key] for key in receipt["requirement_fields"] if key in values}} if design.requirements else None
        if "resource_configurations" in fields:
            result["resource_configurations"] = {}
            for key, resource in design.resources_by_id.items():
                if resource.configuration:
                    config = resource.configuration.model_dump()
                    config["properties"] = {name: value for name, value in config["properties"].items()
                        if name in receipt["configuration_property_fields"].get(key, [])}
                    result["resource_configurations"][key] = config
        restored = from_legacy(result, revision_id=design.revision_id, organization_id=design.organization_id,
            application_id=design.application_id, environment_id=design.environment_id, parent_revision_id=design.parent_revision_id)
    except (KeyError, TypeError, ValueError):
        raise UnsupportedDesign("This design cannot be projected to the legacy format without losing fields.") from None
    if restored != design:
        raise UnsupportedDesign("This design contains fields the legacy editor cannot preserve. Use the canonical export.")
    return result


def fingerprints(design, *, compiler_version="offline-cfn-2", policy_version="network-schema-1"):
    resources = {}
    for key, resource in design.resources_by_id.items():
        value = resource.model_dump(exclude={"label", "description", "layer", "compiler_logical_id"})
        if resource.catalog_type:
            value.pop("legacy_service", None)
        resources[key] = value
    flows = []
    for connection in design.connections_by_id.values():
        if connection.origin == "CONFIGURATION":
            continue  # Properties own these; projections cannot grant extra access.
        flow = connection.model_dump(exclude={"id", "origin", "derived_from", "label"})
        if connection.purpose == "UNKNOWN":
            flow["legacy_label"] = connection.label
        flows.append(flow)
    source = design.source_identity.model_dump()
    source["repository_refs"] = sorted(source["repository_refs"], key=canonical_json)
    source["declared_bindings"] = sorted(source["declared_bindings"], key=canonical_json)
    semantic = {"resources": resources, "connections": sorted(flows, key=canonical_json),
        "workloads": {key: value.model_dump() for key, value in design.workloads_by_id.items()},
        "requirements": design.requirements.model_dump() if design.requirements else None,
        "source_snapshot_ids": sorted(design.source_snapshot_ids), "source_identity": source}
    view = design.view_state.model_dump(exclude={"edge_order"})
    view["edge_order"] = [design.connections_by_id[key].model_dump(exclude={"id"}) for key in design.view_state.edge_order]
    view["display"] = {key: {"label": r.label, "description": r.description, "layer": r.layer} for key, r in design.resources_by_id.items()}
    digest = lambda value: hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()
    semantic_hash = digest(semantic)
    return {"algorithm": "sha256", "version": 1, "semantic_hash": semantic_hash, "layout_hash": digest(view),
        "artifact_input_hash": digest({"semantic_hash": semantic_hash, "organization_id": design.organization_id,
            "application_id": design.application_id, "environment_id": design.environment_id,
            "compiler_version": compiler_version, "policy_version": policy_version}),
        "compiler_version": compiler_version, "policy_version": policy_version,
        "artifact_status": "INPUT_IDENTITY_ONLY"}
