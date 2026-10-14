"""Separate from tests/conftest.py: no SQLite override, create_all, seed or drop_all."""
import os
import pytest
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError
from scripts.test_database import validate_generated_name

try:
    name = validate_generated_name(os.environ.get("LC_TEST_PG_DATABASE", ""))
    url = make_url(os.environ.get("DATABASE_URL", ""))
    assert url.drivername == "postgresql+asyncpg"
    assert url.host in {"127.0.0.1", "::1"} and url.database == name and url.username == name
    assert os.environ.get("ENVIRONMENT") == "test" and os.environ.get("DEMO_MODE") == "false"
except (ValueError, AssertionError, ArgumentError):
    raise pytest.UsageError("Run this suite through python -m scripts.run_postgres_tests against a disposable loopback service.") from None
