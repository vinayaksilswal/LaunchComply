"""Phase 10 Enterprise API Endpoints.

Covers:
- Enterprise SSO & SAML 2.0 / OIDC
- SCIM 2.0 Foundation (/scim/v2/Users, /scim/v2/Groups)
- Service Accounts & Scoped API Tokens (lc_live_...)
- AI Compliance & Security Copilot (Evidence-grounded, human action gates)
- Continuous Threat Modeling (STRIDE, trust boundaries, attack paths, risk linkage)
- MSP / Partner Platform (Delegated customer permissions, consent & revocation)
- Business Units & Control Inheritance
- Outbound Signed Webhooks (HMAC-SHA256)
- Public Enterprise API (/api/public/v1/)
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.permissions import get_current_user
from app.models.auth import User
from app.models.enterprise_identity import (
    SSOProviderType,
    SSOMode,
    DomainVerificationMethod,
)
from app.models.ai_copilot import CopilotMode, ActionProposalType
from app.models.partner import PartnerRole
from app.models.enterprise_org import BusinessUnitRole
from app.services.enterprise.identity_service import EnterpriseIdentityService
from app.services.enterprise.copilot_service import AICopilotService
from app.services.enterprise.threat_modeling_service import ContinuousThreatModelingService
from app.services.enterprise.partner_service import PartnerControlPlaneService
from app.services.enterprise.enterprise_org_service import EnterpriseOrgService

router = APIRouter(tags=["Enterprise"])


# =============================================================================
# SCHEMAS
# =============================================================================

class RegisterDomainRequest(BaseModel):
    organization_id: str
    domain: str
    verification_method: DomainVerificationMethod = DomainVerificationMethod.DNS_TXT

class VerifyDomainRequest(BaseModel):
    simulated_dns_txt: Optional[str] = None

class ConfigureSSORequest(BaseModel):
    organization_id: str
    provider_type: SSOProviderType = SSOProviderType.SAML
    entity_id: str
    acs_url: str
    idp_sso_url: str
    idp_issuer: str
    initial_certificate: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    jwks_url: Optional[str] = None
    sso_mode: SSOMode = SSOMode.OPTIONAL

class SetSSOEnforcementRequest(BaseModel):
    organization_id: str
    mode: SSOMode

class ProcessSAMLLoginRequest(BaseModel):
    organization_id: str
    assertion: Dict[str, Any]
    is_test: bool = False

class CreateServiceAccountRequest(BaseModel):
    organization_id: str
    name: str
    purpose: str
    permissions: List[str]

class GenerateTokenRequest(BaseModel):
    scopes: List[str]
    expires_days: int = 90

class CopilotQueryRequest(BaseModel):
    organization_id: str
    conversation_id: Optional[str] = None
    query: str
    mode: CopilotMode = CopilotMode.COMPLIANCE

class ReviewProposalRequest(BaseModel):
    organization_id: str
    approved: bool

class UploadQuestionnaireRequest(BaseModel):
    organization_id: str
    title: str
    questions: List[str]

class GenerateThreatModelRequest(BaseModel):
    organization_id: str
    application_id: str
    architecture_version: str = "v1.0"
    changes_summary: str = "Architecture synthesis"

class RegisterPartnerRequest(BaseModel):
    name: str
    slug: str
    contact_email: str
    website: Optional[str] = None
    tier: str = "CERTIFIED"
    brand_name: Optional[str] = None
    primary_accent_color: str = "#06B6D4"

class InviteManagedRelationshipRequest(BaseModel):
    partner_id: str
    customer_organization_id: str
    delegated_permissions: List[str]

class ApproveRelationshipRequest(BaseModel):
    approved_permissions: Optional[List[str]] = None

class CreateBusinessUnitRequest(BaseModel):
    organization_id: str
    name: str
    code: str
    region: str = "GLOBAL"
    owner: str
    parent_business_unit_id: Optional[str] = None

class RegisterWebhookRequest(BaseModel):
    organization_id: str
    name: str
    target_url: str
    event_types: List[str]


# =============================================================================
# 1. ENTERPRISE IDENTITY & SSO
# =============================================================================

@router.post("/enterprise/domains")
async def register_domain(req: RegisterDomainRequest, db: AsyncSession = Depends(get_db)):
    svc = EnterpriseIdentityService(db)
    try:
        rec = await svc.register_domain(req.organization_id, req.domain, req.verification_method)
        return {
            "id": rec.id,
            "domain": rec.domain,
            "verification_token": rec.verification_token,
            "verification_method": rec.verification_method,
            "is_verified": rec.is_verified,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/enterprise/domains/{domain_id}/verify")
async def verify_domain(domain_id: str, org_id: str, req: VerifyDomainRequest, db: AsyncSession = Depends(get_db)):
    svc = EnterpriseIdentityService(db)
    try:
        rec = await svc.verify_domain(domain_id, org_id, req.simulated_dns_txt)
        return {"id": rec.id, "domain": rec.domain, "is_verified": rec.is_verified, "verified_at": rec.verified_at}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/enterprise/domains/discover")
async def discover_sso(email: str, db: AsyncSession = Depends(get_db)):
    svc = EnterpriseIdentityService(db)
    sso = await svc.discover_sso_for_email(email)
    if not sso:
        return {"sso_enabled": False}
    return {
        "sso_enabled": True,
        "provider_type": sso.provider_type,
        "sso_mode": sso.sso_mode,
        "idp_sso_url": sso.idp_sso_url,
    }

@router.post("/enterprise/sso/configure")
async def configure_sso(req: ConfigureSSORequest, db: AsyncSession = Depends(get_db)):
    svc = EnterpriseIdentityService(db)
    sso = await svc.configure_sso(
        organization_id=req.organization_id,
        provider_type=req.provider_type,
        entity_id=req.entity_id,
        acs_url=req.acs_url,
        idp_sso_url=req.idp_sso_url,
        idp_issuer=req.idp_issuer,
        initial_certificate=req.initial_certificate,
        client_id=req.client_id,
        client_secret=req.client_secret,
        jwks_url=req.jwks_url,
        sso_mode=req.sso_mode,
    )
    return {"id": sso.id, "provider_type": sso.provider_type, "sso_mode": sso.sso_mode, "entity_id": sso.entity_id}

@router.post("/enterprise/sso/enforcement")
async def set_sso_enforcement(req: SetSSOEnforcementRequest, db: AsyncSession = Depends(get_db)):
    svc = EnterpriseIdentityService(db)
    try:
        sso = await svc.set_sso_enforcement(req.organization_id, req.mode)
        return {"organization_id": sso.organization_id, "sso_mode": sso.sso_mode}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/enterprise/sso/saml/login")
async def process_saml_login(req: ProcessSAMLLoginRequest, db: AsyncSession = Depends(get_db)):
    svc = EnterpriseIdentityService(db)
    # Validate identity and provision JIT
    try:
        user, mem = await svc.process_sso_login(req.organization_id, req.assertion, is_test=req.is_test)
        return {
            "success": True,
            "user_id": user.id,
            "email": user.email,
            "role": mem.role,
            "organization_id": mem.organization_id,
            "is_test": req.is_test,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# 2. SCIM 2.0 PROTOCOL
# =============================================================================

@router.get("/enterprise/scim/config")
async def get_scim_config(org_id: str, db: AsyncSession = Depends(get_db)):
    svc = EnterpriseIdentityService(db)
    scim, token = await svc.get_or_create_scim_config(org_id)
    return {
        "endpoint_url": scim.endpoint_url,
        "is_active": scim.is_active,
        "bearer_token": token,  # Shown only once on creation
    }

@router.post("/scim/v2/Users")
async def scim_create_user(
    user_payload: Dict[str, Any],
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="SCIM authentication required.")
    raw_token = authorization.split("Bearer ")[1].strip()
    svc = EnterpriseIdentityService(db)
    scim = await svc.authenticate_scim_token(raw_token)
    if not scim:
        raise HTTPException(status_code=401, detail="Invalid SCIM Bearer token.")

    res = await svc.scim_provision_user(scim.organization_id, user_payload)
    return res

@router.delete("/scim/v2/Users/{user_id}")
async def scim_delete_user(
    user_id: str,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="SCIM authentication required.")
    raw_token = authorization.split("Bearer ")[1].strip()
    svc = EnterpriseIdentityService(db)
    scim = await svc.authenticate_scim_token(raw_token)
    if not scim:
        raise HTTPException(status_code=401, detail="Invalid SCIM Bearer token.")

    success = await svc.scim_deprovision_user(scim.organization_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found in organization.")
    return {"status": "DEACTIVATED", "user_id": user_id}


# =============================================================================
# 3. SERVICE ACCOUNTS & SCOPED API TOKENS
# =============================================================================

@router.post("/enterprise/service-accounts")
async def create_service_account(
    req: CreateServiceAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = EnterpriseIdentityService(db)
    sa = await svc.create_service_account(
        organization_id=req.organization_id,
        name=req.name,
        purpose=req.purpose,
        permissions=req.permissions,
        created_by=current_user.id,
    )
    return {"id": sa.id, "name": sa.name, "purpose": sa.purpose, "is_active": sa.is_active}

@router.post("/enterprise/service-accounts/{sa_id}/tokens")
async def generate_service_account_token(
    sa_id: str,
    req: GenerateTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = EnterpriseIdentityService(db)
    token_rec, raw_token = await svc.generate_service_account_token(sa_id, req.scopes, req.expires_days)
    return {
        "token_id": token_rec.id,
        "token": raw_token,  # SHOWN ONLY ONCE!
        "prefix": token_rec.token_prefix,
        "expires_at": token_rec.expires_at,
    }


# =============================================================================
# 4. AI COMPLIANCE & SECURITY COPILOT
# =============================================================================

@router.post("/copilot/query")
async def copilot_query(
    req: CopilotQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = AICopilotService(db)
    msg, proposals = await svc.generate_copilot_response(
        organization_id=req.organization_id,
        user_id=current_user.id,
        conversation_id=req.conversation_id,
        query=req.query,
        mode=req.mode,
    )
    return {
        "message_id": msg.id,
        "conversation_id": msg.conversation_id,
        "role": msg.role,
        "content": msg.content,
        "confidence": msg.confidence,
        "proposals": [
            {
                "id": p.id,
                "proposal_type": p.proposal_type,
                "description": p.description,
                "status": p.status,
            }
            for p in proposals
        ],
    }

@router.post("/copilot/proposals/{proposal_id}/review")
async def review_proposal(
    proposal_id: str,
    req: ReviewProposalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = AICopilotService(db)
    try:
        prop = await svc.review_action_proposal(
            proposal_id=proposal_id,
            organization_id=req.organization_id,
            approved=req.approved,
            reviewed_by_user_id=current_user.id,
        )
        return {"id": prop.id, "status": prop.status, "proposal_type": prop.proposal_type}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/copilot/questionnaires/upload")
async def upload_questionnaire(req: UploadQuestionnaireRequest, db: AsyncSession = Depends(get_db)):
    svc = AICopilotService(db)
    upload = await svc.process_questionnaire_upload(req.organization_id, req.title, req.questions)
    return {
        "id": upload.id,
        "title": upload.title,
        "total_questions": upload.total_questions,
        "drafted_count": upload.drafted_count,
        "status": upload.status,
    }


# =============================================================================
# 5. CONTINUOUS THREAT MODELING
# =============================================================================

@router.post("/threat-models/generate")
async def generate_threat_model(req: GenerateThreatModelRequest, db: AsyncSession = Depends(get_db)):
    svc = ContinuousThreatModelingService(db)
    tm = await svc.get_or_create_threat_model(req.organization_id, req.application_id)
    version = await svc.generate_threat_model_version(tm.id, req.architecture_version, req.changes_summary)
    return {
        "threat_model_id": tm.id,
        "version_id": version.id,
        "version_number": version.version_number,
        "status": version.status,
    }

@router.post("/threat-models/threats/{threat_id}/link-risk")
async def link_threat_risk(threat_id: str, org_id: str, db: AsyncSession = Depends(get_db)):
    svc = ContinuousThreatModelingService(db)
    try:
        risk = await svc.link_threat_to_risk_register(threat_id, org_id)
        return {"threat_id": threat_id, "risk_id": risk.id, "risk_title": risk.title}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# 6. MSP / PARTNER CONTROL PLANE
# =============================================================================

@router.post("/partner/register")
async def register_partner(req: RegisterPartnerRequest, db: AsyncSession = Depends(get_db)):
    svc = PartnerControlPlaneService(db)
    try:
        partner = await svc.register_partner_organization(
            name=req.name,
            slug=req.slug,
            contact_email=req.contact_email,
            website=req.website,
            tier=req.tier,
            brand_name=req.brand_name,
            primary_accent_color=req.primary_accent_color,
        )
        return {"id": partner.id, "name": partner.name, "slug": partner.slug, "tier": partner.tier}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/partner/relationships/invite")
async def invite_relationship(req: InviteManagedRelationshipRequest, db: AsyncSession = Depends(get_db)):
    svc = PartnerControlPlaneService(db)
    rel = await svc.invite_managed_relationship(req.partner_id, req.customer_organization_id, req.delegated_permissions)
    return {"id": rel.id, "status": rel.status, "partner_id": rel.partner_id, "customer_organization_id": rel.customer_organization_id}

@router.post("/partner/relationships/{rel_id}/approve")
async def approve_relationship(
    rel_id: str,
    customer_org_id: str,
    req: ApproveRelationshipRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = PartnerControlPlaneService(db)
    try:
        rel = await svc.approve_managed_relationship(rel_id, customer_org_id, current_user.id, req.approved_permissions)
        return {"id": rel.id, "status": rel.status, "approved_at": rel.approved_at}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/partner/relationships/{rel_id}/revoke")
async def revoke_relationship(rel_id: str, customer_org_id: str, db: AsyncSession = Depends(get_db)):
    svc = PartnerControlPlaneService(db)
    try:
        rel = await svc.revoke_managed_relationship(rel_id, customer_org_id)
        return {"id": rel.id, "status": rel.status, "revoked_at": rel.revoked_at}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/partner/{partner_id}/portfolio")
async def get_partner_portfolio(partner_id: str, db: AsyncSession = Depends(get_db)):
    svc = PartnerControlPlaneService(db)
    overview = await svc.get_partner_portfolio_overview(partner_id)
    return overview


# =============================================================================
# 7. BUSINESS UNITS & OUTBOUND WEBHOOKS
# =============================================================================

@router.post("/enterprise/business-units")
async def create_business_unit(req: CreateBusinessUnitRequest, db: AsyncSession = Depends(get_db)):
    svc = EnterpriseOrgService(db)
    try:
        bu = await svc.create_business_unit(
            organization_id=req.organization_id,
            name=req.name,
            code=req.code,
            region=req.region,
            owner=req.owner,
            parent_business_unit_id=req.parent_business_unit_id,
        )
        return {"id": bu.id, "name": bu.name, "code": bu.code, "region": bu.region}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/enterprise/webhooks")
async def register_webhook(req: RegisterWebhookRequest, db: AsyncSession = Depends(get_db)):
    svc = EnterpriseOrgService(db)
    wh, secret = await svc.register_outbound_webhook(
        organization_id=req.organization_id,
        name=req.name,
        target_url=req.target_url,
        event_types=req.event_types,
    )
    return {
        "id": wh.id,
        "name": wh.name,
        "target_url": wh.target_url,
        "signing_secret": secret,  # Returned only upon registration
    }


# =============================================================================
# 8. PUBLIC ENTERPRISE API (/api/public/v1/)
# =============================================================================

@router.get("/api/public/v1/compliance/summary")
async def public_compliance_summary(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    if not authorization or not (authorization.startswith("Bearer lc_live_") or authorization.startswith("Bearer lc_test_")):
        raise HTTPException(status_code=401, detail="Valid Enterprise API token (lc_live_...) required.")
    raw_token = authorization.split("Bearer ")[1].strip()
    id_svc = EnterpriseIdentityService(db)
    try:
        sa, tok = await id_svc.authenticate_api_token(raw_token, required_scope="compliance.read")
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    org_svc = EnterpriseOrgService(db)
    controls = await org_svc.resolve_control_inheritance(sa.organization_id)
    return {
        "service_account": sa.name,
        "organization_id": sa.organization_id,
        "controls_count": len(controls),
        "controls": controls,
    }
