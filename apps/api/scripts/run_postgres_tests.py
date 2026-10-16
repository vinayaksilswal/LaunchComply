"""Create/migrate/test/drop only a uniquely owned test DB on a local PG service.

Requires LC_TEST_PG_ADMIN_URL. Never uses DATABASE_URL or the application's .env.
Run from apps/api: python -m scripts.run_postgres_tests
"""
import os
from pathlib import Path
import secrets
import subprocess
import sys
import uuid

import psycopg
from psycopg import sql
from scripts.test_database import validate_admin_url, validate_generated_name

API = Path(__file__).resolve().parents[1]


def main():
    value = os.environ.get("LC_TEST_PG_ADMIN_URL", "")
    try:
        url = validate_admin_url(value)
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 2
    name = validate_generated_name("lc_pytest_" + uuid.uuid4().hex)
    password = secrets.token_urlsafe(32)
    runtime = url.set(username=name, password=password, database=name)
    env = os.environ | {
        "DATABASE_URL": runtime.set(drivername="postgresql+asyncpg").render_as_string(hide_password=False),
        "LC_TEST_PG_DATABASE": name, "ENVIRONMENT": "test", "DEMO_MODE": "false",
        "DEBUG": "false", "MIGRATE_ON_STARTUP": "false",
        "JWT_SECRET": "isolated-postgres-tests-only-" + secrets.token_hex(32),
        "ENCRYPTION_KEY": "isolated-postgres-tests-only-" + secrets.token_hex(32),
        "ENABLE_AI_COPILOT": "false", "OPENAI_API_KEY": "", "OPENROUTER_API_KEY": "",
        "AWS_EC2_METADATA_DISABLED": "true",
    }
    env.pop("LC_TEST_PG_ADMIN_URL", None)

    def run(*args):
        result = subprocess.run([sys.executable, *args], cwd=API, env=env,
                                capture_output=True, text=True, timeout=180)
        output = (result.stdout + result.stderr).replace(password, "[test-password]")
        print(output, end="")
        if result.returncode:
            raise RuntimeError(f"Test command failed with exit code {result.returncode}")

    role_created = database_created = False
    try:
        with psycopg.connect(value, autocommit=True, connect_timeout=5) as admin:
            try:
                admin.execute(sql.SQL("CREATE ROLE {} LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS").format(sql.Identifier(name), sql.Literal(password)))
                role_created = True
                admin.execute(sql.SQL("CREATE DATABASE {} OWNER {}").format(sql.Identifier(name), sql.Identifier(name)))
                database_created = True
                # Exercise a populated historical schema before the current head.
                run("-m", "alembic", "upgrade", "7462d21be55a")
                with psycopg.connect(runtime.render_as_string(hide_password=False)) as db:
                    db.execute("""INSERT INTO users
                        (id,email,hashed_password,full_name,is_active,is_platform_admin,
                         email_verified,mfa_enabled,created_at,updated_at)
                        VALUES ('migration-user','migration@example.invalid','test-only',
                        'Migration fixture',true,false,false,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)""")
                run("-m", "alembic", "upgrade", "ae1f5a6b7c8d")
                from sqlalchemy import create_engine
                from scripts.architecture_state_fixture import seed_legacy_architectures, assert_workspace_backfill, assert_workspace_constraints, assert_activity_constraints
                fixture_engine = create_engine(runtime.set(drivername="postgresql+psycopg"))
                try:
                    with fixture_engine.begin() as connection:
                        before = seed_legacy_architectures(connection)
                    run("-m", "alembic", "upgrade", "head")
                    with fixture_engine.begin() as connection:
                        assert_workspace_backfill(connection, before)
                        assert_workspace_constraints(connection)
                        assert_activity_constraints(connection)
                    print("Workspace migration preserved history and enforced tenant/environment constraints.")
                finally:
                    fixture_engine.dispose()
                run("-m", "alembic", "check")
                run("-m", "pytest", "--confcutdir=postgres_tests", "postgres_tests", "-q", "-ra", "--junitxml=test-results/postgres.xml")
            finally:
                # Identifiers are generated here, never supplied by the environment.
                validate_generated_name(name)
                if database_created:
                    admin.execute(sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(name)))
                if role_created:
                    admin.execute(sql.SQL("DROP ROLE {}").format(sql.Identifier(name)))
    except (psycopg.Error, RuntimeError, subprocess.TimeoutExpired) as error:
        # Never echo the administrator URL/password, including connection errors.
        print(f"Disposable PostgreSQL checks failed ({type(error).__name__}).", file=sys.stderr)
        return 1
    print("Disposable PostgreSQL checks passed; generated database and role removed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
