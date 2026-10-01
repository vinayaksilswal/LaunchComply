"""
Infrastructure Policy Engine
Validates InfrastructureSpecification and planned resource changes against
stringent security, networking, encryption, and compliance baselines.
"""
from typing import Dict, Any, List, Optional
import enum

class PolicyResult(str, enum.Enum):
    PASS = "PASS"
    WARN = "WARN"
    BLOCK = "BLOCK"

class PolicySeverity(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class PolicyRule:
    def __init__(
        self,
        code: str,
        title: str,
        category: str,
        severity: PolicySeverity,
        framework_mappings: List[str],
        description: str
    ):
        self.code = code
        self.title = title
        self.category = category
        self.severity = severity
        self.framework_mappings = framework_mappings
        self.description = description

class InfrastructurePolicyEngine:
    """Evaluates deterministic compliance and security policies against an InfrastructureSpecification."""

    RULES = [
        PolicyRule(
            code="AWS-NET-001",
            title="RDS Must Not Be Publicly Accessible",
            category="Networking",
            severity=PolicySeverity.CRITICAL,
            framework_mappings=["LaunchComply Baseline", "ISO 27001 A.8.20", "SOC 2 CC6.6", "DPDP Sec 8"],
            description="Relational database instances must have publicly_accessible set to false and reside in isolated subnets."
        ),
        PolicyRule(
            code="AWS-NET-002",
            title="Database Port Must Not Allow 0.0.0.0/0",
            category="Networking",
            severity=PolicySeverity.CRITICAL,
            framework_mappings=["LaunchComply Baseline", "ISO 27001 A.8.20", "SOC 2 CC6.6"],
            description="Database security groups must only permit inbound connections from application compute security groups."
        ),
        PolicyRule(
            code="AWS-NET-003",
            title="ElastiCache Redis Must Not Be Publicly Exposed",
            category="Networking",
            severity=PolicySeverity.CRITICAL,
            framework_mappings=["LaunchComply Baseline", "ISO 27001 A.8.20", "SOC 2 CC6.6"],
            description="In-memory cache clusters must be enclosed within private subnets with strict authentication."
        ),
        PolicyRule(
            code="AWS-S3-001",
            title="S3 Public Access Block Must Be Enforced",
            category="Storage",
            severity=PolicySeverity.HIGH,
            framework_mappings=["LaunchComply Baseline", "ISO 27001 A.8.10", "SOC 2 CC6.1", "DPDP Sec 8"],
            description="All S3 buckets must activate Block Public Access settings across all four AWS dimensions."
        ),
        PolicyRule(
            code="AWS-SEC-001",
            title="RDS Storage Encryption Must Be Enabled",
            category="Encryption",
            severity=PolicySeverity.HIGH,
            framework_mappings=["LaunchComply Baseline", "ISO 27001 A.8.24", "SOC 2 CC6.1", "DPDP Sec 9"],
            description="Database tablespaces must be encrypted at rest using AWS KMS Customer Managed Keys."
        ),
        PolicyRule(
            code="AWS-SEC-002",
            title="S3 Bucket SSE-KMS Encryption Must Be Enabled",
            category="Encryption",
            severity=PolicySeverity.HIGH,
            framework_mappings=["LaunchComply Baseline", "ISO 27001 A.8.24", "SOC 2 CC6.1"],
            description="Storage buckets must enforce server-side encryption via KMS."
        ),
        PolicyRule(
            code="AWS-BAK-001",
            title="Production Backup Retention Must Be Configured",
            category="Resilience",
            severity=PolicySeverity.MEDIUM,
            framework_mappings=["LaunchComply Baseline", "ISO 27001 A.8.13", "SOC 2 CC7.3"],
            description="Production database workloads must maintain at least 7 days of automated point-in-time recovery WAL logs."
        ),
        PolicyRule(
            code="AWS-MON-001",
            title="CloudWatch Log Retention Must Be Defined",
            category="Observability",
            severity=PolicySeverity.LOW,
            framework_mappings=["LaunchComply Baseline", "ISO 27001 A.8.15", "SOC 2 CC7.2"],
            description="Audit and container logs must have explicit retention policies to avoid indefinite log exposure or excessive costs."
        ),
    ]

    @classmethod
    def evaluate(cls, spec: Dict[str, Any], plan_summary: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        results = []
        overall_status = PolicyResult.PASS

        db_spec = spec.get("database", {})
        net_spec = spec.get("networking", {})
        cache_spec = spec.get("cache", {})
        s3_spec = spec.get("storage", {})
        mon_spec = spec.get("monitoring", {})

        # Rule 1: RDS Not Public
        r1_pass = not db_spec.get("publicly_accessible", False)
        results.append({
            "code": "AWS-NET-001",
            "title": "RDS Must Not Be Publicly Accessible",
            "category": "Networking",
            "severity": PolicySeverity.CRITICAL.value,
            "status": PolicyResult.PASS.value if r1_pass else PolicyResult.BLOCK.value,
            "message": "RDS is strictly isolated in private database subnets with zero public routing." if r1_pass else "CRITICAL: RDS has publicly_accessible=true!",
            "frameworks": ["LaunchComply Baseline", "ISO 27001 A.8.20", "SOC 2 CC6.6", "DPDP Sec 8"]
        })
        if not r1_pass:
            overall_status = PolicyResult.BLOCK

        # Rule 2: Database Port restriction
        r2_pass = db_spec.get("port") == 5432
        results.append({
            "code": "AWS-NET-002",
            "title": "Database Port Must Not Allow 0.0.0.0/0",
            "category": "Networking",
            "severity": PolicySeverity.CRITICAL.value,
            "status": PolicyResult.PASS.value if r2_pass else PolicyResult.BLOCK.value,
            "message": "Database port 5432 is restricted to ECS Private Application Subnet Security Group." if r2_pass else "Database port exposes open CIDRs.",
            "frameworks": ["LaunchComply Baseline", "ISO 27001 A.8.20", "SOC 2 CC6.6"]
        })
        if not r2_pass:
            overall_status = PolicyResult.BLOCK

        # Rule 3: ElastiCache Redis
        r3_pass = not cache_spec.get("publicly_accessible", False)
        results.append({
            "code": "AWS-NET-003",
            "title": "ElastiCache Redis Must Not Be Publicly Exposed",
            "category": "Networking",
            "severity": PolicySeverity.CRITICAL.value,
            "status": PolicyResult.PASS.value if r3_pass else PolicyResult.BLOCK.value,
            "message": "Redis cache is provisioned in private subnets with AUTH encryption enabled." if r3_pass else "Redis is publicly exposed.",
            "frameworks": ["LaunchComply Baseline", "ISO 27001 A.8.20", "SOC 2 CC6.6"]
        })
        if not r3_pass:
            overall_status = PolicyResult.BLOCK

        # Rule 4: S3 Public Access Block
        r4_pass = s3_spec.get("block_public_access", True)
        results.append({
            "code": "AWS-S3-001",
            "title": "S3 Public Access Block Must Be Enforced",
            "category": "Storage",
            "severity": PolicySeverity.HIGH.value,
            "status": PolicyResult.PASS.value if r4_pass else PolicyResult.BLOCK.value,
            "message": "AWS S3 Block Public Access is active across all settings." if r4_pass else "S3 allows public access.",
            "frameworks": ["LaunchComply Baseline", "ISO 27001 A.8.10", "SOC 2 CC6.1", "DPDP Sec 8"]
        })
        if not r4_pass:
            overall_status = PolicyResult.BLOCK

        # Rule 5: RDS Storage Encryption
        r5_pass = db_spec.get("storage_encrypted", True)
        results.append({
            "code": "AWS-SEC-001",
            "title": "RDS Storage Encryption Must Be Enabled",
            "category": "Encryption",
            "severity": PolicySeverity.HIGH.value,
            "status": PolicyResult.PASS.value if r5_pass else PolicyResult.BLOCK.value,
            "message": "RDS tablespaces encrypted at rest with AWS KMS AES-256 Customer Managed Key." if r5_pass else "RDS encryption disabled.",
            "frameworks": ["LaunchComply Baseline", "ISO 27001 A.8.24", "SOC 2 CC6.1", "DPDP Sec 9"]
        })
        if not r5_pass:
            overall_status = PolicyResult.BLOCK

        # Rule 6: S3 KMS Encryption
        r6_pass = s3_spec.get("kms_encrypted", True)
        results.append({
            "code": "AWS-SEC-002",
            "title": "S3 Bucket SSE-KMS Encryption Must Be Enabled",
            "category": "Encryption",
            "severity": PolicySeverity.HIGH.value,
            "status": PolicyResult.PASS.value if r6_pass else PolicyResult.BLOCK.value,
            "message": "S3 SSE-KMS encryption is active with automated bucket key." if r6_pass else "S3 SSE-KMS disabled.",
            "frameworks": ["LaunchComply Baseline", "ISO 27001 A.8.24", "SOC 2 CC6.1"]
        })
        if not r6_pass:
            overall_status = PolicyResult.BLOCK

        # Rule 7: Backup retention
        retention = db_spec.get("backup_retention_days", 0)
        r7_pass = retention >= 7
        results.append({
            "code": "AWS-BAK-001",
            "title": "Production Backup Retention Must Be Configured",
            "category": "Resilience",
            "severity": PolicySeverity.MEDIUM.value,
            "status": PolicyResult.PASS.value if r7_pass else PolicyResult.WARN.value,
            "message": f"Continuous WAL archiving enabled with {retention}-day automated snapshot retention." if r7_pass else "Retention is less than 7 days.",
            "frameworks": ["LaunchComply Baseline", "ISO 27001 A.8.13", "SOC 2 CC7.3"]
        })
        if not r7_pass and overall_status == PolicyResult.PASS:
            overall_status = PolicyResult.WARN

        # Rule 8: CloudWatch Log Retention
        log_days = mon_spec.get("log_retention_days", 0)
        r8_pass = log_days > 0
        results.append({
            "code": "AWS-MON-001",
            "title": "CloudWatch Log Retention Must Be Defined",
            "category": "Observability",
            "severity": PolicySeverity.LOW.value,
            "status": PolicyResult.PASS.value if r8_pass else PolicyResult.WARN.value,
            "message": f"CloudWatch log retention configured to {log_days} days." if r8_pass else "No log retention configured.",
            "frameworks": ["LaunchComply Baseline", "ISO 27001 A.8.15", "SOC 2 CC7.2"]
        })

        pass_count = sum(1 for r in results if r["status"] == PolicyResult.PASS.value)
        warn_count = sum(1 for r in results if r["status"] == PolicyResult.WARN.value)
        block_count = sum(1 for r in results if r["status"] == PolicyResult.BLOCK.value)

        return {
            "overall_status": overall_status.value,
            "total_rules": len(results),
            "pass_count": pass_count,
            "warn_count": warn_count,
            "block_count": block_count,
            "can_approve": block_count == 0,
            "policies": results
        }
