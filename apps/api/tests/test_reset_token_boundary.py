import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, func
from app.main import app
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.auth import User
from app.models.auth_commercial import PasswordResetToken
from app.services.commercial.onboarding_invitation_service import onboarding_invitation_service


@pytest.mark.parametrize("environment", ["production", "staging", "development", "test", "demo"])
@pytest.mark.asyncio
async def test_public_reset_never_discloses_token_or_account_existence(monkeypatch, environment):
    monkeypatch.setattr(settings, "ENVIRONMENT", environment)
    async with AsyncSessionLocal() as db:
        before = await db.scalar(select(func.count()).select_from(PasswordResetToken))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        known = await client.post("/api/v1/commercial/auth/request-password-reset", json={"email": "demo@launchcomply.io"})
        unknown = await client.post("/api/v1/commercial/auth/request-password-reset", json={"email": "missing@example.invalid"})
    assert known.status_code == unknown.status_code == 503
    assert known.json() == unknown.json()
    assert "reset_token_preview" not in known.json()
    async with AsyncSessionLocal() as db:
        after = await db.scalar(select(func.count()).select_from(PasswordResetToken))
    assert after == before


@pytest.mark.asyncio
async def test_internal_reset_token_lifecycle_remains_single_use():
    from app.core.security import verify_password, get_password_hash
    async with AsyncSessionLocal() as db:
        user = User(email="reset-control@example.invalid", full_name="Reset control", hashed_password=get_password_hash("ControlBefore123!"))
        db.add(user)
        await db.commit()
        raw_token = await onboarding_invitation_service.request_password_reset(db, user.email)
        assert raw_token
        assert await onboarding_invitation_service.reset_password_with_token(db, raw_token, "ControlAfter123!")
        await db.refresh(user)
        assert verify_password("ControlAfter123!", user.hashed_password)
        assert not await onboarding_invitation_service.reset_password_with_token(db, raw_token, "Attacker123!")
