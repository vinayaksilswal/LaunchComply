"""Offline compiler contracts. No settings import, credentials or AWS calls."""
import copy
import json

import pytest
from pydantic import ValidationError
from app.services.architecture.resource_configuration import ADAPTER, compile_template, logical_id, schemas, validate_resources


def node(identity, service):
    return {"id": identity, "label": identity, "service": service, "zone": "DATA", "description": "", "x": 0, "y": 0}


def fixture():
    graph = {"nodes": [node("vpc", "AWS::EC2::VPC"), node("subnet", "AWS::EC2::Subnet"), node("bucket", "AWS::S3::Bucket"), node("logs", "AWS::Logs::LogGroup")], "edges": []}
    configs = {"vpc": {"resource_type": "AWS::EC2::VPC", "properties": {"cidr": "10.40.0.0/16"}},
               "subnet": {"resource_type": "AWS::EC2::Subnet", "properties": {"vpc_node_id": "vpc", "cidr": "10.40.1.0/24", "availability_zone": "ap-south-1a"}},
               "bucket": {"resource_type": "AWS::S3::Bucket", "properties": {}},
               "logs": {"resource_type": "AWS::Logs::LogGroup", "properties": {"retention_days": 30}}}
    return graph, configs


def test_deterministic_round_trip_and_stable_identity():
    graph, configs = fixture()
    before = copy.deepcopy((graph, configs))
    exported = compile_template(graph, configs, "ap-south-1")
    assert exported == compile_template(json.loads(json.dumps(graph)), json.loads(json.dumps(configs)), "ap-south-1")
    assert (graph, configs) == before
    assert exported["generated_resource_count"] == 5  # Four cards plus the mandatory TLS bucket policy.
    graph["nodes"][0].update(label="Renamed", x=450, y=123)
    assert exported == compile_template(graph, configs, "ap-south-1")
    assert logical_id("a-b") != logical_id("a_b")
    assert exported["aws_validation"] == "NOT_RUN"
    assert exported["deployment"] == "NOT_IMPLEMENTED"


def test_actual_template_security_and_typed_vpc_reference():
    graph, configs = fixture()
    resources = compile_template(graph, configs, "ap-south-1")["template"]["Resources"]
    assert resources[logical_id("subnet")]["Properties"]["VpcId"] == {"Ref": logical_id("vpc")}
    assert resources[logical_id("subnet")]["Properties"]["MapPublicIpOnLaunch"] is False
    bucket = resources[logical_id("bucket")]
    assert all(bucket["Properties"]["PublicAccessBlockConfiguration"].values())
    assert bucket["Properties"]["VersioningConfiguration"]["Status"] == "Enabled"
    assert bucket["Properties"]["BucketEncryption"]["ServerSideEncryptionConfiguration"][0]["ServerSideEncryptionByDefault"]["SSEAlgorithm"] == "AES256"
    assert "BucketName" not in bucket["Properties"]  # AWS names it; no global-name collisions guessed.
    assert bucket["DeletionPolicy"] == bucket["UpdateReplacePolicy"] == "Retain"
    policy = resources[logical_id("bucket") + "TlsPolicy"]["Properties"]["PolicyDocument"]["Statement"][0]
    assert policy["Effect"] == "Deny" and policy["Condition"]["Bool"]["aws:SecureTransport"] == "false"


@pytest.mark.parametrize("cidr", ["8.8.0.0/16", "10.0.1.1/24", "10.0.0.0/8", "10.0.0.0/29", "2001:db8::/64", "127.0.0.0/16", "169.254.0.0/16", "not-a-cidr"])
def test_invalid_or_public_cidr_rejected(cidr):
    with pytest.raises(ValueError):
        ADAPTER.validate_python({"resource_type": "AWS::EC2::VPC", "properties": {"cidr": cidr}})


@pytest.mark.parametrize("kind,properties", [
    ("AWS::EC2::VPC", {"cidr": "10.0.0.0/16", "dns_support": "true"}),
    ("AWS::EC2::VPC", {"cidr": "10.0.0.0/16", "dns_support": False, "dns_hostnames": True}),
    ("AWS::S3::Bucket", {"secret_access_key": "NOT_A_REAL_SECRET"}),
    ("AWS::S3::Bucket", {"versioning": 1}),
    ("AWS::Logs::LogGroup", {"retention_days": "30"}),
    ("AWS::Logs::LogGroup", {"retention_days": True}),
    ("AWS::Logs::LogGroup", {"retention_days": 31}),
    ("AWS::IAM::Role", {}),
])
def test_extra_properties_types_and_unsupported_resources_rejected(kind, properties):
    with pytest.raises(ValidationError):
        ADAPTER.validate_python({"resource_type": kind, "properties": properties})


@pytest.mark.parametrize("mutation,code", [
    (lambda g, c: c["subnet"]["properties"].update(vpc_node_id="missing"), "VPC_REFERENCE"),
    (lambda g, c: c["subnet"]["properties"].update(cidr="10.50.0.0/24"), "SUBNET_OUTSIDE_VPC"),
    (lambda g, c: c["subnet"]["properties"].update(availability_zone="us-east-1a"), "AZ_REGION"),
    (lambda g, c: g["nodes"][0].update(service="API"), "SERVICE_CHANGED"),
    (lambda g, c: g["nodes"].pop(0), "MISSING_COMPONENT"),
])
def test_references_network_containment_and_resource_identity(mutation, code):
    graph, configs = fixture()
    mutation(graph, configs)
    assert code in {issue["code"] for issue in validate_resources(graph, configs, "ap-south-1")["issues"]}
    with pytest.raises(ValueError):
        compile_template(graph, configs, "ap-south-1")


def test_subnet_overlap_and_parent_resize_are_detected():
    graph, configs = fixture()
    graph["nodes"].append(node("overlap", "AWS::EC2::Subnet"))
    configs["overlap"] = copy.deepcopy(configs["subnet"])
    assert "SUBNET_OVERLAP" in {issue["code"] for issue in validate_resources(graph, configs, "ap-south-1")["issues"]}
    configs["vpc"]["properties"]["cidr"] = "10.60.0.0/16"
    assert "SUBNET_OUTSIDE_VPC" in {issue["code"] for issue in validate_resources(graph, configs, "ap-south-1")["issues"]}


def test_partial_export_requires_explicit_selection_and_dependency_closure():
    graph, configs = fixture()
    graph["nodes"].append(node("api", "ECS Fargate"))
    with pytest.raises(ValueError):
        compile_template(graph, configs, "ap-south-1")
    result = compile_template(graph, configs, "ap-south-1", ["vpc", "subnet"])
    assert result["included_node_ids"] == ["subnet", "vpc"]
    assert result["omitted_node_ids"] == ["api", "bucket", "logs"]
    with pytest.raises(ValueError):
        compile_template(graph, configs, "ap-south-1", ["subnet"])


@pytest.mark.parametrize("selection", [[], ["missing"], ["vpc", "vpc"]])
def test_export_selection_is_not_silently_repaired(selection):
    graph, configs = fixture()
    with pytest.raises(ValueError):
        compile_template(graph, configs, "ap-south-1", selection)


def test_connections_never_become_unreviewed_routes_or_iam():
    graph, configs = fixture()
    graph["edges"] = [{"source": "subnet", "target": "bucket", "label": "Grant admin"}]
    result = compile_template(graph, configs, "ap-south-1")
    assert "Grant admin" not in json.dumps(result)
    assert all(resource["Type"] != "AWS::IAM::Role" for resource in result["template"]["Resources"].values())


def test_schema_catalog_marks_capabilities_honestly():
    result = schemas()
    assert result["schema_version"] == 1 and len(result["resources"]) == 4
    for item in result["resources"]:
        assert item["capabilities"]["cloudformation_export"] is True
        assert item["capabilities"]["verified_deployment"] is False
        assert item["schema"]["additionalProperties"] is False
        assert item["documentation"].startswith("https://docs.aws.amazon.com/")
