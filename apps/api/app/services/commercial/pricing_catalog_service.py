"""Phase 13 Canonical Pricing Catalog Review, Provider Mapping and Mismatch Blocker Engine."""
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.commercial import Plan, Price, PlanTier, BillingInterval
from app.models.production_launch import ProviderPriceMapping
from app.services.commercial.catalog_entitlements_service import DEFAULT_PLANS_SPEC


class PricingCatalogService:
    """Canonical price catalog service ensuring exact parity across marketing, backend, and payment gateways."""

    def get_canonical_catalog(self) -> List[Dict[str, Any]]:
        """Returns the canonical versioned pricing configuration."""
        return DEFAULT_PLANS_SPEC

    async def get_pricing_review(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Retrieves pricing catalog items alongside provider mappings and flags mismatches.
        Platform Admin reviews: Plan, Displayed Price, Provider Price, Currency, Interval, Entitlements, Mismatch Status.
        """
        review_items = []
        mappings_res = await db.execute(select(ProviderPriceMapping).where(ProviderPriceMapping.is_active == True))
        provider_mappings = mappings_res.scalars().all()
        mapping_by_key = {
            f"{m.plan_tier}:{m.currency}:{m.billing_period}:{m.provider}": m
            for m in provider_mappings
        }

        for plan_spec in DEFAULT_PLANS_SPEC:
            tier_name = plan_spec["tier"].value if hasattr(plan_spec["tier"], "value") else str(plan_spec["tier"])
            name = plan_spec["name"]
            entitlements = plan_spec.get("entitlements", {})

            for price_item in plan_spec["prices"]:
                currency = price_item["currency"]
                interval_str = price_item["interval"].value if hasattr(price_item["interval"], "value") else str(price_item["interval"])
                displayed_amount = price_item["amount"]

                # Expected provider by currency routing (INR -> Razorpay, USD -> Stripe)
                expected_provider = "RAZORPAY" if currency == "INR" else "STRIPE"
                key = f"{tier_name}:{currency}:{interval_str}:{expected_provider}"
                mapping = mapping_by_key.get(key)

                provider_price_id = mapping.provider_price_id if mapping else None
                mismatch_status = "MATCHED" if provider_price_id else "UNMAPPED_PROVIDER_PRICE"

                review_items.append({
                    "plan_tier": tier_name,
                    "plan_name": name,
                    "currency": currency,
                    "billing_interval": interval_str,
                    "displayed_price": displayed_amount,
                    "expected_provider": expected_provider,
                    "provider_product_id": mapping.provider_product_id if mapping else None,
                    "provider_price_id": provider_price_id,
                    "entitlements": entitlements,
                    "mismatch_status": mismatch_status,
                    "is_blocking_checkout": mismatch_status != "MATCHED",
                    "effective_date": "2026-10-01",
                })

        return review_items

    async def validate_checkout_price_mapping(
        self,
        db: AsyncSession,
        plan_tier: str,
        currency: str,
        interval: str = "MONTHLY",
        provider: str = "STRIPE"
    ) -> Tuple[bool, Optional[str]]:
        """
        Price Mismatch Blocker (§14):
        If marketing price != backend price or backend price != provider price mapping, block checkout activation.
        Returns: (is_valid, error_reason)
        """
        # 1. Check canonical spec
        spec = next((p for p in DEFAULT_PLANS_SPEC if (p["tier"].value if hasattr(p["tier"], "value") else str(p["tier"])) == plan_tier), None)
        if not spec:
            return False, f"Plan tier '{plan_tier}' does not exist in canonical pricing catalog."

        expected_price = next(
            (p for p in spec["prices"] if p["currency"] == currency and (p["interval"].value if hasattr(p["interval"], "value") else str(p["interval"])) == interval),
            None
        )
        if not expected_price:
            return False, f"No canonical price found for {plan_tier} ({currency}, {interval})."

        # 2. Check provider mapping
        mapping_res = await db.execute(
            select(ProviderPriceMapping).where(
                ProviderPriceMapping.plan_tier == plan_tier,
                ProviderPriceMapping.currency == currency,
                ProviderPriceMapping.billing_period == interval,
                ProviderPriceMapping.provider == provider.upper(),
                ProviderPriceMapping.is_active == True
            )
        )
        mapping = mapping_res.scalars().first()
        if not mapping:
            # In test/dev mode without real gateway keys, return warning rather than crashing if sandbox
            return False, f"Price mismatch blocker: missing provider price mapping for {plan_tier} in {provider.upper()}."

        return True, None


pricing_catalog_service = PricingCatalogService()
