"""Keep preset result engines out of customer environments."""
from fastapi import HTTPException
from app.core.config import settings


def require_demo_result_engine():
    if settings.DEMO_MODE and settings.ENVIRONMENT in {"development", "test", "demo"}:
        return
    raise HTTPException(503, detail={
        "code": "OBSERVED_PROVIDER_REQUIRED",
        "message": "This legacy engine only produces demonstration results. Apply for a reviewed service or connect an observed provider; no assessment or recovery result has been generated.",
    })
