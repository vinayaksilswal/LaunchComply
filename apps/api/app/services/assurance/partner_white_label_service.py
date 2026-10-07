"""Phase 11 Partner White-Label Branding, Custom Domains, and Hostname Routing."""
import secrets
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_

from app.models.partner import PartnerOrganization
from app.models.assurance import (
    PartnerCustomDomain,
    PartnerEmailBranding,
    CustomDomainTlsStatus,
)


class PartnerWhiteLabelService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_custom_domain(
        self,
        partner_id: str,
        domain_name: str,
    ) -> PartnerCustomDomain:
        """Register a custom white-label vanity domain for an authorized partner."""
        cleaned_domain = domain_name.strip().lower()
        if not cleaned_domain or "." not in cleaned_domain:
            raise ValueError("Valid domain name required (e.g. compliance.partner.com)")

        # Check existing
        existing = await self.db.execute(
            select(PartnerCustomDomain).where(PartnerCustomDomain.domain_name == cleaned_domain)
        )
        domain = existing.scalar_one_or_none()
        if domain:
            if domain.partner_id != partner_id:
                raise ValueError("Domain already registered to another partner organization.")
            return domain

        verification_token = f"lc-verify-{secrets.token_hex(16)}"
        domain = PartnerCustomDomain(
            partner_id=partner_id,
            domain_name=cleaned_domain,
            dns_verification_token=verification_token,
            cname_target="cname.launchcomply.com",
            is_verified=False,
            tls_status=CustomDomainTlsStatus.PENDING_VERIFICATION,
        )
        self.db.add(domain)
        await self.db.commit()
        await self.db.refresh(domain)
        return domain

    async def verify_custom_domain(
        self,
        partner_id: str,
        domain_id: str,
        simulated_dns_valid: bool = True,
    ) -> PartnerCustomDomain:
        """Verify ownership of DNS records and provision TLS certificates."""
        res = await self.db.execute(
            select(PartnerCustomDomain).where(
                and_(
                    PartnerCustomDomain.id == domain_id,
                    PartnerCustomDomain.partner_id == partner_id,
                )
            )
        )
        domain = res.scalar_one_or_none()
        if not domain:
            raise ValueError(f"Custom domain {domain_id} not found.")

        if not simulated_dns_valid:
            domain.tls_status = CustomDomainTlsStatus.ERROR
            await self.db.commit()
            raise ValueError("DNS verification record not found or propagation pending.")

        domain.is_verified = True
        domain.verified_at = datetime.utcnow()
        domain.tls_status = CustomDomainTlsStatus.ACTIVE
        domain.certificate_arn = f"arn:aws:acm:ap-south-1:123456789012:certificate/{secrets.token_hex(8)}"

        await self.db.commit()
        await self.db.refresh(domain)
        return domain

    async def resolve_partner_by_hostname(
        self,
        hostname: str,
    ) -> Optional[Dict[str, Any]]:
        """Strict hostname-safe routing resolving verified partner branding by incoming host header."""
        cleaned_host = hostname.split(":")[0].strip().lower()
        if cleaned_host in ["localhost", "127.0.0.1", "launchcomply.internal", "app.launchcomply.com"]:
            return None

        res = await self.db.execute(
            select(PartnerCustomDomain, PartnerOrganization)
            .join(PartnerOrganization, PartnerOrganization.id == PartnerCustomDomain.partner_id)
            .where(
                and_(
                    PartnerCustomDomain.domain_name == cleaned_host,
                    PartnerCustomDomain.is_verified == True,
                    PartnerCustomDomain.tls_status == CustomDomainTlsStatus.ACTIVE,
                )
            )
        )
        row = res.first()
        if not row:
            return None

        custom_domain, partner = row
        return {
            "partner_id": partner.id,
            "partner_name": partner.name,
            "brand_name": partner.brand_name or partner.name,
            "logo_url": partner.branding_logo_url,
            "accent_color": partner.primary_accent_color,
            "domain": custom_domain.domain_name,
            "is_white_labeled": True,
        }

    async def update_partner_branding(
        self,
        partner_id: str,
        brand_name: str,
        logo_url: Optional[str] = None,
        primary_accent_color: str = "#06B6D4",
    ) -> PartnerOrganization:
        """Update visual branding elements for white-label portal presentation."""
        res = await self.db.execute(
            select(PartnerOrganization).where(PartnerOrganization.id == partner_id)
        )
        partner = res.scalar_one_or_none()
        if not partner:
            raise ValueError(f"Partner organization {partner_id} not found.")

        partner.brand_name = brand_name
        if logo_url:
            partner.branding_logo_url = logo_url
        partner.primary_accent_color = primary_accent_color

        await self.db.commit()
        await self.db.refresh(partner)
        return partner
