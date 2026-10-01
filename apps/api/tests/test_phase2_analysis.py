import io
import zipfile
import hmac
import hashlib
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.analyzer.safe_extractor import SafeArchiveExtractor, ArchiveSecurityError
from app.services.analyzer.static_engine import StaticAnalysisEngine
from app.services.architecture.generator import ArchitectureGenerator, AWSCostEstimator

@pytest.mark.asyncio
async def test_github_install_url_and_callback():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "demo@launchcomply.io",
            "password": "Password123!"
        })
        token = login_res.json()["access_token"]

        # 1. Get install URL
        url_res = await ac.get(
            "/api/v1/source-control/github/install-url",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert url_res.status_code == 200
        assert "github.com/apps" in url_res.json()["install_url"]
        assert "state" in url_res.json()

        # 2. Callback with installation ID
        cb_res = await ac.post(
            "/api/v1/source-control/github/callback",
            headers={"Authorization": f"Bearer {token}"},
            json={"installation_id": "inst_998877", "code": "sample_auth_code"}
        )
        assert cb_res.status_code == 200
        assert cb_res.json()["status"] == "ACTIVE"

        # 3. List synchronized repositories
        repos_res = await ac.get(
            "/api/v1/source-control/repositories",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert repos_res.status_code == 200
        repos = repos_res.json()
        assert len(repos) >= 1
        assert any(r["name"] == "acme-core" for r in repos)

@pytest.mark.asyncio
async def test_github_webhook_hmac_verification():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = b'{"action": "push", "ref": "refs/heads/main"}'
        secret = "launchcomply_gh_webhook_secret_dev_32char"
        
        # 1. Valid HMAC-SHA256 signature
        valid_sig = "sha256=" + hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
        valid_res = await ac.post(
            "/api/v1/source-control/github/webhook",
            content=payload,
            headers={
                "X-Hub-Signature-256": valid_sig,
                "X-GitHub-Event": "push",
                "Content-Type": "application/json"
            }
        )
        assert valid_res.status_code == 200
        assert valid_res.json()["status"] == "PROCESSED"

        # 2. Invalid / forged HMAC-SHA256 signature
        invalid_res = await ac.post(
            "/api/v1/source-control/github/webhook",
            content=payload,
            headers={
                "X-Hub-Signature-256": "sha256=forged_invalid_signature_hex",
                "X-GitHub-Event": "push",
                "Content-Type": "application/json"
            }
        )
        assert invalid_res.status_code == 401

@pytest.mark.asyncio
async def test_archive_security_path_traversal(workspace_temp_dir):
    # Construct a malicious zip archive with ../ path traversal
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("../../etc/passwd", "root:x:0:0:root:/root:/bin/bash")
    
    malicious_zip = workspace_temp_dir / "malicious.zip"
    malicious_zip.write_bytes(zip_buffer.getvalue())

    extract_dest = workspace_temp_dir / "extract_dest"
    extract_dest.mkdir()

    # Must raise ArchiveSecurityError and reject extraction
    with pytest.raises(ArchiveSecurityError) as exc_info:
        SafeArchiveExtractor.extract_zip(str(malicious_zip), str(extract_dest))
    assert "Malicious path traversal" in str(exc_info.value)

@pytest.mark.asyncio
async def test_static_engine_stack_and_secret_detection(workspace_temp_dir):
    # Create test repository files
    (workspace_temp_dir / "package.json").write_text('{"name": "test-app", "dependencies": {"next": "15.0.0", "react": "19.0.0"}}')
    (workspace_temp_dir / "requirements.txt").write_text('fastapi==0.110.0\nuvicorn==0.28.0\nsqlalchemy==2.0.36\npsycopg2-binary\ncelery\nredis')
    
    code_dir = workspace_temp_dir / "app"
    code_dir.mkdir()
    (code_dir / "config.py").write_text('AWS_KEY = "AKIA1234567890ABCDEF"\nDATABASE_URL = os.environ["DATABASE_URL"]')

    file_index = [
        {"path": "package.json", "category": "manifest"},
        {"path": "requirements.txt", "category": "manifest"},
        {"path": "app/config.py", "category": "source"}
    ]

    analysis = StaticAnalysisEngine.analyze_workspace(str(workspace_temp_dir), file_index)
    
    # Verify services detected
    service_names = [s["name"] for s in analysis["services"]]
    assert "Next.js Web Frontend" in service_names
    assert "FastAPI Core API" in service_names
    assert "Celery Asynchronous Worker" in service_names

    # Verify secret detected and masked
    secret_findings = [f for f in analysis["findings"] if f["category"] == "Secret Exposure"]
    assert len(secret_findings) >= 1
    assert "AKIA••••••••CDEF" in secret_findings[0]["description"]
    assert "AKIA1234567890ABCDEF" not in secret_findings[0]["description"], "CRITICAL: Plaintext secret leaked in finding description!"

@pytest.mark.asyncio
async def test_dynamic_architecture_generation_and_cost():
    analysis_data = {
        "services": [
            {"name": "Next.js Web", "service_type": "frontend"},
            {"name": "FastAPI Core API", "service_type": "backend"},
            {"name": "Celery Worker", "service_type": "worker"}
        ],
        "databases": [{"engine": "PostgreSQL 16"}],
        "integrations": [{"provider": "Redis", "category": "cache"}]
    }

    # Generate BALANCED profile
    arch = ArchitectureGenerator.generate(analysis_data, profile="BALANCED")
    assert arch["profile"] == "BALANCED"
    node_names = [n["name"] for n in arch["nodes"]]
    assert "Application Load Balancer" in node_names
    assert "ECS Fargate (FastAPI API)" in node_names
    assert "ECS Fargate (Celery Worker)" in node_names
    assert "RDS PostgreSQL Multi-AZ" in node_names
    assert "ElastiCache Redis" in node_names

    # Verify Architectural Reasoning attached to each node
    rds_node = next(n for n in arch["nodes"] if "RDS" in n["name"])
    assert "SQLAlchemy" in rds_node["evidence"] or "PostgreSQL" in rds_node["reason"]
    assert rds_node["public_private"] == "Isolated DB Subnet"

    # Verify Cost Estimation
    cost = arch["cost"]
    assert "₹" in cost["estimated_monthly_inr"]
    assert "ESTIMATED MONTHLY COST" in cost["disclaimer"]

@pytest.mark.asyncio
async def test_tenant_isolation_source_control_and_analysis():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Register Tenant X
        res_x = await ac.post("/api/v1/auth/register", json={
            "email": "owner_tenant_x@example.com",
            "password": "SecurePassword123!",
            "full_name": "Tenant X Admin",
            "organization_name": "Tenant X Labs"
        })
        token_x = res_x.json()["access_token"]
        org_x_id = res_x.json()["organization_id"]

        # Register Tenant Y
        res_y = await ac.post("/api/v1/auth/register", json={
            "email": "owner_tenant_y@example.com",
            "password": "SecurePassword456!",
            "full_name": "Tenant Y Admin",
            "organization_name": "Tenant Y Secure Systems"
        })
        token_y = res_y.json()["access_token"]

        # Tenant X connects a GitHub installation
        conn_res = await ac.post(
            "/api/v1/source-control/github/callback",
            headers={"Authorization": f"Bearer {token_x}"},
            json={"installation_id": "inst_tenant_x_777"}
        )
        assert conn_res.status_code == 200
        conn_x_id = conn_res.json()["id"]

        # Tenant Y attempts to list connections
        list_y_res = await ac.get(
            "/api/v1/source-control/connections",
            headers={"Authorization": f"Bearer {token_y}"}
        )
        assert list_y_res.status_code == 200
        y_conns = list_y_res.json()
        assert not any(c["id"] == conn_x_id for c in y_conns), "Cross-tenant leak: Tenant Y saw Tenant X source control connection!"

        # Tenant Y attempts to disconnect Tenant X's connection
        del_res = await ac.delete(
            f"/api/v1/source-control/connections/{conn_x_id}",
            headers={"Authorization": f"Bearer {token_y}"}
        )
        assert del_res.status_code == 404, "Security violation: Tenant Y was able to delete Tenant X's connection!"
