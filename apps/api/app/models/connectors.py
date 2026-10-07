"""Phase 8 Evidence Connectors and Auditor Collaboration Models."""
import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Enum

from app.models.base import BaseModel


class ConnectorType(str, enum.Enum):
    GITHUB_ENTERPRISE = "GITHUB_ENTERPRISE"
    DATADOG = "DATADOG"
    OKTA = "OKTA"
    GOOGLE_WORKSPACE = "GOOGLE_WORKSPACE"


class ConnectorStatus(str, enum.Enum):
    NOT_CONFIGURED = "NOT_CONFIGURED"
    CONNECTED = "CONNECTED"
    DEGRADED = "DEGRADED"
    ERROR = "ERROR"
    REVOKED = "REVOKED"


class AuditorCommentAction(str, enum.Enum):
    COMMENT = "COMMENT"
    ACCEPT_EVIDENCE = "ACCEPT_EVIDENCE"
    REJECT_EVIDENCE = "REJECT_EVIDENCE"
    REQUEST_CLARIFICATION = "REQUEST_CLARIFICATION"


class EvidenceConnector(BaseModel):
    """External automated evidence provider connection."""
    __tablename__ = "commercial_evidence_connectors"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    connector_type = Column(Enum(ConnectorType), nullable=False, index=True)
    status = Column(Enum(ConnectorStatus), default=ConnectorStatus.NOT_CONFIGURED, nullable=False, index=True)
    last_sync_at = Column(DateTime, nullable=True)
    records_synced = Column(Integer, default=0, nullable=False)
    config_encrypted = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)


class ConnectorSyncRun(BaseModel):
    """History of connector automated synchronization."""
    __tablename__ = "commercial_connector_sync_runs"

    connector_id = Column(String(36), ForeignKey("commercial_evidence_connectors.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="SUCCESS", nullable=False)
    items_collected = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)


class AuditorEvidenceComment(BaseModel):
    """Threaded auditor collaboration comment and acceptance/rejection marker."""
    __tablename__ = "commercial_auditor_evidence_comments"

    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_request_id = Column(String(100), nullable=True, index=True)
    evidence_id = Column(String(100), nullable=True, index=True)
    author_id = Column(String(36), nullable=True)
    author_name = Column(String(255), nullable=False)
    author_role = Column(String(50), default="AUDITOR", nullable=False)
    comment = Column(Text, nullable=False)
    action = Column(Enum(AuditorCommentAction), default=AuditorCommentAction.COMMENT, nullable=False)
