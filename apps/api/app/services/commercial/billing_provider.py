"""Phase 8 Billing Provider Abstraction (Stripe & Razorpay Adapters)."""
import hmac
import hashlib
import time
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

from app.core.config import settings
from fastapi import HTTPException


class BillingProvider(ABC):
    """Abstract payment and subscription provider gateway."""

    @staticmethod
    def require_demo_runtime():
        if not settings.DEMO_MODE or settings.ENVIRONMENT not in {"development", "test", "demo"}:
            raise HTTPException(503, "Legacy subscription checkout is unavailable. Use an operations-approved service quote.")

    @abstractmethod
    async def create_customer(self, organization_id: str, legal_name: str, email: str) -> Dict[str, Any]:
        """Creates or links a billing customer."""
        pass

    @abstractmethod
    async def create_checkout_session(
        self,
        customer_id: str,
        plan_tier: str,
        amount: float,
        currency: str,
        success_url: str,
        cancel_url: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Initiates a secure tokenized checkout session."""
        pass

    @abstractmethod
    def verify_webhook_signature(self, payload: bytes, signature_header: str, secret: str) -> bool:
        """Cryptographically verifies incoming webhook payload authenticity."""
        pass


class StripeBillingProvider(BillingProvider):
    """Stripe Billing gateway adapter with production safety gating."""

    async def create_customer(self, organization_id: str, legal_name: str, email: str) -> Dict[str, Any]:
        self.require_demo_runtime()
        if settings.ENABLE_REAL_STRIPE:
            # Production path calling stripe API
            pass
        # Deterministic sandbox simulation
        customer_id = f"cus_lc_{hashlib.sha256(organization_id.encode()).hexdigest()[:16]}"
        return {"customer_id": customer_id, "provider": "STRIPE"}

    async def create_checkout_session(
        self,
        customer_id: str,
        plan_tier: str,
        amount: float,
        currency: str,
        success_url: str,
        cancel_url: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        self.require_demo_runtime()
        session_id = f"cs_test_{hashlib.sha256(f'{customer_id}:{time.time()}'.encode()).hexdigest()[:24]}"
        return {
            "session_id": session_id,
            "checkout_url": f"https://checkout.stripe.com/pay/{session_id}",
            "provider": "STRIPE",
            "amount": amount,
            "currency": currency,
            "plan_tier": plan_tier,
            "metadata": metadata
        }

    def verify_webhook_signature(self, payload: bytes, signature_header: str, secret: str) -> bool:
        """
        Verifies Stripe webhook signature:
        Header format: t=timestamp,v1=signature
        """
        if not signature_header or not secret:
            return False

        try:
            elements = dict(item.split("=", 1) for item in signature_header.split(","))
            timestamp = elements.get("t")
            v1_sig = elements.get("v1")
            if not timestamp or not v1_sig:
                return False

            # Verify timestamp freshness (within 10 minutes)
            if abs(time.time() - int(timestamp)) > 600:
                return False

            # Compute HMAC-SHA256
            signed_payload = f"{timestamp}.".encode("utf-8") + payload
            expected_sig = hmac.new(
                secret.encode("utf-8"),
                signed_payload,
                hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(expected_sig, v1_sig)
        except Exception:
            return False


class RazorpayBillingProvider(BillingProvider):
    """Razorpay Billing gateway adapter for Indian payments with safety gating."""

    async def create_customer(self, organization_id: str, legal_name: str, email: str) -> Dict[str, Any]:
        self.require_demo_runtime()
        customer_id = f"cust_rzp_{hashlib.sha256(organization_id.encode()).hexdigest()[:14]}"
        return {"customer_id": customer_id, "provider": "RAZORPAY"}

    async def create_checkout_session(
        self,
        customer_id: str,
        plan_tier: str,
        amount: float,
        currency: str,
        success_url: str,
        cancel_url: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        self.require_demo_runtime()
        order_id = f"order_{hashlib.sha256(f'{customer_id}:{time.time()}'.encode()).hexdigest()[:16]}"
        return {
            "order_id": order_id,
            "checkout_url": f"https://api.razorpay.com/v1/checkout/{order_id}",
            "provider": "RAZORPAY",
            "amount": amount,
            "currency": currency,
            "plan_tier": plan_tier,
            "metadata": metadata
        }

    def verify_webhook_signature(self, payload: bytes, signature_header: str, secret: str) -> bool:
        """Verifies Razorpay HMAC-SHA256 webhook signature."""
        if not signature_header or not secret:
            return False
        try:
            expected_sig = hmac.new(
                secret.encode("utf-8"),
                payload,
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(expected_sig, signature_header)
        except Exception:
            return False


stripe_provider = StripeBillingProvider()
razorpay_provider = RazorpayBillingProvider()
