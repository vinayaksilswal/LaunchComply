from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, DateTime, Text, JSON, Enum, Float
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class AnalysisStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    FETCHING_REPOSITORY = "FETCHING_REPOSITORY"
    INDEXING = "INDEXING"
    DETECTING_STACK = "DETECTING_STACK"
    ANALYZING_SERVICES = "ANALYZING_SERVICES"
    ANALYZING_DEPENDENCIES = "ANALYZING_DEPENDENCIES"
    ANALYZING_CONFIGURATION = "ANALYZING_CONFIGURATION"
    ANALYZING_SECURITY = "ANALYZING_SECURITY"
    GENERATING_ARCHITECTURE = "GENERATING_ARCHITECTURE"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class ServiceType(str, enum.Enum):
    FRONTEND = "frontend"
    BACKEND = "backend"
    WORKER = "worker"
    SCHEDULER = "scheduler"
    DATABASE = "database"
    CACHE = "cache"
    QUEUE = "queue"
    STORAGE = "storage"
    PROXY = "proxy"
    UNKNOWN = "unknown"

class AnalysisRun(BaseModel):
    __tablename__ = "analysis_runs"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_id = Column(String(36), ForeignKey("repositories.id", ondelete="SET NULL"), nullable=True, index=True)
    environment_id = Column(String(36), ForeignKey("environments.id", ondelete="SET NULL"), nullable=True)
    branch = Column(String(100), default="main", nullable=False)
    commit_sha = Column(String(100), nullable=True)
    status = Column(Enum(AnalysisStatus), default=AnalysisStatus.QUEUED, nullable=False, index=True)
    progress_percent = Column(Integer, default=0, nullable=False)
    current_stage = Column(String(100), default="Queued for analysis", nullable=False)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    triggered_by_user_id = Column(String(36), nullable=True)
    analyzer_version = Column(String(50), default="v2.0.0-static", nullable=False)
    summary = Column(Text, nullable=True)
    failure_reason = Column(Text, nullable=True)
    metrics_json = Column(JSON, nullable=True) # file_count, lines_of_code, duration_ms

    services = relationship("DetectedService", back_populates="analysis_run", cascade="all, delete-orphan")
    env_vars = relationship("DetectedEnvironmentVariable", back_populates="analysis_run", cascade="all, delete-orphan")
    dependencies = relationship("DetectedDependency", back_populates="analysis_run", cascade="all, delete-orphan")
    findings = relationship("AnalysisFinding", back_populates="analysis_run", cascade="all, delete-orphan")
    recommendations = relationship("ArchitectureRecommendation", back_populates="analysis_run", cascade="all, delete-orphan")

class DetectedService(BaseModel):
    __tablename__ = "detected_services"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_run_id = Column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    service_type = Column(Enum(ServiceType), default=ServiceType.UNKNOWN, nullable=False)
    framework = Column(String(100), nullable=True)
    runtime = Column(String(100), nullable=True)
    runtime_version = Column(String(50), nullable=True)
    package_manager = Column(String(50), nullable=True)
    root_path = Column(String(500), default="/", nullable=False)
    build_command = Column(String(500), nullable=True)
    start_command = Column(String(500), nullable=True)
    containerized = Column(Boolean, default=False, nullable=False)
    dockerfile_path = Column(String(500), nullable=True)
    confidence_score = Column(Float, default=1.0, nullable=False)

    analysis_run = relationship("AnalysisRun", back_populates="services")
    ports = relationship("DetectedPort", back_populates="service", cascade="all, delete-orphan")
    health_checks = relationship("DetectedHealthCheck", back_populates="service", cascade="all, delete-orphan")

class DetectedPort(BaseModel):
    __tablename__ = "detected_ports"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    detected_service_id = Column(String(36), ForeignKey("detected_services.id", ondelete="CASCADE"), nullable=False, index=True)
    port = Column(Integer, nullable=False)
    protocol = Column(String(20), default="TCP", nullable=False)
    purpose = Column(String(100), default="HTTP API / Ingress", nullable=False)
    public_required = Column(Boolean, default=False, nullable=False)
    source_file = Column(String(500), nullable=True)

    service = relationship("DetectedService", back_populates="ports")

class DetectedEnvironmentVariable(BaseModel):
    __tablename__ = "detected_environment_variables"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_run_id = Column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    detected_service_id = Column(String(36), ForeignKey("detected_services.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(50), default="BACKEND_ONLY", nullable=False) # REQUIRED, SECRET, PUBLIC_FRONTEND, BACKEND_ONLY, DATABASE, THIRD_PARTY
    required = Column(Boolean, default=True, nullable=False)
    secret_likely = Column(Boolean, default=False, nullable=False)
    default_present = Column(Boolean, default=False, nullable=False)
    source_file = Column(String(500), nullable=True)
    description = Column(String(500), nullable=True)

    analysis_run = relationship("AnalysisRun", back_populates="env_vars")

class DetectedDependency(BaseModel):
    __tablename__ = "detected_dependencies"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_run_id = Column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    detected_service_id = Column(String(36), ForeignKey("detected_services.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    version_spec = Column(String(100), nullable=True)
    dependency_type = Column(String(50), default="production", nullable=False) # production, dev
    manifest_path = Column(String(500), nullable=False)

    analysis_run = relationship("AnalysisRun", back_populates="dependencies")

class DetectedHealthCheck(BaseModel):
    __tablename__ = "detected_health_checks"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    detected_service_id = Column(String(36), ForeignKey("detected_services.id", ondelete="CASCADE"), nullable=False, index=True)
    path = Column(String(255), default="/health", nullable=False)
    protocol = Column(String(20), default="HTTP", nullable=False)
    port = Column(Integer, default=8000, nullable=False)
    source_file = Column(String(500), nullable=True)
    confidence_score = Column(Float, default=1.0, nullable=False)

    service = relationship("DetectedService", back_populates="health_checks")

class DetectedDatabase(BaseModel):
    __tablename__ = "detected_databases"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_run_id = Column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    detected_service_id = Column(String(36), ForeignKey("detected_services.id", ondelete="SET NULL"), nullable=True)
    engine = Column(String(100), default="PostgreSQL", nullable=False)
    driver = Column(String(100), nullable=True)
    orm = Column(String(100), nullable=True) # SQLAlchemy, Prisma, Django, Sequelize
    connection_source = Column(String(255), default="DATABASE_URL", nullable=False)
    confidence_score = Column(Float, default=1.0, nullable=False)

class DetectedExternalIntegration(BaseModel):
    __tablename__ = "detected_external_integrations"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_run_id = Column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False) # payment, email, storage, AI, analytics, auth, monitoring
    source_file = Column(String(500), nullable=True)
    confidence_score = Column(Float, default=1.0, nullable=False)

class DetectedDataFlow(BaseModel):
    __tablename__ = "detected_data_flows"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_run_id = Column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    source_service = Column(String(100), nullable=False)
    target_service = Column(String(100), nullable=False)
    protocol = Column(String(50), default="HTTPS / TCP", nullable=False)
    port = Column(Integer, nullable=True)
    description = Column(String(500), nullable=True)
    confidence_score = Column(Float, default=1.0, nullable=False)

class AnalysisFinding(BaseModel):
    __tablename__ = "analysis_findings"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_run_id = Column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(100), nullable=False) # Secret Exposure, Missing Health Endpoint, Ephemeral Storage, Insecure User
    severity = Column(String(20), default="MEDIUM", nullable=False) # CRITICAL, HIGH, MEDIUM, LOW
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    source_file = Column(String(500), nullable=True)
    line_hint = Column(Integer, nullable=True)
    recommendation = Column(Text, nullable=False)
    status = Column(String(50), default="OPEN", nullable=False)

    analysis_run = relationship("AnalysisRun", back_populates="findings")

class ArchitectureRecommendation(BaseModel):
    __tablename__ = "architecture_recommendations"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_run_id = Column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    architecture_id = Column(String(36), ForeignKey("architectures.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="RECOMMENDED", nullable=False) # RECOMMENDED, APPROVED, SUPERSEDED
    profile_type = Column(String(50), default="BALANCED", nullable=False) # LEAN, BALANCED, HIGH_AVAILABILITY
    generator_version = Column(String(50), default="v2.0.0", nullable=False)
    summary = Column(Text, nullable=False)
    estimated_monthly_cost_min = Column(Integer, default=32000, nullable=False)
    estimated_monthly_cost_max = Column(Integer, default=45000, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    assumptions_json = Column(JSON, nullable=True)

    analysis_run = relationship("AnalysisRun", back_populates="recommendations")

class AnalysisArtifact(BaseModel):
    __tablename__ = "analysis_artifacts"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_run_id = Column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    artifact_type = Column(String(50), nullable=False) # index, dependency_tree, environment_contract, topology
    object_key = Column(String(500), nullable=False)
    sha256 = Column(String(64), nullable=False)
    size = Column(Integer, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
