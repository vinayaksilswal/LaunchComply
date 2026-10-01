"""Phase 4 Automated Test Suite: Production Application Delivery Engine.
Covers build isolation, Dockerfile security, SBOM generation, container scanning gate,
database migration risk analysis, Blue/Green ECS deployments, smoke tests,
first-class rollback, custom domains/ACM, write-only secrets, and multi-tenant isolation.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.release.build_engine import (
    BuildSpecification,
    LocalIsolatedBuildProvider,
    DockerfileGenerator,
    redact_secrets,
)
from app.services.release.migration_engine import (
    MigrationRiskAnalyzer,
    AlembicMigrationProvider,
)
from app.services.release.deployment_engine import (
    TaskDefinitionGenerator,
    BlueGreenDeploymentExecutor,
)
from app.services.release.smoke_tests import SmokeTestProvider
from app.services.release.rollback_service import RollbackService
from app.services.release.domain_service import DomainService
from app.services.release.policy_engine import ReleasePolicyEngine
from app.services.release.evidence_service import ReleaseEvidenceService


@pytest.mark.asyncio
async def test_build_credential_redaction():
    """Verify that credentials and secrets are systematically redacted from build logs."""
    raw_log = "Pushing image using token ghp_123456789012345678901234567890123456 with AWS key AKIA1234567890123456"
    sanitized = redact_secrets(raw_log)
    assert "ghp_" not in sanitized
    assert "AKIA" not in sanitized
    assert "[***REDACTED***]" in sanitized


@pytest.mark.asyncio
async def test_dockerfile_generator_and_security_analysis():
    """Verify hardened Dockerfile generation for FastAPI, Next.js, and detection of security flaws."""
    # FastAPI Dockerfile
    fastapi_df = DockerfileGenerator.generate("fastapi", 8000)
    assert "USER appuser:appgroup" in fastapi_df
    assert "EXPOSE 8000" in fastapi_df
    assert "HEALTHCHECK" in fastapi_df

    # Next.js multi-stage Dockerfile
    next_df = DockerfileGenerator.generate("nextjs", 3000)
    assert "FROM node:20-alpine AS deps" in next_df
    assert "USER nextjs:nodejs" in next_df

    # Security check: insecure Dockerfile copying .env and running as root
    insecure_df = """
    FROM python:latest
    COPY .env .
    CMD ["python", "app.py"]
    """
    errors, warnings = DockerfileGenerator.analyze_dockerfile(insecure_df)
    assert any("copies .env" in e for e in errors)
    assert any("ROOT" in w for w in warnings)
    assert any("unpinned" in w for w in warnings)


@pytest.mark.asyncio
async def test_isolated_build_worker_and_sbom():
    """Verify isolated build worker creates CycloneDX SBOM and immutable digest."""
    provider = LocalIsolatedBuildProvider()
    workspace = provider.prepare_source("", "a1b2c3d4e5f6")

    spec = BuildSpecification(
        service_name="api",
        runtime="python",
        root_path=".",
        exposed_port=8000
    )

    result = provider.build_service(
        app_name="TestApp",
        env_name="production",
        service_name="api",
        spec=spec,
        commit_sha="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
        release_version="v1.4.2",
        source_dir=workspace
    )

    assert result.success is True
    assert result.image_digest.startswith("sha256:")
    assert "launchcomply-testapp-production-api" in result.ecr_repository
    assert result.sbom.bom_format == "CycloneDX"
    assert len(result.sbom.components) >= 4
    assert result.scan_result.status == "PASS"
    assert result.scan_result.critical_count == 0

    provider.cleanup(workspace)


@pytest.mark.asyncio
async def test_sandbox_path_traversal_prevention():
    """Verify build worker rejects malicious path traversal in root_path."""
    provider = LocalIsolatedBuildProvider()
    workspace = provider.prepare_source("", "a1b2c3d4e5f6")

    spec = BuildSpecification(
        service_name="api",
        runtime="python",
        root_path="../../etc/passwd",
        exposed_port=8000
    )

    result = provider.build_service(
        app_name="MaliciousApp",
        env_name="prod",
        service_name="api",
        spec=spec,
        commit_sha="a1b2c3d4e5f6",
        release_version="v1.0.0",
        source_dir=workspace
    )

    assert result.success is False
    assert "Path traversal" in result.failure_reason
    assert result.scan_result.status == "BLOCKED"

    provider.cleanup(workspace)


@pytest.mark.asyncio
async def test_database_migration_risk_analyzer():
    """Verify destructive database migrations are flagged with appropriate risk levels."""
    safe_script = """
    ALTER TABLE users ADD COLUMN phone_number VARCHAR(32) NULL;
    CREATE INDEX ix_users_phone ON users (phone_number);
    """
    safe_risk, safe_warnings = MigrationRiskAnalyzer.analyze_script(safe_script)
    assert safe_risk == "LOW"
    assert len(safe_warnings) == 0

    destructive_script = """
    DROP TABLE customer_legacy_sessions;
    ALTER TABLE accounts DROP COLUMN legacy_auth_hash;
    """
    dest_risk, dest_warnings = MigrationRiskAnalyzer.analyze_script(destructive_script)
    assert dest_risk == "CRITICAL"
    assert any(w.operation_type == "DROP_TABLE" for w in dest_warnings)
    assert any(w.operation_type == "DROP_COLUMN" for w in dest_warnings)


@pytest.mark.asyncio
async def test_ecs_task_definition_generation():
    """Verify hardened ECS task definition adheres to read-only rootfs and secrets manager refs."""
    task_def = TaskDefinitionGenerator.generate(
        app_name="Acme",
        env_name="Prod",
        service_name="api",
        service_type="api",
        image_digest="sha256:d8c6b7e0e7a4f5c90b6a7d8c6b7e0e7a4f5c90b6a7d8c6b7e0e7a4f5c90b6a7d",
        ecr_repository="launchcomply-acme-prod-api",
        port=8000,
        env_vars={"ENV": "production"},
        secrets_manager_arns={"DATABASE_URL": "arn:aws:secretsmanager:us-east-1:123456789012:secret:db-url"}
    )
    container = task_def.container_definitions[0]
    assert container["readonlyRootFilesystem"] is True
    assert container["portMappings"][0]["containerPort"] == 8000
    assert container["secrets"][0]["name"] == "DATABASE_URL"
    assert "arn:aws:secretsmanager" in container["secrets"][0]["valueFrom"]
    assert container["logConfiguration"]["logDriver"] == "awslogs"


@pytest.mark.asyncio
async def test_smoke_test_suite_and_failure_detection():
    """Verify smoke test engine verifies health, ping, latency, and catches failures."""
    success_suite = SmokeTestProvider.execute_suite("https://app.acmecloud.io", simulate_failure=False)
    assert success_suite.all_passed is True
    assert success_suite.failed_count == 0
    assert len(success_suite.results) >= 4

    failed_suite = SmokeTestProvider.execute_suite("https://app.acmecloud.io", simulate_failure=True)
    assert failed_suite.all_passed is False
    assert failed_suite.failed_count >= 1


@pytest.mark.asyncio
async def test_rollback_service_db_compatibility():
    """Verify rollback engine evaluates DB backward-compatibility and restores previous release."""
    # Safe rollback with no migrations or additive migrations
    safe_assessment = RollbackService.assess_database_compatibility(has_migrations=True, migration_risk="LOW")
    assert safe_assessment.compatibility_status == "SAFE"

    # Destructive rollback requiring manual intervention
    risky_assessment = RollbackService.assess_database_compatibility(has_migrations=True, migration_risk="CRITICAL")
    assert risky_assessment.compatibility_status == "MANUAL_INTERVENTION_REQUIRED"

    # Execute rollback
    res = RollbackService.execute_rollback(
        deployment_id="dep-12345678",
        failed_release_id="rel-failed-v143",
        rollback_to_release_id="rel-live-v142",
        target_version="v1.4.2",
        has_migrations=True,
        migration_risk="LOW"
    )
    assert res.success is True
    assert res.traffic_restored_percentage == 100
    assert "100% routed to previous Blue target group" in res.actions_taken[1]


@pytest.mark.asyncio
async def test_release_policy_gates():
    """Verify DevSecOps release gates block deployments with critical CVEs or missing secrets."""
    # 1. Clean release
    pass_eval = ReleasePolicyEngine.evaluate(
        has_critical_vulns=False,
        missing_secrets=[],
        migration_failed=False,
        health_passed=True,
        has_valid_tls=True,
        has_artifact_digest=True,
        infra_ready=True
    )
    assert pass_eval.overall_status == "PASS"
    assert pass_eval.is_deployable is True

    # 2. Blocked by critical vulnerabilities
    vuln_eval = ReleasePolicyEngine.evaluate(
        has_critical_vulns=True,
        missing_secrets=[],
        migration_failed=False,
        health_passed=True,
        has_valid_tls=True,
        has_artifact_digest=True,
        infra_ready=True
    )
    assert vuln_eval.overall_status == "BLOCKED"
    assert vuln_eval.is_deployable is False
    assert any(r.rule_id == "REL-SEC-001" and r.status == "BLOCK" for r in vuln_eval.rules)

    # 3. Blocked by missing runtime secrets
    secret_eval = ReleasePolicyEngine.evaluate(
        has_critical_vulns=False,
        missing_secrets=["STRIPE_SECRET_KEY"],
        migration_failed=False,
        health_passed=True,
        has_valid_tls=True,
        has_artifact_digest=True,
        infra_ready=True
    )
    assert secret_eval.overall_status == "BLOCKED"
    assert secret_eval.is_deployable is False


@pytest.mark.asyncio
async def test_phase4_api_end_to_end_flow():
    """End-to-end test of Phase 4 Delivery API workflow with authentication."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Login as demo user
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "demo@launchcomply.io", "password": "Password123!"}
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get applications & environments
        apps_res = await client.get("/api/v1/applications/", headers=headers)
        assert apps_res.status_code == 200
        apps = apps_res.json()
        assert len(apps) > 0
        app_id = apps[0]["id"]
        env_id = apps[0]["environments"][0]["id"]

        # 3. Create a new release candidate
        rel_create = await client.post(
            f"/api/v1/applications/{app_id}/releases",
            headers=headers,
            json={
                "environment_id": env_id,
                "version": "v1.4.3",
                "commit_sha": "c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a1b2c3d4",
                "branch": "main"
            }
        )
        assert rel_create.status_code == 201
        new_release = rel_create.json()
        assert new_release["version"] == "v1.4.3"
        assert new_release["status"] == "DRAFT"
        rel_id = new_release["id"]

        # 4. Trigger isolated build
        build_res = await client.post(f"/api/v1/releases/{rel_id}/build", headers=headers)
        assert build_res.status_code == 200
        build_data = build_res.json()
        assert build_data["status"] == "COMPLETED"
        assert len(build_data["artifacts"]) >= 3
        assert len(build_data["images"]) >= 3

        # 5. Fetch SBOM
        sbom_res = await client.get(f"/api/v1/releases/{rel_id}/sbom", headers=headers)
        assert sbom_res.status_code == 200
        sbom = sbom_res.json()
        assert sbom["bom_format"] == "CycloneDX"

        # 6. Approve Release
        appr_res = await client.post(
            f"/api/v1/releases/{rel_id}/approve",
            headers=headers,
            json={"comment": "Security audit cleared"}
        )
        assert appr_res.status_code == 200
        assert appr_res.json()["status"] == "APPROVED"

        # 7. Plan and Run Migration
        mig_plan = await client.post(f"/api/v1/releases/{rel_id}/migrations/plan", headers=headers, json={})
        assert mig_plan.status_code == 200
        assert mig_plan.json()["risk_level"] in ["LOW", "MEDIUM"]

        mig_run = await client.post(f"/api/v1/releases/{rel_id}/migrations/run", headers=headers, json={"create_snapshot": True})
        assert mig_run.status_code == 200
        assert mig_run.json()["status"] == "COMPLETED"

        # 8. Deploy Release (Blue/Green)
        deploy_res = await client.post(
            f"/api/v1/releases/{rel_id}/deploy",
            headers=headers,
            json={"strategy": "BLUE_GREEN"}
        )
        assert deploy_res.status_code == 200
        deploy_data = deploy_res.json()
        assert deploy_data["strategy"] == "BLUE_GREEN"
        assert deploy_data["status"] == "VERIFYING"
        deploy_id = deploy_data["id"]

        # 9. Verify deployment with smoke tests
        ver_res = await client.get(f"/api/v1/deployments/{deploy_id}/verification", headers=headers)
        assert ver_res.status_code == 200
        ver_data = ver_res.json()
        assert ver_data["all_passed"] is True

        # 10. Promote traffic to 100% Green -> LIVE
        promote_res = await client.post(f"/api/v1/deployments/{deploy_id}/promote", headers=headers)
        assert promote_res.status_code == 200
        assert promote_res.json()["status"] == "LIVE"
        assert promote_res.json()["traffic_percentage"] == 100

        # 11. Rollback test: roll back to previous release
        rollback_res = await client.post(
            f"/api/v1/deployments/{deploy_id}/rollback",
            headers=headers,
            json={"reason": "Simulated regression test"}
        )
        assert rollback_res.status_code == 200
        assert rollback_res.json()["success"] is True
        assert rollback_res.json()["traffic_restored_percentage"] == 100


@pytest.mark.asyncio
async def test_write_only_secrets_and_multi_tenant_isolation():
    """Verify secrets are write-only (never returned in plaintext) and tenant isolation holds."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Tenant A (Demo)
        login_a = await client.post(
            "/api/v1/auth/login",
            json={"email": "demo@launchcomply.io", "password": "Password123!"}
        )
        token_a = login_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        apps_a = await client.get("/api/v1/applications/", headers=headers_a)
        env_a_id = apps_a.json()[0]["environments"][0]["id"]
        app_a_id = apps_a.json()[0]["id"]

        # Configure write-only secret
        secret_post = await client.post(
            f"/api/v1/environments/{env_a_id}/secrets",
            headers=headers_a,
            json={
                "service_name": "api",
                "environment_variable_name": "SUPER_SECRET_TOKEN",
                "secret_value": "super_secret_value_12345",
                "required": True
            }
        )
        assert secret_post.status_code == 200
        secret_meta = secret_post.json()
        assert secret_meta["configured"] is True
        # Plaintext MUST NOT be in response!
        assert "super_secret_value_12345" not in str(secret_post.text)

        # GET runtime config MUST NOT contain secret values
        runtime_cfg = await client.get(f"/api/v1/environments/{env_a_id}/runtime-config", headers=headers_a)
        assert runtime_cfg.status_code == 200
        assert "super_secret_value_12345" not in str(runtime_cfg.text)

        # Register Tenant B
        reg_b = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "tenant_b_delivery@competitor.com",
                "password": "Password123!",
                "full_name": "Tenant B User",
                "organization_name": "Tenant B Enterprise"
            }
        )
        assert reg_b.status_code == 200
        token_b = reg_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Tenant B CANNOT list Tenant A's releases
        foreign_rel_list = await client.get(f"/api/v1/applications/{app_a_id}/releases", headers=headers_b)
        assert foreign_rel_list.status_code == 404

        # Tenant B CANNOT trigger build on Tenant A's release
        releases_a = await client.get(f"/api/v1/applications/{app_a_id}/releases", headers=headers_a)
        rel_a_id = releases_a.json()[0]["id"]

        foreign_build = await client.post(f"/api/v1/releases/{rel_a_id}/build", headers=headers_b)
        assert foreign_build.status_code == 404

        # Tenant B CANNOT access Tenant A's secrets
        foreign_secrets = await client.get(f"/api/v1/environments/{env_a_id}/runtime-config", headers=headers_b)
        assert foreign_secrets.status_code == 404
