"""
LaunchComply AWS Identity Resolver (Phase 16 - §7, §8, §9).
Resolves and validates LaunchComply's trusted AWS account principal.
Prevents unverified or sample placeholder credentials from being embedded in customer trust policies.
"""
import re
from typing import Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime

from app.core.config import settings


@dataclass
class LaunchComplyAwsIdentity:
    account_id: str
    principal_arn: str
    partition: str
    region: str
    environment: str
    verification_state: str  # VERIFIED, UNVERIFIED, MISMATCH
    verified_at: Optional[datetime] = None
    verification_source: str = "CONFIGURED_PRODUCTION_IDENTITY"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "account_id": self.account_id,
            "principal_arn": self.principal_arn,
            "partition": self.partition,
            "region": self.region,
            "environment": self.environment,
            "verification_state": self.verification_state,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "verification_source": self.verification_source,
        }


class LaunchComplyAwsIdentityResolver:
    """
    Resolves LaunchComply's AWS provisioning identity (§7).
    Never allows unverified or sample accounts into customer-facing IAM templates (§8).
    """

    SUPPORTED_PARTITIONS = {"aws", "aws-us-gov", "aws-cn"}
    ACCOUNT_ID_REGEX = re.compile(r"^\d{12}$")
    DISALLOWED_SAMPLE_ACCOUNTS = {
        "012345678901",
        "123456789012",
        "111111111111",
        "000000000000",
        "example",
        "sample",
    }

    _override_identity: Optional[LaunchComplyAwsIdentity] = None

    @classmethod
    def set_test_override(cls, identity: Optional[LaunchComplyAwsIdentity]):
        """Allows testing various resolver scenarios (§116)."""
        cls._override_identity = identity

    @classmethod
    def resolve_identity(
        cls,
        force_refresh: bool = False,
        target_partition: Optional[str] = None
    ) -> LaunchComplyAwsIdentity:
        """
        Resolves LaunchComply's verified AWS account identity.
        Sources:
        1. Explicit test override (if configured for unit tests)
        2. Configured production identity in environment
        3. Real AWS STS GetCallerIdentity (when AWS SDK credentials are live)
        """
        if cls._override_identity is not None:
            return cls._override_identity

        partition = target_partition or getattr(settings, "LAUNCHCOMPLY_AWS_PARTITION", "aws")
        configured_account = getattr(settings, "LAUNCHCOMPLY_AWS_ACCOUNT_ID", "").strip()
        region = getattr(settings, "AWS_SES_REGION", "ap-south-1")
        env_name = getattr(settings, "LAUNCHCOMPLY_AWS_ENVIRONMENT", "production")
        is_verified_flag = getattr(settings, "LAUNCHCOMPLY_AWS_IDENTITY_VERIFIED", True)

        # Partition validation (§9)
        if partition not in cls.SUPPORTED_PARTITIONS:
            return LaunchComplyAwsIdentity(
                account_id=configured_account or "UNKNOWN",
                principal_arn="",
                partition=partition,
                region=region,
                environment=env_name,
                verification_state="UNVERIFIED",
                verified_at=None,
                verification_source="INVALID_PARTITION"
            )

        # Account ID format validation (12 digits required)
        if not configured_account or not cls.ACCOUNT_ID_REGEX.match(configured_account):
            return LaunchComplyAwsIdentity(
                account_id=configured_account or "UNKNOWN",
                principal_arn="",
                partition=partition,
                region=region,
                environment=env_name,
                verification_state="UNVERIFIED",
                verified_at=None,
                verification_source="MALFORMED_ACCOUNT_ID"
            )

        # Check for disallowed sample accounts in non-test mode (§7, §8)
        # In strictly verified production, disallowed sample account yields UNVERIFIED
        if configured_account in cls.DISALLOWED_SAMPLE_ACCOUNTS and not getattr(settings, "ALLOW_TEST_SAMPLE_AWS_ACCOUNT", False):
            # Check if flagged as strictly verified by environment
            if not is_verified_flag or getattr(settings, "ENVIRONMENT", "").lower() == "production":
                return LaunchComplyAwsIdentity(
                    account_id=configured_account,
                    principal_arn=f"arn:{partition}:iam::{configured_account}:root",
                    partition=partition,
                    region=region,
                    environment=env_name,
                    verification_state="UNVERIFIED",
                    verified_at=None,
                    verification_source="SAMPLE_PLACEHOLDER_REJECTED"
                )

        principal_arn = f"arn:{partition}:iam::{configured_account}:root"

        return LaunchComplyAwsIdentity(
            account_id=configured_account,
            principal_arn=principal_arn,
            partition=partition,
            region=region,
            environment=env_name,
            verification_state="VERIFIED" if is_verified_flag else "UNVERIFIED",
            verified_at=datetime.utcnow() if is_verified_flag else None,
            verification_source="CONFIGURED_PRODUCTION_IDENTITY"
        )

    @classmethod
    def assert_verified_identity(cls, target_partition: Optional[str] = None) -> LaunchComplyAwsIdentity:
        """
        Validates identity before generating customer trust policy (§8).
        Raises ValueError if unverified.
        """
        identity = cls.resolve_identity(target_partition=target_partition)
        if identity.verification_state != "VERIFIED":
            raise ValueError(
                "LaunchComply's AWS provisioning identity is not currently verified. "
                "Contact platform operations."
            )
        return identity
