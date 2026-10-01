"""Pydantic schemas for Phase 4 Release, Build, Deployment, Domain, and Secrets."""
from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict


class ReleaseCreateRequest(BaseModel):
    environment_id: str
    version: str
    commit_sha: str
    branch: str = "main"
    repository_id: Optional[str] = None


class ReleaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    application_id: str
    environment_id: str
    repository_id: Optional[str] = None
    branch: str
    commit_sha: str
    version: str
    status: str
    created_by: str
    created_at: datetime
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    deployed_at: Optional[datetime] = None
    rollback_of_release_id: Optional[str] = None


class BuildArtifactSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    service_name: str
    artifact_type: str
    image_repository: str
    image_tag: str
    image_digest: str
    sha256: str
    size_bytes: Optional[int] = None
    created_at: datetime


class ContainerImageSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    service_name: str
    ecr_repository: str
    image_tag: str
    image_digest: str
    scan_status: str
    critical_vulnerabilities: int
    high_vulnerabilities: int
    medium_vulnerabilities: int
    created_at: datetime


class BuildRunResponse(BaseModel):
    id: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    source_commit_sha: str
    artifacts: List[BuildArtifactSchema] = Field(default_factory=list)
    images: List[ContainerImageSchema] = Field(default_factory=list)
    logs: List[str] = Field(default_factory=list)


class ReleaseApproveRequest(BaseModel):
    comment: Optional[str] = None
    override_gates: bool = False
    override_reason: Optional[str] = None


class MigrationPlanRequest(BaseModel):
    migration_type: str = "alembic"


class MigrationRunRequest(BaseModel):
    migration_type: str = "alembic"
    create_snapshot: bool = True


class MigrationRunResponse(BaseModel):
    id: str
    status: str
    migration_type: str
    version_before: Optional[str] = None
    version_after: Optional[str] = None
    output_summary: Optional[str] = None
    duration_seconds: Optional[float] = None
    started_at: datetime
    completed_at: Optional[datetime] = None


class DeploymentTriggerRequest(BaseModel):
    strategy: str = "BLUE_GREEN"  # BLUE_GREEN or ROLLING


class DeploymentServiceSchema(BaseModel):
    service_name: str
    service_type: str
    ecs_service_arn: Optional[str] = None
    task_definition_arn: Optional[str] = None
    desired_count: int
    running_count: int
    healthy_count: int
    status: str


class DeploymentResponse(BaseModel):
    id: str
    application_release_id: str
    environment_id: str
    strategy: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    traffic_percentage: int
    previous_release_id: Optional[str] = None
    services: List[DeploymentServiceSchema] = Field(default_factory=list)
    logs: List[str] = Field(default_factory=list)


class RollbackRequest(BaseModel):
    rollback_to_release_id: Optional[str] = None
    reason: str


class DomainBindingRequest(BaseModel):
    domain: str


class DomainBindingResponse(BaseModel):
    id: str
    domain: str
    dns_provider: str
    status: str
    certificate_id: Optional[str] = None
    target_type: str
    target_value: str
    created_at: datetime
    verified_at: Optional[datetime] = None
    validation_records: List[Dict[str, Any]] = Field(default_factory=list)


class SecretWriteRequest(BaseModel):
    service_name: str
    environment_variable_name: str
    secret_value: str  # Write-only!
    required: bool = True


class SecretMetadataResponse(BaseModel):
    id: str
    service_name: str
    environment_variable_name: str
    secrets_manager_arn: str
    required: bool
    configured: bool
    last_rotated_at: Optional[datetime] = None
    classification: str = "MANAGED_SECRET"
