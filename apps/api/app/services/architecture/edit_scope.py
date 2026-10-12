"""Server-owned edit permissions; prose and model output cannot enlarge them."""
from collections import Counter
from typing import Literal, Annotated
from pydantic import BaseModel, ConfigDict, Field, model_validator


class EditScope(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mode: Literal["REVIEW", "ADD", "EDIT", "REMOVE"] = "REVIEW"
    node_ids: list[Annotated[str, Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")]] = Field(default_factory=list, max_length=80)

    @model_validator(mode="after")
    def selection(self):
        if len(set(self.node_ids)) != len(self.node_ids):
            raise ValueError("Select each component once.")
        if self.mode in ("EDIT", "REMOVE") and not self.node_ids:
            raise ValueError("Select components to edit or remove.")
        if self.mode in ("ADD", "REVIEW") and self.node_ids:
            raise ValueError("This scope does not use component selections.")
        return self


class ScopeViolation(ValueError):
    def __init__(self, message, code="EDIT_SCOPE"):
        super().__init__(message)
        self.code = code


def apply_operations(original, answer):
    """Materialize a bounded edit list without replacing unrelated graph content."""
    nodes = {node["id"]: dict(node) for node in original["nodes"]}
    seen = set()
    for update in answer.get("node_updates", []):
        key = update["id"]
        if key not in nodes or key in seen:
            raise ScopeViolation("Invalid or repeated update ID.", "INVALID_UPDATE_ID")
        seen.add(key)
        nodes[key].update({field: value for field, value in update.items() if value is not None})
    for node in answer.get("new_nodes", []):
        if node["id"] in nodes:
            raise ScopeViolation("New components must have new IDs.", "DUPLICATE_NODE_ID")
        nodes[node["id"]] = node
    removed = answer.get("removed_node_ids", [])
    if len(set(removed)) != len(removed):
        raise ScopeViolation("Repeated removal ID.")
    for key in removed:
        if key not in nodes or key in seen:
            raise ScopeViolation("Invalid removal ID.")
        del nodes[key]
    edges = [dict(edge) for edge in original["edges"]]
    for edge in answer.get("removed_edges", []):
        if edge not in edges:
            raise ScopeViolation("A removed flow does not exist.")
        edges.remove(edge)
    edges = [edge for edge in edges if edge["source"] in nodes and edge["target"] in nodes]
    edges.extend(answer.get("added_edges", []))
    return {"nodes": list(nodes.values()), "edges": edges}


def validate_selection(graph, scope):
    if not set(scope["node_ids"]).issubset({node["id"] for node in graph["nodes"]}):
        raise ScopeViolation("A selected component no longer exists. Reload the design.")


def enforce_scope(original, proposed, scope):
    """Reject unrelated edits, then retain stable ordering of existing components/flows."""
    validate_selection(original, scope)
    if scope["mode"] == "REVIEW":
        return original
    old = {node["id"]: node for node in original["nodes"]}
    new = {node["id"]: node for node in proposed["nodes"]}
    selected = set(scope["node_ids"])
    added, removed = new.keys() - old.keys(), old.keys() - new.keys()
    mode = scope["mode"]
    if removed and (mode != "REMOVE" or not removed.issubset(selected)):
        raise ScopeViolation("The response removed components outside the approved removal scope.")
    if mode == "REMOVE" and added:
        raise ScopeViolation("Removal cannot add or replace components.")
    for key in old.keys() & new.keys():
        if old[key] != new[key] and (mode != "EDIT" or key not in selected):
            raise ScopeViolation("The response changed an unselected component or its position.", "UNSELECTED_NODE_CHANGE")
    key = lambda edge: (edge["source"], edge["target"], edge["label"])
    before = Counter(map(key, original["edges"]))
    after = Counter(map(key, proposed["edges"]))
    for source, target, _ in (before - after):
        allowed = mode == "EDIT" and bool({source, target} & selected)
        allowed |= mode == "REMOVE" and bool({source, target} & removed)
        if not allowed:
            raise ScopeViolation("The response removed or relabelled an unrelated connection.")
    for source, target, _ in (after - before):
        if mode == "REMOVE" or not ({source, target} & (selected | added)):
            raise ScopeViolation("The response added an unrelated connection.")
    # Preserve original numbering/order; append only genuinely new flows.
    remaining = after.copy()
    edges = []
    for edge in original["edges"]:
        if remaining[key(edge)]:
            edges.append(edge)
            remaining[key(edge)] -= 1
    for edge in proposed["edges"]:
        if remaining[key(edge)]:
            edges.append(edge)
            remaining[key(edge)] -= 1
    return {"nodes": [new[node["id"]] for node in original["nodes"] if node["id"] in new]
            + [node for node in proposed["nodes"] if node["id"] in added], "edges": edges}
