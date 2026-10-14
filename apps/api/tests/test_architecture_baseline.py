"""Shared v1 preservation fixture: real API persistence, offline compiler, mocked source auth."""
import copy
import json
from pathlib import Path

import pytest
from app.services.architecture.resource_configuration import compile_template, validate_resources
from app.services.architecture.workspace import Graph
from test_github_authorization import github_setup
from test_architecture_workspace import linked_app

FIXTURE = Path(__file__).resolve().parents[3] / "fixtures/architecture/saas-v1.json"


def load_fixture():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def test_shared_legacy_fixture_compiles_only_explicit_configurations():
    data = load_fixture()
    design = data["design"]
    original = copy.deepcopy(design)
    Graph.model_validate(data["empty_graph"])
    Graph.model_validate(design["graph"])
    assert not validate_resources(design["graph"], design["resource_configurations"], "ap-south-1")["issues"]
    compiled = compile_template(design["graph"], design["resource_configurations"], "ap-south-1", list(design["resource_configurations"]))
    assert compiled["omitted_node_ids"] == ["api", "web1", "web2", "web3", "web4"]
    assert compiled["deployment"] == "NOT_IMPLEMENTED"
    assert compiled == compile_template(design["graph"], design["resource_configurations"], "ap-south-1", list(reversed(design["resource_configurations"])))
    assert original == design
    with pytest.raises(ValueError):
        compile_template(design["graph"], design["resource_configurations"], "ap-south-1")
    assert not any(e["source"] == "logs" or e["target"] == "logs" for e in design["graph"]["edges"])


def test_shared_cross_vpc_case_is_rejected():
    data = load_fixture(); design = data["design"]; invalid = data["invalid_case"]
    design["graph"]["nodes"].append({"id": "other", "label": "Other VPC", "service": "AWS::EC2::VPC", "zone": "DATA", "description": "", "x": 0, "y": 0})
    design["resource_configurations"]["other"] = invalid["configuration"]
    design["resource_configurations"]["route"]["properties"]["vpc_node_id"] = invalid["route_vpc"]
    assert invalid["expected_issue"] in {i["code"] for i in validate_resources(design["graph"], design["resource_configurations"], "ap-south-1")["issues"]}


@pytest.mark.asyncio
async def test_shared_fixture_settings_survive_save_history_and_restore(github_setup):
    client, headers, _, _ = github_setup
    app_id = await linked_app(github_setup); path = f"/api/v1/architecture/workspace/{app_id}"
    initialized = (await client.post(path + "/initialize", headers=headers)).json()
    planned = await client.post(path + "/requirements", headers=headers, json={"expected_id": initialized["id"],
        "region": "ap-south-1", "availability": "MULTI_AZ", "peak_requests_per_minute": 500, "concurrent_users": 100})
    assert planned.status_code == 200, planned.text
    initialized = planned.json()
    design = load_fixture()["design"]
    saved = await client.post(path + "/save", headers=headers, json={"expected_id": initialized["id"], "graph": design["graph"]})
    assert saved.status_code == 200, saved.text
    current = saved.json()
    for node_id, configuration in design["resource_configurations"].items():
        result = await client.post(path + "/resource-configuration", headers=headers,
            json={"expected_id": current["id"], "node_id": node_id, "configuration": configuration})
        assert result.status_code == 200, result.text
        current = result.json()
    original = copy.deepcopy(current)
    changed = copy.deepcopy(current["graph"]); changed["nodes"][0].update(label="Reviewed VPC", x=160)
    edited = await client.post(path + "/save", headers=headers, json={"expected_id": current["id"], "graph": changed})
    assert edited.status_code == 200, edited.text
    assert edited.json()["resource_configurations"] == original["resource_configurations"]
    old = (await client.get(path + "/versions/" + original["id"], headers=headers)).json()
    assert old["graph"] == original["graph"]
    restored = await client.post(path + "/restore", headers=headers, json={"expected_id": edited.json()["id"], "version_id": original["id"]})
    assert restored.status_code == 200, restored.text
    assert restored.json()["id"] not in {original["id"], edited.json()["id"]}
    assert restored.json()["graph"] == original["graph"]
    assert restored.json()["resource_configurations"] == original["resource_configurations"]
