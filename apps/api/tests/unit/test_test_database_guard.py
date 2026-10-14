"""The destructive test harness must reject application/remote database inputs."""
import pytest
from scripts.test_database import validate_admin_url, validate_generated_name


@pytest.mark.parametrize("url", ["", "postgresql://prod:secret@db.example.com/production",
    "postgresql://lc_test_admin:test@localhost/postgres", "postgresql://lc_test_admin:test@127.0.0.1/production",
    "postgresql://owner:test@127.0.0.1/postgres", "postgresql://lc_test_admin:test@127.0.0.1/postgres?host=db.example.com",
    "sqlite:///production.db", "postgresql://lc_test_admin@test@127.0.0.1/postgres?service=prod"])
def test_unsafe_admin_targets_rejected_without_echoing_input(url):
    with pytest.raises(ValueError) as error:
        validate_admin_url(url)
    assert "secret" not in str(error.value) and "db.example.com" not in str(error.value)


def test_only_generated_identifiers_can_be_cleaned_up():
    assert validate_admin_url("postgresql://lc_test_admin:fixture@127.0.0.1:5432/postgres").database == "postgres"
    assert validate_generated_name("lc_pytest_" + "a" * 32)
    for value in ["production", "lc_pytest_existing", "lc_pytest_" + "a" * 32 + '; DROP ROLE owner']:
        with pytest.raises(ValueError): validate_generated_name(value)
