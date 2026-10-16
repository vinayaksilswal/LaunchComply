"""Isolated tenant/DB acceptance of reviewed property-only AI proposals. No live model."""
import copy
import json
import uuid
from unittest.mock import AsyncMock

import httpx
import pytest
import pytest_asyncio

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.entities import Architecture
from app.services.architecture import workspace as service
from sqlalchemy import select
from app.models.audit import AuditEvent
from test_github_authorization import github_setup
from test_architecture_workspace import linked_app

@pytest_asyncio.fixture
async def configured_asset(github_setup, monkeypatch):
    client, headers, account, _ = github_setup
    asset_id = await linked_app(github_setup)
    url = f"/api/v1/architecture/workspace/{asset_id}"
    initial = (await client.post(url + "/initialize", headers=headers)).json()
    node = {"id": "logs", "label": "Application logs", "service": "AWS::Logs::LogGroup", "zone": "SUPPORT", "description": "Private operational logs", "x": 100, "y": 200}
    saved = await client.post(url + "/save", headers=headers, json={"expected_id": initial["id"], "graph": {"nodes": [node], "edges": []}})
    assert saved.status_code == 200, saved.text
    response = await client.post(url + "/resource-configuration", headers=headers, json={"expected_id": saved.json()["id"], "node_id": "logs", "configuration": {"resource_type": "AWS::Logs::LogGroup", "properties": {"retention_days": 30}}})
    assert response.status_code == 200, response.text
    for key, value in {"ENABLE_AI_COPILOT": True, "ARCHITECTURE_AI_PROVIDER": "openai", "OPENAI_API_KEY": "fixture-not-a-real-key"}.items():
        monkeypatch.setattr(settings, key, value)
    return client, headers, url, response.json()

def model_reply(monkeypatch, updates, questions=None):
    def reply(request):
        assert str(request.url) == "https://api.openai.com/v1/responses"
        supplied = json.loads(json.loads(request.content)["input"])
        assert [item["resource_type"] for item in supplied["planning_context"]["selected_resource_schemas"]] == ["AWS::Logs::LogGroup"]
        network = supplied["planning_context"]["configured_network"]
        assert network["deployment_state"] == "NOT_VERIFIED"
        assert [p["node_id"] for p in network["placements"]] == ["logs"]
        assert network["relations"] == []
        answer = {"message": "Review the proposed retention change. No cloud changes.", "resource_updates": updates, "questions": questions or []}
        return httpx.Response(200, json={"status": "completed", "output": [{"content": [{"type": "output_text", "text": json.dumps(answer)}]}]})
    monkeypatch.setattr(service, "http_client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(reply)))

CHANGE = {"node_id": "logs", "resource_type": "AWS::Logs::LogGroup", "changes": [{"name": "retention_days", "value": 90}]}


@pytest.mark.asyncio
async def test_future_schema_is_not_interpreted_as_current_network_in_ai_context(configured_asset):
    from app.services.architecture.agent import prepare_context
    _, _, _, saved = configured_asset
    result = prepare_context({"graph": saved["graph"], "evidence": saved["evidence"],
        "resource_configurations": saved["resource_configurations"], "resource_schema_version": 2,
        "edit_scope": {"mode": "REVIEW", "node_ids": ["logs"]}})
    network = result["context"]["configured_network"]
    assert network["placements"] == [] and network["relations"] == []
    assert network["issues"][0]["code"] == "UNSUPPORTED_SCHEMA"

@pytest.mark.asyncio
async def test_property_only_proposal_requires_apply_is_versioned_and_can_restore(configured_asset, monkeypatch):
    client, headers, url, original = configured_asset
    model_reply(monkeypatch, [CHANGE])
    response = await client.post(url + "/chat", headers=headers, json={"expected_id": original["id"], "message": "Set selected log retention to 90 days only.", "edit_scope": {"mode": "EDIT", "node_ids": ["logs"]}})
    assert response.status_code == 200, response.text
    pending = response.json()
    assert original["resource_topology"]["placements"][0]["location"] == "OPERATIONS"
    assert pending["proposal"]["resource_topology"]["deployment_state"] == "NOT_VERIFIED"
    assert pending["resource_topology"] == original["resource_topology"]
    assert pending["graph"] == original["graph"] == pending["proposal"]["graph"]
    assert pending["resource_configurations"] == original["resource_configurations"]
    assert pending["proposal"]["resource_configurations"]["logs"]["properties"]["retention_days"] == 90
    assert pending["messages"][-1]["proposal_status"] == "PROPOSED"
    # Property-only pending proposals lock manual edits just like graph proposals.
    blocked = await client.post(url + "/resource-configuration", headers=headers, json={"expected_id": original["id"], "node_id": "logs", "configuration": None})
    assert blocked.status_code == 409
    applied = await client.post(url + "/apply", headers=headers, json={"expected_id": original["id"], "proposal_id": pending["proposal"]["id"]})
    assert applied.status_code == 200, applied.text
    after = applied.json()
    assert after["id"] != original["id"] and after["proposal"] is None
    assert after["graph"] == original["graph"] and after["evidence"] == original["evidence"]
    assert after["resource_configurations"]["logs"]["properties"]["retention_days"] == 90
    assert after["deployment_status"] == "NOT_DEPLOYED"
    assert (await client.post(url + "/apply", headers=headers, json={"expected_id": original["id"], "proposal_id": pending["proposal"]["id"]})).status_code == 409
    restored = await client.post(url + "/restore", headers=headers, json={"expected_id": after["id"], "version_id": original["id"]})
    assert restored.status_code == 200, restored.text
    assert restored.json()["resource_configurations"] == original["resource_configurations"]

@pytest.mark.asyncio
@pytest.mark.parametrize("case", ["invalid", "scope", "questions"])
async def test_invalid_unselected_and_clarification_do_not_save_properties(configured_asset, monkeypatch, case):
    client, headers, url, original = configured_asset
    change = copy.deepcopy(CHANGE)
    if case == "invalid": change["changes"][0]["value"] = 999
    if case == "scope": change["node_id"] = "not-selected"
    model_reply(monkeypatch, [change], [{"id": "retention", "question": "Confirm the retention period?", "options": ["30 days", "90 days"]}] if case == "questions" else None)
    response = await client.post(url + "/chat", headers=headers, json={"expected_id": original["id"], "message": "Change retention only.", "edit_scope": {"mode": "EDIT", "node_ids": ["logs"]}})
    assert response.status_code == (200 if case == "questions" else 502), response.text
    saved = (await client.get(url, headers=headers)).json()["architecture"]
    assert saved["id"] == original["id"] and saved["proposal"] is None
    assert saved["resource_configurations"] == original["resource_configurations"]

@pytest.mark.asyncio
async def test_tampered_property_proposal_cannot_apply(configured_asset, monkeypatch):
    client, headers, url, original = configured_asset
    model_reply(monkeypatch, [CHANGE])
    pending = (await client.post(url + "/chat", headers=headers, json={"expected_id": original["id"], "message": "Change retention only.", "edit_scope": {"mode": "EDIT", "node_ids": ["logs"]}})).json()
    async with AsyncSessionLocal() as db:
        record = await db.get(Architecture, original["id"])
        from app.services.architecture.version_activity import load_activity, write_activity
        from app.services.architecture.workspace_state import effective_spec
        await load_activity(db, record)
        spec = copy.deepcopy(effective_spec(record))
        spec["proposal"]["resource_configurations"]["logs"]["properties"]["retention_days"] = 365
        await write_activity(db, record, spec)
        await db.commit()
    rejected = await client.post(url + "/apply", headers=headers, json={"expected_id": original["id"], "proposal_id": pending["proposal"]["id"]})
    assert rejected.status_code == 409
    saved = (await client.get(url, headers=headers)).json()["architecture"]
    assert saved["resource_configurations"] == original["resource_configurations"]

@pytest.mark.asyncio
@pytest.mark.parametrize("failure", ["invalid_properties", "unselected", "rate_limit", "timeout"])
async def test_free_router_retries_invalid_property_proposals_without_relaxing_scope(configured_asset, monkeypatch, failure):
    client, headers, url, original = configured_asset
    for key, value in {"ARCHITECTURE_AI_PROVIDER": "openrouter", "OPENROUTER_API_KEY": "fixture-only",
        "OPENROUTER_ARCHITECTURE_MODELS": "fixture/preferred:free", "OPENROUTER_FREE_MODELS_ONLY": True,
        "OPENROUTER_FREE_ROUTER_FALLBACK": True}.items():
        monkeypatch.setattr(settings, key, value)
    models = []
    def reply(request):
        body = json.loads(request.content)
        models.append(body["model"])
        assert body["provider"]["max_price"] == {"prompt": 0, "completion": 0}
        assert body["provider"]["data_collection"] == "deny"
        update = copy.deepcopy(CHANGE)
        if len(models) == 1:
            if failure == "rate_limit": return httpx.Response(429, json={"error": {"message": "fixture rate limit"}})
            if failure == "timeout": raise httpx.ReadTimeout("Fixture timeout", request=request)
            if failure == "invalid_properties": update["changes"][0]["value"] = 999
            if failure == "unselected": update["node_id"] = "not-selected"
        else:
            schema = body["response_format"]["json_schema"]["schema"]
            assert schema["$defs"]["ResourceUpdate"]["properties"]["node_id"]["enum"] == ["logs"]
            assert schema["$defs"]["PropertyChange"]["additionalProperties"] is False
            assert body["provider"]["require_parameters"] is True
        return httpx.Response(200, json={"model": "fixture/selected:free", "choices": [{"finish_reason": "stop", "message": {"content": json.dumps({"message": "Review the exact retention change.", "resource_updates": [update]})}}]})
    monkeypatch.setattr(service, "http_client", lambda: httpx.AsyncClient(transport=httpx.MockTransport(reply)))
    response = await client.post(url + "/chat", headers=headers, json={"expected_id": original["id"], "message": "Set selected log retention to 90 days only.", "edit_scope": {"mode": "EDIT", "node_ids": ["logs"]}})
    assert response.status_code == 200, response.text
    assert models == ["fixture/preferred:free", "openrouter/free"]
    result = response.json()
    assert result["resource_configurations"] == original["resource_configurations"]
    assert result["proposal"]["resource_configurations"]["logs"]["properties"]["retention_days"] == 90
    async with AsyncSessionLocal() as db:
        event = (await db.execute(select(AuditEvent).where(AuditEvent.entity_id == url.split("/")[-1], AuditEvent.action == "ARCHITECTURE_AI_PROPOSAL_CREATED"))).scalar_one()
        assert event.details["attempts"][-1]["kind"] == "VALID_PROPOSAL"

@pytest.mark.asyncio
async def test_clarification_cannot_bypass_future_resource_schema_migration(configured_asset, monkeypatch):
    client, headers, url, original = configured_asset
    async with AsyncSessionLocal() as db:
        record = await db.get(Architecture, original["id"])
        spec = copy.deepcopy(record.spec_json)
        spec.update(resource_schema_version=2, ai_request={"id": "old-question"},
            last_ai_scope={"mode": "EDIT", "node_ids": ["logs"]}, last_ai_intent="Change retention",
            last_ai_questions=[{"id": "retention", "question": "Which retention?", "options": ["90 days"]}])
        from app.services.architecture.version_activity import write_activity, snapshot_spec
        record.spec_json = snapshot_spec(spec)
        await write_activity(db, record, spec)
        await db.commit()
    provider = AsyncMock()
    monkeypatch.setattr(service, "refine", provider)
    response = await client.post(url + "/chat", headers=headers, json={"expected_id": original["id"], "answer_to": "old-question", "message": "90 days"})
    assert response.status_code == 409
    provider.assert_not_awaited()
    after = (await client.get(url, headers=headers)).json()["architecture"]
    assert after["resource_schema_version"] == 2 and after["resource_configurations"] == original["resource_configurations"]
