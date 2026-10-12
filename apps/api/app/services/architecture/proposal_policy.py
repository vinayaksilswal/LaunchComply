"""Conservative diagram-transition checks. These do not validate deployed infrastructure."""
import re


def frontend(node):
    return node.get("zone") == "APPLICATION" and bool(re.search(r"frontend|web app|web application|\bspa\b|static hosting", " ".join(node.get(key, "") for key in ("label", "service", "description")), re.I)) and not re.search(r"\bapi\b|backend|worker", node.get("label", ""), re.I)


def ingress(node):
    return bool(re.search(r"application load balancer|\balb\b|api gateway", node.get("service", ""), re.I))


def internal_ingress(node):
    return ingress(node) and bool(re.search(r"internal|private", node.get("service", ""), re.I))


def operations(node):
    return node.get("zone") == "SUPPORT" or bool(re.search(r"cloudwatch|\becr\b|secrets manager|\biam\b", node.get("service", ""), re.I))


def check_transition(original, proposed, request):
    if original == proposed:
        return
    old = {node["id"]: node for node in original["nodes"]}
    nodes = {node["id"]: node for node in proposed["nodes"]}
    # Component identity/removal is enforced by the server-owned edit scope.
    for node in proposed["nodes"]:
        previous = old.get(node["id"])
        if previous and previous.get("zone") == "APPLICATION" and (
            node.get("zone") != "APPLICATION" or frontend(previous) != frontend(node)
        ):
            raise ValueError("WORKLOAD_ROLE_CHANGED")
        if previous and previous.get("zone") == "DATA" and node.get("zone") != "DATA":
            raise ValueError("DATA_ROLE_CHANGED")
        if frontend(node) and (not re.search(r"fargate|ecs|ec2|eks|container", node.get("service", ""), re.I) or not re.search(r"public frontend", node.get("service", ""), re.I)):
            raise ValueError("FRONTEND_PLACEMENT_UNRESOLVED")
        if node.get("zone") == "APPLICATION" and not frontend(node) and re.search(r"public frontend|public backend|public api|public ip", node.get("service", ""), re.I):
            raise ValueError("BACKEND_PUBLIC_EXPOSURE")
    for edge in proposed["edges"]:
        source, target = nodes[edge["source"]], nodes[edge["target"]]
        if internal_ingress(target):
            if source.get("zone") != "APPLICATION":
                raise ValueError("PUBLIC_INTERNAL_API_ROUTE")
            if frontend(source) and (not re.search(r"server.*https.*proxy|https.*server.*proxy", edge.get("label", ""), re.I) or not re.search(r"proxy", source.get("service", ""), re.I)):
                raise ValueError("BROWSER_PRIVATE_API_ROUTE")
        if operations(source) or operations(target):
            raise ValueError("OPERATIONS_IN_REQUEST_PATH")
        if frontend(source) and frontend(target):
            raise ValueError("UNRELATED_FRONTEND_ROUTE")
        if frontend(source) and target.get("zone") == "APPLICATION" and not frontend(target):
            raise ValueError("MISSING_SECURE_API_INGRESS")
        if source.get("zone") == "EDGE" and target.get("zone") == "APPLICATION" and not frontend(target) and not ingress(source):
            raise ValueError("BACKEND_INGRESS_BYPASS")
        if target.get("zone") == "DATA" and (source.get("zone") == "EDGE" or frontend(source)):
            raise ValueError("PUBLIC_DATA_ROUTE")
        if re.search(r"\bs3\b.*private access", target.get("service", ""), re.I) and not re.search(r"s3 gateway vpc endpoint", source.get("service", ""), re.I):
            raise ValueError("PRIVATE_STORAGE_ROUTE_UNRESOLVED")
