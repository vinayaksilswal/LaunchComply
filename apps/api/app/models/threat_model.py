"""Phase 10 Continuous Threat Modeling & Attack Path Models."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ThreatCategory(str, enum.Enum):
    SPOOFING = "SPOOFING"
    TAMPERING = "TAMPERING"
    REPUDIATION = "REPUDIATION"
    INFORMATION_DISCLOSURE = "INFORMATION_DISCLOSURE"
    DENIAL_OF_SERVICE = "DENIAL_OF_SERVICE"
    ELEVATION_OF_PRIVILEGE = "ELEVATION_OF_PRIVILEGE"


class ThreatCriticality(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class ThreatStatus(str, enum.Enum):
    IDENTIFIED = "IDENTIFIED"
    MITIGATED = "MITIGATED"
    ACCEPTED = "ACCEPTED"
    CLOSED = "CLOSED"


class AttackPathStatus(str, enum.Enum):
    THEORETICAL = "THEORETICAL"
    POSSIBLE = "POSSIBLE"
    VALIDATED = "VALIDATED"
    MITIGATED = "MITIGATED"


class TrustBoundaryType(str, enum.Enum):
    INTERNET = "INTERNET"
    EDGE = "EDGE"
    PUBLIC_SUBNET = "PUBLIC_SUBNET"
    PRIVATE_APP = "PRIVATE_APP"
    DATABASE_SUBNET = "DATABASE_SUBNET"
    THIRD_PARTY = "THIRD_PARTY"
    ADMIN_PLANE = "ADMIN_PLANE"


class ThreatModel(BaseModel):
    """Container for an application's architecture threat models."""
    __tablename__ = "threat_models"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    environment_id = Column(String(36), nullable=True)
    name = Column(String(255), nullable=False)
    current_version = Column(Integer, default=1, nullable=False)


class ThreatModelVersion(BaseModel):
    """Specific snapshot version of a threat model tied to an IaC architecture revision."""
    __tablename__ = "threat_model_versions"

    threat_model_id = Column(String(36), ForeignKey("threat_models.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, default=1, nullable=False)
    architecture_version = Column(String(50), default="v1.0", nullable=False)
    status = Column(String(50), default="APPROVED", nullable=False)  # DRAFT, APPROVED, SUPERSEDED
    approved_by = Column(String(36), nullable=True)
    approved_at = Column(DateTime, nullable=True)


class ThreatAsset(BaseModel):
    """Identified critical asset within the architecture."""
    __tablename__ = "threat_assets"

    threat_model_version_id = Column(String(36), ForeignKey("threat_model_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    asset_type = Column(String(100), default="DATABASE", nullable=False)  # DATABASE, API_SERVICE, STORAGE_BUCKET, IAM_ROLE
    classification = Column(String(50), default="CONFIDENTIAL", nullable=False)
    criticality = Column(Enum(ThreatCriticality), default=ThreatCriticality.HIGH, nullable=False)
    trust_zone = Column(String(100), default="PRIVATE_SUBNET", nullable=False)
    internet_exposed = Column(Boolean, default=False, nullable=False)


class TrustBoundary(BaseModel):
    """Security trust perimeter separating architectural tiers."""
    __tablename__ = "threat_trust_boundaries"

    threat_model_version_id = Column(String(36), ForeignKey("threat_model_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    boundary_type = Column(Enum(TrustBoundaryType), default=TrustBoundaryType.PRIVATE_APP, nullable=False)


class Threat(BaseModel):
    """Specific STRIDE threat identified on an asset or boundary."""
    __tablename__ = "threat_identified_threats"

    threat_model_version_id = Column(String(36), ForeignKey("threat_model_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    threat_id = Column(String(50), nullable=False, index=True)  # e.g., THR-001
    category = Column(Enum(ThreatCategory), default=ThreatCategory.INFORMATION_DISCLOSURE, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    entry_point = Column(String(255), nullable=False)
    impact = Column(Integer, default=3, nullable=False)  # 1 to 5
    likelihood = Column(Integer, default=3, nullable=False)  # 1 to 5
    risk_level = Column(Enum(ThreatCriticality), default=ThreatCriticality.MEDIUM, nullable=False)
    status = Column(Enum(ThreatStatus), default=ThreatStatus.IDENTIFIED, nullable=False, index=True)
    risk_register_id = Column(String(36), nullable=True)  # Link to Phase 7 Risk model


class AttackPath(BaseModel):
    """Visualized sequence of steps an attacker could take to exploit an asset."""
    __tablename__ = "threat_attack_paths"

    threat_model_version_id = Column(String(36), ForeignKey("threat_model_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    threat_id = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    steps_json = Column(Text, default="[]", nullable=False)
    status = Column(Enum(AttackPathStatus), default=AttackPathStatus.POSSIBLE, nullable=False)


class ThreatMitigation(BaseModel):
    """Canonical control mitigation addressing an identified threat."""
    __tablename__ = "threat_mitigations"

    threat_id = Column(String(36), ForeignKey("threat_identified_threats.id", ondelete="CASCADE"), nullable=False, index=True)
    control_id = Column(String(50), nullable=False)  # e.g. LC-AC-001
    mitigation_description = Column(Text, nullable=False)
    status = Column(String(50), default="IMPLEMENTED", nullable=False)  # PLANNED, IMPLEMENTED, VERIFIED
