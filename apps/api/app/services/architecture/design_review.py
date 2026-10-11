"""Deterministic planning review. No cloud calls, capacity estimates or compliance claims."""
import re
from datetime import datetime, timezone
from app.services.architecture.knowledge import fingerprint
from app.services.architecture.proposal_policy import frontend, internal_ingress


def placement(service):
    """Match intended service placement, never observed subnet membership."""
    if re.search(r"s3 gateway vpc endpoint", service, re.I): return "VPC_ENDPOINT"
    if re.search(r"\bs3\b.*private access", service, re.I): return "PRIVATE_MANAGED_STORAGE"
    if re.search(r"static hosting\s*(?:/|or)\s*container|cloudfront\s*(?:/|or)\s*alb|choose a cloud|candidate|review compatibility", service, re.I):
        return "DECISION_REQUIRED"
    if re.search(r"public frontend", service, re.I) and re.search(r"fargate|ecs|ec2|container", service, re.I):
        return "PUBLIC_FRONTEND"
    if re.search(r"internal|private", service, re.I) and re.search(r"load balancer|\balb\b|\bnlb\b", service, re.I):
        return "PRIVATE_INGRESS"
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
    disconnected = [node["id"] for node in nodes if node["id"] not in connected and node.get("zone") != "SUPPORT"]
    uncertain = sum(bool(re.search(r"inferred|proposed|candidate|customer intent", edge.get("label", ""), re.I)) for edge in edges)
    add("CONNECTIONS", "Confirm service connections", "REVIEW",
        f"{len(edges)} diagram connections; {uncertain} explicitly labelled inferred or proposed. Non-support services without drawn connections: {len(disconnected)}. Confirm frontend/API destinations, database consumers and queues from source and runtime settings. Build and observability services can be separate from traffic arrows; their configuration still needs review. Drawing a line does not verify a connection.", disconnected)

    frontend_ids = {node["id"] for node in nodes if frontend(node)}
    backend_ids = {node["id"] for node in nodes if node.get("zone") == "APPLICATION" and re.search(r"\bapi\b|backend", node.get("label", ""), re.I) and node["id"] not in frontend_ids}
    support_ids = {node["id"] for node in nodes if node.get("zone") == "SUPPORT" or re.search(r"cloudwatch|\becr\b", node.get("service", ""), re.I)}
    direct_links = [edge for edge in edges if edge["source"] in frontend_ids and edge["target"] in backend_ids]
    frontend_links = [edge for edge in edges if edge["source"] in frontend_ids and edge["target"] in frontend_ids]
    support_links = [edge for edge in edges if edge["source"] in support_ids or edge["target"] in support_ids]
    internal_ids = {node["id"] for node in nodes if internal_ingress(node)}
    invalid_internal = [edge for edge in edges if edge["target"] in internal_ids and (
        edge["source"] not in {node["id"] for node in nodes if node.get("zone") == "APPLICATION"}
        or (edge["source"] in frontend_ids and not re.search(r"server.*https.*proxy|https.*server.*proxy", edge.get("label", ""), re.I)))]
    traffic_issues = []
    if direct_links:
        traffic_issues.append(f"{len(direct_links)} frontend-to-backend links omit the controlled HTTPS API entry; review the browser endpoint and ingress path")
    if frontend_links:
        traffic_issues.append(f"{len(frontend_links)} frontend-to-frontend links need runtime evidence")
    if support_links:
        traffic_issues.append(f"{len(support_links)} support-service links should be distinguished from request traffic; review telemetry/build configuration separately")
    if invalid_internal:
        traffic_issues.append(f"{len(invalid_internal)} routes to internal API ingress bypass an explicitly server-side HTTPS proxy; browser/global services cannot reach private ingress directly")
    add("TRAFFIC", "Review browser-to-private-backend traffic", "MISSING" if traffic_issues else "REVIEW",
        "; ".join(traffic_issues) + "." if traffic_issues else
        "No direct frontend-to-backend, public-to-internal-ingress or support request edges were detected by planning checks. This does not verify API integration. Confirm browser HTTPS origin, frontend server proxy where selected, authenticated ingress, private backend SG restrictions, target TLS and source/runtime settings.",
        sorted(frontend_ids | backend_ids))
    if internal_ids and frontend_ids:
        add("FRONTEND_PROXY", "Implement and verify frontend server proxy", "REVIEW",
            "Selected path: browser uses same-origin /api on public frontend; frontend hosting server proxies over HTTPS to internal ALB; private backend accepts only ALB SG. A static SPA cannot reach private ingress. Verify proxy code/container configuration, path and method allowlists, identity forwarding, authorization, CSRF protections where needed, TLS validation, timeout/size limits, and private DNS reachability. This diagram does not establish that a proxy exists or is deployed.", sorted(frontend_ids | internal_ids | backend_ids))

    private_compute = [item["node_id"] for item in services if item["placement"] == "PRIVATE_COMPUTE"]
    private_data = [item["node_id"] for item in services if item["placement"] == "PRIVATE_DATA"]
    ingress = [item["node_id"] for item in services if item["placement"] == "PUBLIC_INGRESS"]
    public_frontends = [item["node_id"] for item in services if item["placement"] == "PUBLIC_FRONTEND"]
    add("NETWORK", "Review network access", "REVIEW",
        f"Proposed: {len(ingress)} public ingress, {len(internal_ids)} internal ingress, {len(public_frontends)} public-tier frontends, {len(private_compute)} private compute and {len(private_data)} private data services. Public frontends accept only web-ingress SG traffic; internal API ALB accepts only frontend server SGs; backend tasks have no public IP and accept only API-ingress SG traffic. Confirm VPCs, CIDRs, routes, AZ allocation, NAT/endpoints, TLS certificates/validation, authentication, authorization and health checks. WAF associates with supported public ingress; it does not connect VPC tiers. Route 53 and CloudFront are outside the VPC.",
        private_compute + private_data + ingress + public_frontends + sorted(internal_ids))
    workloads = [node["id"] for node in nodes if node.get("zone") == "APPLICATION"]
    private_storage = [item["node_id"] for item in services if item["placement"] == "PRIVATE_MANAGED_STORAGE"]
    if private_storage:
        add("STORAGE", "Review private storage access", "REVIEW", "S3 buckets are managed outside the VPC. Block Public Access, workload IAM, bucket/endpoint policies, encryption and same-region gateway route-table associations need implementation review. Databases and caches remain in isolated subnets. No bucket or access policy has been provisioned.", private_storage)
    bindings = evidence.get("environment_connections", [])
    if bindings:
        unresolved = sum(not item.get("target") or item.get("source") not in {node["id"] for node in nodes} or item.get("target") not in {node["id"] for node in nodes} for item in bindings)
        add("ENVIRONMENT", "Review environment connections", "REVIEW", f"{len(bindings)} customer-declared keys; {unresolved} unresolved or missing component destinations. Static references show key names in sampled files, not runtime use or validated credentials. Configure secrets privately and verify endpoint, protocol, authentication and network access.", sorted({item["source"] for item in bindings}))
    if requirements.get("sizing_workload_id"):
        from app.services.architecture.capacity_planning import plan_capacity
        _, capacity = plan_capacity(graph, requirements)
        add("CAPACITY", "Review workload scaling", "REVIEW", f"Peak demand {capacity['peak_requests_per_second']} requests/s. " + (f"{capacity['suggested_replicas']} replicas proposed using supplied throughput and 25% headroom. " if capacity['suggested_replicas'] else "Benchmark required for peak-capacity sizing. ") + capacity["scope"], [requirements["sizing_workload_id"]])
    add("RUNTIME", "Define build and runtime settings", "REVIEW",
        "Review each workload's build directory, runtime image, start command, listening port, health endpoint, environment-variable names and secret references. CPU, memory, replica limits and autoscaling need workload measurements; no sizes are inferred from traffic alone.", workloads)
    data = [node["id"] for node in nodes if node.get("zone") == "DATA"]
    add("RECOVERY", "Plan data and recovery", "REVIEW",
        "Confirm persistence use, compatibility, encryption, retention, backup/restore and migration strategy. Agree recovery point/time targets and validate them. Multi-AZ and multi-region requirements need actual replica, replication and failover plans; service cards are not instance counts.", data)
    add("ACCESS", "Review identity and secrets", "REVIEW",
        "Review workload-specific IAM roles, customer provisioning permissions, secrets injection, audit logging and sensitive-data handling. An observation-role identity check is not provisioning permission or a security assessment.")
    add("OPERATIONS", "Agree costs and operating ownership", "REVIEW",
        "Review a real infrastructure plan, service and data-transfer costs, deployment/rollback process, alarms, support ownership and acceptance evidence before execution. This checklist records planning gaps; it cannot approve or deploy infrastructure.")
    add("OBSERVABILITY", "Configure monitoring and response", "REVIEW",
        "Define service health, request latency/error rates, saturation, database/queue metrics, security and audit logs, retention/redaction, alert thresholds, recipients and incident runbooks. Verify telemetry delivery and an alert drill. A CloudWatch card is not an active monitor or alarm.", sorted(support_ids))
    add("COMPLIANCE", "Map controls to deployment evidence", "REVIEW",
        "Choose the applicable framework in Compliance; record control owners and evidence for identity, access reviews, change approvals, backups, incident response and logging. Keep evidence versioned against the implemented environment. Diagram checks and tracked readiness percentages do not establish full framework coverage or certification.")

    return {"format": "architecture-review-v1", "graph_fingerprint": fingerprint(graph),
            "source_snapshot": evidence.get("commit"), "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "status": "DECISIONS_REQUIRED" if any(item["state"] == "MISSING" for item in items) else "ENGINEERING_REVIEW_REQUIRED",
            "scope": "Saved design and supplied source metadata only. No AWS configuration, security, cost, capacity or recovery has been validated.",
            "items": items, "services": services, "references": [
                {"title": "AWS operational readiness review", "url": "https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_ready_to_support_const_orr.html"},
                {"title": "AWS private workloads and public ingress", "url": "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-example-private-subnets-nat.html"},
                {"title": "AWS internal load balancer access", "url": "https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html"},
                {"title": "AWS frontend server API integration", "url": "https://docs.aws.amazon.com/prescriptive-guidance/latest/micro-frontends-aws/api-integration-data-fetching.html"},
            ]}
