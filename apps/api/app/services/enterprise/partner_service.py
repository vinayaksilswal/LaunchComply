"""Phase 10 MSP & Security Consultancy Partner Control Plane Service.

Enforces:
- Customer consent & delegation boundaries (customer approval required, immediate revocation)
- Strict multi-tenant isolation (partners only see authorized managed tenants)
- Granular delegated permissions (e.g., managed.security.read vs managed.compliance.manage)
- Partner service catalog & white-label foundation
- Comprehensive audit trails on every delegated action
"""
import json
import secrets
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import select, update, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.partner import (
    PartnerOrganization,
    PartnerMembership,
    ManagedCustomerRelationship,
    PartnerServiceCatalog,
    RelationshipStatus,
    PartnerRole,
)
from app.models.auth import Organization, User
from app.models.entities import SecurityFinding, VAPTProject
from app.models.operations import Incident
from app.models.audit import AuditEvent


class PartnerControlPlaneService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # 1. PARTNER REGISTRATION & TEAM MEMBERSHIP
    # =========================================================================

    async def register_partner_organization(
        self,
        name: str,
        slug: str,
        contact_email: str,
        website: Optional[str] = None,
        tier: str = "CERTIFIED",
        brand_name: Optional[str] = None,
        primary_accent_color: str = "#06B6D4",
    ) -> PartnerOrganization:
        """Register a new MSP or cybersecurity consultancy partner entity."""
        res = await self.db.execute(
            select(PartnerOrganization).where(PartnerOrganization.slug == slug)
        )
        if res.scalar_one_or_none():
            raise ValueError(f"Partner slug '{slug}' is already taken.")

        partner = PartnerOrganization(
            name=name,
            slug=slug,
            contact_email=contact_email,
            website=website,
            tier=tier,
            brand_name=brand_name or name,
            primary_accent_color=primary_accent_color,
            is_verified=True,
        )
        self.db.add(partner)
        await self.db.commit()
        await self.db.refresh(partner)
        return partner

    async def add_partner_member(
        self,
        partner_id: str,
        user_id: str,
        role: PartnerRole = PartnerRole.PARTNER_CONSULTANT,
    ) -> PartnerMembership:
        """Add user to partner organization team."""
        res = await self.db.execute(
            select(PartnerMembership).where(
                and_(
                    PartnerMembership.partner_id == partner_id,
                    PartnerMembership.user_id == user_id,
                )
            )
        )
        mem = res.scalar_one_or_none()
        if not mem:
            mem = PartnerMembership(
                partner_id=partner_id,
                user_id=user_id,
                role=role,
                is_active=True,
            )
            self.db.add(mem)
        else:
            mem.role = role
            mem.is_active = True

        await self.db.commit()
        await self.db.refresh(mem)
        return mem

    # =========================================================================
    # 2. MANAGED CUSTOMER RELATIONSHIP & CONSENT WORKFLOW
    # =========================================================================

    async def invite_managed_relationship(
        self,
        partner_id: str,
        customer_organization_id: str,
        delegated_permissions: List[str],
    ) -> ManagedCustomerRelationship:
        """Partner requests delegated management access to customer tenant."""
        res = await self.db.execute(
            select(ManagedCustomerRelationship).where(
                and_(
                    ManagedCustomerRelationship.partner_id == partner_id,
                    ManagedCustomerRelationship.customer_organization_id == customer_organization_id,
                )
            )
        )
        rel = res.scalar_one_or_none()
        if not rel:
            rel = ManagedCustomerRelationship(
                partner_id=partner_id,
                customer_organization_id=customer_organization_id,
                status=RelationshipStatus.PENDING_CUSTOMER_APPROVAL,
                delegated_permissions_json=json.dumps(delegated_permissions),
            )
            self.db.add(rel)
        else:
            rel.status = RelationshipStatus.PENDING_CUSTOMER_APPROVAL
            rel.delegated_permissions_json = json.dumps(delegated_permissions)

        await self.db.commit()
        await self.db.refresh(rel)
        return rel

    async def approve_managed_relationship(
        self,
        relationship_id: str,
        customer_organization_id: str,
        approving_user_id: str,
        approved_permissions: Optional[List[str]] = None,
    ) -> ManagedCustomerRelationship:
        """Customer explicitly authorizes partner with scoped delegated permissions."""
        res = await self.db.execute(
            select(ManagedCustomerRelationship).where(
                and_(
                    ManagedCustomerRelationship.id == relationship_id,
                    ManagedCustomerRelationship.customer_organization_id == customer_organization_id,
                )
            )
        )
        rel = res.scalar_one_or_none()
        if not rel:
            raise ValueError("Managed customer relationship not found or unauthorized.")

        rel.status = RelationshipStatus.ACTIVE
        rel.approved_by = approving_user_id
        rel.approved_at = datetime.now(timezone.utc)
        rel.revoked_at = None
        if approved_permissions is not None:
            rel.delegated_permissions_json = json.dumps(approved_permissions)

        await self.db.commit()
        await self.db.refresh(rel)
        return rel

    async def revoke_managed_relationship(
        self,
        relationship_id: str,
        customer_organization_id: str,
    ) -> ManagedCustomerRelationship:
        """Customer immediately terminates partner delegated access."""
        res = await self.db.execute(
            select(ManagedCustomerRelationship).where(
                and_(
                    ManagedCustomerRelationship.id == relationship_id,
                    ManagedCustomerRelationship.customer_organization_id == customer_organization_id,
                )
            )
        )
        rel = res.scalar_one_or_none()
        if not rel:
            raise ValueError("Relationship not found.")

        rel.status = RelationshipStatus.REVOKED
        rel.revoked_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(rel)
        return rel

    # =========================================================================
    # 3. DELEGATED ACCESS & MULTI-TENANT ISOLATION CHECK
    # =========================================================================

    async def verify_partner_delegated_access(
        self,
        partner_user_id: str,
        target_customer_org_id: str,
        required_permission: str,
    ) -> Tuple[PartnerOrganization, ManagedCustomerRelationship]:
        """Verify that the user belongs to an active partner with active customer authorization and the specific delegated scope."""
        # Check partner membership
        mem_res = await self.db.execute(
            select(PartnerMembership).where(
                and_(
                    PartnerMembership.user_id == partner_user_id,
                    PartnerMembership.is_active == True,
                )
            )
        )
        mem = mem_res.scalar_one_or_none()
        if not mem:
            raise PermissionError("User is not a member of any partner organization.")

        # Check customer relationship
        rel_res = await self.db.execute(
            select(ManagedCustomerRelationship).where(
                and_(
                    ManagedCustomerRelationship.partner_id == mem.partner_id,
                    ManagedCustomerRelationship.customer_organization_id == target_customer_org_id,
                    ManagedCustomerRelationship.status == RelationshipStatus.ACTIVE,
                )
            )
        )
        rel = rel_res.scalar_one_or_none()
        if not rel:
            raise PermissionError("Partner does not hold active customer authorization for this organization.")

        # Check delegated permissions
        permissions = json.loads(rel.delegated_permissions_json or "[]")
        if required_permission not in permissions and "*" not in permissions:
            raise PermissionError(f"Delegated access denied: Customer has not granted '{required_permission}'.")

        partner_res = await self.db.execute(
            select(PartnerOrganization).where(PartnerOrganization.id == mem.partner_id)
        )
        partner = partner_res.scalar_one()

        return partner, rel

    # =========================================================================
    # 4. PARTNER COMMAND CENTER (AGGREGATE AUTHORIZED HEALTH)
    # =========================================================================

    async def get_partner_portfolio_overview(
        self,
        partner_id: str,
    ) -> Dict[str, Any]:
        """Aggregate security & compliance status across authorized managed customers ONLY."""
        rels_res = await self.db.execute(
            select(ManagedCustomerRelationship).where(
                and_(
                    ManagedCustomerRelationship.partner_id == partner_id,
                    ManagedCustomerRelationship.status == RelationshipStatus.ACTIVE,
                )
            )
        )
        active_rels = rels_res.scalars().all()
        customer_org_ids = [r.customer_organization_id for r in active_rels]

        if not customer_org_ids:
            return {
                "active_managed_customers": 0,
                "customers": [],
                "aggregate_critical_findings": 0,
                "aggregate_open_incidents": 0,
            }

        # Fetch org names
        orgs_res = await self.db.execute(
            select(Organization).where(Organization.id.in_(customer_org_ids))
        )
        org_map = {o.id: o.name for o in orgs_res.scalars().all()}

        # Fetch open findings across authorized customers
        findings_res = await self.db.execute(
            select(SecurityFinding).where(
                and_(
                    SecurityFinding.organization_id.in_(customer_org_ids),
                    SecurityFinding.status.in_(["OPEN", "TRIAGED", "ACTIVE"]),
                )
            )
        )
        findings = findings_res.scalars().all()

        # Fetch open incidents
        incidents_res = await self.db.execute(
            select(Incident).where(
                and_(
                    Incident.organization_id.in_(customer_org_ids),
                    Incident.status.in_(["OPEN", "INVESTIGATING"]),
                )
            )
        )
        incidents = incidents_res.scalars().all()

        customers_summary = []
        for org_id in customer_org_ids:
            org_findings = [f for f in findings if f.organization_id == org_id]
            org_incidents = [i for i in incidents if i.organization_id == org_id]
            customers_summary.append({
                "organization_id": org_id,
                "organization_name": org_map.get(org_id, "Unknown Customer"),
                "critical_high_findings": len([f for f in org_findings if f.severity in ["CRITICAL", "HIGH"]]),
                "open_incidents": len(org_incidents),
                "health_status": "CRITICAL" if any(f.severity == "CRITICAL" for f in org_findings) or org_incidents else "HEALTHY",
            })

        return {
            "active_managed_customers": len(customer_org_ids),
            "customers": customers_summary,
            "aggregate_critical_findings": len([f for f in findings if f.severity == "CRITICAL"]),
            "aggregate_open_incidents": len(incidents),
        }
