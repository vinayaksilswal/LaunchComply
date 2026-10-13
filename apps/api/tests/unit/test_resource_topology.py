import copy
import pytest
from app.services.architecture.resource_topology import build_topology
from test_network_resources import network_fixture


def test_configured_topology_has_exact_ownership_and_distinct_relation_semantics():
    graph, configs = network_fixture()
    before = copy.deepcopy((graph, configs))
    result = build_topology(graph, configs, "ap-south-1")
    placements = {p["node_id"]: p for p in result["placements"]}
    assert len(placements) == len(configs) and not result["issues"]
    assert result["deployment_state"] == "NOT_VERIFIED"
    assert placements["nat"]["subnet_node_id"] == "public"
    assert placements["nat"]["availability_zone"] == "ap-south-1a"
    assert placements["igw"]["vpc_node_id"] == "vpc"
    assert placements["api_in"]["vpc_node_id"] == "vpc"
    assert placements["storage"]["vpc_node_id"] is None
    assert placements["storage"]["location"] == "MANAGED_SERVICE"
    assert placements["public"]["routing"] == "PUBLIC"
    assert placements["private"]["routing"] == "PRIVATE_NAT"
    assert placements["isolated"]["routing"] == "ISOLATED"
    relation = next(r for r in result["relations"] if r["source"] == "api_in" and r["target"] == "web_sg")
    assert relation["kind"] == "SECURITY_PEER" and relation["label"] == "TCP 8443-8443 peer"
    assert next(r for r in result["relations"] if r["source"] == "endpoint" and r["target"] == "storage")["kind"] == "ENDPOINT_POLICY"
    assert (graph, configs) == before
    assert result == build_topology(graph, dict(reversed(list(configs.items()))), "ap-south-1")


def test_missing_explicit_association_does_not_claim_isolation_or_infer_main_route_table():
    graph, configs = network_fixture()
    del configs["isolated_assoc"]
    result = build_topology(graph, configs, "ap-south-1")
    assert next(p for p in result["placements"] if p["node_id"] == "isolated")["routing"] == "UNKNOWN"
    assert any(i["code"] == "ROUTING_UNSPECIFIED" for i in result["issues"])


def test_labels_and_drawn_request_flows_cannot_change_configured_ownership():
    graph, configs = network_fixture()
    before = build_topology(graph, configs, "ap-south-1")
    for node in graph["nodes"]:
        node["label"] = "Private VPC internet production public frontend"
    graph["edges"] = [{"source": "storage", "target": "public", "label": "inside public VPC"}]
    assert build_topology(graph, configs, "ap-south-1") == before


@pytest.mark.parametrize("change", ["missing", "invalid", "region", "cross_vpc", "service"])
def test_invalid_resources_and_transitive_references_do_not_establish_false_containment(change):
    graph, configs = network_fixture()
    if change == "missing": graph["nodes"] = [n for n in graph["nodes"] if n["id"] != "vpc"]
    elif change == "invalid": configs["vpc"]["properties"]["cidr"] = "invalid"
    elif change == "region": configs["public"]["properties"]["availability_zone"] = "us-east-1a"
    elif change == "service": graph["nodes"][0]["service"] = "AWS::S3::Bucket"
    else: configs["public"]["properties"]["vpc_node_id"] = "storage"
    result = build_topology(graph, configs, "ap-south-1")
    ids = {p["node_id"] for p in result["placements"]}
    assert result["issues"]
    assert "nat" not in ids
    assert all(r["source"] in ids and r["target"] in ids for r in result["relations"])


def test_legacy_empty_and_future_schemas_fail_closed_without_mutation():
    graph, configs = network_fixture()
    assert build_topology(graph, {}, "ap-south-1")["placements"] == []
    future = build_topology(graph, configs, "ap-south-1", 2)
    assert not future["placements"] and not future["relations"]
    assert future["issues"][0]["code"] == "UNSUPPORTED_SCHEMA"
