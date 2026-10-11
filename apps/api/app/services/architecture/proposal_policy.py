"""Conservative diagram-transition checks. These do not validate deployed infrastructure."""
import re


def frontend(node):
    return node.get("zone") == "APPLICATION" and bool(re.search(r"frontend|web app|web application", node.get("label", "") + " " + node.get("description", ""), re.I)) and not re.search(r"\bapi\b|backend|worker", node.get("label", ""), re.I)


def ingress(node):
    return bool(re.search(r"application load balancer|\balb\b|api gateway", node.get("service", ""), re.I))


def operations(node):
    return node.get("zone") == "SUPPORT" or bool(re.search(r"cloudwatch|\becr\b|secrets manager|\biam\b", node.get("service", ""), re.I))


def check_transition(original, proposed, request):
    if original == proposed:
        return
    old = {node["id"]: node for node in original["nodes"]}
    nodes = {node["id"]: node for node in proposed["nodes"]}
    # Layout refinements must not silently discard linked repositories' workloads.
    if not re.search(r"remove|delete|consolidat|merge|rebuild|replace", request, re.I):
        if any(node.get("zone") == "APPLICATION" and key not in nodes for key, node in old.items()):
            raise ValueError("WORKLOAD_IDENTITY_LOST")
    for node in proposed["nodes"]:
        if frontend(node) and re.search(r"fargate|ecs|ec2|eks|container", node.get("service", ""), re.I) and not re.search(r"public frontend", node.get("service", ""), re.I):
            raise ValueError("FRONTEND_PLACEMENT_UNRESOLVED")
        if node.get("zone") == "APPLICATION" and not frontend(node) and re.search(r"public frontend|public backend|public api|public ip", node.get("service", ""), re.I):
            raise ValueError("BACKEND_PUBLIC_EXPOSURE")
    for edge in proposed["edges"]:
        source, target = nodes[edge["source"]], nodes[edge["target"]]
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
