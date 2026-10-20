"""The native reader fixture must never write outside a disposable browser DB."""
import uuid
from pathlib import Path
import pytest
from scripts import seed_browser_canonical as fixture


def test_browser_seed_refuses_other_databases_and_non_test_environments(monkeypatch, workspace_temp_dir):
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("DEMO_MODE", "true")
    external = Path(workspace_temp_dir) / f"playwright-{uuid.uuid4()}.db"
    external.touch()
    with pytest.raises(ValueError): fixture.test_database(str(external))
    path = fixture.API / ".test_tmp" / f"playwright-{uuid.uuid4()}.db"
    path.parent.mkdir(exist_ok=True)
    path.touch()
    try:
        assert fixture.test_database(str(path)) == path.resolve()
        for name, value in (("ENVIRONMENT", "production"), ("DEMO_MODE", "false")):
            with monkeypatch.context() as changed:
                changed.setenv(name, value)
                with pytest.raises(ValueError): fixture.test_database(str(path))
        with pytest.raises(ValueError): fixture.test_database(str(path.parent / "production.db"))
    finally:
        path.unlink()
