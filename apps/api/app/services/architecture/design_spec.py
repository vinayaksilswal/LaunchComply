"""Canonical design reader contract. No persistence, settings, AI or AWS calls."""
import hashlib
import json
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, JsonValue, StrictBool, StrictFloat, StrictInt, StrictStr, model_validator

from .resource_configuration import ResourceConfiguration, MODELS, logical_id, validate_resources
from .deployment_planning import WorkloadPolicy, policy_issues

MAX_DESIGN_BYTES = 2 * 1024 * 1024
Identifier = Annotated[StrictStr, Field(pattern=r"^[a-zA-Z0-9_-]{1,64}$")]
RecordId = Annotated[StrictStr, Field(min_length=1, max_length=128)]


def canonical_json(value):
    def encode(item):
        if isinstance(item, BaseModel):
            return item.model_dump(mode="json")
        raise TypeError("Canonical JSON accepts only JSON values and contract models")
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False, default=encode)


def bounded_json(value):
    pending = [(value, 0)]
    count = 0
    while pending:
        item, depth = pending.pop()
        if isinstance(item, BaseModel):
            item = item.model_dump(mode="json")
        count += 1
        if depth > 24 or count > 100000:
            raise ValueError("Design metadata exceeds structural limits")
        if isinstance(item, dict):
            pending.extend((child, depth + 1) for child in item.values())
        elif isinstance(item, list):
            pending.extend((child, depth + 1) for child in item)
    if len(canonical_json(value).encode("utf-8")) > MAX_DESIGN_BYTES:
        raise ValueError("Design exceeds the supported payload limit")
    return value


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class Target(Contract):
    scope: Literal["REGIONAL", "GLOBAL", "UNKNOWN"] = "UNKNOWN"
    connection_ref: RecordId | None = None
    account_id: Annotated[StrictStr, Field(pattern=r"^\d{12}$")] | None = None
    region: Annotated[StrictStr, Field(pattern=r"^[a-z]{2}(?:-[a-z]+)+-\d$")] | None = None
    environment_id: RecordId | None = None


class ResourceCapabilities(Contract):
    drawable: Literal[True] = True
    configuration: StrictBool = False
    cloudformation_export: StrictBool = False
    verified_deployment: Literal[False] = False
    drift_management: Literal[False] = False


class Resource(Contract):
    id: Identifier
    label: Annotated[StrictStr, Field(min_length=1, max_length=100)]
    legacy_service: Annotated[StrictStr, Field(max_length=100)]
    description: Annotated[StrictStr, Field(max_length=500)] = ""
    layer: Literal["EDGE", "APPLICATION", "DATA", "SUPPORT"]
    catalog_type: Annotated[StrictStr, Field(max_length=100)] | None = None
    compiler_logical_id: Annotated[StrictStr, Field(pattern=r"^Lc[a-f0-9]{40}$")]
    configuration_schema_version: Literal[1] = 1
    configuration: ResourceConfiguration | None = None
    ownership: Literal["PLANNED", "DISCOVERED_UNMANAGED", "IMPORT_PENDING", "STACK_MANAGED"] = "PLANNED"
    ownership_evidence_ref: RecordId | None = None
    target: Target = Field(default_factory=Target)
    evidence_refs: list[RecordId] = Field(default_factory=list, max_length=100)
    capabilities: ResourceCapabilities | None = None

    @model_validator(mode="before")
    @classmethod
    def schema_version_type(cls, value):
        if isinstance(value, dict) and type(value.get("configuration_schema_version", 1)) is not int:
            raise ValueError("Configuration schema version must be an integer")
        return value

    @model_validator(mode="after")
    def identity(self):
        if self.compiler_logical_id != logical_id(self.id):
            raise ValueError("Compiler resource identity cannot be reassigned")
        if self.catalog_type is not None and self.catalog_type not in MODELS:
            raise ValueError("Unverified catalog types must remain planning-only")
        if self.configuration and self.configuration.resource_type != self.catalog_type:
            raise ValueError("Configuration must match the canonical resource type")
        if self.ownership == "STACK_MANAGED" and not self.ownership_evidence_ref:
            raise ValueError("Managed ownership needs an observation reference, verified separately by the server")
        expected = ResourceCapabilities(configuration=self.catalog_type is not None, cloudformation_export=self.configuration is not None)
        if self.capabilities is not None and self.capabilities != expected:
            raise ValueError("Capabilities come from supported configuration, not customer claims")
        self.capabilities = expected
        return self


class Workload(Contract):
    id: Identifier
    kind: Literal["FRONTEND", "BFF", "API", "WORKER", "JOB", "UNKNOWN"] = "UNKNOWN"
    execution_mode: Literal["BROWSER", "SERVER", "WORKER", "UNKNOWN"] = "UNKNOWN"
    resource_ids: list[Identifier] = Field(default_factory=list, max_length=80)
    evidence_refs: list[RecordId] = Field(default_factory=list, max_length=100)


class ConfigReference(Contract):
    resource_id: Identifier
    property: Annotated[StrictStr, Field(pattern=r"^[a-z][a-z0-9_]{0,63}$")]
    index: StrictInt | None = Field(default=None, ge=0, le=79)


class Connection(Contract):
    id: Identifier
    source: Identifier
    target: Identifier
    label: Annotated[StrictStr, Field(max_length=80)] = ""
    purpose: Literal["REQUEST", "DATA", "EVENT", "TELEMETRY", "BUILD", "CONFIG_REFERENCE", "SECURITY_RULE", "IAM_PERMISSION", "UNKNOWN"] = "UNKNOWN"
    origin: Literal["LEGACY", "DECLARED", "CONFIGURATION"] = "DECLARED"
    caller_mode: Literal["BROWSER", "SERVER", "WORKER", "UNKNOWN"] = "UNKNOWN"
    protocol: Literal["https", "http", "tcp", "udp", "postgresql", "mysql", "redis", "rediss", "mongodb", "mongodb+srv", "s3", "UNKNOWN"] = "UNKNOWN"
    destination_port: StrictInt | None = Field(default=None, ge=1, le=65535)
    tls: Literal["REQUIRED", "DISABLED", "UNKNOWN"] = "UNKNOWN"
    authentication: Literal["NONE", "JWT", "IAM", "MTLS", "UNKNOWN"] = "UNKNOWN"
    evidence_status: Literal["DECLARED", "INFERRED", "OBSERVED", "UNKNOWN"] = "UNKNOWN"
    evidence_refs: list[RecordId] = Field(default_factory=list, max_length=100)
    derived_from: ConfigReference | None = None

    @model_validator(mode="after")
    def ownership(self):
        if self.source == self.target:
            raise ValueError("A connection needs distinct endpoints")
        if self.origin == "CONFIGURATION":
            if self.purpose != "CONFIG_REFERENCE" or not self.derived_from or self.source != self.derived_from.resource_id:
                raise ValueError("Configuration projections need their actual property owner")
        elif self.derived_from or self.purpose in {"CONFIG_REFERENCE", "SECURITY_RULE", "IAM_PERMISSION"}:
            raise ValueError("Permissions and configuration references cannot be granted by a drawn edge")
        return self


class Requirements(Contract):
    peak_requests_per_minute: StrictInt | None = Field(default=None, ge=1, le=100000000)
    concurrent_users: StrictInt | None = Field(default=None, ge=1, le=10000000)
    region: Annotated[StrictStr, Field(pattern=r"^[a-z]{2}(?:-[a-z]+)+-\d$")] | None = None
    availability: Literal["SINGLE_AZ", "MULTI_AZ", "MULTI_REGION"] | None = None
    secondary_region: Annotated[StrictStr, Field(pattern=r"^[a-z]{2}(?:-[a-z]+)+-\d$")] | None = None
    sizing_workload_id: Identifier | None = None
    requests_per_second_per_replica: StrictFloat | StrictInt | None = Field(default=None, gt=0, le=1000000)
    workload_policies: list[WorkloadPolicy] = Field(default_factory=list, max_length=80)


class Position(Contract):
    x: StrictInt = Field(ge=0, le=6000)
    y: StrictInt = Field(ge=0, le=6000)
    pinned: StrictBool = False


class ViewState(Contract):
    node_positions: dict[Identifier, Position] = Field(max_length=80)
    node_order: list[Identifier] = Field(max_length=80)
    edge_order: list[Identifier] = Field(max_length=160)
    collapsed_resource_ids: list[Identifier] = Field(default_factory=list, max_length=80)
    zoom: StrictFloat | StrictInt | None = Field(default=None, ge=0.05, le=4)


class Extension(Contract):
    version: StrictInt = Field(ge=1, le=1000000)
    data: dict[str, JsonValue]


class SourceIdentity(Contract):
    legacy_commit: Annotated[StrictStr, Field(pattern=r"^[a-fA-F0-9]{40,64}$")] | None = None
    repository_refs: list["SourceRef"] = Field(default_factory=list, max_length=6)
    declared_bindings: list["DeclaredBinding"] = Field(default_factory=list, max_length=100)


class SourceRef(Contract):
    repository_id: RecordId | None = None
    repository: Annotated[StrictStr, Field(max_length=300)] = ""
    branch: Annotated[StrictStr, Field(max_length=300)] = ""
    root_path: Annotated[StrictStr, Field(max_length=1000)] = "/"
    commit: Annotated[StrictStr, Field(pattern=r"^[a-fA-F0-9]{40,64}$")] | None = None


class DeclaredBinding(Contract):
    name: Annotated[StrictStr, Field(pattern=r"^[A-Za-z_][A-Za-z0-9_]{0,79}$")]
    source: Identifier
    target: Identifier | None = None
    protocol: Literal["https", "http", "postgresql", "mysql", "redis", "rediss", "mongodb", "mongodb+srv", "s3", "unknown"] = "unknown"
    execution: Literal["browser", "server", "server-proxy", "unknown"] = "unknown"


def configuration_links(resources):
    """Reference ownership comes from property schemas, never labels or geometry."""
    result = {}
    for resource in resources.values():
        config = resource.configuration
        if config is None:
            continue
        properties = config.properties
        for name, field in type(properties).model_fields.items():
            metadata = field.json_schema_extra or {}
            kind = metadata.get("reference_type")
            if metadata.get("reference_by"):
                rule = metadata["reference_by"]
                kind = rule["types"].get(getattr(properties, rule["field"]))
            if not kind:
                continue
            value = getattr(properties, name)
            values = list(enumerate(value)) if isinstance(value, list) else [(None, value)]
            for index, target in values:
                identifier = "cfg_" + hashlib.sha256(canonical_json([resource.id, name, index, target]).encode()).hexdigest()[:40]
                result[identifier] = Connection(id=identifier, source=resource.id, target=target,
                    label=name, purpose="CONFIG_REFERENCE", origin="CONFIGURATION",
                    derived_from=ConfigReference(resource_id=resource.id, property=name, index=index))
    return result


class Design(Contract):
    format: Literal["launchcomply-design"] = "launchcomply-design"
    schema_version: Literal[2] = 2
    design_id: RecordId
    revision_id: RecordId
    parent_revision_id: RecordId | None = None
    organization_id: RecordId
    application_id: RecordId
    environment_id: RecordId | None = None
    source_snapshot_ids: list[RecordId] = Field(default_factory=list, max_length=100)
    source_identity: SourceIdentity = Field(default_factory=SourceIdentity)
    resources_by_id: dict[Identifier, Resource] = Field(max_length=80)
    workloads_by_id: dict[Identifier, Workload] = Field(default_factory=dict, max_length=80)
    connections_by_id: dict[Identifier, Connection] = Field(max_length=1760)
    requirements: Requirements | None = None
    view_state: ViewState
    analysis_metadata: dict[str, JsonValue] = Field(default_factory=dict)
    extensions: dict[Annotated[StrictStr, Field(pattern=r"^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)+$", max_length=100)], Extension] = Field(default_factory=dict, max_length=30)

    @model_validator(mode="before")
    @classmethod
    def size(cls, value):
        if isinstance(value, dict) and type(value.get("schema_version", 2)) is not int:
            raise ValueError("Design schema version must be an integer")
        return bounded_json(value) if isinstance(value, dict) else value

    @model_validator(mode="after")
    def references(self):
        ids = set(self.resources_by_id)
        for key, resource in self.resources_by_id.items():
            if key != resource.id:
                raise ValueError("Resource key must match its stable ID")
            if self.environment_id and resource.target.environment_id and resource.target.environment_id != self.environment_id:
                raise ValueError("Resource environment differs from the design environment")
        for key, workload in self.workloads_by_id.items():
            if key != workload.id or len(set(workload.resource_ids)) != len(workload.resource_ids) or not set(workload.resource_ids) <= ids:
                raise ValueError("Workload resource identities must exist and be unique")
        for key, connection in self.connections_by_id.items():
            if key != connection.id or connection.source not in ids or connection.target not in ids:
                raise ValueError("Connection identity or endpoint is invalid")
        expected = configuration_links(self.resources_by_id)
        actual = {key: conn for key, conn in self.connections_by_id.items() if conn.origin == "CONFIGURATION"}
        if actual != expected:
            raise ValueError("Configuration projections must match canonical property references")
        for connection in expected.values():
            left = self.resources_by_id[connection.source].target
            right = self.resources_by_id.get(connection.target)
            if right is not None:
                for field in ("region", "account_id", "environment_id"):
                    a, b = getattr(left, field), getattr(right.target, field)
                    if a is not None and b is not None and a != b:
                        raise ValueError("Configured references must stay in the same supported AWS scope")
        if len(set(self.source_snapshot_ids)) != len(self.source_snapshot_ids):
            raise ValueError("Source snapshot references must be unique")
        view = self.view_state
        ordinary = {key for key, conn in self.connections_by_id.items() if conn.origin != "CONFIGURATION"}
        if len(ordinary) > 160 or len(view.node_order) != len(ids) or set(view.node_order) != ids or set(view.node_positions) != ids:
            raise ValueError("View resource identities are incomplete or duplicated")
        if len(view.edge_order) != len(ordinary) or set(view.edge_order) != ordinary or not set(view.collapsed_resource_ids) <= ids:
            raise ValueError("View connection identities are incomplete or duplicated")
        graph = {"nodes": [{"id": r.id, "service": r.catalog_type or r.legacy_service, "zone": r.layer} for r in self.resources_by_id.values()],
                 "edges": [{"source": c.source, "target": c.target} for c in self.connections_by_id.values() if c.origin != "CONFIGURATION"]}
        configs = {r.id: r.configuration.model_dump() for r in self.resources_by_id.values() if r.configuration}
        review = validate_resources(graph, configs)
        if any(issue["code"] != "AZ_REGION" for issue in review["issues"]):
            raise ValueError("Resource properties contain invalid or dangling references")
        for r in self.resources_by_id.values():
            if r.configuration and r.catalog_type == "AWS::EC2::Subnet" and r.target.region and r.configuration.properties.availability_zone[:-1] != r.target.region:
                raise ValueError("Subnet availability zone must match its target region")
        if self.requirements:
            if self.requirements.sizing_workload_id and self.requirements.sizing_workload_id not in self.workloads_by_id:
                raise ValueError("Sizing target must identify an existing workload")
            if policy_issues(graph, [policy.model_dump() for policy in self.requirements.workload_policies]):
                raise ValueError("Workload policies need existing matching resources and routes")
        if any(binding.source not in ids or (binding.target is not None and binding.target not in ids) for binding in self.source_identity.declared_bindings):
            raise ValueError("Declared bindings must reference existing resources")
        return self
