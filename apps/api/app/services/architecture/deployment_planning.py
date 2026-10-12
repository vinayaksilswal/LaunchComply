"""Customer-declared ECS deployment policies; never provisioned configuration."""
import re
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class WorkloadPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")
    node_id: str = Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    min_tasks: int = Field(ge=1, le=10_000)
    max_tasks: int = Field(ge=1, le=10_000)
    metric: Literal["CPU", "MEMORY", "ALB_REQUESTS"]
    target: float = Field(gt=0, le=100_000_000, allow_inf_nan=False)
    scale_out_cooldown_seconds: int = Field(ge=0, le=86_400)
    scale_in_cooldown_seconds: int = Field(ge=0, le=86_400)
    deployment_strategy: Literal["ROLLING", "BLUE_GREEN"]
    alb_id: str | None = Field(default=None, max_length=64)
    target_port: int | None = Field(default=None, ge=1, le=65535)
    health_check_path: str | None = Field(default=None, min_length=1, max_length=160, pattern=r"^/[a-zA-Z0-9/_.-]*$")

    @model_validator(mode="after")
    def consistent(self):
        if self.max_tasks < self.min_tasks:
            raise ValueError("Maximum tasks must be at least the minimum.")
        if self.metric in {"CPU", "MEMORY"} and self.target > 100:
            raise ValueError("CPU and memory targets must be at most 100 percent.")
        if self.metric == "ALB_REQUESTS" and (not self.alb_id or self.deployment_strategy == "BLUE_GREEN"):
            raise ValueError("ALB request-count tracking requires an ALB and rolling deployment.")
        if self.alb_id and (not self.target_port or not self.health_check_path):
            raise ValueError("Choose the target port and health path for the ALB target group.")
        if not self.alb_id and (self.target_port or self.health_check_path):
            raise ValueError("Target-group settings require a connected ALB.")
        return self


def policy_issues(graph, policies):
    """Re-evaluate references against each current draft, including later edits."""
    nodes = {node["id"]: node for node in graph["nodes"]}
    edges = {(edge["source"], edge["target"]) for edge in graph["edges"]}
    seen, issues = set(), []
    for raw in policies:
        try:
            policy = WorkloadPolicy.model_validate(raw)
        except ValueError:
            issues.append("A workload policy has invalid or incomplete fields.")
            continue
        if policy.node_id in seen:
            issues.append("Keep one scaling policy per workload.")
        seen.add(policy.node_id)
        node = nodes.get(policy.node_id)
        if not node or node.get("zone") != "APPLICATION" or not re.search(r"\becs\b|\bfargate\b", node.get("service", ""), re.I):
            issues.append(f"Policy {policy.node_id} needs an existing ECS/Fargate workload.")
        if policy.alb_id:
            alb = nodes.get(policy.alb_id)
            if not alb or alb.get("zone") != "EDGE" or not re.search(r"application load balancer|\balb\b", alb.get("service", ""), re.I) or (policy.alb_id, policy.node_id) not in edges:
                issues.append(f"Policy {policy.node_id} needs an ALB with a saved route to this workload.")
    return issues


def deployment_review(graph, requirements):
    policies = (requirements or {}).get("workload_policies", [])
    ecs = [node for node in graph["nodes"] if node.get("zone") == "APPLICATION" and re.search(r"\becs\b|\bfargate\b", node.get("service", ""), re.I)]
    mapped = {item.get("node_id") for item in policies}
    missing = [node["id"] for node in ecs if node["id"] not in mapped]
    issues = policy_issues(graph, policies)
    if (requirements or {}).get("availability") in {"MULTI_AZ", "MULTI_REGION"}:
        for item in policies:
            if item.get("min_tasks", 0) < 2:
                issues.append(f"Policy {item.get('node_id')} has fewer than two baseline tasks for a multi-AZ target.")
    return {"policies": policies, "unplanned_workload_ids": missing, "issues": issues,
        "status": "DECISIONS_REQUIRED" if missing or issues else "IMPLEMENTATION_REVIEW_REQUIRED",
        "scope": "Customer-declared planning only. Configure unique IP target groups for Fargate, AZ distribution, TLS/auth, stateless sessions, DB connection budgets, quotas, deployment rollback and load/failure tests. No scaling policy or health check has been deployed."}
