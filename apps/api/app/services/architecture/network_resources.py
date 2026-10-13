"""Explicit network definitions; no diagram heuristics, AWS calls or credentials."""
import ipaddress
import re
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, StrictStr, create_model, field_validator, model_validator

NodeId = Annotated[StrictStr, Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")]


def reference(kind, title):
    return Field(title=title, json_schema_extra={"reference_type": kind})


class Properties(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RouteTable(Properties):
    vpc_node_id: NodeId = reference("AWS::EC2::VPC", "VPC")


class Association(Properties):
    subnet_node_id: NodeId = reference("AWS::EC2::Subnet", "Subnet")
    route_table_node_id: NodeId = reference("AWS::EC2::RouteTable", "Route table")


class Empty(Properties):
    pass


class Attachment(Properties):
    vpc_node_id: NodeId = reference("AWS::EC2::VPC", "VPC")
    gateway_node_id: NodeId = reference("AWS::EC2::InternetGateway", "Internet gateway")


class Route(Properties):
    route_table_node_id: NodeId = reference("AWS::EC2::RouteTable", "Route table")
    destination_cidr: StrictStr = Field(default="0.0.0.0/0", max_length=18, title="Destination IPv4 CIDR")
    target_kind: Literal["INTERNET_GATEWAY", "NAT_GATEWAY"] = Field(title="Route target")
    target_node_id: NodeId = Field(title="Target resource", json_schema_extra={"reference_by": {"field": "target_kind", "types": {"INTERNET_GATEWAY": "AWS::EC2::InternetGateway", "NAT_GATEWAY": "AWS::EC2::NatGateway"}}})

    @field_validator("destination_cidr")
    @classmethod
    def cidr(cls, value):
        return str(ipaddress.IPv4Network(value, strict=True))


class NatGateway(Properties):
    subnet_node_id: NodeId = reference("AWS::EC2::Subnet", "Public subnet")
    allocation_node_id: NodeId = reference("AWS::EC2::EIP", "Dedicated Elastic IP")


class SecurityGroup(Properties):
    vpc_node_id: NodeId = reference("AWS::EC2::VPC", "VPC")
    group_description: StrictStr = Field(min_length=1, max_length=255, pattern=r"^[a-zA-Z0-9 ._:/()#,@\[\]+=;&{}!$*\-]+$", title="Group description")
    security_role: Literal["PUBLIC_INGRESS", "FRONTEND", "PRIVATE_BACKEND", "ISOLATED_DATA", "CUSTOM"] = Field(default="CUSTOM", title="Security role", description="Backend/data inbound rules must reference a same-VPC security group, not a CIDR.")


class Rule(Properties):
    group_node_id: NodeId = reference("AWS::EC2::SecurityGroup", "Security group")
    protocol: Literal["tcp", "udp"] = Field(default="tcp", title="Protocol")
    from_port: StrictInt = Field(ge=1, le=65535, title="From port")
    to_port: StrictInt = Field(ge=1, le=65535, title="To port")
    peer_kind: Literal["SECURITY_GROUP", "CIDR"] = Field(title="Peer type")
    peer: StrictStr = Field(min_length=1, max_length=64, title="Peer resource or IPv4 CIDR", json_schema_extra={"reference_by": {"field": "peer_kind", "types": {"SECURITY_GROUP": "AWS::EC2::SecurityGroup"}}})

    @model_validator(mode="after")
    def ports_and_peer(self):
        if self.to_port < self.from_port:
            raise ValueError("The last port cannot be below the first port.")
        if self.peer_kind == "CIDR":
            ipaddress.IPv4Network(self.peer, strict=True)
        elif not re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", self.peer):
            raise ValueError("Select an existing security group.")
        return self


class Egress(Rule):
    allow_public_https_egress: StrictBool = Field(default=False, title="Explicitly allow public HTTPS egress", description="Required for a 0.0.0.0/0 TCP 443 outbound rule; this does not verify TLS or destination trust.")


class S3Endpoint(Properties):
    vpc_node_id: NodeId = reference("AWS::EC2::VPC", "VPC")
    route_table_node_ids: list[NodeId] = Field(min_length=1, max_length=20, title="Associated route tables", json_schema_extra={"reference_type": "AWS::EC2::RouteTable"})
    bucket_node_id: NodeId = reference("AWS::S3::Bucket", "Allowed bucket")
    access: Literal["READ_ONLY", "READ_WRITE"] = Field(default="READ_ONLY", title="Endpoint access", description="Scoped endpoint policy only. Application IAM and bucket policies still determine access; delete is not granted.")

    @field_validator("route_table_node_ids")
    @classmethod
    def unique(cls, value):
        if len(value) != len(set(value)):
            raise ValueError("Select each route table once.")
        return value


NETWORK_MODELS = {
    "AWS::EC2::RouteTable": (RouteTable, "ec2-routetable", "Route table", "Only explicit routes/associations are compiled; the VPC local route is AWS-managed."),
    "AWS::EC2::SubnetRouteTableAssociation": (Association, "ec2-subnetroutetableassociation", "Subnet route-table association", "Changing this association changes the subnet routing. One explicit association per subnet."),
    "AWS::EC2::InternetGateway": (Empty, "ec2-internetgateway", "Internet gateway", "Requires an explicit VPC gateway attachment and route. Does not expose a workload by itself."),
    "AWS::EC2::VPCGatewayAttachment": (Attachment, "ec2-vpcgatewayattachment", "Internet gateway attachment", "One internet gateway per VPC; explicit same-stack references only."),
    "AWS::EC2::Route": (Route, "ec2-route", "IPv4 route", "Internet gateway or zonal public NAT target only. No peering, Transit Gateway or IPv6 routes in this configuration schema."),
    "AWS::EC2::EIP": (Empty, "ec2-eip", "Elastic IP", "New VPC Elastic IP allocation. Allocation charges and account quotas need review; existing addresses are not imported."),
    "AWS::EC2::NatGateway": (NatGateway, "ec2-natgateway", "Zonal public NAT gateway", "Dedicated Elastic IP and a public subnet with an internet-gateway default route are required. NAT has ongoing charges; multi-AZ egress needs separate gateways/routes."),
    "AWS::EC2::SecurityGroup": (SecurityGroup, "ec2-securitygroup", "Security group", "No inbound rules. Default internet egress is replaced by the AWS-documented localhost-only rule; add explicit separate outbound rules. Workloads must attach this group."),
    "AWS::EC2::SecurityGroupIngress": (Rule, "ec2-securitygroupingress", "Inbound security rule", "TCP/UDP IPv4 or same-VPC group peer only. Public inbound is limited to TCP 443 on a PUBLIC_INGRESS group. SG rules do not implement authentication or TLS."),
    "AWS::EC2::SecurityGroupEgress": (Egress, "ec2-securitygroupegress", "Outbound security rule", "Explicit TCP/UDP peer and port range. Internet-wide egress requires the public HTTPS acknowledgement and TCP 443 only."),
    "AWS::EC2::VPCEndpoint": (S3Endpoint, "ec2-vpcendpoint", "S3 gateway endpoint", "Only regional S3 gateway endpoints are supported. Policy permits selected bucket reads or reads/writes, not deletes. It does not grant application IAM access."),
}
NETWORK_CONFIGURATIONS = tuple(create_model(kind.split("::")[-1] + "NetworkConfiguration", __base__=Properties,
    resource_type=(Literal[kind], ...), properties=(model, ...)) for kind, (model, *_rest) in NETWORK_MODELS.items())
NETWORK_ALIASES = {kind: set() for kind in NETWORK_MODELS}
NETWORK_ALIASES["AWS::EC2::VPCEndpoint"] = {"S3 gateway VPC endpoint"}


def references(config):
    values = config.properties.model_dump()
    for key, field in type(config.properties).model_fields.items():
        metadata = field.json_schema_extra or {}
        kind = metadata.get("reference_type")
        if "reference_by" in metadata:
            selector = metadata["reference_by"]
            kind = selector["types"].get(values.get(selector["field"]))
        if kind:
            value = values[key]
            for node_id in value if isinstance(value, list) else [value]:
                yield key, node_id, kind


def vpc_for(node_id, parsed):
    config = parsed.get(node_id)
    if not config:
        return None
    if config.resource_type == "AWS::EC2::VPC":
        return node_id
    return getattr(config.properties, "vpc_node_id", None)


def public_route(subnet_id, parsed):
    tables = {config.properties.route_table_node_id for config in parsed.values()
              if config.resource_type == "AWS::EC2::SubnetRouteTableAssociation" and config.properties.subnet_node_id == subnet_id}
    return next((key for key, config in sorted(parsed.items()) if config.resource_type == "AWS::EC2::Route"
                 and config.properties.route_table_node_id in tables and config.properties.destination_cidr == "0.0.0.0/0"
                 and config.properties.target_kind == "INTERNET_GATEWAY"), None)


def gateway_attachment(gateway_id, vpc_id, parsed):
    return next((key for key, config in sorted(parsed.items()) if config.resource_type == "AWS::EC2::VPCGatewayAttachment"
                 and config.properties.gateway_node_id == gateway_id and config.properties.vpc_node_id == vpc_id), None)


def validate_network(parsed):
    issues, unique = [], {}
    def issue(key, code, message):
        issues.append({"node_id": key, "code": code, "message": message})
    def once(key, signature, message):
        if signature in unique:
            issue(key, "DUPLICATE_NETWORK_RESOURCE", message)
        unique[signature] = key
    for key, config in sorted(parsed.items()):
        kind, p = config.resource_type, config.properties
        refs = list(references(config))
        invalid = False
        for field, target_id, target_kind in refs:
            target = parsed.get(target_id)
            if not target or target.resource_type != target_kind:
                issue(key, "RESOURCE_REFERENCE", f"{field}: select a configured {target_kind} component in this architecture.")
                invalid = True
        if kind not in NETWORK_MODELS or invalid:
            continue
        if kind == "AWS::EC2::SubnetRouteTableAssociation":
            once(key, ("association", p.subnet_node_id), "A subnet can have only one explicit route-table association.")
            if vpc_for(p.subnet_node_id, parsed) != vpc_for(p.route_table_node_id, parsed):
                issue(key, "CROSS_VPC", "Subnet and route table must belong to the same VPC.")
        elif kind == "AWS::EC2::VPCGatewayAttachment":
            once(key, ("attached_vpc", p.vpc_node_id), "A VPC can have only one internet gateway.")
            once(key, ("attached_gateway", p.gateway_node_id), "An internet gateway can attach to only one VPC.")
        elif kind == "AWS::EC2::Route":
            once(key, ("route", p.route_table_node_id, p.destination_cidr), "Duplicate destination in the same route table.")
            vpc = vpc_for(p.route_table_node_id, parsed)
            if p.target_kind == "INTERNET_GATEWAY":
                if not gateway_attachment(p.target_node_id, vpc, parsed):
                    issue(key, "GATEWAY_ATTACHMENT", "Attach this internet gateway to the route table's VPC first.")
            else:
                nat = parsed[p.target_node_id]
                if vpc_for(nat.properties.subnet_node_id, parsed) != vpc:
                    issue(key, "CROSS_VPC", "NAT gateway and route table must belong to the same VPC.")
        elif kind == "AWS::EC2::NatGateway":
            once(key, ("allocation", p.allocation_node_id), "Each NAT gateway needs a dedicated Elastic IP.")
            if not public_route(p.subnet_node_id, parsed):
                issue(key, "NAT_PUBLIC_SUBNET", "Associate the NAT subnet with an internet-gateway default route first.")
        elif kind in {"AWS::EC2::SecurityGroupIngress", "AWS::EC2::SecurityGroupEgress"}:
            group = parsed[p.group_node_id]
            once(key, (kind, p.group_node_id, p.protocol, p.from_port, p.to_port, p.peer_kind, p.peer), "Duplicate security group rule.")
            if p.peer_kind == "SECURITY_GROUP":
                if vpc_for(p.group_node_id, parsed) != vpc_for(p.peer, parsed):
                    issue(key, "CROSS_VPC", "Group peers must be in the same VPC; peering is not configured by this schema.")
            else:
                cidr = ipaddress.IPv4Network(p.peer)
                wide = not any(cidr.subnet_of(ipaddress.IPv4Network(block)) for block in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"))
                if kind.endswith("Ingress"):
                    if group.properties.security_role in {"PRIVATE_BACKEND", "ISOLATED_DATA"}:
                        issue(key, "PRIVATE_INGRESS", "Backend/data inbound access must reference an authorized security group.")
                    elif wide and not (group.properties.security_role == "PUBLIC_INGRESS" and p.protocol == "tcp" and p.from_port == p.to_port == 443):
                        issue(key, "PUBLIC_INGRESS", "Public CIDR inbound access is limited to TCP 443 on a PUBLIC_INGRESS group.")
                elif wide and not (p.allow_public_https_egress and p.protocol == "tcp" and p.from_port == p.to_port == 443):
                    issue(key, "PUBLIC_EGRESS", "Public CIDR egress requires explicit HTTPS acknowledgement and TCP 443 only.")
        elif kind == "AWS::EC2::VPCEndpoint":
            for table in p.route_table_node_ids:
                if vpc_for(table, parsed) != p.vpc_node_id:
                    issue(key, "CROSS_VPC", "Endpoint route tables must belong to its VPC.")
            once(key, ("s3_endpoint", p.vpc_node_id), "Only one S3 gateway endpoint per VPC is supported.")
    return issues


def compile_network(node_id, config, parsed, logical_id, tags):
    kind, p = config.resource_type, config.properties
    ref = lambda key: {"Ref": logical_id(key)}
    depends = []
    if kind == "AWS::EC2::RouteTable":
        values = {"VpcId": ref(p.vpc_node_id), "Tags": tags}
    elif kind == "AWS::EC2::SubnetRouteTableAssociation":
        values = {"SubnetId": ref(p.subnet_node_id), "RouteTableId": ref(p.route_table_node_id)}
    elif kind == "AWS::EC2::InternetGateway":
        values = {"Tags": tags}
    elif kind == "AWS::EC2::VPCGatewayAttachment":
        values = {"VpcId": ref(p.vpc_node_id), "InternetGatewayId": ref(p.gateway_node_id)}
    elif kind == "AWS::EC2::EIP":
        values = {"Domain": "vpc", "Tags": tags}
    elif kind == "AWS::EC2::Route":
        values = {"RouteTableId": ref(p.route_table_node_id), "DestinationCidrBlock": p.destination_cidr,
                  "GatewayId" if p.target_kind == "INTERNET_GATEWAY" else "NatGatewayId": ref(p.target_node_id)}
        if p.target_kind == "INTERNET_GATEWAY":
            depends.append(logical_id(gateway_attachment(p.target_node_id, vpc_for(p.route_table_node_id, parsed), parsed)))
    elif kind == "AWS::EC2::NatGateway":
        values = {"SubnetId": ref(p.subnet_node_id), "AllocationId": {"Fn::GetAtt": [logical_id(p.allocation_node_id), "AllocationId"]}, "ConnectivityType": "public", "Tags": tags}
        depends.append(logical_id(public_route(p.subnet_node_id, parsed)))
    elif kind == "AWS::EC2::SecurityGroup":
        values = {"VpcId": ref(p.vpc_node_id), "GroupDescription": p.group_description, "Tags": tags,
                  "SecurityGroupEgress": [{"CidrIp": "127.0.0.1/32", "IpProtocol": "-1"}]}
    elif kind in {"AWS::EC2::SecurityGroupIngress", "AWS::EC2::SecurityGroupEgress"}:
        values = {"GroupId": {"Fn::GetAtt": [logical_id(p.group_node_id), "GroupId"]}, "IpProtocol": p.protocol, "FromPort": p.from_port, "ToPort": p.to_port}
        if p.peer_kind == "CIDR":
            values["CidrIp"] = p.peer
        else:
            values["SourceSecurityGroupId" if kind.endswith("Ingress") else "DestinationSecurityGroupId"] = {"Fn::GetAtt": [logical_id(p.peer), "GroupId"]}
    else:  # Scoped S3 gateway endpoint; not arbitrary interface endpoints.
        arn = {"Fn::GetAtt": [logical_id(p.bucket_node_id), "Arn"]}
        object_arn = {"Fn::Sub": ["${BucketArn}/*", {"BucketArn": arn}]}
        actions = ["s3:GetObject"] + (["s3:PutObject", "s3:AbortMultipartUpload"] if p.access == "READ_WRITE" else [])
        values = {"VpcId": ref(p.vpc_node_id), "VpcEndpointType": "Gateway", "ServiceName": {"Fn::Sub": "com.amazonaws.${AWS::Region}.s3"},
                  "RouteTableIds": [ref(key) for key in p.route_table_node_ids], "PolicyDocument": {"Version": "2012-10-17", "Statement": [
                      {"Effect": "Allow", "Principal": "*", "Action": ["s3:ListBucket", "s3:GetBucketLocation"], "Resource": arn},
                      {"Effect": "Allow", "Principal": "*", "Action": actions, "Resource": object_arn}]}}
    return values, depends
