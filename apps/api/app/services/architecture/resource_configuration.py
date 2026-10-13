"""Versioned resource properties and deterministic, offline CloudFormation export.

This module has no settings, database, model-provider or AWS dependencies. Only
the explicitly supported properties compile; diagram arrows are never IAM,
network routes or inferred CloudFormation dependencies.
"""
import hashlib
import ipaddress
import json
import re
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, StrictStr, TypeAdapter, field_validator, model_validator


class Properties(BaseModel):
    model_config = ConfigDict(extra="forbid")


def private_cidr(value):
    network = ipaddress.IPv4Network(value, strict=True)
    private = [ipaddress.IPv4Network(cidr) for cidr in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")]
    if not 16 <= network.prefixlen <= 28 or not any(network.subnet_of(parent) for parent in private):
        raise ValueError("Use a canonical RFC1918 IPv4 CIDR with a /16 through /28 prefix.")
    return str(network)


class VpcProperties(Properties):
    cidr: StrictStr = Field(min_length=9, max_length=18, title="IPv4 CIDR", description="Canonical private network, /16 through /28.")
    dns_support: StrictBool = Field(default=True, title="DNS resolution")
    dns_hostnames: StrictBool = Field(default=True, title="DNS hostnames")
    _cidr = field_validator("cidr")(private_cidr)

    @model_validator(mode="after")
    def dns(self):
        if self.dns_hostnames and not self.dns_support:
            raise ValueError("DNS hostnames require DNS resolution.")
        return self


class SubnetProperties(Properties):
    vpc_node_id: StrictStr = Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$", title="Parent VPC", json_schema_extra={"reference_type": "AWS::EC2::VPC"})
    cidr: StrictStr = Field(min_length=9, max_length=18, title="IPv4 CIDR")
    availability_zone: StrictStr = Field(pattern=r"^[a-z]{2}(?:-[a-z]+)+-\d[a-z]$", max_length=32, title="Availability zone", description="Choose an AZ available to your AWS account, such as ap-south-1a.")
    _cidr = field_validator("cidr")(private_cidr)


class BucketProperties(Properties):
    versioning: StrictBool = Field(default=True, title="Object versioning")


class LogProperties(Properties):
    retention_days: StrictInt = Field(default=30, title="Retention in days", json_schema_extra={"enum": [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653]})

    @field_validator("retention_days")
    @classmethod
    def retention(cls, value):
        if value not in cls.model_fields["retention_days"].json_schema_extra["enum"]:
            raise ValueError("Select an AWS-supported retention period.")
        return value


class VpcConfiguration(Properties):
    resource_type: Literal["AWS::EC2::VPC"]
    properties: VpcProperties


class SubnetConfiguration(Properties):
    resource_type: Literal["AWS::EC2::Subnet"]
    properties: SubnetProperties


class BucketConfiguration(Properties):
    resource_type: Literal["AWS::S3::Bucket"]
    properties: BucketProperties


class LogConfiguration(Properties):
    resource_type: Literal["AWS::Logs::LogGroup"]
    properties: LogProperties


ResourceConfiguration = Annotated[VpcConfiguration | SubnetConfiguration | BucketConfiguration | LogConfiguration, Field(discriminator="resource_type")]
ADAPTER = TypeAdapter(ResourceConfiguration)
MODELS = {
    "AWS::EC2::VPC": (VpcProperties, "ec2-vpc", "VPC", "CIDR changes require replacement. Routes, endpoints and security groups are not generated."),
    "AWS::EC2::Subnet": (SubnetProperties, "ec2-subnet", "Subnet", "CIDR, VPC or AZ changes can require replacement. No public IP assignment or internet route is generated."),
    "AWS::S3::Bucket": (BucketProperties, "s3-bucket", "Private S3 bucket", "Public access blocked; AES256 encryption and TLS-only bucket policy. IAM grants, VPC endpoints and backups require separate configuration."),
    "AWS::Logs::LogGroup": (LogProperties, "logs-loggroup", "CloudWatch log group", "Retention is configured; application emitters, IAM permissions and alarms are not generated."),
}
SERVICE_ALIASES = {"AWS::EC2::VPC": {"Amazon VPC", "VPC"}, "AWS::EC2::Subnet": {"Subnet"},
                   "AWS::S3::Bucket": {"S3", "Amazon S3", "S3 · private access"},
                   "AWS::Logs::LogGroup": {"CloudWatch Logs", "CloudWatch log group"}}


def schemas():
    return {"schema_version": 1, "resources": [{"resource_type": kind, "label": label,
        "schema": model.model_json_schema(), "documentation": f"https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-{doc}.html",
        "limitations": limit, "service_aliases": sorted(SERVICE_ALIASES[kind]),
        "capabilities": {"configuration": True, "cloudformation_export": True, "verified_deployment": False, "drift_management": False}}
        for kind, (model, doc, label, limit) in MODELS.items()]}


def matches_service(service, kind):
    if service == kind:
        return True
    # Exact, unambiguous aliases only. A CloudWatch monitoring card is not a log
    # group; an API or VPC endpoint cannot be reassigned to a VPC definition.
    return service in SERVICE_ALIASES[kind]


def validate_resources(graph, configurations, region=None):
    nodes = {node["id"]: node for node in graph["nodes"]}
    parsed, issues = {}, []

    def issue(node_id, code, message):
        issues.append({"node_id": node_id, "code": code, "message": message})

    for node_id, raw in configurations.items():
        if node_id not in nodes:
            issue(node_id, "MISSING_COMPONENT", "The configured component is no longer in the diagram.")
            continue
        try:
            config = ADAPTER.validate_python(raw)
        except ValueError:
            issue(node_id, "INVALID_PROPERTIES", "Resource properties are invalid or contain unsupported fields.")
            continue
        parsed[node_id] = config
        if not matches_service(nodes[node_id]["service"], config.resource_type):
            issue(node_id, "SERVICE_CHANGED", "The diagram service does not match its saved resource configuration.")
        if isinstance(config, SubnetConfiguration):
            if not region or config.properties.availability_zone[:-1] != region:
                issue(node_id, "AZ_REGION", "The subnet availability zone must match the selected AWS region.")
    subnets = {}
    for node_id, config in parsed.items():
        if not isinstance(config, SubnetConfiguration):
            continue
        parent = parsed.get(config.properties.vpc_node_id)
        if not isinstance(parent, VpcConfiguration):
            issue(node_id, "VPC_REFERENCE", "Select a configured VPC in this architecture.")
            continue
        network = ipaddress.IPv4Network(config.properties.cidr)
        if not network.subnet_of(ipaddress.IPv4Network(parent.properties.cidr)):
            issue(node_id, "SUBNET_OUTSIDE_VPC", "The subnet CIDR must be contained in its parent VPC.")
        siblings = subnets.setdefault(config.properties.vpc_node_id, [])
        for sibling_id, sibling in siblings:
            if network.overlaps(sibling):
                issue(node_id, "SUBNET_OVERLAP", f"The subnet CIDR overlaps component {sibling_id} in the same VPC.")
        siblings.append((node_id, network))
    return {"schema_version": 1, "issues": issues, "configured_count": len(parsed),
            "unconfigured_node_ids": [node_id for node_id in nodes if node_id not in configurations],
            "aws_validation": "NOT_RUN", "deployment": "NOT_IMPLEMENTED"}


def logical_id(node_id):
    # Never derive identity from labels or coordinates; punctuation must not
    # collapse a-b and a_b into the same CloudFormation logical ID.
    return "Lc" + hashlib.sha256(node_id.encode()).hexdigest()[:40]


def compile_template(graph, configurations, region, resource_ids=None):
    nodes = {node["id"]: node for node in graph["nodes"]}
    selected = set(nodes) if resource_ids is None else set(resource_ids)
    if not selected or len(selected) != len(resource_ids or selected) or not selected.issubset(nodes):
        raise ValueError("Choose unique, existing components for export.")
    if not re.fullmatch(r"[a-z]{2}(?:-[a-z]+)+-\d", region or ""):
        raise ValueError("Save the intended AWS region before exporting.")
    if not selected.issubset(configurations):
        raise ValueError("Every selected component needs a supported resource configuration. No partial template was generated.")
    chosen = {node_id: configurations[node_id] for node_id in sorted(selected)}
    review = validate_resources({"nodes": [nodes[node_id] for node_id in selected], "edges": []}, chosen, region)
    if review["issues"]:
        raise ValueError("Resolve selected resource configuration and VPC reference issues before exporting.")
    resources, parameters = {}, {}
    for node_id, raw in chosen.items():
        config = ADAPTER.validate_python(raw)
        properties = config.properties
        tags = [{"Key": "LaunchComplyNodeId", "Value": node_id}]
        if isinstance(config, VpcConfiguration):
            values = {"CidrBlock": properties.cidr, "EnableDnsSupport": properties.dns_support,
                      "EnableDnsHostnames": properties.dns_hostnames, "Tags": tags}
        elif isinstance(config, SubnetConfiguration):
            az_parameter = logical_id("az:" + properties.availability_zone)
            parameters[az_parameter] = {"Type": "AWS::EC2::AvailabilityZone::Name", "Default": properties.availability_zone,
                                        "Description": "Confirm an availability zone in the deployment account and selected region."}
            values = {"VpcId": {"Ref": logical_id(properties.vpc_node_id)}, "CidrBlock": properties.cidr,
                      "AvailabilityZone": {"Ref": az_parameter}, "MapPublicIpOnLaunch": False, "Tags": tags}
        elif isinstance(config, BucketConfiguration):
            values = {"PublicAccessBlockConfiguration": {key: True for key in ("BlockPublicAcls", "IgnorePublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets")},
                      "BucketEncryption": {"ServerSideEncryptionConfiguration": [{"ServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]},
                      "OwnershipControls": {"Rules": [{"ObjectOwnership": "BucketOwnerEnforced"}]}, "Tags": tags}
            values["VersioningConfiguration"] = {"Status": "Enabled" if properties.versioning else "Suspended"}
            resources[logical_id(node_id) + "TlsPolicy"] = {"Type": "AWS::S3::BucketPolicy", "DeletionPolicy": "Retain", "UpdateReplacePolicy": "Retain", "Properties": {
                "Bucket": {"Ref": logical_id(node_id)}, "PolicyDocument": {"Version": "2012-10-17", "Statement": [{
                    "Sid": "DenyInsecureTransport", "Effect": "Deny", "Principal": "*", "Action": "s3:*",
                    "Resource": [{"Fn::GetAtt": [logical_id(node_id), "Arn"]}, {"Fn::Sub": ["${BucketArn}/*", {"BucketArn": {"Fn::GetAtt": [logical_id(node_id), "Arn"]}}]}],
                    "Condition": {"Bool": {"aws:SecureTransport": "false", "aws:PrincipalIsAWSService": "false"}}}]}}}
        else:
            values = {"RetentionInDays": properties.retention_days, "Tags": tags}
        resources[logical_id(node_id)] = {"Type": config.resource_type, "Properties": values,
                                        "DeletionPolicy": "Retain", "UpdateReplacePolicy": "Retain"}
    template = {"AWSTemplateFormatVersion": "2010-09-09", "Description": "LaunchComply explicitly configured resources. Not an application deployment.",
                "Metadata": {"LaunchComply": {"schema_version": 1, "region": region, "node_ids": sorted(selected)}}, "Resources": resources}
    if parameters:
        template["Parameters"] = parameters
    digest = hashlib.sha256(json.dumps(template, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return {"template": template, "sha256": digest, "included_node_ids": sorted(selected),
            "omitted_node_ids": sorted(set(nodes) - selected), "generated_resource_count": len(resources),
            "aws_validation": "NOT_RUN", "deployment": "NOT_IMPLEMENTED",
            "notes": ["Offline property/reference checks only; AWS account, region availability, quotas and permissions remain unverified.",
                      "Diagram arrows are not infrastructure routes or access grants. No workload, HTTPS ingress, security group or scaling policy is created.",
                      "Resources use Retain on deletion/replacement. Retained resources continue to incur applicable costs and need an explicit recovery/cleanup plan.",
                      "Review and validate the template in the selected AWS account before a separately approved CloudFormation change set."]}
