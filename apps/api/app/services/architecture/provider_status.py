"""Admin-only provider observations; never return key labels, keys or raw errors."""
import asyncio
from datetime import datetime, timezone
import httpx
from app.core.config import settings


async def observe_provider_access():
    result = {"checked_at": datetime.now(timezone.utc).isoformat(), "state": "NOT_CONFIGURED",
        "http_status": None, "authentication_verified": False, "daily_allowance": None,
        "scope": "Provider-reported key access and daily free allowance. This does not verify model access, privacy-compatible endpoints or successful architecture responses."}
    if settings.ARCHITECTURE_AI_PROVIDER != "openrouter" or not settings.OPENROUTER_API_KEY:
        return result
    try:
        async with asyncio.timeout(10):
            async with httpx.AsyncClient(timeout=8, follow_redirects=False) as client:
                response = await client.get("https://openrouter.ai/api/v1/key",
                    headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"})
        result["http_status"] = response.status_code
        if response.status_code != 200:
            result["state"] = {401: "AUTHENTICATION_FAILED", 403: "ACCESS_DENIED", 429: "RATE_LIMITED"}.get(response.status_code, "PROVIDER_UNAVAILABLE")
            return result
        payload = response.json()
        data = payload.get("data") if isinstance(payload, dict) else None
        if not isinstance(data, dict):
            result["state"] = "INVALID_RESPONSE"
            return result
        result["authentication_verified"] = True
        result["state"] = "KEY_ACCESS_VERIFIED"
        allowance = data.get("free_model_daily_requests")
        fields = ("used", "limit", "remaining")
        if isinstance(allowance, dict) and all(type(allowance.get(field)) is int and 0 <= allowance[field] <= 1_000_000_000 for field in fields):
            result["daily_allowance"] = {field: allowance[field] for field in fields}
        return result
    except (TimeoutError, httpx.HTTPError, ValueError, TypeError):
        result["state"] = "PROVIDER_UNAVAILABLE"
        return result
