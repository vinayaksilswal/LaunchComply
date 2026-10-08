import pytest
from httpx import ASGITransport, AsyncClient
from app.core.config import Settings
from app.main import app


def hosted_settings(**overrides):
    values = dict(
        ENVIRONMENT="staging", DEBUG=False, DEMO_MODE=False,
        DATABASE_URL="postgresql://user:pass@database:5432/launchcomply",
        JWT_SECRET="a" * 64, ENCRYPTION_KEY="b" * 64,
        BACKEND_CORS_ORIGINS=["https://owner.vercel.app"],
    )
    return Settings(_env_file=None, **(values | overrides))


@pytest.mark.parametrize("prefix", ["postgres://", "postgresql://", "postgresql+asyncpg://"])
def test_render_database_urls_use_async_driver(prefix):
    settings = hosted_settings(DATABASE_URL=prefix + "user:pass@database:5432/db")
    driver = "asyncpg" if prefix == "postgresql+asyncpg://" else "psycopg"
    assert settings.DATABASE_URL == f"postgresql+{driver}://user:pass@database:5432/db"
    assert settings.validate_hosted_environment()[0]


def test_neon_url_preserves_tls_and_channel_binding():
    from sqlalchemy.ext.asyncio import create_async_engine
    settings = hosted_settings(DATABASE_URL="postgresql://user:pass@database/db?sslmode=require&channel_binding=require")
    assert settings.validate_hosted_environment()[0]
    engine = create_async_engine(settings.DATABASE_URL)
    assert engine.dialect.is_async
    assert engine.dialect.driver == "psycopg"
    _, arguments = engine.dialect.create_connect_args(engine.url)
    assert arguments["sslmode"] == "require"
    assert arguments["channel_binding"] == "require"


@pytest.mark.parametrize("override", [
    {"DEMO_MODE": True}, {"DEBUG": True}, {"JWT_SECRET": "short"},
    {"DATABASE_URL": "sqlite+aiosqlite:///./unsafe.db"},
    {"BACKEND_CORS_ORIGINS": ["*"]},
    {"BACKEND_CORS_ORIGINS": ["http://localhost:3000"]},
    {"BACKEND_CORS_ORIGINS": ["https://owner.vercel.app/path"]},
    {"BACKEND_CORS_ORIGINS": []},
])
def test_staging_rejects_unsafe_hosted_configuration(override):
    assert not hosted_settings(**override).validate_hosted_environment()[0]


@pytest.mark.asyncio
@pytest.mark.parametrize("path", ["/health/ready", "/api/v1/health/ready"])
async def test_readiness_probes_database_and_hides_failure(monkeypatch, path):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        ready = await client.get(path)
        assert ready.json()["database"] == "CONNECTED"
        assert ready.headers["cache-control"] == "no-store"

        def broken_connection():
            raise RuntimeError("secret database connection details")

        from types import SimpleNamespace
        monkeypatch.setattr("app.main.engine", SimpleNamespace(connect=broken_connection))
        response = await client.get(path)
        assert response.status_code == 503
        assert response.json() == {"status": "NOT_READY", "database": "UNAVAILABLE"}
        assert response.headers["cache-control"] == "no-store"
        assert (await client.get("/health/live")).status_code == 200


@pytest.mark.asyncio
async def test_startup_rejects_configuration_before_touching_database(monkeypatch):
    from app.main import lifespan
    monkeypatch.setattr("app.main.settings", hosted_settings(DEMO_MODE=True))
    with pytest.raises(RuntimeError, match="Invalid hosted configuration"):
        async with lifespan(app):
            pass
