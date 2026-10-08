"""Opt-in, read-only smoke checks for the deployed API; no live writes or credentials."""
import os

import httpx
import pytest


@pytest.mark.parametrize("path, expected_status", [
    ("/", "ONLINE"),
    ("/health/live", "ALIVE"),
    ("/health/ready", "READY"),
    ("/api/v1/health/ready", "READY"),
])
def test_deployed_api_health(path, expected_status):
    origin = os.environ.get("LIVE_API_URL")
    if not origin:
        pytest.skip("Set LIVE_API_URL to run read-only deployed API checks.")
    response = httpx.get(origin.rstrip("/") + path, timeout=30, follow_redirects=True)
    assert response.status_code == 200, f"{path} returned HTTP {response.status_code}"
    assert "application/json" in response.headers.get("content-type", "")
    payload = response.json()
    assert payload["status"] == expected_status
    if path.endswith("/health/ready"):
        assert payload["database"] == "CONNECTED"
