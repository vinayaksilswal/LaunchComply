"""Bounded property patches. Never accepts arbitrary infrastructure or credentials."""
import hashlib
import json
from copy import deepcopy
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, StrictStr, model_validator

from app.services.architecture.resource_configuration import ADAPTER, MODELS, matches_service, validate_resources
from app.services.architecture.edit_scope import ScopeViolation

class PropertyChange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: StrictStr = Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")
    value: StrictStr | StrictInt | StrictBool | list[Annotated[StrictStr, Field(max_length=64)]]

class ResourceUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    node_id: StrictStr = Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    resource_type: StrictStr = Field(max_length=100)
    changes: list[PropertyChange] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def unique_properties(self):
        if len({change.name for change in self.changes}) != len(self.changes):
            raise ValueError("Each property can be changed once per request.")
        return self

def fingerprint(configurations):
    return hashlib.sha256(json.dumps(configurations, sort_keys=True, separators=(",", ":")).encode()).hexdigest()

def apply_resource_updates(graph, configurations, updates, scope, region=None):
    result = deepcopy(configurations)
    if not updates:
        return result
    if scope.get("mode") != "EDIT":
        raise ScopeViolation("Select Edit and the resource components before changing properties.", "RESOURCE_SCOPE")
    nodes = {node["id"]: node for node in graph["nodes"]}
    seen = set()
    for raw in updates:
        update = ResourceUpdate.model_validate(raw)
        if update.node_id in seen:
            raise ValueError("Duplicate resource operation.")
        seen.add(update.node_id)
        if update.node_id not in scope.get("node_ids", []) or update.node_id not in nodes:
            raise ScopeViolation("Resource changes exceed the selected components.", "RESOURCE_SCOPE")
        if update.resource_type not in MODELS or not matches_service(nodes[update.node_id]["service"], update.resource_type):
            raise ValueError("Select a supported matching resource type.")
        previous = result.get(update.node_id, {})
        if previous and previous.get("resource_type") != update.resource_type:
            raise ValueError("A configured resource cannot be retyped by AI.")
        properties = deepcopy(previous.get("properties", {}))
        properties.update({change.name: change.value for change in update.changes})
        result[update.node_id] = ADAPTER.validate_python({"resource_type": update.resource_type, "properties": properties}).model_dump()
    if validate_resources(graph, result, region)["issues"]:
        raise ValueError("Resource changes failed property, network or reference validation.")
    return result

def selected_schemas(graph, scope):
    if scope.get("mode") != "EDIT":
        return []
    return [{"resource_type": kind, "properties_schema": model.model_json_schema()}
            for kind, (model, *_rest) in MODELS.items()
            if any(node["id"] in scope.get("node_ids", []) and matches_service(node["service"], kind) for node in graph["nodes"])]
