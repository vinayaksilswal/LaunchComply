import copy

import pytest

from app.services.architecture.edit_scope import ScopeViolation
from app.services.architecture.resource_edits import apply_resource_updates, fingerprint, selected_schemas
from test_network_resources import network_fixture

def patch(node_id, resource_type, **changes):
    return {"node_id": node_id, "resource_type": resource_type, "changes": [{"name": key, "value": value} for key, value in changes.items()]}

def test_exact_property_patch_preserves_unrelated_resources_and_graph():
    graph, configs = network_fixture()
    original = copy.deepcopy((graph, configs))
    result = apply_resource_updates(graph, configs, [patch("api_in", "AWS::EC2::SecurityGroupIngress", from_port=9443, to_port=9443)],
        {"mode": "EDIT", "node_ids": ["api_in"]}, "ap-south-1")
    assert (graph, configs) == original
    assert result["api_in"]["properties"]["peer"] == "web_sg"
    assert result["api_in"]["properties"]["from_port"] == 9443
    assert all(result[key] == value for key, value in configs.items() if key != "api_in")
    assert fingerprint(result) != fingerprint(configs)
    assert fingerprint(configs) == fingerprint(dict(reversed(list(configs.items()))))

@pytest.mark.parametrize("mode,selected", [("REVIEW", []), ("ADD", []), ("REMOVE", ["api_in"]), ("EDIT", ["https"])])
def test_resource_scope_cannot_be_enlarged(mode, selected):
    graph, configs = network_fixture()
    with pytest.raises(ScopeViolation):
        apply_resource_updates(graph, configs, [patch("api_in", "AWS::EC2::SecurityGroupIngress", from_port=9443)], {"mode": mode, "node_ids": selected}, "ap-south-1")

@pytest.mark.parametrize("update", [
    patch("api_in", "AWS::EC2::SecurityGroupIngress", peer_kind="CIDR", peer="0.0.0.0/0"),
    patch("api_in", "AWS::EC2::SecurityGroupIngress", from_port="443"),
    patch("api_in", "AWS::EC2::SecurityGroupIngress", source_security_group_id="not-configured"),
    patch("api_in", "AWS::EC2::SecurityGroupIngress", peer="missing"),
    patch("api_in", "AWS::EC2::SecurityGroupEgress", from_port=443),
    patch("api_in", "AWS::EC2::SecurityGroupIngress", from_port=9000),
    {"node_id": "api_in", "resource_type": "AWS::EC2::SecurityGroupIngress", "changes": [{"name": "from_port", "value": 443}, {"name": "from_port", "value": 443}]},
    patch("api_in", "AWS::EC2::SecurityGroupIngress", api_key="fixture-credential"),
])
def test_invalid_or_unsafe_resource_changes_do_not_mutate_design(update):
    graph, configs = network_fixture()
    original = copy.deepcopy(configs)
    with pytest.raises(ValueError):
        apply_resource_updates(graph, configs, [update], {"mode": "EDIT", "node_ids": ["api_in"]}, "ap-south-1")
    assert configs == original

def test_duplicate_node_operations_are_rejected():
    graph, configs = network_fixture()
    change = patch("storage", "AWS::S3::Bucket", versioning=False)
    with pytest.raises(ValueError):
        apply_resource_updates(graph, configs, [change, change], {"mode": "EDIT", "node_ids": ["storage"]}, "ap-south-1")

def test_new_configuration_requires_explicit_required_properties():
    graph, configs = network_fixture()
    del configs["api_in"]
    scope = {"mode": "EDIT", "node_ids": ["api_in"]}
    with pytest.raises(ValueError):
        apply_resource_updates(graph, configs, [patch("api_in", "AWS::EC2::SecurityGroupIngress", from_port=8443)], scope, "ap-south-1")
    result = apply_resource_updates(graph, configs, [patch("api_in", "AWS::EC2::SecurityGroupIngress", group_node_id="api_sg", protocol="tcp", from_port=8443, to_port=8443, peer_kind="SECURITY_GROUP", peer="web_sg")], scope, "ap-south-1")
    assert result["api_in"]["properties"]["peer"] == "web_sg"

def test_only_selected_resource_schemas_enter_ai_context():
    graph, _ = network_fixture()
    assert selected_schemas(graph, {"mode": "REVIEW", "node_ids": []}) == []
    assert [schema["resource_type"] for schema in selected_schemas(graph, {"mode": "EDIT", "node_ids": ["storage"]})] == ["AWS::S3::Bucket"]
