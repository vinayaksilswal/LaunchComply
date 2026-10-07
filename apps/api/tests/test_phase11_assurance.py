"""Phase 11 Continuous Assurance, Live Threat Canvas, Partner White-Label & Auditor Workpapers Tests."""
import json
import uuid
from datetime import datetime, timedelta
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.auth import Organization
from app.models.partner import PartnerOrganization
from app.models.security_assurance import AuditorAccessGrant
from app.models.compliance_framework import CanonicalControl, ControlImplementation
from app.models.assurance import (
    AuditBot,
    AuditBotRun,
    AuditBotObservation,
    ContinuousControlMonitor,
    ContinuousControlStatus,
    ControlEvaluationHistory,
    EvidenceObservation,
    EvidenceIntegrityChain,
    EvidenceFreshnessPolicy,
    PartnerCustomDomain,
    CustomDomainTlsStatus,
    AuditorWorkpaper,
    EvidenceReviewThread,
    AuditorReviewStatus,
)
from app.services.assurance import (
    AuditBotService,
    ContinuousControlService,
    EvidencePipelineService,
    PartnerWhiteLabelService,
    AuditorWorkspaceService,
)
from app.services.enterprise.copilot_service import AICopilotService


@pytest.mark.asyncio
async def test_audit_bot_execution_and_evidence_generation():
    """Verify autonomous audit bot inspection, observation collection, and cryptographic evidence creation."""
    async with AsyncSessionLocal() as db:
        bot_svc = AuditBotService(db)
        org_id = str(uuid.uuid4())

        # Initialize default bots
        bots = await bot_svc.initialize_default_bots(org_id)
        assert len(bots) >= 8

        rds_bot = next(b for b in bots if b.bot_code == "BOT_AWS_RDS_ENCRYPTION")
        assert rds_bot.target_control_code == "LC-CR-001"

        # Execute bot in compliant mode
        run, obs, ev = await bot_svc.run_bot(organization_id=org_id, bot_id=rds_bot.id, simulated_failure=False)

        assert run.status == "PASS"
        assert len(obs) >= 1
        assert obs[0].is_compliant is True
        assert ev.control_code == "LC-CR-001"
        assert len(ev.raw_payload_hash) == 64
        assert len(ev.normalized_payload_hash) == 64
        assert ev.authenticity_status.value == "API_COLLECTED"


@pytest.mark.asyncio
async def test_evidence_hash_chain_tamper_evident_integrity():
    """Verify sequential cryptographic hash chaining and tampering detection."""
    async with AsyncSessionLocal() as db:
        bot_svc = AuditBotService(db)
        pipe_svc = EvidencePipelineService(db)
        org_id = str(uuid.uuid4())

        bots = await bot_svc.initialize_default_bots(org_id)
        bot = bots[0]

        # Produce two successive evidence observations
        run1, _, ev1 = await bot_svc.run_bot(org_id, bot.id)
        run2, _, ev2 = await bot_svc.run_bot(org_id, bot.id)

        # Verify chain integrity
        is_valid, count, violations = await pipe_svc.verify_chain_integrity(org_id)
        assert is_valid is True
        assert count == 2
        assert len(violations) == 0

        # Simulate tampering with a hash
        chain_res = await db.execute(
            select(EvidenceIntegrityChain).where(EvidenceIntegrityChain.evidence_observation_id == ev2.id)
        )
        chain_entry = chain_res.scalar_one()
        original_hash = chain_entry.current_hash
        chain_entry.current_hash = "corrupted_hash_" + "0" * 49
        await db.commit()

        # Re-verify should detect corruption
        is_valid_after, _, violations_after = await pipe_svc.verify_chain_integrity(org_id)
        assert is_valid_after is False
        assert len(violations_after) > 0

        # Restore original hash
        chain_entry.current_hash = original_hash
        await db.commit()


@pytest.mark.asyncio
async def test_evidence_freshness_policy_evaluation():
    """Verify evidence freshness monitoring against configurable SLA obsolescence policies."""
    async with AsyncSessionLocal() as db:
        pipe_svc = EvidencePipelineService(db)
        org_id = str(uuid.uuid4())

        await pipe_svc.initialize_default_policies(org_id)

        # Create a fresh observation and an expired observation
        now = datetime.utcnow()
        fresh_ev = EvidenceObservation(
            organization_id=org_id,
            evidence_code="EVD-FRESH-001",
            source_provider="AWS",
            external_resource_id="res-01",
            valid_until=now + timedelta(days=1),
            control_code="LC-CR-001",
            raw_payload_hash="0" * 64,
            normalized_payload_hash="1" * 64,
            collected_at=now,
        )
        stale_ev = EvidenceObservation(
            organization_id=org_id,
            evidence_code="EVD-STALE-002",
            source_provider="AWS",
            external_resource_id="res-02",
            valid_until=now - timedelta(hours=5),
            control_code="LC-CR-001",
            raw_payload_hash="2" * 64,
            normalized_payload_hash="3" * 64,
            collected_at=now - timedelta(days=3),
        )
        db.add_all([fresh_ev, stale_ev])
        await db.commit()

        summary = await pipe_svc.evaluate_freshness(org_id)
        assert summary["total_evidence_observations"] == 2
        assert summary["current_count"] == 1
        assert summary["stale_count"] == 1
        assert summary["freshness_percentage"] == 50.0


@pytest.mark.asyncio
async def test_continuous_control_monitoring_and_exception_lifecycle():
    """Verify continuous control failure tracking, exception windows, and remediation resolution."""
    async with AsyncSessionLocal() as db:
        ctrl_svc = ContinuousControlService(db)
        org_id = str(uuid.uuid4())

        # Ensure canonical control & implementation exist
        ctrl_res = await db.execute(select(CanonicalControl).where(CanonicalControl.control_code == "LC-CR-001"))
        ctrl = ctrl_res.scalar_one_or_none()
        if not ctrl:
            ctrl = CanonicalControl(
                control_code="LC-CR-001",
                title="Cryptographic Protection & Encryption at Rest",
                category="CRYPTOGRAPHY",
                description="All sensitive datastores must enforce encryption at rest.",
            )
            db.add(ctrl)
            await db.commit()
            await db.refresh(ctrl)

        impl = ControlImplementation(
            organization_id=org_id,
            control_id=ctrl.id,
            status="IMPLEMENTED",
            owner="DevOps Team",
            implementation_description="AWS RDS storage encrypted using KMS CMK.",
        )
        db.add(impl)
        await db.commit()

        # Step 1: Trigger control FAILURE (PASS -> FAIL)
        monitor, history, exc = await ctrl_svc.evaluate_control(
            organization_id=org_id,
            control_code="LC-CR-001",
            new_status=ContinuousControlStatus.FAIL,
            reason="RDS storage encryption was disabled on database instance db-prod-01.",
            trigger_event="BOT_RUN",
        )

        assert monitor.current_status == ContinuousControlStatus.FAIL
        assert "RDS storage encryption was disabled" in monitor.status_reason
        assert history is not None
        assert history.previous_status == "PASS"
        assert history.new_status == "FAIL"
        assert exc is not None
        assert exc.status == "OPEN"

        # Step 2: Remediate control (FAIL -> PASS)
        monitor2, history2, exc2 = await ctrl_svc.evaluate_control(
            organization_id=org_id,
            control_code="LC-CR-001",
            new_status=ContinuousControlStatus.PASS,
            reason="Remediation verified: KMS encryption enabled and active on all RDS datastores.",
            trigger_event="BOT_RUN",
        )

        assert monitor2.current_status == ContinuousControlStatus.PASS
        assert history2.new_status == "PASS"
        assert exc2 is not None
        assert exc2.status == "RESOLVED"
        assert exc2.resolved_at is not None


@pytest.mark.asyncio
async def test_partner_custom_domain_and_tls_verification():
    """Verify MSP partner custom domain registration, DNS verification, and TLS states."""
    async with AsyncSessionLocal() as db:
        wl_svc = PartnerWhiteLabelService(db)

        partner = PartnerOrganization(
            name="SecureOps Advisory",
            slug=f"secureops-{uuid.uuid4().hex[:6]}",
            contact_email="security@secureops.example",
            tier="PREMIER",
        )
        db.add(partner)
        await db.commit()
        await db.refresh(partner)

        # Register custom vanity domain
        domain = await wl_svc.register_custom_domain(partner.id, "compliance.secureops.example")
        assert domain.domain_name == "compliance.secureops.example"
        assert domain.is_verified is False
        assert domain.tls_status == CustomDomainTlsStatus.PENDING_VERIFICATION
        assert domain.dns_verification_token.startswith("lc-verify-")

        # Verify domain
        verified_domain = await wl_svc.verify_custom_domain(partner.id, domain.id, simulated_dns_valid=True)
        assert verified_domain.is_verified is True
        assert verified_domain.tls_status == CustomDomainTlsStatus.ACTIVE
        assert verified_domain.certificate_arn is not None


@pytest.mark.asyncio
async def test_strict_hostname_safe_routing():
    """Verify that white-label portal routes strictly through verified partner domains and rejects unknown hosts."""
    async with AsyncSessionLocal() as db:
        wl_svc = PartnerWhiteLabelService(db)

        partner = PartnerOrganization(
            name="GlobalCloud Consulting",
            slug=f"globalcloud-{uuid.uuid4().hex[:6]}",
            contact_email="support@globalcloud.example",
            brand_name="GlobalCloud SecurePortal",
            branding_logo_url="https://cdn.globalcloud.example/logo.png",
            primary_accent_color="#3B82F6",
        )
        db.add(partner)
        await db.commit()
        await db.refresh(partner)

        domain = await wl_svc.register_custom_domain(partner.id, "trust.globalcloud.example")
        await wl_svc.verify_custom_domain(partner.id, domain.id, simulated_dns_valid=True)

        # 1. Query verified custom domain
        resolved = await wl_svc.resolve_partner_by_hostname("trust.globalcloud.example")
        assert resolved is not None
        assert resolved["brand_name"] == "GlobalCloud SecurePortal"
        assert resolved["accent_color"] == "#3B82F6"

        # 2. Query unknown or untrusted hostname
        unknown = await wl_svc.resolve_partner_by_hostname("attacker-domain.evil.com")
        assert unknown is None

        # 3. Query native internal hostname (should return None to preserve default LaunchComply identity)
        native = await wl_svc.resolve_partner_by_hostname("app.launchcomply.com")
        assert native is None


@pytest.mark.asyncio
async def test_auditor_workpaper_lifecycle_and_threaded_collaboration():
    """Verify independent auditor workpaper creation, sampling note, review status, and threaded discussion."""
    async with AsyncSessionLocal() as db:
        audit_ws = AuditorWorkspaceService(db)
        org_id = str(uuid.uuid4())

        # Create active auditor grant
        grant = AuditorAccessGrant(
            organization_id=org_id,
            auditor_email="lead.auditor@deloitte-audit.example",
            auditor_name="Sarah Jenkins, CPA",
            framework="SOC2",
            valid_until=datetime.utcnow() + timedelta(days=30),
            created_by="admin@launchcomply.internal",
            status="ACTIVE",
        )
        db.add(grant)
        await db.commit()
        await db.refresh(grant)

        # Create workpaper
        wp = await audit_ws.create_workpaper(
            organization_id=org_id,
            grant_id=grant.id,
            control_code="LC-CR-001",
            workpaper_number="WP-2026-SOC2-CC6.1",
            auditor_email=grant.auditor_email,
            framework="SOC2",
            sampling_notes="Sampled 25 deployment approvals from the 90-day evaluation period.",
        )
        assert wp.workpaper_number == "WP-2026-SOC2-CC6.1"
        assert wp.review_status == AuditorReviewStatus.NOT_REVIEWED
        assert "Sampled 25 deployment approvals" in wp.sampling_notes

        # Auditor posts an inquiry
        msg = await audit_ws.add_review_thread_message(
            organization_id=org_id,
            workpaper_id=wp.id,
            author_email=grant.auditor_email,
            author_role="AUDITOR",
            message="Please provide KMS key rotation policy evidence for production RDS cluster.",
            evidence_reference="EVD-OBS-2026-001",
        )
        assert msg.author_role == "AUDITOR"

        # Auditee compliance manager responds
        resp_msg = await audit_ws.add_review_thread_message(
            organization_id=org_id,
            workpaper_id=wp.id,
            author_email="compliance@acme.com",
            author_role="COMPLIANCE_MANAGER",
            message="KMS key rotation is enabled annually by AWS default key policy. Attached audit logs.",
            evidence_reference="EVD-OBS-2026-001",
        )
        assert resp_msg.author_role == "COMPLIANCE_MANAGER"

        # Auditor marks workpaper ACCEPTED
        updated_wp = await audit_ws.update_workpaper_status(
            organization_id=org_id,
            workpaper_id=wp.id,
            status=AuditorReviewStatus.ACCEPTED,
            findings_notes="Satisfactory evidence observed. No exceptions noted.",
            evidence_references=["EVD-OBS-2026-001"],
        )
        assert updated_wp.review_status == AuditorReviewStatus.ACCEPTED


@pytest.mark.asyncio
async def test_copilot_continuous_assurance_reasoning():
    """Verify AI Copilot responds to assurance queries with real continuous control evidence citations."""
    async with AsyncSessionLocal() as db:
        copilot_svc = AICopilotService(db)
        ctrl_svc = ContinuousControlService(db)
        org_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())

        # Establish a failed control monitor
        await ctrl_svc.evaluate_control(
            organization_id=org_id,
            control_code="LC-AC-001",
            new_status=ContinuousControlStatus.FAIL,
            reason="S3 public access block disabled on evidence storage bucket.",
            evidence_code="EVD-S3-009",
        )

        # Inquire about failed controls
        msg, proposals = await copilot_svc.generate_copilot_response(
            organization_id=org_id,
            user_id=user_id,
            conversation_id=None,
            query="What controls failed this week?",
        )

        assert "Continuous Assurance Monitoring identified" in msg.content
        assert "LC-AC-001" in msg.content
        assert len(proposals) >= 1
        assert proposals[0].action_type.value == "CREATE_TASK"


@pytest.mark.asyncio
async def test_public_assurance_api_endpoints():
    """Verify public enterprise API endpoints for continuous assurance data consumption."""
    async with AsyncSessionLocal() as db:
        org_id = str(uuid.uuid4())
        ctrl_svc = ContinuousControlService(db)
        await ctrl_svc.evaluate_control(
            organization_id=org_id,
            control_code="LC-CR-001",
            new_status=ContinuousControlStatus.PASS,
            reason="Cryptographic assurance intact.",
        )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Summary
        resp = await client.get("/api/public/v1/assurance/summary", headers={"X-Organization-Id": org_id})
        assert resp.status_code == 200
        data = resp.json()
        assert "monitored_controls_count" in data
        assert data["monitored_controls_count"] >= 1

        # 2. Controls
        resp_ctrls = await client.get("/api/public/v1/assurance/controls", headers={"X-Organization-Id": org_id})
        assert resp_ctrls.status_code == 200
        ctrls = resp_ctrls.json()
        assert len(ctrls) >= 1
        assert ctrls[0]["control_code"] == "LC-CR-001"
