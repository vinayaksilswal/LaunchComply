import pytest
from httpx import AsyncClient
from app.services.infrastructure.spec_compiler import InfrastructureSpecCompiler
from app.services.infrastructure.policy_engine import InfrastructurePolicyEngine, PolicyResult
from app.services.infrastructure.iac_engine import TerraformOpenTofuEngine
from app.services.infrastructure.aws_onboarding import AWSOnboardingService

@pytest.mark.asyncio
async def test_spec_compiler_and_profiles():
    # 1. Test LEAN Profile
    lean_spec = InfrastructureSpecCompiler.compile(
        app_name="TestApp",
        env_name="production",
        profile="LEAN",
        region="ap-south-1"
    )
    assert lean_spec["profile"] == "LEAN"
    assert lean_spec["database"]["instance_class"] == "db.t4g.small"
    assert lean_spec["database"]["multi_az"] is False
    assert lean_spec["networking"]["nat_strategy"] == "single_nat"
    assert lean_spec["database"]["publicly_accessible"] is False

    # 2. Test BALANCED Profile
    balanced_spec = InfrastructureSpecCompiler.compile(
        app_name="TestApp",
        env_name="production",
        profile="BALANCED",
        region="ap-south-1"
    )
    assert balanced_spec["profile"] == "BALANCED"
    assert balanced_spec["database"]["instance_class"] == "db.t4g.medium"
    assert balanced_spec["database"]["multi_az"] is True
    assert balanced_spec["networking"]["nat_strategy"] == "multi_nat"

    # 3. Test HIGH_AVAILABILITY Profile
    ha_spec = InfrastructureSpecCompiler.compile(
        app_name="TestApp",
        env_name="production",
        profile="HIGH_AVAILABILITY",
        region="ap-south-1"
    )
    assert ha_spec["profile"] == "HIGH_AVAILABILITY"
    assert ha_spec["database"]["instance_class"] == "db.r6g.large"
    assert len(ha_spec["networking"]["availability_zones"]) == 3
    assert ha_spec["compute"]["api_service"]["min_count"] == 4

@pytest.mark.asyncio
async def test_policy_engine_security_rules():
    clean_spec = InfrastructureSpecCompiler.compile("SecureApp", "production", "BALANCED")
    result = InfrastructurePolicyEngine.evaluate(clean_spec)
    assert result["overall_status"] == PolicyResult.PASS.value
    assert result["can_approve"] is True
    assert result["block_count"] == 0

    # Insecure spec: RDS Public
    insecure_spec = InfrastructureSpecCompiler.compile("InsecureApp", "production", "BALANCED")
    insecure_spec["database"]["publicly_accessible"] = True
    insecure_res = InfrastructurePolicyEngine.evaluate(insecure_spec)
    assert insecure_res["overall_status"] == PolicyResult.BLOCK.value
    assert insecure_res["can_approve"] is False
    assert insecure_res["block_count"] >= 1

    # Insecure spec: S3 Public
    insecure_s3 = InfrastructureSpecCompiler.compile("InsecureS3", "production", "BALANCED")
    insecure_s3["storage"]["block_public_access"] = False
    insecure_s3_res = InfrastructurePolicyEngine.evaluate(insecure_s3)
    assert insecure_s3_res["overall_status"] == PolicyResult.BLOCK.value
    assert insecure_s3_res["can_approve"] is False

@pytest.mark.asyncio
async def test_iac_engine_modular_generation_and_validation():
    engine = TerraformOpenTofuEngine()
    spec = InfrastructureSpecCompiler.compile("TestApp", "production", "BALANCED")
    files = engine.generate_configuration(spec)

    assert "versions.tf" in files
    assert "main.tf" in files
    assert "outputs.tf" in files
    assert "modules/network/main.tf" in files
    assert "modules/rds/main.tf" in files
    assert "modules/ecs/main.tf" in files
    assert "modules/s3/main.tf" in files

    # Validate HCL syntax & brace integrity
    val = engine.validate_configuration(files)
    assert val["valid"] is True
    assert len(val["errors"]) == 0
    assert len(val["configuration_hash"]) == 64

@pytest.mark.asyncio
async def test_aws_onboarding_cloudformation_and_sts_validation():
    ext_id = AWSOnboardingService.generate_external_id("org-12345678-abcd")
    assert "launchcomply-ext-" in ext_id

    cfn = AWSOnboardingService.generate_cloudformation_template(ext_id)
    assert "LaunchComplyProvisioningRole" in cfn
    assert ext_id in cfn
    assert "sts:AssumeRole" in cfn

    # Valid Role ARN
    valid_report = AWSOnboardingService.validate_role_arn(
        "arn:aws:iam::123456789012:role/LaunchComplyProvisioningRole",
        ext_id
    )
    assert valid_report["valid"] is True
    assert valid_report["account_id"] == "123456789012"
    assert valid_report["overall_status"] == "READY_FOR_PROVISIONING"
    assert len(valid_report["capabilities"]) == 10

    # Invalid Role ARN
    invalid_report = AWSOnboardingService.validate_role_arn("invalid-arn", ext_id)
    assert invalid_report["valid"] is False

from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_infrastructure_api_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "demo@launchcomply.io", "password": "Password123!"}
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get applications to grab application_id & environment_id
        apps_resp = await client.get("/api/v1/applications/", headers=headers)
        assert apps_resp.status_code == 200
        apps = apps_resp.json()
        assert len(apps) > 0
        app_id = apps[0]["id"]

        # 3. Create or get stack
        stack_resp = await client.post(
            "/api/v1/infrastructure/stacks",
            headers=headers,
            json={
                "application_id": app_id,
                "environment_id": app_id,
                "profile": "BALANCED",
                "region": "ap-south-1"
            }
        )
        assert stack_resp.status_code == 200
        stack = stack_resp.json()
        stack_id = stack["id"]

        # 4. Generate plan
        plan_resp = await client.post(
            f"/api/v1/infrastructure/stacks/{stack_id}/plan",
            headers=headers,
            json={"profile": "BALANCED", "region": "ap-south-1"}
        )
        assert plan_resp.status_code == 200
        plan = plan_resp.json()
        assert plan["status"] == "READY"
        assert plan["resources_add"] > 20
        plan_id = plan["plan_id"]

        # 5. Approve plan
        approve_resp = await client.post(
            f"/api/v1/infrastructure/plans/{plan_id}/approve",
            headers=headers,
            json={"notes": "Approved for production rollout"}
        )
        assert approve_resp.status_code == 200
        assert approve_resp.json()["status"] == "APPROVED"

        # 6. Apply plan (Simulated execution mode)
        apply_resp = await client.post(
            f"/api/v1/infrastructure/plans/{plan_id}/apply",
            headers=headers,
            json={"enable_real_aws": False}
        )
        assert apply_resp.status_code == 200
        run_data = apply_resp.json()
        assert run_data["status"] == "COMPLETED"
        assert run_data["stack_status"] == "READY"

        # 7. Verify discovered cloud resources
        res_resp = await client.get(f"/api/v1/infrastructure/stacks/{stack_id}/resources", headers=headers)
        assert res_resp.status_code == 200
        resources = res_resp.json()
        assert len(resources) >= 8
        resource_types = [r["resource_type"] for r in resources]
        assert "aws_vpc" in resource_types
        assert "aws_db_instance" in resource_types
        assert "aws_s3_bucket" in resource_types

        # 8. Check Drift Detection
        drift_resp = await client.get(f"/api/v1/infrastructure/stacks/{stack_id}/drift", headers=headers)
        assert drift_resp.status_code == 200
        drift_data = drift_resp.json()
        assert drift_data["status"] in ["NO_DRIFT", "DRIFT_DETECTED"]

        # 9. List Compliance Evidence
        ev_resp = await client.get(f"/api/v1/infrastructure/stacks/{stack_id}/evidence", headers=headers)
        assert ev_resp.status_code == 200
        evidences = ev_resp.json()
        assert len(evidences) >= 4
        control_codes = [e["control_code"] for e in evidences]
        assert "ISO-27001-A.8.24" in control_codes

@pytest.mark.asyncio
async def test_tenant_isolation_infrastructure():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as Tenant A (demo)
        login_a = await client.post(
            "/api/v1/auth/login",
            json={"email": "demo@launchcomply.io", "password": "Password123!"}
        )
        token_a = login_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Get Tenant A's stack with foreign ID fails
        stacks_res = await client.post(
            "/api/v1/infrastructure/stacks",
            headers=headers_a,
            json={"application_id": "nonexistent-app-id", "environment_id": "env", "profile": "LEAN"}
        )
        assert stacks_res.status_code == 404

        # 2. Register Tenant B
        reg_b = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "tenant_b_infra@competitor.com",
                "password": "Password123!",
                "full_name": "Tenant B Admin",
                "organization_name": "Tenant B Corp"
            }
        )
        assert reg_b.status_code == 200
        token_b = reg_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Tenant B tries to query Tenant A's stack directly by ID
        foreign_stack_get = await client.get(
            "/api/v1/infrastructure/stacks/nonexistent-or-foreign-id",
            headers=headers_b
        )
        assert foreign_stack_get.status_code == 404
