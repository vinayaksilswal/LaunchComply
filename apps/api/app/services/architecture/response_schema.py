"""Strict wire schema, with Pydantic and server scope checks retained independently."""


def strict_schema(value):
    if isinstance(value, list):
        return [strict_schema(item) for item in value]
    if not isinstance(value, dict):
        return value
    result = {key: strict_schema(item) for key, item in value.items() if key not in {"default", "title"}}
    if result.get("type") == "object":
        result["additionalProperties"] = False
        result["required"] = list(result.get("properties", {}))
    return result


def scoped_schema(schema, scope):
    result = strict_schema(schema)
    properties = result.get("properties", {})
    mode = scope["mode"]
    if mode == "EDIT" and "NodeUpdate" in result.get("$defs", {}):
        result["$defs"]["NodeUpdate"]["properties"]["id"] = {"type": "string", "enum": scope["node_ids"]}
    if mode == "EDIT" and "ResourceUpdate" in result.get("$defs", {}):
        result["$defs"]["ResourceUpdate"]["properties"]["node_id"] = {"type": "string", "enum": scope["node_ids"]}
    if mode != "EDIT" and "resource_updates" in properties:
        properties["resource_updates"]["maxItems"] = 0
    if mode == "REMOVE" and "removed_node_ids" in properties:
        properties["removed_node_ids"]["items"] = {"type": "string", "enum": scope["node_ids"]}
    empty = {"ADD": ["node_updates", "removed_node_ids", "removed_edges"],
             "EDIT": ["removed_node_ids"], "REMOVE": ["node_updates", "new_nodes", "added_edges"]}.get(mode, [])
    for key in empty:
        if key in properties:
            properties[key]["maxItems"] = 0
    return result
