from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class InfrastructureStack(BaseModel):
    __tablename__ = "infrastructure_stacks"

    organization_id = Column(String(36), nullable=False, index=True)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    environment_id = Column(String(36), ForeignKey("environments.id", ondelete="CASCADE"), nullable=False, index=True)
    architecture_id = Column(String(36), nullable=True, index=True)
    cloud_account_id = Column(String(36), nullable=True, index=True)
    
    provider = Column(String(50), default="AWS", nullable=False)
    region = Column(String(50), default="ap-south-1", nullable=False)
    profile = Column(String(50), default="BALANCED", nullable=False) # LEAN, BALANCED, HIGH_AVAILABILITY
    
    # Status: DRAFT, ARCHITECTURE_APPROVED, READY_TO_PLAN, PLANNING, PLAN_READY, AWAITING_APPROVAL, APPROVED, PROVISIONING, VERIFYING, READY, UPDATE_AVAILABLE, FAILED, ROLLBACK_REQUIRED, DESTROY_PENDING, DESTROYING, DESTROYED
    status = Column(String(50), default="DRAFT", nullable=False, index=True)
    
    specification_json = Column(JSON, nullable=True) # Normalized InfrastructureSpecification
    current_version = Column(String(50), default="v1.0.0", nullable=False)
    
    # Relationships
    plans = relationship("InfrastructurePlan", back_populates="stack", cascade="all, delete-orphan")
    runs = relationship("ProvisioningRun", back_populates="stack", cascade="all, delete-orphan")
    resources = relationship("CloudResource", back_populates="stack", cascade="all, delete-orphan")
    outputs = relationship("InfrastructureOutput", back_populates="stack", cascade="all, delete-orphan")
    drift_runs = relationship("DriftDetectionRun", back_populates="stack", cascade="all, delete-orphan")

class InfrastructureVersion(BaseModel):
    __tablename__ = "infrastructure_versions"

    organization_id = Column(String(36), nullable=False, index=True)
    infrastructure_stack_id = Column(String(36), ForeignKey("infrastructure_stacks.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(String(50), nullable=False)
    architecture_version = Column(String(50), default="v1.0", nullable=False)
    specification_json = Column(JSON, nullable=False)
    iac_engine = Column(String(50), default="OPENTOFU", nullable=False)
    iac_version = Column(String(20), default="1.6.0", nullable=False)
    configuration_hash = Column(String(64), nullable=False)
    created_by = Column(String(255), default="System", nullable=False)

class InfrastructurePlan(BaseModel):
    __tablename__ = "infrastructure_plans"

    organization_id = Column(String(36), nullable=False, index=True)
    infrastructure_stack_id = Column(String(36), ForeignKey("infrastructure_stacks.id", ondelete="CASCADE"), nullable=False, index=True)
    infrastructure_version_id = Column(String(36), nullable=True)
    
    # Status: PENDING, READY, APPROVED, REJECTED, EXPIRED, APPLIED, FAILED
    status = Column(String(50), default="READY", nullable=False, index=True)
    plan_key = Column(String(255), nullable=True)
    plan_summary_json = Column(JSON, nullable=True)
    
    resources_add = Column(Integer, default=0, nullable=False)
    resources_change = Column(Integer, default=0, nullable=False)
    resources_destroy = Column(Integer, default=0, nullable=False)
    
    estimated_cost_delta = Column(String(100), default="₹0 / mo", nullable=False)
    requested_by = Column(String(255), default="System", nullable=False)
    approved_by = Column(String(255), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    stack = relationship("InfrastructureStack", back_populates="plans")

class ProvisioningRun(BaseModel):
    __tablename__ = "provisioning_runs"

    organization_id = Column(String(36), nullable=False, index=True)
    infrastructure_stack_id = Column(String(36), ForeignKey("infrastructure_stacks.id", ondelete="CASCADE"), nullable=False, index=True)
    infrastructure_plan_id = Column(String(36), ForeignKey("infrastructure_plans.id", ondelete="CASCADE"), nullable=True)
    
    # Status: QUEUED, INITIALIZING, VALIDATING, PLANNING, WAITING_APPROVAL, APPLYING, DISCOVERING, VERIFYING, COMPLETED, FAILED, CANCELLED
    status = Column(String(50), default="QUEUED", nullable=False, index=True)
    worker_job_id = Column(String(255), nullable=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    triggered_by = Column(String(255), default="System", nullable=False)

    stack = relationship("InfrastructureStack", back_populates="runs")
    steps = relationship("ProvisioningStep", back_populates="run", cascade="all, delete-orphan")

class ProvisioningStep(BaseModel):
    __tablename__ = "provisioning_steps"

    organization_id = Column(String(36), nullable=False, index=True)
    provisioning_run_id = Column(String(36), ForeignKey("provisioning_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    step = Column(String(100), nullable=False)
    # Status: PENDING, RUNNING, COMPLETED, FAILED, SKIPPED
    status = Column(String(50), default="PENDING", nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    message = Column(Text, nullable=True)

    run = relationship("ProvisioningRun", back_populates="steps")

class CloudResource(BaseModel):
    __tablename__ = "cloud_resources"

    organization_id = Column(String(36), nullable=False, index=True)
    infrastructure_stack_id = Column(String(36), ForeignKey("infrastructure_stacks.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    architecture_node_id = Column(String(100), nullable=True, index=True) # Linked to ArchitectureCanvas node ID
    
    provider_resource_id = Column(String(255), nullable=False, index=True) # e.g. vpc-0a1b2c3d4e, db-instance-name
    provider_resource_arn = Column(String(500), nullable=True)
    resource_type = Column(String(100), nullable=False) # aws_vpc, aws_ecs_service, aws_db_instance, aws_s3_bucket, etc.
    category = Column(String(100), default="Compute", nullable=False)
    region = Column(String(50), default="ap-south-1", nullable=False)
    availability_zone = Column(String(50), nullable=True)
    
    # Status: CREATING, AVAILABLE, MODIFIED, DELETING, DELETED, DRIFTED, FAILED
    status = Column(String(50), default="AVAILABLE", nullable=False)
    
    # Ownership: MANAGED, DISCOVERED, EXTERNAL
    managed_by_launchcomply = Column(String(50), default="MANAGED", nullable=False)
    
    tags_json = Column(JSON, nullable=True)
    configuration_json = Column(JSON, nullable=True)
    discovered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_verified_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    stack = relationship("InfrastructureStack", back_populates="resources")

class InfrastructureOutput(BaseModel):
    __tablename__ = "infrastructure_outputs"

    organization_id = Column(String(36), nullable=False, index=True)
    infrastructure_stack_id = Column(String(36), ForeignKey("infrastructure_stacks.id", ondelete="CASCADE"), nullable=False, index=True)
    key = Column(String(255), nullable=False)
    value = Column(Text, nullable=False)
    sensitive = Column(Boolean, default=False, nullable=False)

    stack = relationship("InfrastructureStack", back_populates="outputs")

class DriftDetectionRun(BaseModel):
    __tablename__ = "drift_detection_runs"

    organization_id = Column(String(36), nullable=False, index=True)
    infrastructure_stack_id = Column(String(36), ForeignKey("infrastructure_stacks.id", ondelete="CASCADE"), nullable=False, index=True)
    # Status: RUNNING, NO_DRIFT, DRIFT_DETECTED, FAILED
    status = Column(String(50), default="NO_DRIFT", nullable=False)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    drift_count = Column(Integer, default=0, nullable=False)
    summary_json = Column(JSON, nullable=True)

    stack = relationship("InfrastructureStack", back_populates="drift_runs")
    drifts = relationship("ResourceDrift", back_populates="run", cascade="all, delete-orphan")

class ResourceDrift(BaseModel):
    __tablename__ = "resource_drifts"

    organization_id = Column(String(36), nullable=False, index=True)
    drift_detection_run_id = Column(String(36), ForeignKey("drift_detection_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    cloud_resource_id = Column(String(36), ForeignKey("cloud_resources.id", ondelete="CASCADE"), nullable=False, index=True)
    attribute = Column(String(255), nullable=False) # e.g. ingress_rules, backup_retention_period, storage_encrypted
    expected_value = Column(Text, nullable=False)
    actual_value = Column(Text, nullable=False)
    # Severity: LOW, MEDIUM, HIGH, CRITICAL
    severity = Column(String(50), default="MEDIUM", nullable=False)

    run = relationship("DriftDetectionRun", back_populates="drifts")

class TerraformStateReference(BaseModel):
    __tablename__ = "terraform_state_references"

    organization_id = Column(String(36), nullable=False, index=True)
    infrastructure_stack_id = Column(String(36), ForeignKey("infrastructure_stacks.id", ondelete="CASCADE"), nullable=False, index=True)
    backend_type = Column(String(50), default="s3", nullable=False)
    state_location = Column(String(500), nullable=False) # S3 URI, never plaintext state in DB
    lock_identifier = Column(String(255), nullable=True)
    version = Column(Integer, default=1, nullable=False)
    checksum = Column(String(64), nullable=False)
    last_updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class InfrastructureEvidence(BaseModel):
    __tablename__ = "infrastructure_evidences"

    organization_id = Column(String(36), nullable=False, index=True)
    infrastructure_stack_id = Column(String(36), ForeignKey("infrastructure_stacks.id", ondelete="CASCADE"), nullable=False, index=True)
    cloud_resource_id = Column(String(36), ForeignKey("cloud_resources.id", ondelete="CASCADE"), nullable=True, index=True)
    evidence_type = Column(String(100), nullable=False) # ENCRYPTION_AT_REST, MULTI_AZ_RESILIENCE, PUBLIC_ACCESS_BLOCK, IAM_LEAST_PRIVILEGE, BACKUP_POLICY
    control_code = Column(String(100), nullable=False) # e.g. ISO-27001-A.8.24, SOC2-CC6.1, DPDP-SEC-8
    framework = Column(String(100), default="ISO 27001", nullable=False)
    title = Column(String(255), nullable=False)
    raw_snapshot_json = Column(JSON, nullable=True)
    sha256_hash = Column(String(64), nullable=False)
    verified_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
