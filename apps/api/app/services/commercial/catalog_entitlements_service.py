"""Phase 8 Commercial Product Catalog and Entitlements Engine."""
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.commercial import (
    Product,
    Plan,
    Price,
    PlanEntitlement,
    OrganizationEntitlement,
    PlanTier,
    BillingInterval,
    ValueType,
    EntitlementSource,
    UsageMetricDefinition,
)
from app.models.auth import Organization


DEFAULT_PLANS_SPEC = [
    {
        "tier": PlanTier.STARTER,
        "name": "Starter",
        "tagline": "For early-stage startups and small projects launching their first production app.",
        "description": "Essential infrastructure deployment, basic monitoring, and foundational security.",
        "trial_days": 14,
        "display_order": 1,
        "prices": [
            {"currency": "INR", "interval": BillingInterval.MONTHLY, "amount": 4999.00},
            {"currency": "INR", "interval": BillingInterval.ANNUAL, "amount": 49990.00},
            {"currency": "USD", "interval": BillingInterval.MONTHLY, "amount": 59.00},
            {"currency": "USD", "interval": BillingInterval.ANNUAL, "amount": 590.00},
        ],
        "entitlements": {
            "applications.max": 1,
            "environments.max": 1,
            "members.max": 3,
            "security_scans.monthly": 10,
            "vapt_projects.max": 0,
            "audit_portal.enabled": False,
            "trust_center.enabled": False,
            "dr.enabled": False,
            "iso27001.enabled": False,
            "soc2.enabled": False,
            "dpdp.enabled": False,
            "custom_domains.max": 1,
            "evidence_retention.days": 30,
            "support.level": "COMMUNITY_AND_EMAIL",
        }
    },
    {
        "tier": PlanTier.GROWTH,
        "name": "Growth",
        "tagline": "For scaling SaaS businesses requiring multi-environment delivery and continuous security.",
        "description": "Staging + production, automated canary deployments, DR restore drills, and ISO/SOC readiness.",
        "trial_days": 14,
        "display_order": 2,
        "prices": [
            {"currency": "INR", "interval": BillingInterval.MONTHLY, "amount": 19999.00},
            {"currency": "INR", "interval": BillingInterval.ANNUAL, "amount": 199990.00},
            {"currency": "USD", "interval": BillingInterval.MONTHLY, "amount": 249.00},
            {"currency": "USD", "interval": BillingInterval.ANNUAL, "amount": 2490.00},
        ],
        "entitlements": {
            "applications.max": 5,
            "environments.max": 3,
            "members.max": 15,
            "security_scans.monthly": 100,
            "vapt_projects.max": 1,
            "audit_portal.enabled": False,
            "trust_center.enabled": True,
            "dr.enabled": True,
            "iso27001.enabled": True,
            "soc2.enabled": True,
            "dpdp.enabled": True,
            "custom_domains.max": 5,
            "evidence_retention.days": 90,
            "support.level": "STANDARD_SLA",
        }
    },
    {
        "tier": PlanTier.BUSINESS,
        "name": "Business",
        "tagline": "For mature SaaS teams selling to enterprise customers with compliance and auditor access.",
        "description": "Full compliance workspace, auditor portal, vendor management, and priority support.",
        "trial_days": 14,
        "display_order": 3,
        "prices": [
            {"currency": "INR", "interval": BillingInterval.MONTHLY, "amount": 49999.00},
            {"currency": "INR", "interval": BillingInterval.ANNUAL, "amount": 499990.00},
            {"currency": "USD", "interval": BillingInterval.MONTHLY, "amount": 649.00},
            {"currency": "USD", "interval": BillingInterval.ANNUAL, "amount": 6490.00},
        ],
        "entitlements": {
            "applications.max": 20,
            "environments.max": 10,
            "members.max": 50,
            "security_scans.monthly": 500,
            "vapt_projects.max": 4,
            "audit_portal.enabled": True,
            "trust_center.enabled": True,
            "dr.enabled": True,
            "iso27001.enabled": True,
            "soc2.enabled": True,
            "dpdp.enabled": True,
            "custom_domains.max": 20,
            "evidence_retention.days": 365,
            "support.level": "PRIORITY_SLA",
        }
    },
    {
        "tier": PlanTier.ENTERPRISE,
        "name": "Enterprise",
        "tagline": "For organizations requiring custom limits, dedicated advisory, and bespoke contracts.",
        "description": "Unlimited applications, dedicated lead implementer, 24x7 critical SLA, and invoice-only billing.",
        "trial_days": 30,
        "display_order": 4,
        "prices": [
            {"currency": "INR", "interval": BillingInterval.ANNUAL, "amount": 1200000.00},
            {"currency": "USD", "interval": BillingInterval.ANNUAL, "amount": 15000.00},
        ],
        "entitlements": {
            "applications.max": 100,
            "environments.max": 50,
            "members.max": 500,
            "security_scans.monthly": 10000,
            "vapt_projects.max": 20,
            "audit_portal.enabled": True,
            "trust_center.enabled": True,
            "dr.enabled": True,
            "iso27001.enabled": True,
            "soc2.enabled": True,
            "dpdp.enabled": True,
            "custom_domains.max": 100,
            "evidence_retention.days": 1825,  # 5 years
            "support.level": "DEDICATED_24X7_SLA",
        }
    }
]


class CatalogEntitlementsService:
    """Manages the commercial catalog and enforces backend feature entitlements."""

    async def ensure_catalog(self, db: AsyncSession) -> None:
        """Seeds default commercial product catalog and plans if missing."""
        product_res = await db.execute(select(Product).where(Product.product_code == "LC_PLATFORM"))
        product = product_res.scalars().first()
        if not product:
            product = Product(
                product_code="LC_PLATFORM",
                name="LaunchComply Platform",
                description="Production cloud engineering, security assurance, and compliance operating system.",
                is_active=True
            )
            db.add(product)
            await db.flush()

        # Seed plans and entitlements
        for spec in DEFAULT_PLANS_SPEC:
            plan_res = await db.execute(select(Plan).where(Plan.tier == spec["tier"]))
            plan = plan_res.scalars().first()
            if not plan:
                plan = Plan(
                    product_id=product.id,
                    tier=spec["tier"],
                    name=spec["name"],
                    tagline=spec["tagline"],
                    description=spec["description"],
                    trial_days=spec["trial_days"],
                    display_order=spec["display_order"],
                    is_active=True
                )
                db.add(plan)
                await db.flush()

                # Add prices
                for pr in spec["prices"]:
                    price = Price(
                        plan_id=plan.id,
                        currency=pr["currency"],
                        interval=pr["interval"],
                        amount=pr["amount"],
                        is_active=True
                    )
                    db.add(price)

                # Add entitlements
                for feat, val in spec["entitlements"].items():
                    if isinstance(val, bool):
                        vtype = ValueType.BOOLEAN
                        b_val, n_val, s_val = val, None, None
                    elif isinstance(val, (int, float)):
                        vtype = ValueType.NUMERIC
                        b_val, n_val, s_val = None, float(val), None
                    else:
                        vtype = ValueType.STRING
                        b_val, n_val, s_val = None, None, str(val)

                    pe = PlanEntitlement(
                        plan_id=plan.id,
                        feature_key=feat,
                        value_type=vtype,
                        boolean_value=b_val,
                        numeric_value=n_val,
                        string_value=s_val
                    )
                    db.add(pe)

        await db.commit()

    async def list_plans(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """Returns public plan catalog with pricing and limits for UI consumption."""
        await self.ensure_catalog(db)
        res = await db.execute(select(Plan).order_by(Plan.display_order.asc()))
        plans = res.scalars().all()

        output = []
        for p in plans:
            pr_res = await db.execute(select(Price).where(Price.plan_id == p.id, Price.is_active == True))
            prices = pr_res.scalars().all()

            ent_res = await db.execute(select(PlanEntitlement).where(PlanEntitlement.plan_id == p.id))
            entitlements = ent_res.scalars().all()

            ent_map = {}
            for e in entitlements:
                if e.value_type == ValueType.BOOLEAN:
                    ent_map[e.feature_key] = e.boolean_value
                elif e.value_type == ValueType.NUMERIC:
                    ent_map[e.feature_key] = int(e.numeric_value) if e.numeric_value.is_integer() else e.numeric_value
                else:
                    ent_map[e.feature_key] = e.string_value

            output.append({
                "id": p.id,
                "tier": p.tier.value,
                "name": p.name,
                "tagline": p.tagline,
                "description": p.description,
                "trial_days": p.trial_days,
                "prices": [
                    {
                        "currency": pr.currency,
                        "interval": pr.interval.value,
                        "amount": pr.amount
                    }
                    for pr in prices
                ],
                "entitlements": ent_map
            })
        return output

    async def check_entitlement(
        self,
        db: AsyncSession,
        organization_id: str,
        feature_key: str,
        current_count: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Enforces backend entitlement for an organization.
        Checks custom organization overrides first, then falls back to current active plan.
        """
        now = datetime.utcnow()
        # 1. Check custom organization entitlement override
        ov_res = await db.execute(
            select(OrganizationEntitlement).where(
                OrganizationEntitlement.organization_id == organization_id,
                OrganizationEntitlement.feature_key == feature_key,
                OrganizationEntitlement.effective_from <= now,
            )
        )
        overrides = ov_res.scalars().all()
        active_override = next((o for o in overrides if o.effective_to is None or o.effective_to >= now), None)

        if active_override:
            return self._evaluate_entitlement(active_override, current_count, source="ORGANIZATION_OVERRIDE")

        # 2. Get organization's subscription tier
        from app.models.billing import Subscription, SubscriptionStatus
        sub_res = await db.execute(
            select(Subscription).where(
                Subscription.organization_id == organization_id,
                Subscription.status.in_([
                    SubscriptionStatus.ACTIVE,
                    SubscriptionStatus.TRIALING,
                    SubscriptionStatus.GRACE_PERIOD,
                    SubscriptionStatus.CANCEL_AT_PERIOD_END,
                    SubscriptionStatus.INVOICE_ONLY
                ])
            )
        )
        subscription = sub_res.scalars().first()
        tier_str = subscription.plan_tier if subscription else "GROWTH"

        # 3. Lookup plan entitlement
        plan_res = await db.execute(select(Plan).where(Plan.tier == tier_str))
        plan = plan_res.scalars().first()
        if not plan:
            # Fallback to GROWTH
            plan_res = await db.execute(select(Plan).where(Plan.tier == PlanTier.GROWTH))
            plan = plan_res.scalars().first()

        if plan:
            ent_res = await db.execute(
                select(PlanEntitlement).where(
                    PlanEntitlement.plan_id == plan.id,
                    PlanEntitlement.feature_key == feature_key
                )
            )
            pe = ent_res.scalars().first()
            if pe:
                return self._evaluate_entitlement(pe, current_count, source=f"PLAN_{plan.tier.value}")

        # Default permit if undefined
        return {
            "allowed": True,
            "feature_key": feature_key,
            "value": None,
            "source": "DEFAULT_PERMIT",
            "reason": "Feature has no explicit limit configured."
        }

    def _evaluate_entitlement(self, item: Any, current_count: Optional[float], source: str) -> Dict[str, Any]:
        """Helper to derive allowed status for boolean or numeric limits."""
        if item.value_type == ValueType.BOOLEAN:
            allowed = bool(item.boolean_value)
            return {
                "allowed": allowed,
                "feature_key": item.feature_key,
                "value": allowed,
                "source": source,
                "reason": "Feature enabled by entitlement." if allowed else f"Feature requires an upgraded plan ({source})."
            }
        elif item.value_type == ValueType.NUMERIC:
            limit = item.numeric_value
            if current_count is not None:
                allowed = current_count < limit
                return {
                    "allowed": allowed,
                    "feature_key": item.feature_key,
                    "limit": limit,
                    "current": current_count,
                    "source": source,
                    "reason": f"Usage within limit ({current_count}/{limit})." if allowed else f"Limit reached for {item.feature_key} ({limit}). Please upgrade plan."
                }
            return {
                "allowed": True,
                "feature_key": item.feature_key,
                "limit": limit,
                "source": source,
                "reason": f"Configured limit: {limit}"
            }
        else:
            return {
                "allowed": True,
                "feature_key": item.feature_key,
                "value": item.string_value,
                "source": source,
                "reason": f"Configured value: {item.string_value}"
            }


catalog_entitlements_service = CatalogEntitlementsService()
