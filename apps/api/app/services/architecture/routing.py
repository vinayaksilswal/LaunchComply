"""Shared, bounded OpenRouter plan. The general free router always comes last."""
from app.core.config import settings

FREE_ROUTER = "openrouter/free"
REQUEST_BUDGET_SECONDS = 85
MODEL_TIMEOUT_SECONDS = 28


def openrouter_models():
    configured = list(dict.fromkeys(value.strip() for value in (
        settings.OPENROUTER_ARCHITECTURE_MODELS or settings.OPENROUTER_ARCHITECTURE_MODEL
    ).split(",") if value.strip()))
    preferred = [value for value in configured if value != FREE_ROUTER][:6]
    if settings.OPENROUTER_FREE_ROUTER_FALLBACK or FREE_ROUTER in configured:
        preferred.append(FREE_ROUTER)
    return preferred
