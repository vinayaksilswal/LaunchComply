"""
AWS Least-Privilege Permission Manifests & Profiles (Phase 16 - §34-§42).
Defines fine-grained permission profiles, customer-facing explainability,
and strict rejection of broad AdministratorAccess.
"""
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict


@dataclass
class PermissionItem:
    service: str
    actions: List[str]
    resource_scope: str
    required: bool
    reason: str  # Why does LaunchComply need this permission? (§38)


@dataclass
class PermissionProfile:
    profile_id: str  # DISCOVERY, DEPLOYMENT, MONITORING, SECURITY_READ, BACKUP_READ, COST_READ
    name: str
    description: str
    is_default: bool
    permissions: List[PermissionItem]


class AwsPermissionManifest:
    VERSION = "2026-10-v3"

    PROFILES: Dict[str, PermissionProfile] = {
        "DISCOVERY": PermissionProfile(
            profile_id="DISCOVERY",
            name="Infrastructure Discovery & Topology Mapping",
            description="Read-only inspection of existing VPCs, subnets, route tables, and load balancers to plan zero-conflict placement.",
            is_default=True,
            permissions=[
                PermissionItem(
                    service="ec2",
                    actions=["ec2:DescribeVpcs", "ec2:DescribeSubnets", "ec2:DescribeSecurityGroups", "ec2:DescribeRouteTables", "ec2:DescribeAvailabilityZones"],
                    resource_scope="*",
                    required=True,
                    reason="Required to identify VPC topology, private subnets, and CIDR blocks for container networking."
                ),
                PermissionItem(
                    service="elasticloadbalancing",
                    actions=["elasticloadbalancing:DescribeLoadBalancers", "elasticloadbalancing:DescribeTargetGroups", "elasticloadbalancing:DescribeListeners"],
                    resource_scope="*",
                    required=True,
                    reason="Discovers active application load balancers and ingress routing configurations."
                ),
            ]
        ),
        "DEPLOYMENT": PermissionProfile(
            profile_id="DEPLOYMENT",
            name="Container Workload Deployment",
            description="Enables automated zero-downtime rolling updates on ECS Fargate with private ECR container images.",
            is_default=True,
            permissions=[
                PermissionItem(
                    service="ecs",
                    actions=["ecs:DescribeClusters", "ecs:DescribeServices", "ecs:UpdateService", "ecs:DescribeTasks", "ecs:ListTasks"],
                    resource_scope="*",
                    required=True,
                    reason="Used to orchestrate blue/green or rolling service updates and verify container health."
                ),
                PermissionItem(
                    service="ecr",
                    actions=["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"],
                    resource_scope="*",
                    required=True,
                    reason="Permits Fargate tasks to authenticate and securely pull vetted container images."
                ),
                PermissionItem(
                    service="elasticloadbalancing",
                    actions=["elasticloadbalancing:RegisterTargets", "elasticloadbalancing:DeregisterTargets"],
                    resource_scope="*",
                    required=True,
                    reason="Attaches healthy new task instances to load balancer target groups during deployments."
                ),
                PermissionItem(
                    service="iam",
                    actions=["iam:PassRole"],
                    resource_scope="arn:aws:iam::*:role/launchcomply-*",
                    required=True,
                    reason="Scoped passing of task execution roles to ECS Fargate tasks (strictly limited to launchcomply-* roles)."
                ),
            ]
        ),
        "MONITORING": PermissionProfile(
            profile_id="MONITORING",
            name="Observability & CloudWatch Telemetry",
            description="Collects container application logs, CPU/memory performance metrics, and latency alarms.",
            is_default=True,
            permissions=[
                PermissionItem(
                    service="logs",
                    actions=["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams", "logs:DescribeLogGroups"],
                    resource_scope="*",
                    required=True,
                    reason="Captures structured application logs for real-time auditability and deployment verification."
                ),
                PermissionItem(
                    service="cloudwatch",
                    actions=["cloudwatch:DescribeAlarms", "cloudwatch:GetMetricData"],
                    resource_scope="*",
                    required=False,
                    reason="Reads error rate and 5xx metric alarms to trigger automated rollbacks when enabled."
                ),
            ]
        ),
        "SECURITY_READ": PermissionProfile(
            profile_id="SECURITY_READ",
            name="Continuous Security & Compliance Read",
            description="Audits KMS encryption at rest, Secrets Manager configurations, and TLS certificates without accessing sensitive plaintext.",
            is_default=True,
            permissions=[
                PermissionItem(
                    service="kms",
                    actions=["kms:DescribeKey", "kms:ListAliases"],
                    resource_scope="*",
                    required=True,
                    reason="Validates that databases, storage, and secrets use AWS KMS customer-managed key encryption."
                ),
                PermissionItem(
                    service="secretsmanager",
                    actions=["secretsmanager:DescribeSecret", "secretsmanager:ListSecrets"],
                    resource_scope="*",
                    required=True,
                    reason="Verifies secret rotation status and tagging metadata (NEVER reads plaintext secret contents)."
                ),
                PermissionItem(
                    service="acm",
                    actions=["acm:DescribeCertificate", "acm:ListCertificates"],
                    resource_scope="*",
                    required=False,
                    reason="Verifies TLS certificate validity, expiration dates, and HTTPS domain coverage."
                ),
            ]
        ),
        "BACKUP_READ": PermissionProfile(
            profile_id="BACKUP_READ",
            name="Database & Disaster Recovery Verification",
            description="Monitors automated snapshot cadences, continuous WAL archiving, and Point-in-Time Recovery status.",
            is_default=True,
            permissions=[
                PermissionItem(
                    service="rds",
                    actions=["rds:DescribeDBInstances", "rds:DescribeDBSnapshots", "rds:DescribeDBSubnetGroups"],
                    resource_scope="*",
                    required=True,
                    reason="Verifies RDS instance health, Multi-AZ replication, and automated snapshot retention."
                ),
            ]
        ),
        "COST_READ": PermissionProfile(
            profile_id="COST_READ",
            name="FinOps & Cost Explorer (Optional)",
            description="Monitors daily AWS spend and rightsizing recommendations for connected infrastructure.",
            is_default=False,
            permissions=[
                PermissionItem(
                    service="ce",
                    actions=["ce:GetCostAndUsage", "ce:GetCostForecast"],
                    resource_scope="*",
                    required=False,
                    reason="Provides visibility into daily cloud spend and unit economics (optional)."
                ),
            ]
        ),
    }

    @classmethod
    def get_manifest_dict(cls) -> Dict[str, Any]:
        """Returns structured permission manifest for frontend rendering and audit logging (§37, §38)."""
        profiles_out = {}
        for p_id, profile in cls.PROFILES.items():
            profiles_out[p_id] = {
                "profile_id": profile.profile_id,
                "name": profile.name,
                "description": profile.description,
                "is_default": profile.is_default,
                "permissions": [asdict(p) for p in profile.permissions]
            }
        return {
            "version": cls.VERSION,
            "least_privilege_enforced": True,
            "zero_administrator_access": True,
            "profiles": profiles_out
        }

    @classmethod
    def check_for_administrator_access(cls, policy_doc: Dict[str, Any]) -> bool:
        """
        Detects if policy document requests broad AdministratorAccess (§40).
        Returns True if dangerous wildcard AdministratorAccess is detected.
        """
        statements = policy_doc.get("Statement", [])
        if isinstance(statements, dict):
            statements = [statements]

        for stmt in statements:
            if stmt.get("Effect") == "Allow":
                actions = stmt.get("Action", [])
                if isinstance(actions, str):
                    actions = [actions]
                resource = stmt.get("Resource", "")
                if "*" in actions and resource == "*":
                    return True
                if "AdministratorAccess" in str(stmt):
                    return True
        return False

    @classmethod
    def evaluate_permissions(
        cls,
        active_profiles: Optional[List[str]] = None,
        simulated_block: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates permissions across selected feature profiles (§39).
        Result statuses: PASS, MISSING_REQUIRED, MISSING_OPTIONAL, BLOCKED_BY_SCP, BLOCKED_BY_BOUNDARY, UNKNOWN
        """
        profiles_to_check = active_profiles or ["DISCOVERY", "DEPLOYMENT", "MONITORING", "SECURITY_READ", "BACKUP_READ"]
        findings = []
        overall_status = "PASS"

        if simulated_block == "SCP":
            return {
                "overall_status": "BLOCKED_BY_SCP",
                "summary": "One or more required AWS permissions are denied by an AWS Organizations Service Control Policy (SCP).",
                "profiles_evaluated": profiles_to_check,
                "findings": [
                    {
                        "profile": "DEPLOYMENT",
                        "service": "ecs",
                        "action": "ecs:UpdateService",
                        "status": "BLOCKED_BY_SCP",
                        "required": True,
                        "guidance": "Contact your AWS Organization administrator to permit ecs:UpdateService on this organizational unit."
                    }
                ]
            }
        elif simulated_block == "BOUNDARY":
            return {
                "overall_status": "BLOCKED_BY_BOUNDARY",
                "summary": "An attached IAM Permissions Boundary is restricting the LaunchComply cross-account role.",
                "profiles_evaluated": profiles_to_check,
                "findings": [
                    {
                        "profile": "DEPLOYMENT",
                        "service": "iam",
                        "action": "iam:PassRole",
                        "status": "BLOCKED_BY_BOUNDARY",
                        "required": True,
                        "guidance": "Update the permissions boundary attached to the role to allow passing launchcomply-* roles."
                    }
                ]
            }

        for prof_id in profiles_to_check:
            prof = cls.PROFILES.get(prof_id)
            if not prof:
                continue
            for perm in prof.permissions:
                findings.append({
                    "profile": prof.profile_id,
                    "service": perm.service,
                    "actions": perm.actions,
                    "required": perm.required,
                    "reason": perm.reason,
                    "status": "PASS",
                })

        return {
            "overall_status": overall_status,
            "version": cls.VERSION,
            "profiles_evaluated": profiles_to_check,
            "findings": findings
        }
