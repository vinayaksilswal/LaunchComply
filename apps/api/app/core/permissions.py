from typing import Optional, List
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.auth import User, OrganizationMembership, MembershipRole, Organization

security_scheme = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or not found",
        )
    return user

async def get_current_membership(
    current_user: User = Depends(get_current_user),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-Id"),
    db: AsyncSession = Depends(get_db)
) -> OrganizationMembership:
    query = select(OrganizationMembership).where(
        OrganizationMembership.user_id == current_user.id,
        OrganizationMembership.is_active == True
    )
    
    if x_organization_id:
        query = query.where(OrganizationMembership.organization_id == x_organization_id)
        
    result = await db.execute(query)
    membership = result.scalars().first()
    
    if not membership:
        # If no specific org requested, fallback to first user organization membership
        result_fallback = await db.execute(
            select(OrganizationMembership).where(
                OrganizationMembership.user_id == current_user.id,
                OrganizationMembership.is_active == True
            )
        )
        membership = result_fallback.scalars().first()
        
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not an active member of any organization"
        )
    return membership

def require_roles(allowed_roles: List[MembershipRole]):
    async def role_checker(membership: OrganizationMembership = Depends(get_current_membership)):
        if membership.role not in allowed_roles and membership.role != MembershipRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {[r.value for r in allowed_roles]}"
            )
        return membership
    return role_checker


ROLE_PERMISSIONS: dict[str, List[MembershipRole]] = {
    "monitoring.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.SECURITY, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.VIEWER],
    "monitoring.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS],
    "logs.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.SECURITY, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.VIEWER],
    "alerts.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.SECURITY, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.VIEWER],
    "alerts.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS],
    "incident.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.SECURITY, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.VIEWER],
    "incident.create": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.SECURITY],
    "incident.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS, MembershipRole.SECURITY],
    "backup.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.DEVELOPER, MembershipRole.VIEWER],
    "backup.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS],
    "restore.execute": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS],
    "security.signal.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.VIEWER],
    "cost.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.VIEWER],
    "cost.manage": [MembershipRole.OWNER, MembershipRole.ADMIN],
    "compliance.monitor.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.SECURITY, MembershipRole.VIEWER],
    "compliance.exception.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY],
    "auto_rollback.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS],

    # Phase 6 Permissions
    "security.scope.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.DEVELOPER, MembershipRole.VIEWER],
    "security.scope.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS],
    "security.assessment.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.DEVELOPER, MembershipRole.VIEWER],
    "security.assessment.execute": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS],
    "security.finding.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.DEVELOPER, MembershipRole.VIEWER],
    "security.finding.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS],
    "security.retest.execute": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS, MembershipRole.DEVELOPER],
    "security.risk_accept": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY],
    "security.ai_remediate": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS, MembershipRole.DEVELOPER],
    "vapt.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.DEVELOPER, MembershipRole.VIEWER],
    "vapt.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY],
    "vapt.authorize": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY],
    "dr.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.VIEWER],
    "dr.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS],
    "dr.execute": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS],
    "auditor.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY],
    "trust.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY],
    "evidence.request.respond": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY, MembershipRole.DEVOPS],

    # Phase 7 Compliance OS RBAC Permissions
    "compliance.framework.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY, MembershipRole.AUDITOR, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.VIEWER],
    "compliance.control.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY],
    "risk.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY, MembershipRole.AUDITOR, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.VIEWER],
    "risk.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY],
    "risk.accept": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.COMPLIANCE],
    "policy.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY, MembershipRole.AUDITOR, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.VIEWER],
    "policy.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY],
    "policy.approve": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE],
    "vendor.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY, MembershipRole.AUDITOR, MembershipRole.DEVOPS, MembershipRole.VIEWER],
    "vendor.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY],
    "audit.internal.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY, MembershipRole.AUDITOR, MembershipRole.VIEWER],
    "audit.internal.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE],
    "corrective_action.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY, MembershipRole.AUDITOR, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.VIEWER],
    "corrective_action.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY, MembershipRole.DEVOPS],
    "management_review.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY, MembershipRole.AUDITOR, MembershipRole.VIEWER],
    "management_review.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE],
    "privacy.inventory.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY, MembershipRole.AUDITOR, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.VIEWER],
    "privacy.inventory.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY],
    "privacy.request.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY, MembershipRole.AUDITOR, MembershipRole.VIEWER],
    "privacy.request.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE],
    "contracts.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY, MembershipRole.AUDITOR, MembershipRole.VIEWER],
    "contracts.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE],
    "audit_package.generate": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY],
    "training.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE],
    "access_review.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.COMPLIANCE],

    # Phase 8 Commercial SaaS RBAC Permissions
    "billing.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.BILLING, MembershipRole.VIEWER],
    "billing.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.BILLING],
    "usage.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.BILLING, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.VIEWER],
    "team.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVELOPER, MembershipRole.DEVOPS, MembershipRole.SECURITY, MembershipRole.COMPLIANCE, MembershipRole.BILLING, MembershipRole.VIEWER],
    "team.invite": [MembershipRole.OWNER, MembershipRole.ADMIN],
    "team.manage": [MembershipRole.OWNER, MembershipRole.ADMIN],
    "support.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVELOPER, MembershipRole.DEVOPS, MembershipRole.SECURITY, MembershipRole.COMPLIANCE, MembershipRole.BILLING, MembershipRole.VIEWER],
    "support.create": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVELOPER, MembershipRole.DEVOPS, MembershipRole.SECURITY, MembershipRole.COMPLIANCE, MembershipRole.BILLING],
    "support.manage": [MembershipRole.OWNER, MembershipRole.ADMIN],
    "organization.settings.manage": [MembershipRole.OWNER, MembershipRole.ADMIN],

    # Phase 10 Enterprise Identity, Copilot, Threat Modeling, Partner & Enterprise Scale Permissions
    "sso.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.COMPLIANCE, MembershipRole.VIEWER],
    "sso.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY],
    "scim.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.COMPLIANCE],
    "scim.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY],
    "service_account.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS, MembershipRole.SECURITY],
    "service_account.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS, MembershipRole.SECURITY],
    "copilot.use": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.SECURITY, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.BILLING, MembershipRole.VIEWER],
    "copilot.security": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS],
    "copilot.compliance": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR],
    "copilot.cloud": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS],
    "copilot.audit": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.AUDITOR, MembershipRole.COMPLIANCE],
    "threat_model.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.VIEWER],
    "threat_model.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS],
    "partner.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.COMPLIANCE, MembershipRole.VIEWER],
    "partner.manage": [MembershipRole.OWNER, MembershipRole.ADMIN],
    "partner.customer.access": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.CONSULTANT],
    "enterprise.business_unit.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS, MembershipRole.SECURITY, MembershipRole.COMPLIANCE, MembershipRole.VIEWER],
    "enterprise.business_unit.manage": [MembershipRole.OWNER, MembershipRole.ADMIN],
    "webhooks.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS, MembershipRole.SECURITY, MembershipRole.DEVELOPER],
    "webhooks.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.DEVOPS],
    # Phase 11 Continuous Assurance Permissions
    "assurance.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.COMPLIANCE, MembershipRole.DEVOPS, MembershipRole.DEVELOPER, MembershipRole.AUDITOR, MembershipRole.VIEWER],
    "assurance.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.COMPLIANCE],
    "audit_bot.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.COMPLIANCE, MembershipRole.DEVOPS, MembershipRole.AUDITOR, MembershipRole.VIEWER],
    "audit_bot.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS],
    "audit_bot.execute": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.SECURITY, MembershipRole.DEVOPS],
    "evidence.review": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.AUDITOR, MembershipRole.SECURITY],
    "control.evaluate": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.COMPLIANCE, MembershipRole.SECURITY],
    "partner.branding.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.CONSULTANT, MembershipRole.VIEWER],
    "partner.branding.manage": [MembershipRole.OWNER, MembershipRole.ADMIN],
    "partner.custom_domain.manage": [MembershipRole.OWNER, MembershipRole.ADMIN],
    "auditor.workpaper.read": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.AUDITOR, MembershipRole.COMPLIANCE, MembershipRole.SECURITY],
    "auditor.workpaper.manage": [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.AUDITOR, MembershipRole.COMPLIANCE],
}


def require_permission(permission: str):
    """Enforces specific operational RBAC permission based on membership role."""
    allowed_roles = ROLE_PERMISSIONS.get(permission, [MembershipRole.OWNER, MembershipRole.ADMIN])
    return require_roles(allowed_roles)


async def require_platform_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Enforces platform administrator authorization strictly isolated from tenant roles."""
    if not current_user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform administrator privileges required"
        )
    return current_user


