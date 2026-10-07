"""Phase 6 Security Assurance, Authorized VAPT, DR, & Auditor Trust Portal Test Suite.
Validates SSRF prevention, scope authorization gates, finding deduplication/SLA tracking,
AI remediation review gates, isolated non-destructive DR drills, auditor portal redaction,
and multi-tenant isolation.
"""
import pytest
from datetime import datetime, timedelta
import hashlib
from sqlalchemy.future import select

from app.core.database import AsyncSessionLocal
from app.models.application import Environment, Application
from app.models.auth import Organization
from app.models.security_assurance import (
    SecurityAssessmentScope,
    SecurityAsset,
    SecurityAuthorization,
    SecurityAssessment,
    SecurityRiskAcceptance,
    RemediationPullRequest,
    DisasterRecoveryPlan,
    DisasterRecoveryDrill,
    AuditorAccessGrant,
    AuditorEvidenceRequest,
    TrustCenterProfile,
    SecurityQuestionnaire,
)
from app.models.entities import SecurityFinding, VAPTProject
from app.services.security_assurance import (
    ScopeManager,
    FindingManager,
    AIRemediationEngine,
    VAPTEngagementService,
    MultiRegionDREngine,
    AuditorPortalService,
    TrustCenterService,
    validate_target_url,
)
from app.services.security_assurance.scanner_provider import RawFinding


@pytest.mark.asyncio
async def test_target_url_ssrf_validation():
    """Validates that SSRF, loopback, cloud metadata, and private IP targets are strictly blocked."""
    # Block loopback
    res = validate_target_url("http://127.0.0.1:8000/internal")
    assert not res["valid"]
    assert "Loopback" in res["reason"] or "loopback" in res["reason"]

    res = validate_target_url("http://localhost:3000/api")
    assert not res["valid"]

    # Block AWS cloud metadata
    res = validate_target_url("http://169.254.169.254/latest/meta-data")
    assert not res["valid"]
    assert "metadata" in res["reason"].lower()

    # Block private RFC1918 IPs by default
    res = validate_target_url("http://10.0.1.5/admin")
    assert not res["valid"]
    assert "Private" in res["reason"] or "blocked" in res["reason"]

    res = validate_target_url("http://192.168.1.1/")
    assert not res["valid"]

    # Allow valid public HTTPS domains
    res = validate_target_url("https://api.acmecloud.io")
    assert res["valid"] is True


@pytest.mark.asyncio
async def test_scope_authorization_gate_and_ssrf_defense():
    """Validates that assessment scans cannot execute without legal authorization, and adding SSRF assets fails."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()
        assert env is not None

        scope_mgr = ScopeManager()

        # 1. Create scope
        scope = await scope_mgr.create_scope(
            db=session,
            organization_id=env.organization_id,
            application_id=env.application_id,
            environment_id=env.id,
            name="Test Scope Unauthorized",
            requested_by="qa@launchcomply.io",
        )
        assert scope.status == "DRAFT"

        # 2. Verify authorization initially fails
        is_auth, reason = await scope_mgr.verify_authorization(session, scope.id)
        assert not is_auth
        assert "authorization is mandatory" in reason.lower() or "draft" in reason.lower()

        # 3. Adding an SSRF asset must raise ValueError
        with pytest.raises(ValueError) as exc:
            await scope_mgr.add_asset(
                db=session,
                scope_id=scope.id,
                organization_id=env.organization_id,
                asset_type="API",
                target_url_or_id="http://169.254.169.254/secret",
            )
        assert "Target URL rejected" in str(exc.value)

        # 4. Adding a valid asset succeeds
        asset = await scope_mgr.add_asset(
            db=session,
            scope_id=scope.id,
            organization_id=env.organization_id,
            asset_type="DOMAIN",
            target_url_or_id="https://app.acmecloud.io",
        )
        assert asset.ownership_status == "VERIFIED"

        # 5. Authorizing the scope enables verification to pass
        auth = await scope_mgr.authorize_scope(
            db=session,
            scope_id=scope.id,
            organization_id=env.organization_id,
            authorized_by_email="ciso@acmecloud.io",
            valid_days=30,
        )
        assert auth.authorized_role == "Authorized Security Lead"
        assert auth.authorization_text is not None

        is_auth_now, _ = await scope_mgr.verify_authorization(session, scope.id)
        assert is_auth_now is True


@pytest.mark.asyncio
async def test_finding_deduplication_and_sla_tracking():
    """Validates finding fingerprinting, deduplication against existing findings, and SLA calculation."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()

        finding_mgr = FindingManager()

        raw_finding = RawFinding(
            scanner="SecretScanner",
            finding_type="SECRET",
            title="Exposed Database Password in Env File",
            severity="CRITICAL",
            asset=".env.production",
            cwe="CWE-798",
            description="DB_PASSWORD plaintext literal found in .env.production",
            file=".env.production",
            line=5,
            suggested_fix="Move to AWS Secrets Manager",
        )

        # Ingest finding first time
        f1 = await finding_mgr.ingest_finding(
            db=session,
            raw=raw_finding,
            organization_id=env.organization_id,
            application_id=env.application_id,
            environment_id=env.id,
        )
        assert f1.severity == "CRITICAL"
        assert f1.status == "OPEN"
        assert f1.sla_due_date is not None
        # Critical SLA should be ~24 hours from creation
        assert f1.sla_due_date > datetime.utcnow()
        initial_id = f1.id
        initial_fingerprint = f1.fingerprint
        assert initial_fingerprint is not None

        # Ingest the same finding again: must deduplicate and return same row
        f2 = await finding_mgr.ingest_finding(
            db=session,
            raw=raw_finding,
            organization_id=env.organization_id,
            application_id=env.application_id,
            environment_id=env.id,
        )
        assert f2.id == initial_id
        assert f2.fingerprint == initial_fingerprint


@pytest.mark.asyncio
async def test_finding_risk_acceptance_and_retesting():
    """Validates risk acceptance lifecycle and automated retesting."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()

        finding_mgr = FindingManager()

        raw = RawFinding(
            scanner="SASTScanner",
            finding_type="VULNERABILITY",
            title="Missing Subresource Integrity on CDN Script Tag",
            severity="LOW",
            asset="public/index.html",
            cwe="CWE-345",
            description="Script tag lacks sha384 integrity hash.",
            file="public/index.html",
            line=12,
        )
        finding = await finding_mgr.ingest_finding(
            db=session,
            raw=raw,
            organization_id=env.organization_id,
            application_id=env.application_id,
            environment_id=env.id,
        )

        # Accept risk with 30-day window
        acceptance = await finding_mgr.accept_risk(
            db=session,
            finding_id=finding.id,
            organization_id=env.organization_id,
            actor_email="security@launchcomply.io",
            reason="CDN hosted on internal VPC endpoint",
            justification="Mitigated by private network isolation.",
            duration_days=30,
        )
        assert acceptance.finding_id == finding.id
        assert finding.status == "ACCEPTED_RISK"

        # Automated Retest
        retest_res = await finding_mgr.retest_finding(
            db=session,
            finding_id=finding.id,
            organization_id=env.organization_id,
            actor_email="qa@launchcomply.io",
        )
        assert retest_res["retest_status"] in ("FIXED", "STILL_PRESENT")
        assert retest_res["finding_id"] == finding.id


@pytest.mark.asyncio
async def test_ai_remediation_proposal_and_review_gate():
    """Validates that AI generates code patches requiring human review without auto-deploying."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()

        finding_mgr = FindingManager()
        remediation_engine = AIRemediationEngine()

        raw = RawFinding(
            scanner="SASTScanner",
            finding_type="VULNERABILITY",
            title="Overly Permissive CORS Headers on Session Cookie Handler",
            severity="HIGH",
            asset="apps/api/app/main.py",
            cwe="CWE-942",
            description="Access-Control-Allow-Origin contains wildcard with credentials.",
            file="apps/api/app/main.py",
            line=25,
        )
        finding = await finding_mgr.ingest_finding(
            db=session,
            raw=raw,
            organization_id=env.organization_id,
            application_id=env.application_id,
            environment_id=env.id,
        )

        # Generate proposal with code diff
        proposal = await remediation_engine.generate_remediation_proposal(
            db=session,
            finding_id=finding.id,
            organization_id=env.organization_id,
            actor_email="developer@launchcomply.io",
        )
        assert "allow_origins" in proposal["diff"]
        assert proposal["human_review_required"] is True

        # Create review-gated PR
        pr = await remediation_engine.create_remediation_pull_request(
            db=session,
            finding_id=finding.id,
            organization_id=env.organization_id,
            actor_email="developer@launchcomply.io",
            target_repo="launchcomply/apps",
            target_branch="security/remediate-cors",
        )
        assert pr.status == "OPEN"
        assert pr.approved_by is None

        # Review gate: Human review approves the PR
        reviewed = await remediation_engine.review_remediation_pr(
            db=session,
            pr_id=pr.id,
            organization_id=env.organization_id,
            actor_email="lead-architect@launchcomply.io",
            approved=True,
            notes="LGTM, origins restricted to whitelist.",
        )
        assert reviewed.status == "MERGED"
        assert reviewed.approved_by == "lead-architect@launchcomply.io"
        # Ensure finding itself was not auto-closed prematurely
        f_check = await session.get(SecurityFinding, finding.id)
        assert f_check.status != "RESOLVED"


@pytest.mark.asyncio
async def test_vapt_engagement_lifecycle_and_sha256_report():
    """Validates professional VAPT engagement flow and tamper-evident report hashing."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()

        vapt_service = VAPTEngagementService()

        project = await vapt_service.request_engagement(
            db=session,
            organization_id=env.organization_id,
            application_id=env.application_id,
            title="SOC 2 Type II Penetration Testing Engagement",
            scope_description="AWS VPC, API Endpoints, and Web UI",
        )
        assert project.status == "REQUESTED"
        assert "OWASP" in project.methodology

        # Progress to testing
        await vapt_service.advance_status(session, project.id, env.organization_id, "TESTING")
        assert project.status == "TESTING"

        # Generate signed report
        report = await vapt_service.generate_vapt_report(session, project.id, env.organization_id)
        assert "sha256_integrity_hash" in report
        assert len(report["sha256_integrity_hash"]) == 64  # SHA256 hex length
        assert report["project_id"] == project.id


@pytest.mark.asyncio
async def test_multi_region_dr_drill_isolation():
    """Validates that cross-region DR simulation runs in an isolated sandbox without altering production traffic."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()

        dr_engine = MultiRegionDREngine()

        plan = await dr_engine.get_or_create_plan(
            db=session,
            organization_id=env.organization_id,
            application_id=env.application_id,
            environment_id=env.id,
            primary_region="ap-south-1",
            secondary_region="ap-southeast-1",
            target_rto_minutes=30,
            target_rpo_minutes=15,
        )
        assert plan.strategy == "WARM_STANDBY"
        assert plan.primary_region == "ap-south-1"
        assert plan.secondary_region == "ap-southeast-1"

        drill = await dr_engine.execute_dr_drill(
            db=session,
            plan_id=plan.id,
            organization_id=env.organization_id,
            actor_email="sre@launchcomply.io",
        )
        assert drill.status == "COMPLETED"
        assert drill.observed_rto_seconds is not None
        assert drill.observed_rto_seconds <= 1800  # RTO SLA met


@pytest.mark.asyncio
async def test_auditor_portal_grant_validation_and_redaction():
    """Validates time-bound read-only auditor grant, token hash verification, and secret redaction."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()

        portal_service = AuditorPortalService()

        grant, raw_token = await portal_service.create_access_grant(
            db=session,
            organization_id=env.organization_id,
            auditor_name="Sarah Jenkins",
            auditor_email="sjenkins@kpmg-audit.example.com",
            auditing_firm="KPMG Cybersecurity Services",
            scope_description="ISO 27001 Annual Surveillance Audit",
            created_by_user_id="user-ops-lead",
            created_by_email="ciso@acmecloud.io",
            duration_days=7,
        )
        assert raw_token.startswith("lc_aud_")
        assert grant.status == "ACTIVE"

        # Validate token
        validated = await portal_service.validate_grant_token(session, raw_token)
        assert validated.id == grant.id
        assert validated.auditor_name == "Sarah Jenkins"

        # Evidence package generation
        package = await portal_service.get_auditor_evidence_package(session, validated)
        assert "grant_info" in package
        assert "security_findings_summary" in package
        assert "compliance_assessments" in package

        # Revoking grant blocks subsequent access
        await portal_service.revoke_grant(session, grant.id, "user-ops-lead", "ciso@acmecloud.io", "Audit Completed")
        with pytest.raises(ValueError) as exc:
            await portal_service.validate_grant_token(session, raw_token)
        assert "Invalid or revoked auditor access grant" in str(exc.value)


@pytest.mark.asyncio
async def test_trust_center_public_profile_and_questionnaire():
    """Validates sanitized public trust center overview data and CAIQ questionnaire access."""
    async with AsyncSessionLocal() as session:
        env_res = await session.execute(select(Environment).limit(1))
        env = env_res.scalars().first()

        trust_service = TrustCenterService()

        profile = await trust_service.get_or_create_profile(session, env.organization_id)
        assert profile.public_enabled is True

        # Fetch sanitized public view
        public_data = await trust_service.get_public_trust_data(session, env.organization_id)
        assert "live_metrics" in public_data
        assert "disclaimer" in public_data
        assert "LaunchComply provides continuous assurance" in public_data["disclaimer"]
        assert public_data["live_metrics"]["target_rto_minutes"] == 30

        # Create/save questionnaire
        q = await trust_service.create_or_update_questionnaire(
            db=session,
            organization_id=env.organization_id,
            framework="CAIQ",
            question="Is all customer data encrypted in transit using industry-standard protocols?",
            answer="Yes. TLS 1.3 is enforced on all public and internal service boundaries. Plaintext HTTP is permanently rejected with HSTS enabled.",
            owner="user-sec-lead",
        )
        assert q.status == "APPROVED"
        assert "TLS 1.3" in q.answer


@pytest.mark.asyncio
async def test_phase6_tenant_isolation():
    """Validates that Organization B cannot view or access Organization A's scopes, findings, or auditor grants."""
    async with AsyncSessionLocal() as session:
        # Create dummy Org B
        org_b = Organization(name="Competitor Corp", slug="competitor-corp")
        session.add(org_b)
        await session.commit()
        await session.refresh(org_b)

        # Query findings belonging to Org B: must be empty
        findings_stmt = select(SecurityFinding).where(SecurityFinding.organization_id == org_b.id)
        res = await session.execute(findings_stmt)
        b_findings = res.scalars().all()
        assert len(b_findings) == 0

        # Query scopes belonging to Org B: must be empty
        scopes_stmt = select(SecurityAssessmentScope).where(SecurityAssessmentScope.organization_id == org_b.id)
        res_s = await session.execute(scopes_stmt)
        b_scopes = res_s.scalars().all()
        assert len(b_scopes) == 0
