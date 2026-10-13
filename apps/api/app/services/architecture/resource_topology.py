"""Read-only topology from validated resource references, never diagram labels.

This is configured intent, not AWS discovery or a reachability/security verdict.
No canonical graph, saved properties or application request flows are modified.
"""
from app.services.architecture.resource_configuration import ADAPTER, validate_resources
from app.services.architecture.network_resources import references


def build_topology(graph, configurations, region=None, schema_version=1):
    result = {"schema_version": 1, "source": "CONFIGURED_PROPERTIES", "deployment_state": "NOT_VERIFIED",
              "region": region, "placements": [], "relations": [], "issues": []}
    if schema_version not in (None, 1):
        result["issues"] = [{"node_id": "", "code": "UNSUPPORTED_SCHEMA", "message": "Resource settings require a newer topology reader."}]
        return result
    review = validate_resources(graph, configurations, region)
    result["issues"] = review["issues"]
    invalid = {item["node_id"] for item in review["issues"]}
    parsed = {key: ADAPTER.validate_python(value) for key, value in configurations.items() if key not in invalid}
    # Invalid referenced parents must not produce apparent valid containment.
    while True:
        missing = {key for key, config in parsed.items() if any(target not in parsed for _, target, _ in references(config))}
        if not missing:
            break
        for key in missing:
            parsed.pop(key)
            result["issues"].append({"node_id": key, "code": "DEPENDENCY_UNAVAILABLE", "message": "A referenced resource has invalid settings. This component's network placement is not established."})
    kinds = {key: config.resource_type.split("::")[-1] for key, config in parsed.items()}
    props = {key: config.properties.model_dump() for key, config in parsed.items()}
    attached = {p["gateway_node_id"]: p["vpc_node_id"] for key, p in props.items() if kinds[key] == "VPCGatewayAttachment"}
    tables = {p["subnet_node_id"]: p["route_table_node_id"] for key, p in props.items() if kinds[key] == "SubnetRouteTableAssociation"}
    routes = {}
    for key, p in props.items():
        if kinds[key] == "Route":
            routes.setdefault(p["route_table_node_id"], []).append(p)

    def owner(key):
        kind, p = kinds.get(key), props.get(key, {})
        if kind == "VPC":
            return key
        if "vpc_node_id" in p:
            return p["vpc_node_id"]
        if kind in ("NatGateway", "SubnetRouteTableAssociation"):
            return props[p["subnet_node_id"]]["vpc_node_id"]
        if kind == "Route":
            return props[p["route_table_node_id"]]["vpc_node_id"]
        if kind in ("SecurityGroupIngress", "SecurityGroupEgress"):
            return props[p["group_node_id"]]["vpc_node_id"]
        if kind == "InternetGateway":
            return attached.get(key)
        return None

    for key in sorted(parsed):
        kind, p = kinds[key], props[key]
        subnet = p.get("subnet_node_id") if kind in ("NatGateway", "SubnetRouteTableAssociation") else None
        az = p.get("availability_zone") if kind == "Subnet" else props.get(subnet, {}).get("availability_zone")
        routing = None
        if kind == "Subnet":
            table = tables.get(key)
            entries = routes.get(table, [])
            routing = ("UNKNOWN" if not table else "PUBLIC" if any(r["target_kind"] == "INTERNET_GATEWAY" for r in entries)
                       else "PRIVATE_NAT" if any(r["target_kind"] == "NAT_GATEWAY" for r in entries) else "ISOLATED")
            if not table:
                result["issues"].append({"node_id": key, "code": "ROUTING_UNSPECIFIED",
                    "message": "No explicit route-table association. The deployed main route table is unknown."})
        result["placements"].append({"node_id": key, "resource_type": parsed[key].resource_type,
            "vpc_node_id": owner(key), "subnet_node_id": subnet, "availability_zone": az,
            "cidr": p.get("cidr"), "routing": routing,
            "location": "MANAGED_SERVICE" if kind == "Bucket" else "OPERATIONS" if kind == "LogGroup" else "NETWORK_CONFIGURATION"})
        for field, target, _ in references(parsed[key]):
            relation = ("PARENT_REFERENCE" if field in ("vpc_node_id", "subnet_node_id") else
                        "ROUTE_TARGET" if kind == "Route" and field == "target_node_id" else
                        "SECURITY_PEER" if field == "peer" else
                        "ENDPOINT_POLICY" if field == "bucket_node_id" else "ASSOCIATION")
            result["relations"].append({"source": key, "target": target, "kind": relation, "field": field,
                "label": (f"{p['protocol'].upper()} {p['from_port']}-{p['to_port']} peer" if field == "peer" else
                          f"{p['destination_cidr']} route target" if relation == "ROUTE_TARGET" else
                          f"S3 {p['access'].lower().replace('_', ' ')} endpoint policy" if relation == "ENDPOINT_POLICY" else field.replace("_node_ids", "").replace("_node_id", "").replace("_", " "))})
    return result
