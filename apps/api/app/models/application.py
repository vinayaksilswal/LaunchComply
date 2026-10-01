import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class AppStatus(str, enum.Enum):
    ANALYZING = "ANALYZING"
    READY_FOR_ARCHITECTURE = "READY_FOR_ARCHITECTURE"
    READY_TO_DEPLOY = "READY_TO_DEPLOY"
    DEPLOYING = "DEPLOYING"
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"

class Application(BaseModel):
    __tablename__ = "applications"
    
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    repo_url = Column(String(500), nullable=True)
    repo_branch = Column(String(100), default="main", nullable=False)
    repo_provider = Column(String(50), default="github", nullable=False)  # github, gitlab, archive, manual
    
    # Detected tech stack
    framework_frontend = Column(String(100), default="React", nullable=False)
    framework_backend = Column(String(100), default="FastAPI", nullable=False)
    database_engine = Column(String(100), default="PostgreSQL", nullable=False)
    runtime = Column(String(100), default="Python 3.11 / Node.js 20", nullable=False)
    containerized = Column(Boolean, default=True, nullable=False)
    health_endpoint = Column(String(100), default="/health", nullable=False)
    
    status = Column(Enum(AppStatus), default=AppStatus.HEALTHY, nullable=False)
    production_readiness_score = Column(String(10), default="84%", nullable=False)
    security_posture_score = Column(String(10), default="81%", nullable=False)
    compliance_readiness_score = Column(String(10), default="67%", nullable=False)

    organization = relationship("Organization", back_populates="applications")
    environments = relationship("Environment", back_populates="application", cascade="all, delete-orphan")

class Environment(BaseModel):
    __tablename__ = "environments"
    
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)  # production, staging, development
    slug = Column(String(100), nullable=False)
    aws_region = Column(String(50), default="ap-south-1", nullable=False)
    is_live = Column(Boolean, default=True, nullable=False)
    domain_name = Column(String(255), default="app.acmecloud.io", nullable=False)
    https_active = Column(Boolean, default=True, nullable=False)
    status = Column(String(50), default="HEALTHY", nullable=False)

    application = relationship("Application", back_populates="environments")
