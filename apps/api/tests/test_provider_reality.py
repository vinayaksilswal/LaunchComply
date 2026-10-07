import pytest
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.services.commercial.production_launch_service import production_launch_service
from app.services.commercial.email_delivery_service import email_delivery_service


@pytest.mark.asyncio
async def test_provider_flags_are_not_connection_evidence(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_REAL_STRIPE", True)
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "test-only-placeholder")
    monkeypatch.setattr(settings, "ENABLE_REAL_RAZORPAY", True)
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "test-only-placeholder")
    monkeypatch.setattr(settings, "ENABLE_REAL_EMAIL", True)
    async with AsyncSessionLocal() as db:
        matrix = await production_launch_service.get_provider_status_matrix(db)
    for entry in matrix:
        if entry["check_kind"] != "DATABASE_PROBE":
            assert entry["status"] not in ("CONNECTED", "PRODUCTION_READY", "PASS")
            assert entry["last_verified_at"] is None
    github = next(entry for entry in matrix if entry["category"] == "SOURCE_CONTROL")
    assert github["status"] == "SIMULATED"


@pytest.mark.parametrize("environment", ["staging", "production"])
@pytest.mark.asyncio
async def test_hosted_email_health_does_not_invent_delivery_or_dns(monkeypatch, environment):
    monkeypatch.setattr(settings, "ENVIRONMENT", environment)
    monkeypatch.setattr(settings, "ENABLE_REAL_EMAIL", True)
    async with AsyncSessionLocal() as db:
        health = await email_delivery_service.get_email_health(db)
    assert health["delivery_rate_percent"] is None
    assert health["totals"]["sent"] is None
    assert health["totals"]["delivered"] is None
    for key in ("spf_status", "dkim_status", "dmarc_status"):
        assert health["domain_health"][key] == "NOT_VERIFIED"
    assert health["domain_health"]["last_verified_at"] is None


def test_release_metadata_does_not_claim_unmeasured_ga_checks():
    metadata = production_launch_service.get_ga_release_metadata()
    assert metadata["state"] == "NO_GO"
    assert metadata["security_scan"] == metadata["e2e_result"] == "UNVERIFIED"
    assert metadata["deployment_artifact"] is None


@pytest.mark.asyncio
async def test_hosted_github_cannot_create_fixture_connections(monkeypatch):
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging")
    monkeypatch.setattr(settings, "DEMO_MODE", False)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        providers = await client.get("/api/v1/source-control/providers")
        assert providers.json()[0]["status"] == "NOT_CONFIGURED"
        callback = await client.post("/api/v1/source-control/github/callback", json={"installation_id": "arbitrary"})
        assert callback.status_code == 503
        webhook = await client.post("/api/v1/source-control/github/webhook", json={})
        assert webhook.status_code == 503
