"""Real hosted checkout APIs. No card data, mock URLs or client-side paid status."""
import hashlib
import hmac
import time
from urllib.parse import urlsplit
import httpx
from fastapi import HTTPException
from app.core.config import settings


def provider_config(provider):
    if provider == "STRIPE":
        enabled, key, secret, mode = settings.ENABLE_REAL_STRIPE, settings.STRIPE_SECRET_KEY, settings.STRIPE_WEBHOOK_SECRET, settings.STRIPE_MODE
        valid_key = key.startswith("sk_live_" if mode == "live" else "sk_test_")
    else:
        enabled, key, secret, mode = settings.ENABLE_REAL_RAZORPAY, settings.RAZORPAY_KEY_ID, settings.RAZORPAY_WEBHOOK_SECRET, settings.RAZORPAY_MODE
        valid_key = key.startswith("rzp_live_" if mode == "live" else "rzp_test_") and bool(settings.RAZORPAY_KEY_SECRET)
    configured = bool(settings.ENABLE_SERVICE_PAYMENTS and enabled and valid_key and secret and mode in {"test", "live"}
                      and settings.BILLING_RETURN_ORIGIN and (settings.ENVIRONMENT != "production" or mode == "live"))
    return {"provider": provider, "available": configured, "mode": mode,
            "reason": "Ready for checkout" if configured else "Payments need platform configuration."}


async def api(provider, method, path, *, data=None, body=None, idempotency=None):
    if not provider_config(provider)["available"]:
        raise HTTPException(503, "This payment provider is not enabled. No payment has been created.")
    base = "https://api.stripe.com/v1" if provider == "STRIPE" else "https://api.razorpay.com/v1"
    auth = (settings.STRIPE_SECRET_KEY, "") if provider == "STRIPE" else (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    headers = {"Idempotency-Key": idempotency} if idempotency and provider == "STRIPE" else {}
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=False, trust_env=False) as client:
            response = await client.request(method, base + path, auth=auth, headers=headers, data=data, json=body)
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "The payment provider could not complete this request. Refresh before retrying; payment is not confirmed.") from None


def safe_checkout_url(provider, url):
    if not isinstance(url, str):
        raise HTTPException(502, "The provider returned no checkout address.")
    try:
        parsed = urlsplit(url)
        port = parsed.port
    except ValueError:
        raise HTTPException(502, "The provider returned an invalid checkout address.") from None
    hosts = {"checkout.stripe.com"} if provider == "STRIPE" else {"rzp.io", "pages.razorpay.com"}
    if parsed.scheme != "https" or parsed.hostname not in hosts or parsed.username or parsed.password or port not in {None, 443}:
        raise HTTPException(502, "The provider returned an unsupported checkout address.")
    return url


async def create_checkout(quote, checkout):
    origin = settings.BILLING_RETURN_ORIGIN
    # Stable across retries so the persisted idempotency key always has the same body.
    from datetime import timezone
    created = checkout.created_at
    expires = int(created.replace(tzinfo=timezone.utc).timestamp()) + 3600
    if expires < time.time() + 1800:
        raise HTTPException(409, "This checkout creation window expired. Contact operations before starting another payment.")
    return_url = origin + "/dashboard/billing?payment=returned"
    if checkout.provider == "STRIPE":
        result = await api("STRIPE", "POST", "/checkout/sessions", idempotency=checkout.id, data={
            "mode": "payment", "success_url": return_url, "cancel_url": origin + "/dashboard/billing?payment=cancelled",
            "client_reference_id": checkout.id, "metadata[checkout_id]": checkout.id, "metadata[quote_id]": quote.id,
            "line_items[0][price_data][currency]": quote.currency.lower(),
            "line_items[0][price_data][unit_amount]": str(quote.amount_minor),
            "line_items[0][price_data][product_data][name]": quote.title,
            "line_items[0][quantity]": "1", "expires_at": str(expires),
        })
        return result["id"], safe_checkout_url("STRIPE", result.get("url")), result.get("expires_at")
    # A persisted checkout ID is a unique reference; after an interrupted request,
    # recover that link before attempting creation. No automatic charge is made.
    existing = await api("RAZORPAY", "GET", "/payment_links?reference_id=" + checkout.id)
    matches = [item for item in existing.get("payment_links", []) if item.get("reference_id") == checkout.id]
    if matches:
        result = matches[0]
    else:
        result = await api("RAZORPAY", "POST", "/payment_links", body={
            "amount": quote.amount_minor, "currency": quote.currency, "accept_partial": False,
            "reference_id": checkout.id, "description": quote.title,
            "notes": {"checkout_id": checkout.id, "quote_id": quote.id},
            "callback_url": return_url, "callback_method": "get", "expire_by": expires,
        })
    return result["id"], safe_checkout_url("RAZORPAY", result.get("short_url")), result.get("expire_by")


def verify_signature(provider, raw, signature):
    secret = settings.STRIPE_WEBHOOK_SECRET if provider == "STRIPE" else settings.RAZORPAY_WEBHOOK_SECRET
    if not secret or not signature:
        return False
    if provider == "RAZORPAY":
        return hmac.compare_digest(hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest(), signature)
    try:
        parts = [item.split("=", 1) for item in signature.split(",")]
        timestamp = next(value for key, value in parts if key == "t")
        if abs(time.time() - int(timestamp)) > 300:
            return False
        expected = hmac.new(secret.encode(), timestamp.encode() + b"." + raw, hashlib.sha256).hexdigest()
        return any(hmac.compare_digest(expected, value) for key, value in parts if key == "v1")
    except (ValueError, StopIteration):
        return False


async def inspect_payment(quote, checkout):
    reference = checkout.provider_reference
    if not reference:
        raise HTTPException(409, "Checkout creation has not completed. Retry checkout to recover its provider reference.")
    if checkout.provider == "STRIPE":
        result = await api("STRIPE", "GET", "/checkout/sessions/" + reference)
        matched = (result.get("id") == reference and result.get("client_reference_id") == checkout.id and (result.get("metadata") or {}).get("quote_id") == quote.id
                   and result.get("amount_total") == quote.amount_minor and result.get("currency", "").upper() == quote.currency
                   and result.get("livemode") == (checkout.mode == "live") and result.get("mode") == "payment")
        paid = result.get("payment_status") == "paid" and result.get("status") == "complete"
        expired = result.get("status") == "expired"
    else:
        result = await api("RAZORPAY", "GET", "/payment_links/" + reference)
        matched = (result.get("id") == reference and result.get("reference_id") == checkout.id and (result.get("notes") or {}).get("quote_id") == quote.id
                   and result.get("amount") == quote.amount_minor and result.get("currency") == quote.currency
                   and provider_config("RAZORPAY")["mode"] == checkout.mode)
        paid = result.get("status") == "paid" and result.get("amount_paid") == quote.amount_minor
        expired = result.get("status") in {"expired", "cancelled"}
    if not matched:
        raise HTTPException(409, "Provider payment details do not match the issued quote. Operations must review this payment.")
    return "PAID" if paid else "EXPIRED" if expired else "PENDING"
