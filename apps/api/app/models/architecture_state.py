"""Current workspace identity, separate from saved architecture snapshots.

Source eligibility uses this record. Latest-version reads remain authoritative
for head identity during the A02 cutover.
"""
from sqlalchemy import CheckConstraint, Column, ForeignKeyConstraint, Index, Integer, String, JSON, UniqueConstraint, text

from app.models.base import BaseModel


class ArchitectureWorkspaceState(BaseModel):
    __tablename__ = "architecture_workspace_states"

    organization_id = Column(String(36), nullable=False)
    application_id = Column(String(36), nullable=False)
    environment_id = Column(String(36), nullable=True)
    head_architecture_id = Column(String(36), nullable=True)
    source_epoch = Column(Integer, nullable=False, server_default="0")
    analyzed_source_epoch = Column(Integer, nullable=True)
    state_version = Column(Integer, nullable=False, server_default="0")

    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "application_id"],
            ["applications.organization_id", "applications.id"],
            name="fk_arch_workspace_application", ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["organization_id", "application_id", "environment_id"],
            ["environments.organization_id", "environments.application_id", "environments.id"],
            name="fk_arch_workspace_environment", ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["organization_id", "application_id", "head_architecture_id"],
            ["architectures.organization_id", "architectures.application_id", "architectures.id"],
            name="fk_arch_workspace_head",
        ),
        CheckConstraint("source_epoch >= 0", name="ck_arch_workspace_source_epoch"),
        CheckConstraint("state_version >= 0", name="ck_arch_workspace_state_version"),
        CheckConstraint(
            "analyzed_source_epoch IS NULL OR (analyzed_source_epoch >= 0 AND analyzed_source_epoch <= source_epoch)",
            name="ck_arch_workspace_analyzed_epoch",
        ),
        Index("uq_arch_workspace_unassigned", "organization_id", "application_id", unique=True,
              sqlite_where=text("environment_id IS NULL"), postgresql_where=text("environment_id IS NULL")),
        Index("uq_arch_workspace_environment", "organization_id", "application_id", "environment_id", unique=True,
              sqlite_where=text("environment_id IS NOT NULL"), postgresql_where=text("environment_id IS NOT NULL")),
    )


class ArchitectureVersionActivity(BaseModel):
    """Version-linked conversation/review state; never deployment intent."""
    __tablename__ = "architecture_version_activity"

    organization_id = Column(String(36), nullable=False)
    application_id = Column(String(36), nullable=False)
    architecture_id = Column(String(36), nullable=False)
    payload = Column(JSON, nullable=False)

    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "application_id"],
            ["applications.organization_id", "applications.id"],
            name="fk_arch_activity_application", ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["organization_id", "application_id", "architecture_id"],
            ["architectures.organization_id", "architectures.application_id", "architectures.id"],
            name="fk_arch_activity_version", ondelete="CASCADE",
        ),
        UniqueConstraint("architecture_id", name="uq_arch_activity_version"),
    )
