"""Connection metadata only: raw credentials never enter this API or AI context."""
from typing import Literal
import hashlib
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field
from app.services.architecture.workspace import Graph
from app.services.architecture.proposal_policy import frontend, internal_ingress


class Connection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(pattern=r"^[A-Za-z_][A-Za-z0-9_]{0,79}$")
    source: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    target: str | None = Field(default=None, pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    protocol: Literal["https", "http", "postgresql", "mysql", "redis", "rediss", "mongodb", "mongodb+srv", "s3", "unknown"] = "unknown"
    execution: Literal["browser", "server"] = "browser"


def map_connections(graph, evidence, bindings):
    nodes = {node["id"]: node for node in graph["nodes"]}
    previous = evidence.get("environment_connections", [])
    # Remove only labelled env edges from the previous receipt, preserving manual routes.
    def label(name, execution="browser"):
        prefix = "Server HTTPS proxy · Env " if execution == "server-proxy" else "Env "
        limit = 80 - len(prefix) - len(" · declared")
        display = name if len(name) <= limit else name[:limit - 9] + "-" + hashlib.sha256(name.encode()).hexdigest()[:8]
        return f"{prefix}{display} · declared"
    def legacy_label(name):
        display = name if len(name) <= 60 else name[:45] + "-" + hashlib.sha256(name.encode()).hexdigest()[:8]
        return f"Env {display} · declared"
    old = {(item["source"], item.get("route_target") or item.get("target"), item.get("edge_label") or legacy_label(item['name'])) for item in previous}
    old.update(tuple(edge) for item in previous for edge in item.get("owned_route_edges", []))
    edges = [edge for edge in graph["edges"] if (edge["source"], edge["target"], edge["label"]) not in old]
    records, seen = [], set()
    for binding in bindings:
        source, target = nodes.get(binding.source), nodes.get(binding.target) if binding.target else None
        if not source or source["zone"] != "APPLICATION" or (binding.target and (not target or target["id"] == source["id"] or target["zone"] == "SUPPORT")):
            raise HTTPException(422, "Choose a workload source and a separate service destination for each connection.")
        identity = (binding.source, binding.name)
        if identity in seen: raise HTTPException(422, "Each workload can have only one entry per environment key.")
        seen.add(identity)
        if frontend(source) and binding.execution == "server" and binding.name.upper().startswith(("NEXT_PUBLIC_", "VITE_", "REACT_APP_", "PUBLIC_")):
            raise HTTPException(422, "This key prefix exposes values to the browser. Use a different server-only key for private API proxy configuration.")
        # Evidence paths are server-derived from the pinned source sample. The customer
        # chooses a workload association; finding a key does not prove runtime usage.
        references = [{"path": module["path"], "line": key["line"], "repository_id": module.get("repository_id")}
                      for module in evidence.get("modules", []) for key in module.get("environment_keys", []) if key["name"] == binding.name][:60]
        record = {**binding.model_dump(), "references": references, "status": "CUSTOMER_DECLARED", "source_snapshot": evidence.get("commit")}
        records.append(record)
        if target:
            server_proxy = frontend(source) and internal_ingress(target)
            if server_proxy and (binding.execution != "server" or "proxy" not in source["service"].lower() or binding.name.upper().startswith(("NEXT_PUBLIC_", "VITE_", "REACT_APP_", "PUBLIC_"))):
                raise HTTPException(422, "Private API ingress requires an explicitly server-only proxy connection and a server-only key. Browser-visible keys cannot use private addresses.")
            # A browser must target HTTPS ingress, never a private backend address.
            if frontend(source) and (target["zone"] != "EDGE" or not any(name in target["service"].lower() for name in ("application load balancer", "api gateway", "cloudfront"))):
                raise HTTPException(422, "Map frontend API keys to the secured HTTPS entry, not directly to private backend tasks, databases or storage.")
            if frontend(source) and binding.protocol != "https":
                raise HTTPException(422, "Choose HTTPS for a frontend connection. Unresolved protocols may be saved as keys without a destination.")
            endpoint = next((node for node in nodes.values() if node["service"].lower() == "s3 gateway vpc endpoint"), None)
            route_target = endpoint["id"] if endpoint and "s3" in target["service"].lower() and "private access" in target["service"].lower() else target["id"]
            record["route_target"] = route_target
            edge_label = label(binding.name, "server-proxy" if server_proxy else "browser")
            record["edge_label"] = edge_label
            edges.append({"source": source["id"], "target": route_target, "label": edge_label})
            if route_target != target["id"] and not any(edge["source"] == route_target and edge["target"] == target["id"] for edge in edges):
                edge = {"source": route_target, "target": target["id"], "label": "Private S3 route · customer declared"}
                edges.append(edge)
                record["owned_route_edges"] = [[edge["source"], edge["target"], edge["label"]]]
    try:
        mapped = Graph(nodes=graph["nodes"], edges=edges).model_dump()
    except ValueError:
        raise HTTPException(422, "Connection mapping exceeds the diagram limit. Reduce the entries first.") from None
    return mapped, records
