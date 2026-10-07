"""
AWS Trust Policy Inspector & Diff Engine (Phase 16 - §29-§33).
Inspects, normalizes, and compares actual vs expected IAM trust policies.
Produces human-readable diffs and corrected copyable policies without compromising ExternalId security.
"""
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from app.services.infrastructure.aws_identity_resolver import LaunchComplyAwsIdentityResolver


@dataclass
class TrustPolicyDiffResult:
    is_valid: bool
    differences: List[str]
    detected_principal: Optional[str]
    expected_principal: str
    detected_external_id: Optional[str]
    expected_external_id: str
    corrected_trust_policy: Dict[str, Any]
    corrected_trust_policy_json: str
    human_diff_summary: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "differences": self.differences,
            "detected_principal": self.detected_principal,
            "expected_principal": self.expected_principal,
            "detected_external_id": self.detected_external_id,
            "expected_external_id": self.expected_external_id,
            "corrected_trust_policy": self.corrected_trust_policy,
            "corrected_trust_policy_json": self.corrected_trust_policy_json,
            "human_diff_summary": self.human_diff_summary,
        }


class AwsTrustPolicyInspector:
    """
    Normalizes and audits trust policies (§29).
    Compares EXPECTED vs ACTUAL trust relationship and highlights deviations (§30).
    """

    @classmethod
    def generate_expected_trust_policy(
        cls,
        external_id: str,
        custom_principal: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generates canonical least-privilege trust policy with ExternalId condition (§33)."""
        if custom_principal:
            principal = custom_principal
        else:
            identity = LaunchComplyAwsIdentityResolver.resolve_identity()
            principal = identity.principal_arn

        return {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "LaunchComplyCrossAccountAssumeRole",
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": principal
                    },
                    "Action": "sts:AssumeRole",
                    "Condition": {
                        "StringEquals": {
                            "sts:ExternalId": external_id
                        }
                    }
                }
            ]
        }

    @classmethod
    def normalize_policy(cls, policy_input: Any) -> Dict[str, Any]:
        """Normalizes policy structure from string JSON or dict."""
        if isinstance(policy_input, str):
            try:
                data = json.loads(policy_input)
            except Exception:
                return {}
        elif isinstance(policy_input, dict):
            data = policy_input
        else:
            return {}
        return data

    @classmethod
    def compare_trust_policies(
        cls,
        actual_policy_raw: Any,
        expected_external_id: str,
        expected_principal_override: Optional[str] = None
    ) -> TrustPolicyDiffResult:
        """
        Performs fine-grained comparison between customer's current IAM trust policy
        and LaunchComply's required trust specification (§29, §30).
        """
        expected_identity = LaunchComplyAwsIdentityResolver.resolve_identity()
        expected_principal = expected_principal_override or expected_identity.principal_arn
        corrected_policy = cls.generate_expected_trust_policy(
            external_id=expected_external_id,
            custom_principal=expected_principal
        )
        corrected_json = json.dumps(corrected_policy, indent=2)

        actual_policy = cls.normalize_policy(actual_policy_raw)
        differences = []

        if not actual_policy:
            differences.append("Actual trust policy is empty or invalid JSON.")
            return TrustPolicyDiffResult(
                is_valid=False,
                differences=differences,
                detected_principal=None,
                expected_principal=expected_principal,
                detected_external_id=None,
                expected_external_id=expected_external_id,
                corrected_trust_policy=corrected_policy,
                corrected_trust_policy_json=corrected_json,
                human_diff_summary="No valid trust policy found on the role."
            )

        statements = actual_policy.get("Statement", [])
        if isinstance(statements, dict):
            statements = [statements]

        if not statements:
            differences.append("Trust policy contains no Statement blocks.")
            return TrustPolicyDiffResult(
                is_valid=False,
                differences=differences,
                detected_principal=None,
                expected_principal=expected_principal,
                detected_external_id=None,
                expected_external_id=expected_external_id,
                corrected_trust_policy=corrected_policy,
                corrected_trust_policy_json=corrected_json,
                human_diff_summary="Missing Statement block in trust policy."
            )

        # Inspect statements for sts:AssumeRole
        matching_stmt = None
        for stmt in statements:
            actions = stmt.get("Action", [])
            if isinstance(actions, str):
                actions = [actions]
            if "sts:AssumeRole" in actions or "sts:*" in actions:
                matching_stmt = stmt
                break

        if not matching_stmt:
            differences.append("Missing 'sts:AssumeRole' action in trust policy statement.")
            return TrustPolicyDiffResult(
                is_valid=False,
                differences=differences,
                detected_principal=None,
                expected_principal=expected_principal,
                detected_external_id=None,
                expected_external_id=expected_external_id,
                corrected_trust_policy=corrected_policy,
                corrected_trust_policy_json=corrected_json,
                human_diff_summary="Trust policy does not grant 'sts:AssumeRole'."
            )

        # 1. Check Effect
        if matching_stmt.get("Effect") != "Allow":
            differences.append(f"Statement Effect is '{matching_stmt.get('Effect')}', expected 'Allow'.")

        # 2. Check Principal (§30)
        principal_block = matching_stmt.get("Principal", {})
        actual_principal = None
        if isinstance(principal_block, dict):
            aws_p = principal_block.get("AWS", "")
            if isinstance(aws_p, list):
                actual_principal = aws_p[0] if aws_p else None
            else:
                actual_principal = aws_p
        elif isinstance(principal_block, str):
            actual_principal = principal_block

        if not actual_principal:
            differences.append("Principal is missing or does not contain an 'AWS' identity.")
        elif actual_principal.strip() != expected_principal.strip():
            differences.append(
                f"Principal Mismatch: Expected '{expected_principal}', but found '{actual_principal}'."
            )

        # 3. Check Condition: sts:ExternalId (§30, §33)
        condition_block = matching_stmt.get("Condition", {})
        actual_external_id = None
        if isinstance(condition_block, dict):
            str_eq = condition_block.get("StringEquals") or condition_block.get("stringequals") or {}
            if isinstance(str_eq, dict):
                actual_external_id = str_eq.get("sts:ExternalId") or str_eq.get("sts:externalid")

        if not actual_external_id:
            differences.append(
                f"Missing Condition: Required 'sts:ExternalId' condition matching '{expected_external_id}' not found."
            )
        elif actual_external_id != expected_external_id:
            differences.append(
                f"ExternalId Mismatch: Expected '{expected_external_id}', but found '{actual_external_id}'."
            )

        is_valid = len(differences) == 0

        diff_summary = "Trust policy matches all requirements." if is_valid else "; ".join(differences)

        return TrustPolicyDiffResult(
            is_valid=is_valid,
            differences=differences,
            detected_principal=actual_principal,
            expected_principal=expected_principal,
            detected_external_id=actual_external_id,
            expected_external_id=expected_external_id,
            corrected_trust_policy=corrected_policy,
            corrected_trust_policy_json=corrected_json,
            human_diff_summary=diff_summary
        )
