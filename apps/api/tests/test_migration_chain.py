"""Acceptance checks against actual migration-created, isolated databases."""
import os
from pathlib import Path
import subprocess
import sys
from sqlalchemy import create_engine, text

API_DIRECTORY = Path(__file__).resolve().parents[1]


def migrate(path, *arguments):
    env = os.environ | {
        "DATABASE_URL": f"sqlite+aiosqlite:///{path.as_posix()}",
        "ENVIRONMENT": "test",
    }
    result = subprocess.run(
        [sys.executable, "-m", "alembic", *arguments],
        cwd=API_DIRECTORY, env=env, capture_output=True, text=True, timeout=90,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    return result.stdout


def test_clean_database_migrates_and_matches_models(workspace_temp_dir):
    path = workspace_temp_dir.resolve() / "clean.db"
    migrate(path, "upgrade", "head")
    assert "No new upgrade operations detected" in migrate(path, "check")
    from app.core.schema_check import check_hosted_schema
    engine = create_engine(f"sqlite:///{path.as_posix()}")
    with engine.connect() as connection:
        check_hosted_schema(connection)
    engine.dispose()


def test_existing_migration_schema_preserves_user_during_upgrade(workspace_temp_dir):
    path = workspace_temp_dir.resolve() / "existing.db"
    migrate(path, "upgrade", "7462d21be55a")
    engine = create_engine(f"sqlite:///{path.as_posix()}")
    with engine.begin() as connection:
        connection.execute(text("""INSERT INTO users
            (id, email, hashed_password, full_name, is_active, is_platform_admin,
             email_verified, mfa_enabled, created_at, updated_at)
            VALUES ('migration-user', 'migration@example.invalid', 'test-only-hash',
                    'Migration fixture', 1, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"""))
    migrate(path, "upgrade", "head")
    with engine.connect() as connection:
        assert connection.execute(text("SELECT email FROM users WHERE id='migration-user'")).scalar_one() == "migration@example.invalid"
    assert "No new upgrade operations detected" in migrate(path, "check")
    engine.dispose()
