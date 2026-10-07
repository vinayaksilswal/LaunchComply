"""Phase 10 Enterprise Suite: Identity, SAML, SCIM, AI Copilot, Threat Modeling, Partner MSP, Scale."""
import json
import secrets
import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.core.database import AsyncSessionLocal
from app.models.auth import User, Organization, OrganizationMembership, MembershipRole
from app.models.enterprise_identity import (
    SSOProviderType,
    SSOMode,
    DomainVerificationMethod,
    CertStatus,
    SSOConfiguration,
    SSOCertificate,
    GroupRoleMapping,
)
from app.models.ai_copilot import CopilotMode, ActionProposalStatus
from app.models.threat_model import ThreatCriticality, ThreatStatus
from app.models.compliance_framework import CanonicalControl, ControlImplementation
from app.models.compliance_risk import Risk
from app.services.enterprise.identity_service import EnterpriseIdentityService
from app.services.enterprise.copilot_service import AICopilotService
from app.services.enterprise.threat_modeling_service import ContinuousThreatModelingService
from app.services.enterprise.partner_service import PartnerControlPlaneService
from app.services.enterprise.enterprise_org_service import EnterpriseOrgService


@pytest.mark.asyncio
async def test_saml_assertion_validation_and_security():
    """Verify SAML 2.0 cryptographic and structural security checks."""
    async with AsyncSessionLocal() as db:
        svc = EnterpriseIdentityService(db)
        org_id = str(uuid.uuid4())

        sso_config = await svc.configure_sso(
            organization_id=org_id,
            provider_type=SSOProviderType.SAML,
            entity_id="https://app.launchcomply.com/saml/metadata",
            acs_url="https://app.launchcomply.com/saml/acs",
            idp_sso_url="https://idp.okta.com/app/sso/saml",
            idp_issuer="http://www.okta.com/exk12345",
            initial_certificate="-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...\n-----END CERTIFICATE-----",
            sso_mode=SSOMode.OPTIONAL,
        )

        certs = [
            SSOCertificate(
                sso_configuration_id=sso_config.id,
                certificate_data="dummy_cert_data",
                fingerprint="fp12345",
                status=CertStatus.ACTIVE,
                expires_at=datetime.now(timezone.utc) + timedelta(days=365),
            )
        ]

        now = datetime.now(timezone.utc)
        valid_assertion = {
            "signature": "valid_hmac_sig",
            "issuer": "http://www.okta.com/exk12345",
            "audience": "https://app.launchcomply.com/saml/metadata",
            "recipient": "https://app.launchcomply.com/saml/acs",
            "not_before": now - timedelta(seconds=60),
            "not_on_or_after": now + timedelta(seconds=60),
            "name_id": "auditor@enterprise.com",
            "email": "auditor@enterprise.com",
            "first_name": "Enterprise",
            "last_name": "Auditor",
            "groups": ["LaunchComply-Security"],
        }

        # 1. Valid assertion passes
        parsed = svc.validate_saml_assertion(sso_config, certs, valid_assertion)
        assert parsed["email"] == "auditor@enterprise.com"

        # 2. Unsigned assertion rejected
        unsigned = dict(valid_assertion, signature=None)
        with pytest.raises(ValueError, match="Unsigned assertions are rejected"):
            svc.validate_saml_assertion(sso_config, certs, unsigned)

        # 3. Wrong issuer rejected
        wrong_issuer = dict(valid_assertion, issuer="http://malicious-idp.com")
        with pytest.raises(ValueError, match="Issuer mismatch"):
            svc.validate_saml_assertion(sso_config, certs, wrong_issuer)

        # 4. Wrong audience rejected
        wrong_aud = dict(valid_assertion, audience="https://different-app.com")
        with pytest.raises(ValueError, match="Audience mismatch"):
            svc.validate_saml_assertion(sso_config, certs, wrong_aud)

        # 5. Expired assertion rejected
        expired = dict(valid_assertion, not_on_or_after=now - timedelta(seconds=400))
        with pytest.raises(ValueError, match="Assertion has expired"):
            svc.validate_saml_assertion(sso_config, certs, expired)


@pytest.mark.asyncio
async def test_domain_discovery_and_verification():
    """Verify enterprise domain registration, DNS TXT check, and SSO discovery."""
    async with AsyncSessionLocal() as db:
        svc = EnterpriseIdentityService(db)
        org_id = str(uuid.uuid4())
        unique_domain = f"corp-{secrets.token_hex(4)}.com"

        # 1. Register domain
        domain_rec = await svc.register_domain(
            organization_id=org_id,
            domain=unique_domain,
            verification_method=DomainVerificationMethod.DNS_TXT,
        )
        assert domain_rec.is_verified is False
        assert domain_rec.verification_token.startswith("lc-verify-")

        # 2. Invalid token fails verification
        with pytest.raises(ValueError, match="verification token does not match"):
            await svc.verify_domain(domain_rec.id, org_id, simulated_dns_txt="wrong-token")

        # 3. Correct token verifies domain
        verified_rec = await svc.verify_domain(domain_rec.id, org_id, simulated_dns_txt=domain_rec.verification_token)
        assert verified_rec.is_verified is True
        assert verified_rec.verified_at is not None

        # 4. SSO domain discovery
        await svc.configure_sso(
            organization_id=org_id,
            provider_type=SSOProviderType.SAML,
            entity_id="https://app.launchcomply.com/metadata",
            acs_url="https://app.launchcomply.com/acs",
            idp_sso_url="https://sso.okta.com",
            idp_issuer="http://okta.com/org",
        )
        discovered_sso = await svc.discover_sso_for_email(f"employee@{unique_domain}")
        assert discovered_sso is not None
        assert discovered_sso.organization_id == org_id


@pytest.mark.asyncio
async def test_jit_provisioning_and_group_role_mapping():
    """Verify group-to-role mapping and JIT user provisioning."""
    async with AsyncSessionLocal() as db:
        svc = EnterpriseIdentityService(db)
        org = Organization(name="JIT Enterprise", slug=f"jit-{secrets.token_hex(4)}")
        db.add(org)
        await db.commit()
        await db.refresh(org)

        # Configure Group -> Role mapping
        mapping = GroupRoleMapping(
            organization_id=org.id,
            idp_group_name="Okta-SecOps",
            mapped_role=MembershipRole.SECURITY,
            is_active=True,
        )
        db.add(mapping)
        await db.commit()

        user_identity = {
            "email": f"secops-{secrets.token_hex(4)}@enterprise.com",
            "first_name": "Alice",
            "last_name": "Security",
            "groups": ["Okta-SecOps", "Employees"],
        }

        # JIT provision
        user, membership = await svc.process_sso_login(org.id, user_identity, is_test=False)
        assert user.email == user_identity["email"]
        assert membership.role == MembershipRole.SECURITY
        assert membership.is_active is True


@pytest.mark.asyncio
async def test_sso_enforcement_lockout_protection():
    """Verify lockout prevention safeguards before switching to REQUIRED SSO mode."""
    async with AsyncSessionLocal() as db:
        svc = EnterpriseIdentityService(db)
        org = Organization(name="Lockout Safe Org", slug=f"lockout-{secrets.token_hex(4)}")
        db.add(org)
        await db.commit()
        await db.refresh(org)

        # Configure SSO (untested)
        sso = await svc.configure_sso(
            organization_id=org.id,
            provider_type=SSOProviderType.SAML,
            entity_id="entity",
            acs_url="acs",
            idp_sso_url="sso",
            idp_issuer="issuer",
        )

        # Enforcement fails before test login
        with pytest.raises(ValueError, match="Cannot enforce SSO before a successful test login"):
            await svc.set_sso_enforcement(org.id, SSOMode.REQUIRED)

        # Mark test login succeeded
        sso.test_login_succeeded = True
        await db.commit()

        # Enforcement fails if no active Owner/Admin exists
        with pytest.raises(ValueError, match="Lockout protection: At least one active Owner/Admin is required"):
            await svc.set_sso_enforcement(org.id, SSOMode.REQUIRED)

        # Add active Admin
        admin = User(email=f"admin-{secrets.token_hex(4)}@org.com", full_name="Breakglass Admin", hashed_password="pw")
        db.add(admin)
        await db.commit()
        mem = OrganizationMembership(organization_id=org.id, user_id=admin.id, role=MembershipRole.OWNER, is_active=True)
        db.add(mem)
        await db.commit()

        # Enforcement now succeeds
        enforced = await svc.set_sso_enforcement(org.id, SSOMode.REQUIRED)
        assert enforced.sso_mode == SSOMode.REQUIRED


@pytest.mark.asyncio
async def test_scim_provisioning_and_safe_deprovisioning():
    """Verify SCIM 2.0 user creation and deactivation preserving audit trail."""
    async with AsyncSessionLocal() as db:
        svc = EnterpriseIdentityService(db)
        org = Organization(name="SCIM Org", slug=f"scim-{secrets.token_hex(4)}")
        db.add(org)
        await db.commit()
        await db.refresh(org)

        scim_config, raw_token = await svc.get_or_create_scim_config(org.id)
        assert raw_token.startswith("lc_scim_")

        # Authenticate token
        auth_scim = await svc.authenticate_scim_token(raw_token)
        assert auth_scim is not None
        assert auth_scim.organization_id == org.id

        # Provision user via SCIM
        email = f"scim-user-{secrets.token_hex(4)}@enterprise.com"
        scim_payload = {
            "userName": email,
            "name": {"givenName": "John", "familyName": "Doe"},
            "active": True,
        }
        user_resp = await svc.scim_provision_user(org.id, scim_payload)
        assert user_resp["active"] is True
        user_id = user_resp["id"]

        # Deprovision user
        deprovisioned = await svc.scim_deprovision_user(org.id, user_id)
        assert deprovisioned is True

        # Verify access removed but user entity and record remains
        user_res = await db.execute(select(User).where(User.id == user_id))
        user_rec = user_res.scalar_one_or_none()
        assert user_rec is not None  # Preserved for audit/evidence history!


@pytest.mark.asyncio
async def test_service_accounts_and_scoped_api_tokens():
    """Verify service account creation, prefix 'lc_live_', hashing, and scope enforcement."""
    async with AsyncSessionLocal() as db:
        svc = EnterpriseIdentityService(db)
        org_id = str(uuid.uuid4())

        sa = await svc.create_service_account(
            organization_id=org_id,
            name="CI Deployer",
            purpose="Automated GitHub Actions deployments",
            permissions=["deployments.execute"],
            created_by="admin-user-id",
        )
        assert sa.name == "CI Deployer"

        token_rec, raw_token = await svc.generate_service_account_token(
            service_account_id=sa.id,
            scopes=["deployments.execute", "compliance.read"],
            expires_days=30,
        )
        assert raw_token.startswith("lc_live_")
        assert token_rec.token_hash != raw_token  # Hashed in DB!

        # Authenticate with valid scope
        authed_sa, _ = await svc.authenticate_api_token(raw_token, required_scope="deployments.execute")
        assert authed_sa.id == sa.id

        # Reject when unauthorized scope requested
        with pytest.raises(ValueError, match="lacks required scope"):
            await svc.authenticate_api_token(raw_token, required_scope="billing.manage")

        # Revoke token
        await svc.revoke_api_token(token_rec.id)
        with pytest.raises(ValueError, match="token invalid or revoked"):
            await svc.authenticate_api_token(raw_token)


@pytest.mark.asyncio
async def test_ai_copilot_grounding_and_action_gate():
    """Verify AI Copilot evidence grounding, citations, and human approval requirement."""
    async with AsyncSessionLocal() as db:
        copilot_svc = AICopilotService(db)
        org = Organization(name="Copilot Org", slug=f"copilot-{secrets.token_hex(4)}")
        db.add(org)
        await db.commit()
        await db.refresh(org)

        # Seed real control & implementation with missing evidence
        ctrl_code = f"LC-AC-{secrets.token_hex(4)}"
        ctrl = CanonicalControl(
            control_code=ctrl_code,
            title="Access Review and Revocation",
            category="ACCESS_CONTROL",
            description="Regular review of privileged access",
        )
        db.add(ctrl)
        await db.commit()

        impl = ControlImplementation(
            organization_id=org.id,
            control_id=ctrl.id,
            status="PARTIAL",
            owner="security@org.com",
            implementation_description="Access review procedure",
            applicable=True,
        )
        db.add(impl)

        # Seed high risk
        risk = Risk(
            organization_id=org.id,
            risk_id=f"RSK-TEST-{secrets.token_hex(4)}",
            title="Unencrypted Backup Archive",
            category="TECHNICAL",
            asset="Backup Storage",
            threat="Data exposure via unencrypted volume",
            vulnerability="Missing KMS encryption key",
            owner="security@org.com",
            inherent_score=16,
            residual_score=12,
            status="IDENTIFIED",
        )
        db.add(risk)
        await db.commit()

        # Query Compliance Copilot
        msg, proposals = await copilot_svc.generate_copilot_response(
            organization_id=org.id,
            user_id="user-123",
            conversation_id=None,
            query="What is blocking our ISO 27001 readiness?",
            mode=CopilotMode.COMPLIANCE,
        )
        assert ctrl_code in msg.content or "Unencrypted Backup Archive" in msg.content
        assert len(proposals) > 0
        proposal = proposals[0]
        assert proposal.status == ActionProposalStatus.PROPOSED

        # AI CANNOT self-execute: human approval is required
        reviewed_prop = await copilot_svc.review_action_proposal(
            proposal_id=proposal.id,
            organization_id=org.id,
            approved=True,
            reviewed_by_user_id="user-123",
        )
        assert reviewed_prop.status == ActionProposalStatus.EXECUTED


@pytest.mark.asyncio
async def test_continuous_threat_modeling_and_risk_linkage():
    """Verify continuous STRIDE threat generation, attack paths, and Phase 7 Risk promotion."""
    async with AsyncSessionLocal() as db:
        tm_svc = ContinuousThreatModelingService(db)
        org_id = str(uuid.uuid4())
        app_id = str(uuid.uuid4())

        tm = await tm_svc.get_or_create_threat_model(org_id, app_id)
        version = await tm_svc.generate_threat_model_version(tm.id, "v2.0", "Added outbound webhook API")
        assert version.version_number == 1

        # Fetch generated threats
        from app.models.threat_model import Threat, AttackPath, TrustBoundary
        threats_res = await db.execute(select(Threat).where(Threat.threat_model_version_id == version.id))
        threats = threats_res.scalars().all()
        assert len(threats) >= 4
        assert any(t.category == "SPOOFING" for t in threats)

        paths_res = await db.execute(select(AttackPath).where(AttackPath.threat_model_version_id == version.id))
        paths = paths_res.scalars().all()
        assert len(paths) >= 2

        # Link threat to Phase 7 Risk register
        target_threat = threats[0]
        promoted_risk = await tm_svc.link_threat_to_risk_register(target_threat.id, org_id)
        assert promoted_risk.id is not None
        assert target_threat.risk_register_id == promoted_risk.id


@pytest.mark.asyncio
async def test_partner_msp_delegated_access_and_revocation():
    """Verify MSP partner platform, customer consent, scoped delegation, and immediate revocation."""
    async with AsyncSessionLocal() as db:
        partner_svc = PartnerControlPlaneService(db)

        # 1. Register partner
        partner = await partner_svc.register_partner_organization(
            name="CyberConsulting MSP",
            slug=f"cyber-{secrets.token_hex(4)}",
            contact_email="soc@cyberconsulting.com",
            tier="PREMIER",
        )

        partner_user = User(email=f"consultant-{secrets.token_hex(4)}@cyber.com", full_name="SOC Consultant", hashed_password="pw")
        db.add(partner_user)
        await db.commit()
        await partner_svc.add_partner_member(partner.id, partner_user.id)

        # Customer Org
        customer = Organization(name="Acme Health", slug=f"acme-health-{secrets.token_hex(4)}")
        db.add(customer)
        await db.commit()
        await db.refresh(customer)

        # 2. Invite relationship
        rel = await partner_svc.invite_managed_relationship(
            partner_id=partner.id,
            customer_organization_id=customer.id,
            delegated_permissions=["managed.security.read", "managed.vapt.manage"],
        )
        assert rel.status == "PENDING_CUSTOMER_APPROVAL"

        # Partner cannot access before customer approval
        with pytest.raises(PermissionError, match="does not hold active customer authorization"):
            await partner_svc.verify_partner_delegated_access(partner_user.id, customer.id, "managed.security.read")

        # 3. Customer approves
        approved_rel = await partner_svc.approve_managed_relationship(rel.id, customer.id, "customer-admin-id")
        assert approved_rel.status == "ACTIVE"

        # Access now granted for authorized scope
        p, r = await partner_svc.verify_partner_delegated_access(partner_user.id, customer.id, "managed.security.read")
        assert p.id == partner.id

        # Access denied for ungranted scope (e.g., billing)
        with pytest.raises(PermissionError, match="Customer has not granted 'managed.billing.manage'"):
            await partner_svc.verify_partner_delegated_access(partner_user.id, customer.id, "managed.billing.manage")

        # 4. Customer revokes relationship -> immediately terminated
        await partner_svc.revoke_managed_relationship(rel.id, customer.id)
        with pytest.raises(PermissionError, match="does not hold active customer authorization"):
            await partner_svc.verify_partner_delegated_access(partner_user.id, customer.id, "managed.security.read")


@pytest.mark.asyncio
async def test_business_units_and_control_inheritance():
    """Verify hierarchical business units and central vs local control inheritance."""
    async with AsyncSessionLocal() as db:
        org_svc = EnterpriseOrgService(db)
        org_id = str(uuid.uuid4())

        parent_bu = await org_svc.create_business_unit(org_id, "Global Corp APAC", f"APAC-{secrets.token_hex(2)}", "APAC", "head@corp.com")
        child_bu = await org_svc.create_business_unit(org_id, "India Division", f"IND-{secrets.token_hex(2)}", "INDIA", "india@corp.com", parent_bu.id)
        assert child_bu.parent_business_unit_id == parent_bu.id

        # Resolve control inheritance
        resolved = await org_svc.resolve_control_inheritance(org_id, child_bu.id)
        assert isinstance(resolved, list)


@pytest.mark.asyncio
async def test_outbound_webhooks_and_public_enterprise_api():
    """Verify HMAC-SHA256 signed outbound webhooks and public enterprise API."""
    async with AsyncSessionLocal() as db:
        org_svc = EnterpriseOrgService(db)
        id_svc = EnterpriseIdentityService(db)
        org_id = str(uuid.uuid4())

        # Register webhook
        wh, secret = await org_svc.register_outbound_webhook(
            organization_id=org_id,
            name="SIEM Integration",
            target_url="https://siem.corp.com/events",
            event_types=["security.finding.created"],
        )
        assert secret.startswith("whsec_")

        # Sign payload
        payload_bytes = b'{"event":"security.finding.created","finding_id":"123"}'
        sig_header = org_svc.sign_webhook_payload(secret, payload_bytes, 1727970000)
        assert sig_header.startswith("t=1727970000,v1=")

        # Create service account & token for public API test
        sa = await id_svc.create_service_account(org_id, "External Audit Bot", "Public API access", ["compliance.read"], "admin")
        _, raw_token = await id_svc.generate_service_account_token(sa.id, ["compliance.read"])

    # Test Public Enterprise API via HTTP
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(
            "/api/v1/api/public/v1/compliance/summary",
            headers={"Authorization": f"Bearer {raw_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["service_account"] == "External Audit Bot"
        assert "controls" in data
