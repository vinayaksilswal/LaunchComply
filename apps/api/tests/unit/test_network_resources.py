"""Real network compiler contracts with isolated in-memory canonical designs."""
import copy
import json

import pytest
from pydantic import ValidationError

from app.services.architecture.resource_configuration import ADAPTER, compile_template, logical_id, validate_resources
from test_resource_configuration import node


def network_fixture():
    specs = {
        "vpc": ("VPC", {"cidr": "10.20.0.0/16"}),
        "public": ("Subnet", {"vpc_node_id": "vpc", "cidr": "10.20.1.0/24", "availability_zone": "ap-south-1a"}),
        "private": ("Subnet", {"vpc_node_id": "vpc", "cidr": "10.20.2.0/24", "availability_zone": "ap-south-1a"}),
        "isolated": ("Subnet", {"vpc_node_id": "vpc", "cidr": "10.20.3.0/24", "availability_zone": "ap-south-1b"}),
        "public_rt": ("RouteTable", {"vpc_node_id": "vpc"}),
        "private_rt": ("RouteTable", {"vpc_node_id": "vpc"}),
        "isolated_rt": ("RouteTable", {"vpc_node_id": "vpc"}),
        "public_assoc": ("SubnetRouteTableAssociation", {"subnet_node_id": "public", "route_table_node_id": "public_rt"}),
        "private_assoc": ("SubnetRouteTableAssociation", {"subnet_node_id": "private", "route_table_node_id": "private_rt"}),
        "isolated_assoc": ("SubnetRouteTableAssociation", {"subnet_node_id": "isolated", "route_table_node_id": "isolated_rt"}),
        "igw": ("InternetGateway", {}),
        "attachment": ("VPCGatewayAttachment", {"vpc_node_id": "vpc", "gateway_node_id": "igw"}),
        "internet": ("Route", {"route_table_node_id": "public_rt", "target_kind": "INTERNET_GATEWAY", "target_node_id": "igw"}),
        "eip": ("EIP", {}),
        "nat": ("NatGateway", {"subnet_node_id": "public", "allocation_node_id": "eip"}),
        "egress": ("Route", {"route_table_node_id": "private_rt", "target_kind": "NAT_GATEWAY", "target_node_id": "nat"}),
        "web_sg": ("SecurityGroup", {"vpc_node_id": "vpc", "group_description": "Public web ingress", "security_role": "PUBLIC_INGRESS"}),
        "api_sg": ("SecurityGroup", {"vpc_node_id": "vpc", "group_description": "Private API", "security_role": "PRIVATE_BACKEND"}),
        "https": ("SecurityGroupIngress", {"group_node_id": "web_sg", "from_port": 443, "to_port": 443, "peer_kind": "CIDR", "peer": "0.0.0.0/0"}),
        "api_in": ("SecurityGroupIngress", {"group_node_id": "api_sg", "from_port": 8443, "to_port": 8443, "peer_kind": "SECURITY_GROUP", "peer": "web_sg"}),
        "web_out": ("SecurityGroupEgress", {"group_node_id": "web_sg", "from_port": 8443, "to_port": 8443, "peer_kind": "SECURITY_GROUP", "peer": "api_sg"}),
        "storage": ("S3::Bucket", {}),
        "endpoint": ("VPCEndpoint", {"vpc_node_id": "vpc", "route_table_node_ids": ["private_rt", "isolated_rt"], "bucket_node_id": "storage"}),
    }
    configs = {key: {"resource_type": "AWS::" + kind if "::" in kind else "AWS::EC2::" + kind, "properties": props} for key, (kind, props) in specs.items()}
    graph = {"nodes": [node(key, config["resource_type"]) for key, config in configs.items()], "edges": []}
    return graph, configs


def test_complete_public_private_isolated_foundation_is_deterministic_and_typed():
    graph, configs = network_fixture()
    original = copy.deepcopy((graph, configs))
    assert not validate_resources(graph, configs, "ap-south-1")["issues"]
    compiled = compile_template(graph, configs, "ap-south-1")
    assert compiled == compile_template(json.loads(json.dumps(graph)), json.loads(json.dumps(configs)), "ap-south-1")
    assert (graph, configs) == original
    resources = compiled["template"]["Resources"]
    assert resources[logical_id("internet")]["DependsOn"] == [logical_id("attachment")]
    assert resources[logical_id("nat")]["DependsOn"] == [logical_id("internet")]
    assert resources[logical_id("egress")]["Properties"]["NatGatewayId"] == {"Ref": logical_id("nat")}
    assert resources[logical_id("nat")]["Properties"]["AllocationId"] == {"Fn::GetAtt": [logical_id("eip"), "AllocationId"]}
    assert resources[logical_id("api_sg")]["Properties"]["SecurityGroupEgress"] == [{"CidrIp": "127.0.0.1/32", "IpProtocol": "-1"}]
    assert resources[logical_id("api_in")]["Properties"]["SourceSecurityGroupId"] == {"Fn::GetAtt": [logical_id("web_sg"), "GroupId"]}
    assert resources[logical_id("web_out")]["Properties"]["DestinationSecurityGroupId"] == {"Fn::GetAtt": [logical_id("api_sg"), "GroupId"]}
    assert resources[logical_id("api_in")]["DeletionPolicy"] == resources[logical_id("api_in")]["UpdateReplacePolicy"] == "Delete"
    assert resources[logical_id("web_out")]["DeletionPolicy"] == resources[logical_id("web_out")]["UpdateReplacePolicy"] == "Delete"
    assert resources[logical_id("storage")]["DeletionPolicy"] == "Retain"
    assert compiled["template"]["Metadata"]["LaunchComply"]["compiler_version"] == 2
    assert all(config["properties"].get("route_table_node_id") != "isolated_rt" for config in configs.values() if config["resource_type"] == "AWS::EC2::Route")
    policy = resources[logical_id("endpoint")]["Properties"]["PolicyDocument"]
    assert all(statement["Resource"] != "*" for statement in policy["Statement"])
    assert "s3:PutObject" not in policy["Statement"][1]["Action"]


@pytest.mark.parametrize("kind,properties", [
    ("SecurityGroupIngress", {"group_node_id": "g", "from_port": "443", "to_port": 443, "peer_kind": "CIDR", "peer": "0.0.0.0/0"}),
    ("SecurityGroupIngress", {"group_node_id": "g", "from_port": 100, "to_port": 50, "peer_kind": "CIDR", "peer": "10.0.0.0/8"}),
    ("SecurityGroupIngress", {"group_node_id": "g", "from_port": 0, "to_port": 443, "peer_kind": "CIDR", "peer": "0.0.0.0/0"}),
    ("SecurityGroupIngress", {"group_node_id": "g", "from_port": 443, "to_port": 443, "peer_kind": "CIDR", "peer": "10.0.0.1/24"}),
    ("Route", {"route_table_node_id": "rt", "target_kind": "INTERNET_GATEWAY", "target_node_id": "igw", "destination_cidr": "0.0.0.1/0"}),
    ("VPCEndpoint", {"vpc_node_id": "v", "route_table_node_ids": ["rt", "rt"], "bucket_node_id": "b"}),
    ("VPCEndpoint", {"vpc_node_id": "v", "route_table_node_ids": [], "bucket_node_id": "b"}),
    ("VPCEndpoint", {"vpc_node_id": "v", "route_table_node_ids": ["rt"], "bucket_node_id": "b", "policy_document": {"Action": "*"}}),
    ("NatGateway", {"subnet_node_id": "s", "allocation_node_id": "e", "credential": "not-a-secret"}),
])
def test_invalid_network_properties_fail_closed(kind, properties):
    with pytest.raises(ValidationError):
        ADAPTER.validate_python({"resource_type": "AWS::EC2::" + kind, "properties": properties})


@pytest.mark.parametrize("key,changes,code", [
    ("api_in", {"peer_kind": "CIDR", "peer": "0.0.0.0/0"}, "PRIVATE_INGRESS"),
    ("api_in", {"peer_kind": "CIDR", "peer": "10.20.0.0/16"}, "PRIVATE_INGRESS"),
    ("https", {"from_port": 22, "to_port": 22}, "PUBLIC_INGRESS"),
    ("https", {"protocol": "udp"}, "PUBLIC_INGRESS"),
    ("web_out", {"peer_kind": "CIDR", "peer": "0.0.0.0/0", "from_port": 443, "to_port": 443}, "PUBLIC_EGRESS"),
    ("nat", {"subnet_node_id": "isolated"}, "NAT_PUBLIC_SUBNET"),
    ("endpoint", {"route_table_node_ids": ["missing"]}, "RESOURCE_REFERENCE"),
    ("api_in", {"peer": "storage"}, "RESOURCE_REFERENCE"),
])
def test_network_policy_and_dependencies_reject_unsafe_configuration(key, changes, code):
    graph, configs = network_fixture()
    configs[key]["properties"].update(changes)
    assert code in {issue["code"] for issue in validate_resources(graph, configs, "ap-south-1")["issues"]}
    with pytest.raises(ValueError):
        compile_template(graph, configs, "ap-south-1")


def test_explicit_public_https_egress_and_bucket_scoped_write_policy():
    graph, configs = network_fixture()
    configs["web_out"]["properties"].update(peer_kind="CIDR", peer="0.0.0.0/0", from_port=443, to_port=443, allow_public_https_egress=True)
    configs["endpoint"]["properties"]["access"] = "READ_WRITE"
    exported = compile_template(graph, configs, "ap-south-1")
    actions = exported["template"]["Resources"][logical_id("endpoint")]["Properties"]["PolicyDocument"]["Statement"][1]["Action"]
    assert "s3:PutObject" in actions and "s3:DeleteObject" not in actions and "s3:*" not in actions


@pytest.mark.parametrize("source", ["internet", "public_assoc", "api_in", "attachment", "nat"])
def test_duplicate_network_semantics_rejected(source):
    graph, configs = network_fixture()
    graph["nodes"].append(node("duplicate", configs[source]["resource_type"]))
    configs["duplicate"] = copy.deepcopy(configs[source])
    assert "DUPLICATE_NETWORK_RESOURCE" in {issue["code"] for issue in validate_resources(graph, configs, "ap-south-1")["issues"]}


@pytest.mark.parametrize("key,field", [("public_rt", "vpc_node_id"), ("api_sg", "vpc_node_id"), ("endpoint", "vpc_node_id")])
def test_cross_vpc_associations_rules_and_endpoint_rejected(key, field):
    graph, configs = network_fixture()
    graph["nodes"].append(node("other", "AWS::EC2::VPC"))
    configs["other"] = {"resource_type": "AWS::EC2::VPC", "properties": {"cidr": "10.30.0.0/16"}}
    configs[key]["properties"][field] = "other"
    assert "CROSS_VPC" in {issue["code"] for issue in validate_resources(graph, configs, "ap-south-1")["issues"]}


@pytest.mark.parametrize("excluded", ["attachment", "internet", "web_sg", "storage", "public_assoc"])
def test_partial_export_cannot_drop_typed_or_required_routing_dependencies(excluded):
    graph, configs = network_fixture()
    with pytest.raises(ValueError):
        compile_template(graph, configs, "ap-south-1", [key for key in configs if key != excluded])
