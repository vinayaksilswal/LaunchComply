"""
Unit & Integration Tests for Phase 16: AWS Onboarding Automation & Zero-Friction STS/IAM (§115-§122).
Covers Identity Resolution, Versioned CloudFormation, STS Diagnostics V2, Trust Policy Diff,
Permission Manifests, State Machine Gates, Tenant Isolation, and Safe Disconnect.
"""
import json
import pytest
from datetime import datetime, timedelta
from sqlalchemy.future import select

from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.models.auth import Organization, User, OrganizationMembership, MembershipRole
from app.models.entities import CloudAccount
from app.models.aws_connection import (
    AwsOnboardingTemplateVersion,
    AwsExternalIdRotation,
    AwsStackObservation,
)
from app.services.infrastructure.aws_identity_resolver import (
    LaunchComplyAwsIdentityResolver,
    LaunchComplyAwsIdentity,
)
from app.services.infrastructure.aws_permission_manifest import (
    AwsPermissionManifest,
)
from app.services.infrastructure.aws_trust_policy_inspector import (
    AwsTrustPolicyInspector,
)
from app.services.infrastructure.aws_onboarding import (
    AWSOnboardingService,
    aws_onboarding_service,
)


@pytest.mark.asyncio
async def test_identity_resolution_scenarios():
    """Test 1: AWS Identity Resolver scenarios - valid, unverified, and partitions (§116)."""
    # 1. Valid resolution
    identity = LaunchComplyAwsIdentityResolver.resolve_identity()
    assert identity.partition in {"aws", "aws-us-gov", "aws-cn"}
    assert len(identity.account_id) == 12
    assert identity.principal_arn.startswith(f"arn:{identity.partition}:iam::")
    assert identity.verification_state == "VERIFIED"

    # 2. Invalid partition resolution (§9)
    bad_part = LaunchComplyAwsIdentityResolver.resolve_identity(target_partition="aws-invalid")
    assert bad_part.verification_state == "UNVERIFIED"
    assert bad_part.verification_source == "INVALID_PARTITION"

    # 3. Unverified identity blocks customer template generation (§8)
    unverified = LaunchComplyAwsIdentity(
        account_id="000000000000",
        principal_arn="arn:aws:iam::000000000000:root",
        partition="aws",
        region="ap-south-1",
        environment="production",
        verification_state="UNVERIFIED",
        verification_source="UNVERIFIED_TEST"
    )
    LaunchComplyAwsIdentityResolver.set_test_override(unverified)
    try:
        with pytest.raises(ValueError, match="LaunchComply's AWS provisioning identity is not currently verified"):
            AWSOnboardingService.generate_cloudformation_template("launchcomply-ext-test-123")
    finally:
        LaunchComplyAwsIdentityResolver.set_test_override(None)


@pytest.mark.asyncio
async def test_versioned_cloudformation_template():
    """Test 2: Versioned template generation, checksum, ExternalId uniqueness, no AdministratorAccess (§115)."""
    ext1 = AWSOnboardingService.generate_external_id("org-alpha-1")
    ext2 = AWSOnboardingService.generate_external_id("org-beta-2")
    assert ext1 != ext2
    assert "launchcomply-ext-" in ext1

    tpl_data = AWSOnboardingService.generate_versioned_template(ext1, version="v1.2.0")
    assert tpl_data["version"] == "v1.2.0"
    assert len(tpl_data["checksum"]) == 64  # SHA256
    assert "sts:ExternalId" in tpl_data["template_yaml"]
    assert ext1 in tpl_data["template_yaml"]
    assert "AdministratorAccess" not in tpl_data["template_yaml"]  # Least privilege (§40)
    assert "LaunchComplyProvisioningRole" in tpl_data["template_yaml"]
    assert tpl_data["stack_name"].startswith("LaunchComply-Onboarding-")


@pytest.mark.asyncio
async def test_sts_error_diagnostics_taxonomy():
    """Test 3: STS Diagnostics V2 - Canonical failure codes and confidence levels (§117)."""
    ext_id = "launchcomply-ext-diag-test"

    # 1. INVALID_PRINCIPAL
    d1 = AWSOnboardingService.parse_sts_error("User is not authorized to perform: sts:AssumeRole invalid principal", ext_id)
    assert d1["error_code"] == "INVALID_PRINCIPAL"
    assert d1["confidence"] == "CONFIRMED"

    # 2. WRONG_EXTERNAL_ID
    d2 = AWSOnboardingService.parse_sts_error("sts:AssumeRole AccessDenied externalId mismatch", ext_id)
    assert d2["error_code"] == "WRONG_EXTERNAL_ID"
    assert d2["confidence"] == "CONFIRMED"

    # 3. ROLE_NOT_FOUND
    d3 = AWSOnboardingService.parse_sts_error("The role with name LaunchComplyRole cannot be found", ext_id)
    assert d3["error_code"] == "ROLE_NOT_FOUND"
    assert d3["confidence"] == "CONFIRMED"

    # 4. ORG_SCP_DENIED
    d4 = AWSOnboardingService.parse_sts_error("Access denied by service control policy", ext_id)
    assert d4["error_code"] == "ORG_SCP_DENIED"
    assert d4["confidence"] == "CONFIRMED"

    # 5. PERMISSION_BOUNDARY_DENIED
    d5 = AWSOnboardingService.parse_sts_error("Denied by permission_boundary", ext_id)
    assert d5["error_code"] == "PERMISSION_BOUNDARY_DENIED"
    assert d5["confidence"] == "CONFIRMED"

    # 6. ROLE_MAX_SESSION_INVALID
    d6 = AWSOnboardingService.parse_sts_error("The requested session duration violates max_session", ext_id)
    assert d6["error_code"] == "ROLE_MAX_SESSION_INVALID"
    assert d6["confidence"] == "CONFIRMED"

    # 7. REGION_DISABLED
    d7 = AWSOnboardingService.parse_sts_error("The region is disabled for this account", ext_id)
    assert d7["error_code"] == "REGION_DISABLED"
    assert d7["confidence"] == "CONFIRMED"

    # 8. ACCESS_DENIED (Generic)
    d8 = AWSOnboardingService.parse_sts_error("AccessDenied without further details", ext_id)
    assert d8["error_code"] == "ACCESS_DENIED"
    assert d8["confidence"] == "LIKELY"


@pytest.mark.asyncio
async def test_trust_policy_inspector_and_diff():
    """Test 4: Normalized trust policy comparison, diff output, and corrected policy generation (§118)."""
    identity = LaunchComplyAwsIdentityResolver.resolve_identity()
    correct_ext = "launchcomply-ext-tenant-42"

    # Actual policy with wrong principal and missing external ID
    wrong_policy = {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": { "AWS": "arn:aws:iam::999999999999:root" },
          "Action": "sts:AssumeRole"
        }
      ]
    }

    diff = AwsTrustPolicyInspector.compare_trust_policies(wrong_policy, expected_external_id=correct_ext)
    assert diff.is_valid is False
    assert any("Principal Mismatch" in d for d in diff.differences)
    assert any("Missing Condition" in d for d in diff.differences)
    assert diff.expected_principal == identity.principal_arn

    # Corrected policy preserves mandatory ExternalId condition (§32, §33)
    corr = diff.corrected_trust_policy
    stmt = corr["Statement"][0]
    assert stmt["Effect"] == "Allow"
    assert stmt["Principal"]["AWS"] == identity.principal_arn
    assert stmt["Condition"]["StringEquals"]["sts:ExternalId"] == correct_ext

    # Passing comparison
    correct_policy = AwsTrustPolicyInspector.generate_expected_trust_policy(correct_ext)
    diff_pass = AwsTrustPolicyInspector.compare_trust_policies(correct_policy, expected_external_id=correct_ext)
    assert diff_pass.is_valid is True
    assert len(diff_pass.differences) == 0


@pytest.mark.asyncio
async def test_permission_manifest_and_profiles():
    """Test 5: Permission profiles, explainability reasons, AdministratorAccess rejection (§119)."""
    manifest = AwsPermissionManifest.get_manifest_dict()
    assert manifest["version"] == AwsPermissionManifest.VERSION
    assert manifest["least_privilege_enforced"] is True
    assert "DISCOVERY" in manifest["profiles"]
    assert "DEPLOYMENT" in manifest["profiles"]
    assert "MONITORING" in manifest["profiles"]
    assert "SECURITY_READ" in manifest["profiles"]
    assert "BACKUP_READ" in manifest["profiles"]
    assert "COST_READ" in manifest["profiles"]

    # Verify explainability reasons exist (§38)
    for prof_name, prof in manifest["profiles"].items():
        for perm in prof["permissions"]:
            assert len(perm["reason"]) > 10, f"Missing explanation for {perm['service']}"

    # Verify AdministratorAccess detection (§40)
    admin_policy = {
        "Version": "2012-10-17",
        "Statement": [{"Effect": "Allow", "Action": "*", "Resource": "*"}]
    }
    assert AwsPermissionManifest.check_for_administrator_access(admin_policy) is True

    scoped_policy = {
        "Version": "2012-10-17",
        "Statement": [{"Effect": "Allow", "Action": "ecs:DescribeServices", "Resource": "*"}]
    }
    assert AwsPermissionManifest.check_for_administrator_access(scoped_policy) is False

    # SCP block evaluation (§42)
    scp_res = AwsPermissionManifest.evaluate_permissions(simulated_block="SCP")
    assert scp_res["overall_status"] == "BLOCKED_BY_SCP"

    # Boundary block evaluation
    boundary_res = AwsPermissionManifest.evaluate_permissions(simulated_block="BOUNDARY")
    assert boundary_res["overall_status"] == "BLOCKED_BY_BOUNDARY"


@pytest.mark.asyncio
async def test_connection_state_machine_and_gates():
    """Test 6: State machine gates - CONNECTED cannot be reached without all gates passed (§120)."""
    # 1. Invalid Role ARN fails validation
    res1 = AWSOnboardingService.validate_role_arn("invalid-arn", "launchcomply-ext-123")
    assert res1["valid"] is False
    assert "Invalid Role ARN" in res1["error"]

    # 2. Account mismatch fails validation
    res2 = AWSOnboardingService.validate_role_arn(
        "arn:aws:iam::111122223333:role/LaunchComplyProvisioningRole",
        "launchcomply-ext-123",
        expected_account_id="999988887777"
    )
    assert res2["valid"] is False
    assert "does not match expected organization account" in res2["error"]

    # 3. Simulated failure during permission audit blocks CONNECTED
    audit_fail = AWSOnboardingService.audit_permissions(
        "arn:aws:iam::111122223333:role/LaunchComplyProvisioningRole",
        "launchcomply-ext-123",
        is_simulated_failure="INVALID_PRINCIPAL"
    )
    assert audit_fail["valid"] is False
    assert audit_fail["overall_status"] == "FAILED"


@pytest.mark.asyncio
async def test_tenant_isolation_aws_onboarding():
    """Test 7: Tenant isolation - Tenant A cannot access Tenant B's AWS role/stack/ExternalId (§121)."""
    async with AsyncSessionLocal() as db:
        unique_t = int(datetime.utcnow().timestamp())
        org_a = Organization(
            name=f"Tenant A {unique_t}",
            slug=f"tenant-a-{unique_t}",
            customer_classification="PILOT_CUSTOMER",
            commercial_state="AWS_ONBOARDING"
        )
        org_b = Organization(
            name=f"Tenant B {unique_t}",
            slug=f"tenant-b-{unique_t}",
            customer_classification="PILOT_CUSTOMER",
            commercial_state="AWS_ONBOARDING"
        )
        db.add_all([org_a, org_b])
        await db.commit()
        await db.refresh(org_a)
        await db.refresh(org_b)

        ext_a = AWSOnboardingService.generate_external_id(org_a.id)
        ext_b = AWSOnboardingService.generate_external_id(org_b.id)
        assert ext_a != ext_b

        acc_a = CloudAccount(
            organization_id=org_a.id,
            provider="AWS",
            account_id="111111111111",
            role_arn="arn:aws:iam::111111111111:role/RoleA",
            external_id=ext_a,
            status="CONNECTED"
        )
        acc_b = CloudAccount(
            organization_id=org_b.id,
            provider="AWS",
            account_id="222222222222",
            role_arn="arn:aws:iam::222222222222:role/RoleB",
            external_id=ext_b,
            status="CONNECTED"
        )
        db.add_all([acc_a, acc_b])
        await db.commit()

        # Query scoped to Tenant A must not return Tenant B's credentials
        res_a = await db.execute(select(CloudAccount).where(CloudAccount.organization_id == org_a.id))
        accounts_a = res_a.scalars().all()
        assert len(accounts_a) == 1
        assert accounts_a[0].account_id == "111111111111"
        assert accounts_a[0].external_id == ext_a
        assert accounts_a[0].role_arn != acc_b.role_arn


@pytest.mark.asyncio
async def test_safe_disconnect_preserves_infrastructure():
    """Test 8: Disconnect AWS revokes connection without deleting customer infrastructure (§122)."""
    async with AsyncSessionLocal() as db:
        unique_t = int(datetime.utcnow().timestamp())
        org = Organization(
            name=f"Disconnect Test Org {unique_t}",
            slug=f"disc-org-{unique_t}",
            customer_classification="PILOT_CUSTOMER",
            commercial_state="DEPLOYMENT_LIVE"
        )
        db.add(org)
        await db.commit()
        await db.refresh(org)

        acc = CloudAccount(
            organization_id=org.id,
            provider="AWS",
            account_id="333344445555",
            role_arn="arn:aws:iam::333344445555:role/LaunchComplyProvisioningRole",
            external_id=f"launchcomply-ext-disc-{unique_t}",
            status="CONNECTED",
            connection_state="CONNECTED",
            discovered_resources_json={"vpcs": ["vpc-123"], "ecs": ["cluster-1"]}
        )
        db.add(acc)
        await db.commit()
        await db.refresh(acc)

        # Disconnect cloud account
        disc_res = await AWSOnboardingService.disconnect_cloud_account(
            db=db,
            cloud_account_id=acc.id,
            reason="Customer test disconnection"
        )
        assert disc_res["success"] is True
        assert disc_res["status"] == "REVOKED"
        assert disc_res["infrastructure_preserved"] is True

        # Verify account in DB is REVOKED but discovered resources are intact
        await db.refresh(acc)
        assert acc.status == "REVOKED"
        assert acc.connection_state == "REVOKED"
        assert acc.discovered_resources_json["vpcs"] == ["vpc-123"]


@pytest.mark.asyncio
async def test_stack_observation_and_customer_safe_translation():
    """Test 9: Stack observation and customer-safe error translation (§18-§22)."""
    # 1. Successful observation
    obs_ok = AWSOnboardingService.observe_stack_status("LaunchComply-QuickSetup", simulated_status="CREATE_COMPLETE")
    assert obs_ok["stack_status"] == "CREATE_COMPLETE"
    assert "Stack creation completed" in obs_ok["events"][0]["reason"]

    # 2. Failed observation with translated customer-safe language (§20, §21)
    obs_fail = AWSOnboardingService.observe_stack_status("LaunchComply-QuickSetup", simulated_status="CREATE_FAILED")
    assert obs_fail["stack_status"] == "CREATE_FAILED"
    assert "AWS could not create the LaunchComply role" in obs_fail["customer_safe_summary"]
    assert "Retry Verification" in obs_fail["retry_options"]


@pytest.mark.asyncio
async def test_read_only_resource_discovery_preview():
    """Test 10: Read-only resource discovery preview (§48, §49)."""
    disc = AWSOnboardingService.discover_account_resources(
        account_id="123456789012",
        role_arn="arn:aws:iam::123456789012:role/LaunchComplyProvisioningRole",
        region="ap-south-1"
    )
    assert disc["account_id"] == "123456789012"
    assert "vpcs" in disc["resources"]
    assert "subnets" in disc["resources"]
    assert "ecs_clusters" in disc["resources"]
    assert "rds_instances" in disc["resources"]
    assert "Use Existing Infrastructure" in disc["customer_choices"]
