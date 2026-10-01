from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class ApplicationRelease(BaseModel):
    __tablename__ = "application_releases"

    organization_id = Column(String(36), nullable=False, index=True)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    environment_id = Column(String(36), ForeignKey("environments.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_id = Column(String(36), nullable=True)
    
    branch = Column(String(100), default="main", nullable=False)
    commit_sha = Column(String(64), nullable=False, index=True)
    version = Column(String(50), nullable=False, index=True) # e.g. v1.4.2
    
    # Status: DRAFT, QUEUED, BUILDING, BUILD_FAILED, ARTIFACT_READY, SECURITY_SCANNING, SECURITY_BLOCKED, AWAITING_APPROVAL, APPROVED, MIGRATING, MIGRATION_FAILED, DEPLOYING, VERIFYING, TRAFFIC_SHIFTING, LIVE, FAILED, ROLLBACK_PENDING, ROLLING_BACK, ROLLED_BACK, SUPERSEDED
    status = Column(String(50), default="DRAFT", nullable=False, index=True)
    
    created_by = Column(String(255), default="System", nullable=False)
    approved_by = Column(String(255), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    deployed_at = Column(DateTime(timezone=True), nullable=True)
    rollback_of_release_id = Column(String(36), nullable=True)

    # Relationships
    build_runs = relationship("BuildRun", back_populates="release", cascade="all, delete-orphan")
    container_images = relationship("ContainerImage", back_populates="release", cascade="all, delete-orphan")
    migration_runs = relationship("DatabaseMigrationRun", back_populates="release", cascade="all, delete-orphan")
    deployments = relationship("ApplicationDeployment", back_populates="release", cascade="all, delete-orphan")
    verifications = relationship("ReleaseVerification", back_populates="release", cascade="all, delete-orphan")
    evidences = relationship("ReleaseEvidence", back_populates="release", cascade="all, delete-orphan")

class BuildRun(BaseModel):
    __tablename__ = "build_runs"

    organization_id = Column(String(36), nullable=False, index=True)
    application_release_id = Column(String(36), ForeignKey("application_releases.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Status: QUEUED, BUILDING, SCANNING, COMPLETED, FAILED
    status = Column(String(50), default="QUEUED", nullable=False, index=True)
    worker_job_id = Column(String(255), nullable=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, default=0, nullable=False)
    failure_reason = Column(Text, nullable=True)
    builder_version = Column(String(50), default="1.0.0-isolated", nullable=False)
    source_commit_sha = Column(String(64), nullable=False)

    release = relationship("ApplicationRelease", back_populates="build_runs")
    artifacts = relationship("BuildArtifact", back_populates="build_run", cascade="all, delete-orphan")

class BuildArtifact(BaseModel):
    __tablename__ = "build_artifacts"

    organization_id = Column(String(36), nullable=False, index=True)
    build_run_id = Column(String(36), ForeignKey("build_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    artifact_type = Column(String(50), default="container_image", nullable=False) # container_image, sbom, manifest
    service_name = Column(String(100), nullable=False)
    image_repository = Column(String(255), nullable=False)
    image_tag = Column(String(100), nullable=False)
    image_digest = Column(String(128), nullable=False, index=True) # e.g. sha256:...
    sbom_key = Column(String(500), nullable=True)
    manifest_key = Column(String(500), nullable=True)
    size_bytes = Column(Integer, nullable=True)
    sha256 = Column(String(64), nullable=False)

    build_run = relationship("BuildRun", back_populates="artifacts")

class ContainerImage(BaseModel):
    __tablename__ = "container_images"

    organization_id = Column(String(36), nullable=False, index=True)
    application_release_id = Column(String(36), ForeignKey("application_releases.id", ondelete="CASCADE"), nullable=False, index=True)
    service_name = Column(String(100), nullable=False)
    ecr_repository = Column(String(255), nullable=False)
    image_tag = Column(String(100), nullable=False)
    image_digest = Column(String(128), nullable=False)
    # scan_status: SCANNING, PASS, WARN, BLOCK
    scan_status = Column(String(50), default="PASS", nullable=False)
    critical_vulnerabilities = Column(Integer, default=0, nullable=False)
    high_vulnerabilities = Column(Integer, default=0, nullable=False)
    medium_vulnerabilities = Column(Integer, default=0, nullable=False)

    release = relationship("ApplicationRelease", back_populates="container_images")

class DatabaseMigrationRun(BaseModel):
    __tablename__ = "database_migration_runs"

    organization_id = Column(String(36), nullable=False, index=True)
    application_release_id = Column(String(36), ForeignKey("application_releases.id", ondelete="CASCADE"), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    migration_type = Column(String(50), default="alembic", nullable=False) # alembic, prisma, django, none
    
    # Status: PENDING, RUNNING, COMPLETED, FAILED, SKIPPED
    status = Column(String(50), default="PENDING", nullable=False)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)
    output_summary = Column(Text, nullable=True)
    migration_version_before = Column(String(100), nullable=True)
    migration_version_after = Column(String(100), nullable=True)

    release = relationship("ApplicationRelease", back_populates="migration_runs")

class ApplicationDeployment(BaseModel):
    __tablename__ = "application_deployments"

    organization_id = Column(String(36), nullable=False, index=True)
    application_release_id = Column(String(36), ForeignKey("application_releases.id", ondelete="CASCADE"), nullable=False, index=True)
    environment_id = Column(String(36), ForeignKey("environments.id", ondelete="CASCADE"), nullable=False, index=True)
    
    strategy = Column(String(50), default="BLUE_GREEN", nullable=False) # BLUE_GREEN, ROLLING
    # Status: PENDING, DEPLOYING_GREEN, VERIFYING, TRAFFIC_SHIFTING, LIVE, FAILED, ROLLED_BACK
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    previous_release_id = Column(String(36), nullable=True)
    target_release_id = Column(String(36), nullable=False)
    traffic_percentage = Column(Integer, default=0, nullable=False)
    failure_reason = Column(Text, nullable=True)

    release = relationship("ApplicationRelease", back_populates="deployments")
    services = relationship("DeploymentService", back_populates="deployment", cascade="all, delete-orphan")
    traffic_shifts = relationship("TrafficShift", back_populates="deployment", cascade="all, delete-orphan")

class DeploymentService(BaseModel):
    __tablename__ = "deployment_services"

    organization_id = Column(String(36), nullable=False, index=True)
    application_deployment_id = Column(String(36), ForeignKey("application_deployments.id", ondelete="CASCADE"), nullable=False, index=True)
    service_name = Column(String(100), nullable=False)
    service_type = Column(String(50), default="api", nullable=False) # api, frontend, worker
    ecs_service_arn = Column(String(500), nullable=True)
    task_definition_arn = Column(String(500), nullable=True)
    desired_count = Column(Integer, default=2, nullable=False)
    running_count = Column(Integer, default=2, nullable=False)
    healthy_count = Column(Integer, default=2, nullable=False)
    status = Column(String(50), default="HEALTHY", nullable=False)

    deployment = relationship("ApplicationDeployment", back_populates="services")

class TrafficShift(BaseModel):
    __tablename__ = "traffic_shifts"

    organization_id = Column(String(36), nullable=False, index=True)
    application_deployment_id = Column(String(36), ForeignKey("application_deployments.id", ondelete="CASCADE"), nullable=False, index=True)
    from_target = Column(String(100), default="blue", nullable=False)
    to_target = Column(String(100), default="green", nullable=False)
    percentage = Column(Integer, default=100, nullable=False)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="COMPLETED", nullable=False)

    deployment = relationship("ApplicationDeployment", back_populates="traffic_shifts")

class ReleaseVerification(BaseModel):
    __tablename__ = "release_verifications"

    organization_id = Column(String(36), nullable=False, index=True)
    application_release_id = Column(String(36), ForeignKey("application_releases.id", ondelete="CASCADE"), nullable=False, index=True)
    environment_id = Column(String(36), nullable=False, index=True)
    verification_type = Column(String(50), default="SMOKE_TEST", nullable=False) # SMOKE_TEST, HEALTH_ENDPOINT, DB_CONNECTIVITY, TLS_VALIDITY
    # Status: PASS, WARN, FAIL
    status = Column(String(50), default="PASS", nullable=False)
    endpoint = Column(String(500), nullable=False)
    response_code = Column(Integer, default=200, nullable=False)
    latency_ms = Column(Float, default=45.0, nullable=False)
    details_json = Column(JSON, nullable=True)
    checked_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    release = relationship("ApplicationRelease", back_populates="verifications")

class RollbackRun(BaseModel):
    __tablename__ = "rollback_runs"

    organization_id = Column(String(36), nullable=False, index=True)
    application_deployment_id = Column(String(36), ForeignKey("application_deployments.id", ondelete="CASCADE"), nullable=False, index=True)
    rollback_to_release_id = Column(String(36), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    # Status: PENDING, RUNNING, COMPLETED, FAILED
    status = Column(String(50), default="COMPLETED", nullable=False)
    requested_by = Column(String(255), default="System Auto-Rollback", nullable=False)
    approved_by = Column(String(255), nullable=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

class DomainBinding(BaseModel):
    __tablename__ = "domain_bindings"

    organization_id = Column(String(36), nullable=False, index=True)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    environment_id = Column(String(36), ForeignKey("environments.id", ondelete="CASCADE"), nullable=False, index=True)
    domain = Column(String(255), nullable=False, index=True) # e.g. app.customer.com
    dns_provider = Column(String(100), default="Route53", nullable=False) # Route53, Cloudflare, External
    # Status: PENDING_DNS, DNS_VERIFIED, ISSUING_CERTIFICATE, ACTIVE, FAILED
    status = Column(String(50), default="ACTIVE", nullable=False)
    certificate_id = Column(String(36), nullable=True)
    target_type = Column(String(50), default="ALB", nullable=False)
    target_value = Column(String(500), nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    certificates = relationship("CertificateRecord", back_populates="domain_binding", cascade="all, delete-orphan")

class CertificateRecord(BaseModel):
    __tablename__ = "certificate_records"

    organization_id = Column(String(36), nullable=False, index=True)
    domain_binding_id = Column(String(36), ForeignKey("domain_bindings.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(50), default="AWS_ACM", nullable=False)
    certificate_arn = Column(String(500), nullable=False)
    # Status: REQUESTED, WAITING_DNS, ISSUED, FAILED, EXPIRED
    status = Column(String(50), default="ISSUED", nullable=False)
    validation_method = Column(String(50), default="DNS", nullable=False)
    requested_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    issued_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    domain_binding = relationship("DomainBinding", back_populates="certificates")

class RuntimeSecretBinding(BaseModel):
    __tablename__ = "runtime_secret_bindings"

    organization_id = Column(String(36), nullable=False, index=True)
    environment_id = Column(String(36), ForeignKey("environments.id", ondelete="CASCADE"), nullable=False, index=True)
    service_name = Column(String(100), nullable=False)
    environment_variable_name = Column(String(255), nullable=False)
    secrets_manager_arn = Column(String(500), nullable=False)
    required = Column(Boolean, default=True, nullable=False)
    configured = Column(Boolean, default=True, nullable=False)
    last_rotated_at = Column(DateTime(timezone=True), nullable=True)

class ReleaseEvidence(BaseModel):
    __tablename__ = "release_evidences"

    organization_id = Column(String(36), nullable=False, index=True)
    application_release_id = Column(String(36), ForeignKey("application_releases.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_type = Column(String(100), nullable=False) # BUILD_INTEGRITY, CONTAINER_SCAN, RELEASE_APPROVAL, MIGRATION_RESULT, SMOKE_TEST_PASS, TLS_CERTIFICATE
    source = Column(String(100), default="LaunchComply Delivery Engine", nullable=False)
    artifact_key = Column(String(500), nullable=True)
    sha256 = Column(String(64), nullable=False)

    release = relationship("ApplicationRelease", back_populates="evidences")
