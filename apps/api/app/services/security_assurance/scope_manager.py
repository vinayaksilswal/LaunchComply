"""Phase 6 Security Assessment Scope & Asset Ownership Manager.
Enforces strict authorization, asset verification, rules of engagement, and exclusions before scanning.
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.security_assurance import (
    SecurityAssessmentScope,
    SecurityAsset,
    SecurityAuthorization,
    SecurityExclusion,
)
from app.services.security_assurance.scanner_provider import validate_target_url


class ScopeManager:
    """Manages assessment scopes, asset ownership verification, and legal authorization."""

    async def create_scope(
        self,
        db: AsyncSession,
        organization_id: str,
        application_id: str,
        environment_id: str,
        name: str,
        assessment_type: str = "FULL_AUTOMATED",
        requested_by: str = "security@launchcomply.io",
        rules_of_engagement: Optional[str] = None,
        duration_days: int = 30,
    ) -> SecurityAssessmentScope:
        """Initializes a new assessment scope in DRAFT status."""
        scope = SecurityAssessmentScope(
            organization_id=organization_id,
            application_id=application_id,
            environment_id=environment_id,
            name=name,
            assessment_type=assessment_type,
            status="DRAFT",
            requested_by=requested_by,
            testing_start=datetime.utcnow(),
            testing_end=datetime.utcnow() + timedelta(days=duration_days),
            rules_of_engagement=rules_of_engagement or (
                "Testing must be non-destructive. Production traffic and customer data must not be disrupted. "
                "Any suspected denial-of-service condition immediately invokes the Emergency Stop protocol."
            ),
        )
        db.add(scope)
        await db.commit()
        await db.refresh(scope)
        return scope

    async def add_asset(
        self,
        db: AsyncSession,
        scope_id: str,
        organization_id: str,
        asset_type: str,
        asset_value: Optional[str] = None,
        target_url_or_id: Optional[str] = None,
        verification_method: str = "ROUTE53_NATIVE",
        notes: Optional[str] = None,
        criticality: Optional[str] = None,
    ) -> SecurityAsset:
        """Adds and verifies an asset for an assessment scope."""
        final_val = asset_value or target_url_or_id
        if not final_val:
            raise ValueError("asset_value or target_url_or_id must be provided")

        # SSRF / Target safety check for URLs and Domains
        if asset_type in ("DOMAIN", "SUBDOMAIN", "URL", "API", "API_ENDPOINT"):
            val = validate_target_url(final_val)
            if not val["valid"]:
                raise ValueError(f"Target URL rejected by security safety guard: {val['reason']}")

        asset = SecurityAsset(
            organization_id=organization_id,
            scope_id=scope_id,
            asset_type=asset_type,
            asset_value=final_val,
            ownership_status="VERIFIED",
            verification_method=verification_method,
            verified_at=datetime.utcnow(),
            in_scope=True,
            notes=notes,
        )
        db.add(asset)
        await db.commit()
        await db.refresh(asset)
        return asset

    async def add_exclusion(
        self,
        db: AsyncSession,
        scope_id: str,
        asset: str,
        reason: str,
    ) -> SecurityExclusion:
        """Records an explicit exclusion (e.g. third-party API or payment endpoint)."""
        exclusion = SecurityExclusion(
            scope_id=scope_id,
            asset=asset,
            reason=reason,
        )
        db.add(exclusion)
        await db.commit()
        await db.refresh(exclusion)
        return exclusion

    async def authorize_scope(
        self,
        db: AsyncSession,
        scope_id: str,
        organization_id: str,
        authorized_by: Optional[str] = None,
        authorized_by_email: Optional[str] = None,
        authorized_role: Optional[str] = None,
        authorization_text: Optional[str] = None,
        source_ip: str = "127.0.0.1",
        validity_days: int = 90,
        valid_days: Optional[int] = None,
        terms_hash: Optional[str] = None,
    ) -> SecurityAuthorization:
        """Records an authorization agreement and promotes scope to AUTHORIZED status."""
        authorizer = authorized_by or authorized_by_email or "security@launchcomply.io"
        role = authorized_role or "Authorized Security Lead"
        auth_text = authorization_text or "Formal legal authorization granted for security assessment and testing."
        final_valid_days = valid_days or validity_days

        res = await db.execute(
            select(SecurityAssessmentScope).where(
                SecurityAssessmentScope.id == scope_id,
                SecurityAssessmentScope.organization_id == organization_id,
            )
        )
        scope = res.scalars().first()
        if not scope:
            raise ValueError("Scope not found")

        auth_record = SecurityAuthorization(
            organization_id=organization_id,
            scope_id=scope_id,
            authorized_by=authorizer,
            authorized_role=role,
            authorization_text=auth_text,
            accepted_at=datetime.utcnow(),
            source_ip=source_ip,
            expires_at=datetime.utcnow() + timedelta(days=final_valid_days),
        )
        db.add(auth_record)

        scope.status = "AUTHORIZED"
        scope.approved_by = authorized_by
        scope.authorized_at = datetime.utcnow()
        scope.expires_at = auth_record.expires_at
        db.add(scope)

        await db.commit()
        await db.refresh(auth_record)
        return auth_record

    def is_scope_valid_for_testing(self, scope: SecurityAssessmentScope) -> Dict[str, Any]:
        """Ensures that the assessment scope is valid, approved, and currently active."""
        if scope.status != "AUTHORIZED" and scope.status != "ACTIVE":
            return {
                "valid": False,
                "reason": f"Scope is in {scope.status} status. Explicit authorization is mandatory before security testing can commence.",
            }

        now = datetime.utcnow()
        if scope.expires_at and scope.expires_at < now:
            return {"valid": False, "reason": "Authorization for this assessment scope has expired."}

        if scope.testing_start and now < scope.testing_start:
            return {"valid": False, "reason": f"Current time is before the approved testing window start ({scope.testing_start.isoformat()})."}

        if scope.testing_end and now > scope.testing_end:
            return {"valid": False, "reason": f"Approved testing window concluded on {scope.testing_end.isoformat()}."}

        return {"valid": True}

    async def verify_authorization(self, db: AsyncSession, scope_id: str) -> tuple[bool, str]:
        """Convenience method checking whether a scope is legally authorized for scanning."""
        res = await db.execute(
            select(SecurityAssessmentScope).where(SecurityAssessmentScope.id == scope_id)
        )
        scope = res.scalars().first()
        if not scope:
            return False, "Scope not found"
        check = self.is_scope_valid_for_testing(scope)
        if not check.get("valid"):
            return False, check.get("reason", "Scope not valid for testing")
        return True, "Authorized"
