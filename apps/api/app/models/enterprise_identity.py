"""Phase 10 Enterprise Identity Models (SAML 2.0, OIDC, SCIM 2.0, Access Policies, Service Accounts)."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.models.auth import MembershipRole


class SSOMode(str, enum.Enum):
    OPTIONAL = "OPTIONAL"
    REQUIRED = "REQUIRED"
    REQUIRED_EXCEPT_BREAK_GLASS = "REQUIRED_EXCEPT_BREAK_GLASS"


class SSOProviderType(str, enum.Enum):
    SAML = "SAML"
    OIDC = "OIDC"


class DomainVerificationMethod(str, enum.Enum):
    DNS_TXT = "DNS_TXT"
    EMAIL = "EMAIL"
    MANUAL = "MANUAL"


class CertStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    NEXT = "NEXT"
    EXPIRED = "EXPIRED"


class VerifiedOrganizationDomain(BaseModel):
    """Domain verified for SSO discovery and automatic routing."""
    __tablename__ = "enterprise_verified_domains"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    domain = Column(String(255), unique=True, nullable=False, index=True)
    verification_token = Column(String(64), nullable=False)
    verification_method = Column(Enum(DomainVerificationMethod), default=DomainVerificationMethod.DNS_TXT, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verified_at = Column(DateTime, nullable=True)


class SSOConfiguration(BaseModel):
    """SAML 2.0 or OIDC enterprise SSO configuration."""
    __tablename__ = "enterprise_sso_configurations"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    provider_type = Column(Enum(SSOProviderType), default=SSOProviderType.SAML, nullable=False)
    sso_mode = Column(Enum(SSOMode), default=SSOMode.OPTIONAL, nullable=False)
    entity_id = Column(String(255), nullable=False)
    acs_url = Column(String(255), nullable=False)
    idp_sso_url = Column(String(500), nullable=False)
    idp_issuer = Column(String(255), nullable=False)
    client_id = Column(String(255), nullable=True)
    client_secret_encrypted = Column(Text, nullable=True)
    jwks_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    test_login_succeeded = Column(Boolean, default=False, nullable=False)


class SSOCertificate(BaseModel):
    """X.509 certificate for SAML signing & encryption rotation."""
    __tablename__ = "enterprise_sso_certificates"

    sso_configuration_id = Column(String(36), ForeignKey("enterprise_sso_configurations.id", ondelete="CASCADE"), nullable=False, index=True)
    certificate_data = Column(Text, nullable=False)
    fingerprint = Column(String(64), nullable=False)
    status = Column(Enum(CertStatus), default=CertStatus.ACTIVE, nullable=False)
    expires_at = Column(DateTime, nullable=False)


class GroupRoleMapping(BaseModel):
    """Maps IdP directory group names to LaunchComply RBAC roles."""
    __tablename__ = "enterprise_group_role_mappings"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    idp_group_name = Column(String(255), nullable=False)
    mapped_role = Column(Enum(MembershipRole), default=MembershipRole.DEVELOPER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class SCIMConfiguration(BaseModel):
    """SCIM 2.0 provisioning configuration."""
    __tablename__ = "enterprise_scim_configurations"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    endpoint_url = Column(String(255), nullable=False)
    bearer_token_hash = Column(String(64), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_synced_at = Column(DateTime, nullable=True)


class DirectorySyncRun(BaseModel):
    """Directory sync execution log."""
    __tablename__ = "enterprise_directory_sync_runs"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    users_synced = Column(Integer, default=0, nullable=False)
    groups_synced = Column(Integer, default=0, nullable=False)
    users_deprovisioned = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="SUCCESS", nullable=False)
    errors_json = Column(Text, default="[]", nullable=False)


class EnterpriseAccessPolicy(BaseModel):
    """Granular access controls for enterprise compliance."""
    __tablename__ = "enterprise_access_policies"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    require_sso = Column(Boolean, default=False, nullable=False)
    require_mfa = Column(Boolean, default=True, nullable=False)
    allowed_email_domains_json = Column(Text, default="[]", nullable=False)
    session_duration_minutes = Column(Integer, default=720, nullable=False)
    max_idle_minutes = Column(Integer, default=60, nullable=False)
    approved_ip_ranges_json = Column(Text, default="[]", nullable=False)


class ServiceAccount(BaseModel):
    """Service account for machine-to-machine API access."""
    __tablename__ = "enterprise_service_accounts"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    purpose = Column(String(500), nullable=False)
    permissions_json = Column(Text, default="[]", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(String(36), nullable=False)
    expires_at = Column(DateTime, nullable=True)


class ServiceAccountToken(BaseModel):
    """Cryptographic API token issued to a service account."""
    __tablename__ = "enterprise_service_account_tokens"

    service_account_id = Column(String(36), ForeignKey("enterprise_service_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    token_prefix = Column(String(20), default="lc_live_", nullable=False)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    scopes_json = Column(Text, default="[]", nullable=False)
    expires_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
