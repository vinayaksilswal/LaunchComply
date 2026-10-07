import subprocess
import pytest

from app import container_start
from app.core.config import Settings


def configure(monkeypatch, **overrides):
    values = dict(
        ENVIRONMENT="production", DEBUG=False, DEMO_MODE=False,
        DATABASE_URL="postgresql://test:test@database/db?sslmode=require&channel_binding=require",
        JWT_SECRET="a" * 64, ENCRYPTION_KEY="b" * 64,
        BACKEND_CORS_ORIGINS=["https://owner.vercel.app"],
        MIGRATE_ON_STARTUP=True,
    )
    monkeypatch.setattr(container_start, "settings", Settings(_env_file=None, **(values | overrides)))
    monkeypatch.setenv("PORT", "10000")
    calls = []
    monkeypatch.setattr(container_start.subprocess, "run", lambda arguments, check: calls.append(("migrate", arguments, check)))
    monkeypatch.setattr(container_start.os, "execv", lambda executable, arguments: calls.append(("serve", arguments)))
    return calls


def test_docker_migrates_before_serving_and_uses_render_port(monkeypatch):
    calls = configure(monkeypatch)
    container_start.main()
    assert [call[0] for call in calls] == ["migrate", "serve"]
    assert calls[0][1][1:] == ["-m", "alembic", "upgrade", "head"]
    assert calls[0][2] is True
    assert calls[1][1][1:] == ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]


def test_unsafe_settings_stop_before_database_mutation(monkeypatch):
    calls = configure(monkeypatch, DEMO_MODE=True)
    with pytest.raises(SystemExit):
        container_start.main()
    assert calls == []


def test_render_missing_private_environment_values_stop_before_migrations(monkeypatch, capsys):
    calls = configure(
        monkeypatch,
        JWT_SECRET=Settings.model_fields["JWT_SECRET"].default,
        ENCRYPTION_KEY=Settings.model_fields["ENCRYPTION_KEY"].default,
        BACKEND_CORS_ORIGINS=Settings.model_fields["BACKEND_CORS_ORIGINS"].default,
    )
    with pytest.raises(SystemExit):
        container_start.main()
    assert calls == []
    message = capsys.readouterr().err
    for name in ("JWT_SECRET", "ENCRYPTION_KEY", "BACKEND_CORS_ORIGINS"):
        assert name in message
    assert "Render's Environment settings" in message
    assert Settings.model_fields["JWT_SECRET"].default not in message
    assert Settings.model_fields["ENCRYPTION_KEY"].default not in message


def test_failed_migration_never_starts_api(monkeypatch):
    calls = configure(monkeypatch)
    def fail(arguments, check):
        raise subprocess.CalledProcessError(1, arguments)
    monkeypatch.setattr(container_start.subprocess, "run", fail)
    with pytest.raises(subprocess.CalledProcessError):
        container_start.main()
    assert calls == []


def test_separate_migration_job_can_disable_startup_migrations(monkeypatch):
    calls = configure(monkeypatch, MIGRATE_ON_STARTUP=False)
    container_start.main()
    assert [call[0] for call in calls] == ["serve"]


@pytest.mark.parametrize("port", ["invalid", "0", "65536"])
def test_invalid_port_stops_before_migration(monkeypatch, port):
    calls = configure(monkeypatch)
    monkeypatch.setenv("PORT", port)
    with pytest.raises(SystemExit):
        container_start.main()
    assert calls == []
