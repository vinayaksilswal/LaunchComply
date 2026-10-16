"""Additive source suggestions. Existing customer intent always wins on identity."""
from copy import deepcopy
from collections import Counter

from .workspace import Graph


def merge_findings(saved, generated):
    graph = deepcopy(saved)
    ids = {node["id"] for node in graph["nodes"]}
    generated_ids = {node["id"] for node in generated["nodes"]}
    slots = ((x, y) for y in range(80, 5801, 240) for x in range(70, 5501, 400))
    for node in generated["nodes"]:
        if node["id"] in ids:
            continue
        added = deepcopy(node)
        added["x"], added["y"] = next((x, y) for x, y in slots
            if all(abs(x - old["x"]) >= 350 or abs(y - old["y"]) >= 200 for old in graph["nodes"]))
        graph["nodes"].append(added)
        ids.add(added["id"])
    edges = {(edge["source"], edge["target"], edge["label"]) for edge in graph["edges"]}
    for edge in generated["edges"]:
        key = (edge["source"], edge["target"], edge["label"])
        if key not in edges:
            graph["edges"].append(deepcopy(edge))
            edges.add(key)
    return Graph.model_validate(graph).model_dump(), sorted(node["id"] for node in saved["nodes"] if node["id"] not in generated_ids)


def validate_preservation(saved, proposed):
    graph = Graph.model_validate(proposed).model_dump()
    proposed_nodes = {node["id"]: node for node in graph["nodes"]}
    if any(proposed_nodes.get(node["id"]) != node for node in saved["nodes"]):
        raise ValueError("Source refresh cannot replace existing component settings or placement.")
    edges = Counter((edge["source"], edge["target"], edge["label"]) for edge in graph["edges"])
    saved_edges = Counter((edge["source"], edge["target"], edge["label"]) for edge in saved["edges"])
    if saved_edges - edges:
        raise ValueError("Source refresh cannot remove customer connections.")
    return graph
