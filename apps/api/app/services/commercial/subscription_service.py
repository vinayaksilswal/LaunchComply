"""Phase 8 Commercial Subscription Lifecycle and Webhook Processing Service."""
import json
import hashlib
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.billing import (
    Subscription,
    SubscriptionStatus,
    BillingCustomer,
    BillingProviderType,
    Invoice,
    InvoiceStatus,
)
from app.models.auth import Organization
from app.models.application import Application
from app.models.commercial import Plan, PlanTier, PlanEntitlement
from app.services.commercial.billing_provider import stripe_provider, razorpay_provider
from app.services.commercial.catalog_entitlements_service import catalog_entitlements_service


class SubscriptionService:
    """Manages subscription creation, trials, checkouts, webhook activations, and plan changes."""

    async def get_or_create_subscription(
        self,
        db: AsyncSession,
        organization_id: str,
        plan_tier: str = "GROWTH"
    ) -> Subscription:
        """Retrieves active subscription or establishes a 14-day free trial."""
        res = await db.execute(select(Subscription).where(Subscription.organization_id == organization_id))
        sub = res.scalars().first()
        if sub:
            return sub

        now = datetime.utcnow()
        trial_end = now + timedelta(days=14)
        sub = Subscription(
            organization_id=organization_id,
            plan_tier=plan_tier,
            status=SubscriptionStatus.TRIALING,
            billing_provider=BillingProviderType.STRIPE,
            current_period_start=now,
            current_period_end=trial_end,
            trial_start=now,
            trial_end=trial_end,
            interval="MONTHLY",
            amount=19999.00 if plan_tier == "GROWTH" else 4999.00,
            currency="INR"
        )
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
        return sub

    async def initiate_checkout(
        self,
        db: AsyncSession,
        organization_id: str,
        target_tier: str,
        currency: str = "INR",
        provider_type: BillingProviderType = BillingProviderType.STRIPE
    ) -> Dict[str, Any]:
        """Creates tokenized checkout session with billing provider."""
        # Find organization profile
        org_res = await db.execute(select(Organization).where(Organization.id == organization_id))
        org = org_res.scalars().first()
        if not org:
            raise ValueError("Organization not found.")

        # Lookup plan price
        tier_enum = PlanTier(target_tier)
        plan_res = await db.execute(select(Plan).where(Plan.tier == tier_enum))
        plan = plan_res.scalars().first()
        if not plan:
            raise ValueError(f"Plan tier {target_tier} not found.")

        amount = 19999.00 if target_tier == "GROWTH" else 49999.00 if target_tier == "BUSINESS" else 4999.00

        # Get or create billing customer
        cust_res = await db.execute(select(BillingCustomer).where(BillingCustomer.organization_id == organization_id))
        customer = cust_res.scalars().first()
        if not customer:
            customer = BillingCustomer(
                organization_id=organization_id,
                stripe_customer_id=f"cus_{organization_id[:12]}",
                currency=currency
            )
            db.add(customer)
            await db.flush()

        provider = stripe_provider if provider_type == BillingProviderType.STRIPE else razorpay_provider
        session_data = await provider.create_checkout_session(
            customer_id=customer.stripe_customer_id or f"cus_{organization_id[:10]}",
            plan_tier=target_tier,
            amount=amount,
            currency=currency,
            success_url=f"/dashboard/billing?session_id=cs_success",
            cancel_url=f"/dashboard/billing?cancelled=true",
            metadata={"organization_id": organization_id, "target_tier": target_tier}
        )
        await db.commit()
        return session_data

    async def process_webhook(
        self,
        db: AsyncSession,
        provider_type: BillingProviderType,
        raw_payload: bytes,
        signature_header: str,
        webhook_secret: str
    ) -> Dict[str, Any]:
        """
        Cryptographically verifies and handles billing webhooks.
        Activates subscriptions only upon verified provider event.
        """
        provider = stripe_provider if provider_type == BillingProviderType.STRIPE else razorpay_provider
        is_valid = provider.verify_webhook_signature(raw_payload, signature_header, webhook_secret)
        if not is_valid:
            raise ValueError("Invalid webhook signature or expired timestamp.")

        event_data = json.loads(raw_payload.decode("utf-8"))
        event_type = event_data.get("type") or event_data.get("event")

        # Idempotency check using event ID
        event_id = event_data.get("id") or hashlib.sha256(raw_payload).hexdigest()[:20]

        # Persist webhook event record for audit and replay safety
        from app.services.commercial.production_launch_service import production_launch_service
        await production_launch_service.persist_payment_webhook(
            db=db,
            provider=provider_type.value,
            provider_event_id=event_id,
            event_type=event_type or "unknown",
            raw_payload=raw_payload.decode("utf-8", errors="ignore")
        )

        if event_type in ["checkout.session.completed", "customer.subscription.created", "subscription.activated"]:
            session_obj = event_data.get("data", {}).get("object", event_data)
            org_id = session_obj.get("metadata", {}).get("organization_id")
            target_tier = session_obj.get("metadata", {}).get("target_tier", "GROWTH")

            if org_id:
                sub = await self.get_or_create_subscription(db, org_id)
                sub.status = SubscriptionStatus.ACTIVE
                sub.plan_tier = target_tier
                sub.current_period_start = datetime.utcnow()
                sub.current_period_end = datetime.utcnow() + timedelta(days=30)
                sub.trial_end = None
                sub.grace_period_end = None
                await db.commit()

                return {
                    "event_id": event_id,
                    "status": "PROCESSED",
                    "action": "SUBSCRIPTION_ACTIVATED",
                    "organization_id": org_id,
                    "plan_tier": target_tier
                }

        elif event_type in ["invoice.payment_failed"]:
            invoice_obj = event_data.get("data", {}).get("object", event_data)
            org_id = invoice_obj.get("metadata", {}).get("organization_id")
            if org_id:
                sub = await self.get_or_create_subscription(db, org_id)
                sub.status = SubscriptionStatus.PAST_DUE
                sub.grace_period_end = datetime.utcnow() + timedelta(days=14)
                await db.commit()
                return {
                    "event_id": event_id,
                    "status": "PROCESSED",
                    "action": "PAYMENT_FAILED_GRACE_PERIOD_STARTED",
                    "organization_id": org_id
                }

        return {"event_id": event_id, "status": "IGNORED", "event_type": event_type}

    async def change_plan(
        self,
        db: AsyncSession,
        organization_id: str,
        target_tier: str
    ) -> Dict[str, Any]:
        """
        Handles plan upgrade or downgrade with resource safety check.
        Prevents downgrading if active resources exceed the target tier limit.
        """
        sub = await self.get_or_create_subscription(db, organization_id)
        current_tier = sub.plan_tier

        # If downgrading, verify application count
        tier_hierarchy = {"STARTER": 1, "GROWTH": 2, "BUSINESS": 3, "ENTERPRISE": 4}
        is_downgrade = tier_hierarchy.get(target_tier, 1) < tier_hierarchy.get(current_tier, 2)

        if is_downgrade:
            # Check applications count
            app_res = await db.execute(select(Application).where(Application.organization_id == organization_id))
            active_apps_count = len(app_res.scalars().all())

            # Get target tier limit
            target_limit_spec = {"STARTER": 1, "GROWTH": 5, "BUSINESS": 20, "ENTERPRISE": 100}
            target_max = target_limit_spec.get(target_tier, 1)

            if active_apps_count > target_max:
                raise ValueError(
                    f"Cannot downgrade to {target_tier}: your organization currently has {active_apps_count} active applications, "
                    f"which exceeds the {target_tier} plan limit of {target_max}. Please remove excess applications first."
                )

        sub.plan_tier = target_tier
        await db.commit()
        return {
            "organization_id": organization_id,
            "previous_tier": current_tier,
            "new_tier": target_tier,
            "status": "UPDATED"
        }

    async def cancel_subscription(
        self,
        db: AsyncSession,
        organization_id: str,
        immediate: bool = False
    ) -> Dict[str, Any]:
        """
        Cancels subscription at period end or immediately.
        Never deletes customer production or AWS resources automatically!
        """
        sub = await self.get_or_create_subscription(db, organization_id)
        now = datetime.utcnow()
        if immediate:
            sub.status = SubscriptionStatus.CANCELLED
            sub.cancelled_at = now
        else:
            sub.status = SubscriptionStatus.CANCEL_AT_PERIOD_END
            sub.cancel_at = sub.current_period_end

        await db.commit()
        return {
            "organization_id": organization_id,
            "status": sub.status.value,
            "effective_date": sub.cancelled_at.isoformat() if immediate else sub.cancel_at.isoformat(),
            "safety_guarantee": "Customer AWS resources and production deployments remain untouched and safe."
        }


subscription_service = SubscriptionService()
