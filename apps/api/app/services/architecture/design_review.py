"""Deterministic planning review. No cloud calls, capacity estimates or compliance claims."""
import re
from datetime import datetime, timezone
from app.services.architecture.knowledge import fingerprint


def placement(service):
    """Match intended service placement, never observed subnet membership."""
    if re.search(r"static hosting\s*/\s*container|cloudfront\s*/\s*alb|choose a cloud|candidate|review compatibility", service, re.I):
        return "DECISION_REQUIRED"
    if re.search(r"internal|private", service, re.I) and re.search(r"load balancer|\balb\b|\bnlb\b", service, re.I):
        return "DECISION_REQUIRED"
    for pattern, value in (
        (r"application load balancer|\balb\b|network load balancer|\bnlb\b", "PUBLIC_INGRESS"),
        (r"\brds\b|\baurora\b|elasticache|\bredis\b|\bdocumentdb\b", "PRIVATE_DATA"),
        (r"\bfargate\b|\becs\b|\bec2\b|\beks\b|container|virtual machine", "PRIVATE_COMPUTE"),
        (r"cloudfront|route\s*53|static hosting|amplify|\bs3\b|dynamodb|\bsqs\b|\bsns\b|api gateway|\becr\b|cloudwatch|secrets manager|\biam\b|\bwaf\b", "OUTSIDE_VPC"),
    ):
        if re.search(pattern, service, re.I):
            return value
    return "DECISION_REQUIRED"


def build_review(graph, evidence=None, requirements=None, source_changed=False):
    evidence, requirements = evidence or {}, requirements or {}
    nodes, edges = graph.get("nodes", []), graph.get("edges", [])
    items = []

    def add(code, title, state, detail, node_ids=None):
        items.append({"code": code, "title": title, "state": state, "detail": detail,
                      "node_ids": node_ids or []})

    source_recorded = bool(evidence.get("commit") and evidence.get("files") and not source_changed)
    coverage = evidence.get("source_coverage") or {}
    sampled, candidates = coverage.get("inspected"), coverage.get("candidates")
    source_detail = "Source links changed. Refresh source findings before reviewing this version." if source_changed else (
        "A pinned source snapshot is recorded. This establishes provenance, not complete runtime understanding." if source_recorded
        else "Connect source code and record analysis for this business asset.")
    if sampled is not None and candidates is not None:
        source_detail += f" {sampled} of {candidates} candidate source files were inspected. Dynamic calls and deployment settings remain unverified."
    add("SOURCE", "Source evidence", "RECORDED" if source_recorded else "MISSING", source_detail)

    target_names = {"peak_requests_per_minute": "peak requests per minute", "concurrent_users": "concurrent users",
                    "region": "primary region", "availability": "availability requirement"}
    missing = [name for key, name in target_names.items() if not requirements.get(key)]
    if requirements.get("availability") == "MULTI_REGION" and (
        not requirements.get("secondary_region") or requirements.get("secondary_region") == requirements.get("region")
    ):
        missing.append("a different recovery region")
    add("TARGETS", "Traffic and availability targets", "MISSING" if missing else "RECORDED",
        "Still needed: " + ", ".join(missing) + "." if missing else
        "Planning targets are recorded. They are not measured capacity, guaranteed availability or a recovery test.")

    services = [{"node_id": node["id"], "label": node["label"], "service": node.get("service", ""),
                 "placement": placement(node.get("service", ""))} for node in nodes]
    ambiguous = [item for item in services if item["placement"] == "DECISION_REQUIRED"]
    add("HOSTING", "Choose specific hosting services", "MISSING" if ambiguous or not nodes else "RECORDED",
        f"{len(ambiguous)} services need a specific hosting or network placement decision. Lambda attachment, internal ingress and compatibility must be reviewed explicitly." if ambiguous else
        ("No cloud services are saved." if not nodes else "Saved service names have a proposed placement classification. This does not verify service configuration or suitability."),
        [item["node_id"] for item in ambiguous])

    connected = {value for edge in edges for value in (edge["source"], edge["target"])}
    disconnected = [node["id"] for node in nodes if node["id"] not in connected]
    uncertain = sum(bool(re.search(r"inferred|proposed|candidate", edge.get("label", ""), re.I)) for edge in edges)
    add("CONNECTIONS", "Confirm service connections", "REVIEW",
        f"{len(edges)} diagram connections; {uncertain} explicitly labelled inferred or proposed. Services without drawn connections: {len(disconnected)}. Confirm frontend/API destinations, database consumers, queues and image delivery from source and runtime settings; drawing a line does not verify a connection.", disconnected)

    private_compute = [item["node_id"] for item in services if item["placement"] == "PRIVATE_COMPUTE"]
    private_data = [item["node_id"] for item in services if item["placement"] == "PRIVATE_DATA"]
    ingress = [item["node_id"] for item in services if item["placement"] == "PUBLIC_INGRESS"]
    add("NETWORK", "Review network access", "REVIEW",
        f"Proposed: {len(ingress)} ingress, {len(private_compute)} private compute and {len(private_data)} private data services. Confirm regional VPCs, non-overlapping CIDRs, routes, subnet/AZ allocation, NAT or endpoints, TLS, health checks and security-group paths. Route 53 and CloudFront are global services outside the VPC; regional origins still require a region.",
        private_compute + private_data + ingress)
    workloads = [node["id"] for node in nodes if node.get("zone") == "APPLICATION"]
    add("RUNTIME", "Define build and runtime settings", "REVIEW",
        "Review each workload's build directory, runtime image, start command, listening port, health endpoint, environment-variable names and secret references. CPU, memory, replica limits and autoscaling need workload measurements; no sizes are inferred from traffic alone.", workloads)
    data = [node["id"] for node in nodes if node.get("zone") == "DATA"]
    add("RECOVERY", "Plan data and recovery", "REVIEW",
        "Confirm persistence use, compatibility, encryption, retention, backup/restore and migration strategy. Agree recovery point/time targets and validate them. Multi-AZ and multi-region requirements need actual replica, replication and failover plans; service cards are not instance counts.", data)
    add("ACCESS", "Review identity and secrets", "REVIEW",
        "Review workload-specific IAM roles, customer provisioning permissions, secrets injection, audit logging and sensitive-data handling. An observation-role identity check is not provisioning permission or a security assessment.")
    add("OPERATIONS", "Agree costs and operating ownership", "REVIEW",
        "Review a real infrastructure plan, service and data-transfer costs, deployment/rollback process, alarms, support ownership and acceptance evidence before execution. This checklist records planning gaps; it cannot approve or deploy infrastructure.")

    return {"format": "architecture-review-v1", "graph_fingerprint": fingerprint(graph),
            "source_snapshot": evidence.get("commit"), "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "status": "DECISIONS_REQUIRED" if any(item["state"] == "MISSING" for item in items) else "ENGINEERING_REVIEW_REQUIRED",
            "scope": "Saved design and supplied source metadata only. No AWS configuration, security, cost, capacity or recovery has been validated.",
            "items": items, "services": services, "references": [
                {"title": "AWS operational readiness review", "url": "https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_ready_to_support_const_orr.html"},
                {"title": "AWS private workloads and public ingress", "url": "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-example-private-subnets-nat.html"},
            ]}
