from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, DateTime, Text, JSON, Enum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class SourceControlProviderType(str, enum.Enum):
    GITHUB = "GITHUB"
    GITLAB = "GITLAB"
    BITBUCKET = "BITBUCKET"

class ConnectionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    REVOKED = "REVOKED"
    ERROR = "ERROR"

class SourceControlConnection(BaseModel):
    __tablename__ = "source_control_connections"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(Enum(SourceControlProviderType), default=SourceControlProviderType.GITHUB, nullable=False)
    provider_account_id = Column(String(100), nullable=False)
    provider_account_name = Column(String(255), nullable=False)
    installation_id = Column(String(100), nullable=False, index=True)
    status = Column(Enum(ConnectionStatus), default=ConnectionStatus.ACTIVE, nullable=False)
    connected_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    connected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)

    repositories = relationship("Repository", back_populates="connection", cascade="all, delete-orphan")

class Repository(BaseModel):
    __tablename__ = "repositories"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    source_control_connection_id = Column(String(36), ForeignKey("source_control_connections.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_repository_id = Column(String(100), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False, index=True)
    owner = Column(String(100), nullable=False)
    default_branch = Column(String(100), default="main", nullable=False)
    visibility = Column(String(50), default="private", nullable=False) # public, private
    html_url = Column(String(500), nullable=False)
    language = Column(String(100), nullable=True)
    archived = Column(Boolean, default=False, nullable=False)
    selected = Column(Boolean, default=True, nullable=False)
    last_synced_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    connection = relationship("SourceControlConnection", back_populates="repositories")
    branches = relationship("RepositoryBranch", back_populates="repository", cascade="all, delete-orphan")
    application_links = relationship("ApplicationRepository", back_populates="repository", cascade="all, delete-orphan")

class RepositoryBranch(BaseModel):
    __tablename__ = "repository_branches"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_id = Column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    commit_sha = Column(String(100), nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    last_synced_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    repository = relationship("Repository", back_populates="branches")

class ApplicationRepository(BaseModel):
    __tablename__ = "application_repositories"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_id = Column(String(36), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    branch = Column(String(100), default="main", nullable=False)
    root_path = Column(String(500), default="/", nullable=False)
    is_primary = Column(Boolean, default=True, nullable=False)

    repository = relationship("Repository", back_populates="application_links")
