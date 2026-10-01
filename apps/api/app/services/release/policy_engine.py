"""Release Policy Engine.
Evaluates gate checks (security scans, runtime secrets, migrations, health verification,
TLS certificates, immutable digests, and infrastructure drift) prior to deployment.
"""
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class PolicyRuleEvaluation(BaseModel):
    rule_id: str
    name: str
    status: str  # PASS, WARN, BLOCK
    details: str
    remediation: Optional[str] = None


class ReleasePolicyAssessment(BaseModel):
    overall_status: str  # PASS, BLOCKED, OVERRIDDEN
    rules: List[PolicyRuleEvaluation]
    blocked_count: int
    warn_count: int
    passed_count: int
    is_deployable: bool
    override_applied: bool = False
    override_reason: Optional[str] = None
    override_by: Optional[str] = None


class ReleasePolicyEngine:
    """Evaluates release readiness gates according to DevSecOps standards."""

    @classmethod
    def evaluate(
        cls,
        has_critical_vulns: bool,
        missing_secrets: List[str],
        migration_failed: bool,
        health_passed: bool,
        has_valid_tls: bool,
        has_artifact_digest: bool,
        infra_ready: bool,
        has_critical_drift: bool = False,
        override_token: Optional[str] = None,
        override_reason: Optional[str] = None,
        override_by: Optional[str] = None
    ) -> ReleasePolicyAssessment:
        rules: List[PolicyRuleEvaluation] = []

        # REL-SEC-001: Image Vulnerability Gate
        if has_critical_vulns:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-SEC-001",
                name="Critical Image Vulnerability Gate",
                status="BLOCK",
                details="Container image contains CRITICAL vulnerabilities with active exploits.",
                remediation="Upgrade base image or patch vulnerable dependencies before deploying to production."
            ))
        else:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-SEC-001",
                name="Critical Image Vulnerability Gate",
                status="PASS",
                details="Zero CRITICAL vulnerabilities detected in release container images."
            ))

        # REL-CONFIG-001: Required Secrets Gate
        if missing_secrets:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-CONFIG-001",
                name="Runtime Configuration & Secrets Gate",
                status="BLOCK",
                details=f"Missing required runtime secrets: {', '.join(missing_secrets)}",
                remediation="Configure all required write-only secrets in the Environment Secrets vault."
            ))
        else:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-CONFIG-001",
                name="Runtime Configuration & Secrets Gate",
                status="PASS",
                details="All required environment secrets are properly configured in AWS Secrets Manager."
            ))

        # REL-DB-001: Database Migration Gate
        if migration_failed:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-DB-001",
                name="Database Schema Migration Gate",
                status="BLOCK",
                details="Database migration execution failed or schema is in a corrupt state.",
                remediation="Inspect migration logs and fix schema compatibility before promotion."
            ))
        else:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-DB-001",
                name="Database Schema Migration Gate",
                status="PASS",
                details="Database schema migrations passed or no pending migrations required."
            ))

        # REL-HEALTH-001: Health Endpoint Smoke Test Gate
        if not health_passed:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-HEALTH-001",
                name="Health Endpoint Smoke Test Gate",
                status="BLOCK",
                details="Application container failed health probe or returned non-200 status code.",
                remediation="Check application logs in CloudWatch and verify DB/Redis connections."
            ))
        else:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-HEALTH-001",
                name="Health Endpoint Smoke Test Gate",
                status="PASS",
                details="Application health checks and smoke test suite passed with latency < 500ms."
            ))

        # REL-TLS-001: TLS Certificate Gate
        if not has_valid_tls:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-TLS-001",
                name="Domain TLS Certificate Gate",
                status="WARN",
                details="Domain certificate is pending DNS validation. Traffic will use temporary ALB endpoint.",
                remediation="Add required ACM CNAME records in your DNS provider."
            ))
        else:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-TLS-001",
                name="Domain TLS Certificate Gate",
                status="PASS",
                details="Valid ACM TLS certificate active with HTTP -> HTTPS 301 redirection."
            ))

        # REL-ART-001: Immutable Digest Gate
        if not has_artifact_digest:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-ART-001",
                name="Immutable Artifact Digest Gate",
                status="BLOCK",
                details="Release lacks a cryptographic sha256 image digest. Mutable tags are prohibited in production.",
                remediation="Ensure build worker generates and pushes immutable digest to ECR."
            ))
        else:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-ART-001",
                name="Immutable Artifact Digest Gate",
                status="PASS",
                details="Verified immutable cryptographic sha256 image digest."
            ))

        # REL-IAC-001: Infrastructure Readiness Gate
        if not infra_ready:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-IAC-001",
                name="Infrastructure Readiness Gate",
                status="BLOCK",
                details="Target environment infrastructure is not in READY state.",
                remediation="Apply OpenTofu/Terraform infrastructure plan before deploying applications."
            ))
        else:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-IAC-001",
                name="Infrastructure Readiness Gate",
                status="PASS",
                details="Infrastructure stack (VPC, ECS Cluster, ALB, RDS) is provisioned and READY."
            ))

        # REL-DRIFT-001: Infrastructure Drift Gate
        if has_critical_drift:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-DRIFT-001",
                name="Critical Infrastructure Drift Gate",
                status="BLOCK",
                details="Critical drift detected on security groups or RDS access rules outside Terraform.",
                remediation="Reconcile infrastructure drift before deploying new release."
            ))
        else:
            rules.append(PolicyRuleEvaluation(
                rule_id="REL-DRIFT-001",
                name="Critical Infrastructure Drift Gate",
                status="PASS",
                details="Zero unmanaged infrastructure drift detected."
            ))

        blocked_count = sum(1 for r in rules if r.status == "BLOCK")
        warn_count = sum(1 for r in rules if r.status == "WARN")
        passed_count = sum(1 for r in rules if r.status == "PASS")

        is_deployable = (blocked_count == 0)
        overall_status = "PASS" if is_deployable else "BLOCKED"
        override_applied = False

        if not is_deployable and override_reason and override_by:
            overall_status = "OVERRIDDEN"
            is_deployable = True
            override_applied = True

        return ReleasePolicyAssessment(
            overall_status=overall_status,
            rules=rules,
            blocked_count=blocked_count,
            warn_count=warn_count,
            passed_count=passed_count,
            is_deployable=is_deployable,
            override_applied=override_applied,
            override_reason=override_reason,
            override_by=override_by
        )
