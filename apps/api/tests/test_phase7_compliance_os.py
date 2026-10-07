"""Phase 7 Enterprise Compliance Operating System Test Suite.
Validates:
- Framework-neutral canonical controls & versioned mappings (ISO 27001, SOC 2, DPDP)
- Control implementation lifecycle and explainable readiness calculations
- Enterprise Risk Register 5x5 scoring matrix, heatmap, treatments, and acceptance gates
- ISO 27001 ISMS Scope and Statement of Applicability (SoA) approval
- Policy lifecycle, approvals, and employee acknowledgement campaigns
- SOC 2 Type II operating periods, continuous control tests, and exception tracking
- India DPDP Privacy operations, personal data inventory, and DSR fulfillment workflows
- Vendor/subprocessor risk assessments and DPA tracking
- Internal audit findings, centralized CAPA lifecycle, and executive management reviews
- Immutable Audit Package generation with Zero-Knowledge redaction and SHA256 manifest
- External assurance records gating Trust Center "Certified" vs "Readiness" badges
- Strict multi-tenant isolation across all compliance entities
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy.future import select

from app.core.database import AsyncSessionLocal
from app.models.auth import Organization
from app.models.compliance_framework import (
    FrameworkVersion,
    CanonicalControl,
    ControlImplementation,
    ControlOperatingPeriod,
    ControlTest,
    ControlException,
)
from app.models.compliance_risk import Risk, RiskTreatmentAction
from app.models.compliance_iso import ISMSScope, StatementOfApplicabilityEntry
from app.models.compliance_policy import Policy, PolicyVersion, PolicyAcknowledgement
from app.models.compliance_privacy import DataInventoryItem, ProcessingActivity, PrivacyRequest
from app.models.compliance_vendor import Vendor, VendorAssessment
from app.models.compliance_audit import InternalAudit, CorrectiveAction, ManagementReview, AuditPackage
from app.models.compliance_operations import ExternalAssuranceRecord

from app.services.compliance.framework_engine import framework_engine
from app.services.compliance.risk_service import risk_service
from app.services.compliance.iso27001_service import iso27001_service
from app.services.compliance.policy_service import policy_service
from app.services.compliance.soc2_engine import soc2_engine
from app.services.compliance.privacy_service import privacy_service
from app.services.compliance.vendor_risk_service import vendor_risk_service
from app.services.compliance.audit_capa_service import audit_capa_service
from app.services.compliance.audit_package_service import audit_package_service
from app.services.compliance.external_assurance_service import external_assurance_service


@pytest.mark.asyncio
async def test_canonical_control_framework_mapping():
    """Validates that canonical controls map to multiple framework versions without redundant duplicate work."""
    async with AsyncSessionLocal() as session:
        await framework_engine.ensure_canonical_library(session)

        # Check framework versions exist
        fvs = (await session.execute(select(FrameworkVersion))).scalars().all()
        codes = [fv.code for fv in fvs]
        assert "ISO_27001_2022" in codes
        assert "SOC2_2017" in codes
        assert "DPDP_2023" in codes
        assert "LAUNCHCOMPLY_BASELINE_V1" in codes

        # Check canonical controls exist
        controls = (await session.execute(select(CanonicalControl))).scalars().all()
        assert len(controls) >= 15
        ac_ctrl = next((c for c in controls if c.control_code == "LC-AC-001"), None)
        assert ac_ctrl is not None
        assert ac_ctrl.category == "ACCESS_CONTROL"
        assert ac_ctrl.default_implementation_type == "AUTOMATED"


@pytest.mark.asyncio
async def test_control_implementation_and_readiness_calculation():
    """Validates control implementation status updates and explainable readiness calculations without fake certification."""
    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization).limit(1))
        org = org_res.scalars().first()
        assert org is not None

        await framework_engine.ensure_organization_controls(session, org.id)

        # Calculate readiness for ISO 27001
        readiness = await framework_engine.calculate_framework_readiness(
            session, org.id, "ISO_27001_2022"
        )
        assert readiness["framework_code"] == "ISO_27001_2022"
        assert "Readiness Program Active" in readiness["certification_statement"]
        assert "LaunchComply provides continuous evidence verification" in readiness["certification_statement"]
        assert "category_breakdown" in readiness



@pytest.mark.asyncio
async def test_risk_creation_scoring_and_heatmap():
    """Validates 5x5 scoring matrix (inherent & residual) and heatmap grid distribution."""
    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization).limit(1))
        org = org_res.scalars().first()

        risk = await risk_service.create_risk(
            db=session,
            organization_id=org.id,
            risk_code="RSK-TEST-001",
            title="Unencrypted S3 Bucket Attachment Ingestion",
            category="TECHNICAL",
            asset="S3 Storage Bucket",
            threat="Data interception or unauthorized access to customer attachments.",
            vulnerability="Missing SSE-KMS bucket policy.",
            likelihood=5,  # Almost certain
            impact=4,      # Major
            owner="security@acmecloud.io",
            residual_likelihood=2,
            residual_impact=2,
            treatment="MITIGATE",
        )
        assert risk.inherent_score == 20  # 5 * 4
        assert risk.residual_score == 4   # 2 * 2
        assert risk.status == "ASSESSED"

        # Check heatmap
        heatmap = await risk_service.get_risk_heatmap(session, org.id)
        assert heatmap["total_risks"] >= 1
        assert len(heatmap["inherent_matrix"]) == 5
        assert len(heatmap["residual_matrix"]) == 5


@pytest.mark.asyncio
async def test_risk_acceptance_lifecycle():
    """Validates that risk acceptance requires formal justification, executive approver, and expiration date."""
    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization).limit(1))
        org = org_res.scalars().first()

        risk = await risk_service.create_risk(
            db=session,
            organization_id=org.id,
            risk_code="RSK-ACCEPT-01",
            title="Legacy Internal Test Endpoint Plaintext Transmission",
            category="TECHNICAL",
            asset="Dev Testing API",
            threat="Sniffing on developer subnet.",
            vulnerability="Plaintext HTTP on port 8080.",
            likelihood=2,
            impact=2,
            owner="developer@acmecloud.io",
        )

        accepted = await risk_service.accept_risk(
            db=session,
            organization_id=org.id,
            risk_id=risk.id,
            justification="Test endpoint isolated to loopback interface on dev workstation; scheduled for sunset in Sprint 50.",
            approver="ciso@acmecloud.io",
            expires_days=60,
        )
        assert accepted.status == "ACCEPTED"
        assert accepted.treatment == "ACCEPT"
        assert accepted.treatment_approver == "ciso@acmecloud.io"
        assert accepted.treatment_expires_at > datetime.utcnow()


@pytest.mark.asyncio
async def test_iso27001_scope_and_soa_approval():
    """Validates ISMS scope statement and formal Statement of Applicability (SoA) approval."""
    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization).limit(1))
        org = org_res.scalars().first()

        scope = await iso27001_service.get_or_create_scope(session, org.id)
        assert scope.version == "v1.0"
        assert "AWS" in scope.aws_accounts

        soa_entries = await iso27001_service.ensure_soa(session, org.id)
        assert len(soa_entries) >= 15

        # Formally approve SoA
        res = await iso27001_service.approve_soa(session, org.id, "ciso@acmecloud.io")
        assert res["status"] == "APPROVED"
        assert res["approved_by"] == "ciso@acmecloud.io"
        assert res["applicable_controls"] > 0


@pytest.mark.asyncio
async def test_policy_lifecycle_and_acknowledgement():
    """Validates policy creation, versioning, approvals, and employee acknowledgement campaigns."""
    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization).limit(1))
        org = org_res.scalars().first()

        policies = await policy_service.list_policies(session, org.id)
        assert len(policies) >= 5

        infosec_policy = next((p for p in policies if p.slug == "information-security-policy"), None)
        assert infosec_policy is not None
        assert infosec_policy.status == "PUBLISHED"

        # Check versions and approvals
        detailed = await policy_service.get_policy(session, org.id, infosec_policy.id)
        assert len(detailed.versions) >= 1
        assert len(detailed.versions[0].approvals) >= 1
        assert detailed.versions[0].approvals[0].approver_email == "ciso@acmecloud.io"

        # Check employee acknowledgement
        assert len(detailed.versions[0].acknowledgements) >= 1
        ack = detailed.versions[0].acknowledgements[0]
        assert ack.status == "ACKNOWLEDGED"


@pytest.mark.asyncio
async def test_soc2_operating_period_and_exceptions():
    """Validates SOC 2 Type II operating period tracking, tests, and exception status."""
    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization).limit(1))
        org = org_res.scalars().first()

        period = await soc2_engine.get_or_create_active_period(session, org.id)
        assert period.framework == "SOC2"
        assert period.status == "ACTIVE"

        soc2_status = await soc2_engine.get_soc2_status(session, org.id)
        assert soc2_status["days_elapsed"] > 0
        assert "Operating Period Active" in soc2_status["status_statement"]
        assert "independent CPA examination" in soc2_status["status_statement"]


@pytest.mark.asyncio
async def test_dpdp_privacy_inventory_and_dsr_workflow():
    """Validates India DPDP personal data inventory, processing activities (ROPA), and DSR SLA countdowns."""
    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization).limit(1))
        org = org_res.scalars().first()

        inventory = await privacy_service.list_data_inventory(session, org.id)
        assert len(inventory) >= 3
        rds_inv = next((i for i in inventory if "RDS" in i.system_name), None)
        assert rds_inv is not None
        assert rds_inv.encryption_at_rest == "AWS KMS AES-256"

        activities = await privacy_service.list_processing_activities(session, org.id)
        assert len(activities) >= 2

        # Create new privacy request
        req = await privacy_service.create_privacy_request(
            db=session,
            organization_id=org.id,
            request_type="ACCESS",
            data_principal_name="Pooja Sen",
            data_principal_email="pooja.sen@example.com",
            sla_days=30,
        )
        assert req.status == "RECEIVED"
        assert req.request_number.startswith("DSR-2026-")
        assert req.due_at > datetime.utcnow()


@pytest.mark.asyncio
async def test_vendor_risk_assessment_and_dpa():
    """Validates third-party vendor assessments, criticality, risk ratings, and executed DPAs."""
    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization).limit(1))
        org = org_res.scalars().first()

        vendors = await vendor_risk_service.list_vendors(session, org.id)
        assert len(vendors) >= 3

        aws_v = next((v for v in vendors if "AWS" in v.name or "Amazon" in v.name), None)
        assert aws_v is not None
        assert aws_v.status == "APPROVED"
        assert aws_v.dpa_status == "EXECUTED"
        assert len(aws_v.assessments) >= 1
        assert aws_v.assessments[0].overall_score >= 90


@pytest.mark.asyncio
async def test_internal_audit_capa_and_management_review():
    """Validates internal audit findings, centralized CAPA lifecycle, and executive management review minutes."""
    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization).limit(1))
        org = org_res.scalars().first()

        audits = await audit_capa_service.list_internal_audits(session, org.id)
        assert len(audits) >= 1
        audit = audits[0]
        assert audit.audit_code == "IA-2026-Q3"
        assert len(audit.findings) >= 1

        capas = await audit_capa_service.list_corrective_actions(session, org.id)
        assert len(capas) >= 2
        effective_capa = next((c for c in capas if c.status == "EFFECTIVE"), None)
        assert effective_capa is not None
        assert effective_capa.verification_notes is not None
        assert effective_capa.effectiveness_reviewer is not None

        reviews = await audit_capa_service.list_management_reviews(session, org.id)
        assert len(reviews) >= 1
        assert reviews[0].status == "APPROVED"
        assert len(reviews[0].attendees_json) >= 2


@pytest.mark.asyncio
async def test_audit_package_generation_with_redaction_and_hash():
    """Validates immutable audit package manifest, zero-knowledge safe redaction, and SHA256 integrity hash."""
    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization).limit(1))
        org = org_res.scalars().first()

        package = await audit_package_service.generate_audit_package(
            db=session,
            organization_id=org.id,
            title="Q3 2026 SOC 2 & ISO 27001 Verification Package",
            framework="SOC2_ISO27001",
            evaluation_period="2026-07-01 to 2026-09-30",
            generated_by="compliance@launchcomply.io",
        )
        assert package.status == "READY"
        assert len(package.manifest_hash) == 64  # SHA256 hex length
        assert package.redaction_level == "AUDITOR_SAFE_ZERO_KNOWLEDGE"
        assert len(package.items) >= 5
        for item in package.items:
            assert item.redacted is True
            assert len(item.sha256_hash) == 64


@pytest.mark.asyncio
async def test_external_assurance_gating_trust_center_badges():
    """Validates that Trust Center displays 'Certified' ONLY with active verified assurance record, otherwise 'Readiness Program'."""
    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization).limit(1))
        org = org_res.scalars().first()

        # Check badges initially: ISO 27001 is NOT certified yet
        badges = await external_assurance_service.get_verified_badge_status(session, org.id)
        assert badges["iso27001"]["is_certified"] is False
        assert "Readiness Program" in badges["iso27001"]["display_badge"]

        # Add verified active ISO 27001 certificate
        rec = await external_assurance_service.add_assurance_record(
            db=session,
            organization_id=org.id,
            assurance_type="ISO_CERTIFICATE",
            framework="ISO27001",
            issuer_auditor="BSI Group (UKAS Accredited Registrar)",
            document_reference="CERT-ISO27001-2026-BSI.pdf",
            expires_at=datetime.utcnow() + timedelta(days=365),
            verified_by="compliance@launchcomply.io",
        )
        assert rec.is_active is True

        # Check badges again: ISO 27001 is now Certified with issuer
        badges_after = await external_assurance_service.get_verified_badge_status(session, org.id)
        assert badges_after["iso27001"]["is_certified"] is True
        assert "Certified" in badges_after["iso27001"]["display_badge"]
        assert badges_after["iso27001"]["issuer"] == "BSI Group (UKAS Accredited Registrar)"


@pytest.mark.asyncio
async def test_phase7_tenant_isolation():
    """Negative test validating that Tenant B cannot access Tenant A's risks, policies, audits, or privacy requests."""
    async with AsyncSessionLocal() as session:
        org_b = Organization(name="Tenant Isolation Corp", slug="tenant-isolation-corp")
        session.add(org_b)
        await session.commit()
        await session.refresh(org_b)

        # Tenant B must have zero risks initially
        b_risks = await risk_service.list_risks(session, org_b.id)
        assert len(b_risks) == 0

        # Tenant B must have zero privacy requests
        b_priv = (await session.execute(select(PrivacyRequest).where(PrivacyRequest.organization_id == org_b.id))).scalars().all()
        assert len(b_priv) == 0

        # Tenant B must have zero internal audits
        b_audits = (await session.execute(select(InternalAudit).where(InternalAudit.organization_id == org_b.id))).scalars().all()
        assert len(b_audits) == 0

        # Tenant B must have zero audit packages
        b_pkgs = (await session.execute(select(AuditPackage).where(AuditPackage.organization_id == org_b.id))).scalars().all()
        assert len(b_pkgs) == 0
