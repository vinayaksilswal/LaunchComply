"""Separate mutable activity from saved architecture snapshots.

Revision ID: b03c7d8e9f10
Revises: af2a6b7c8d9e
"""
from alembic import op
import sqlalchemy as sa

revision = "b03c7d8e9f10"
down_revision = "af2a6b7c8d9e"
branch_labels = None
depends_on = None


def upgrade():
    # Legacy embedded activity stays in place and is read by the compatibility
    # adapter. No graph, version ID, JSON or timestamp is rewritten here.
    op.create_table(
        "architecture_version_activity",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("organization_id", sa.String(36), nullable=False),
        sa.Column("application_id", sa.String(36), nullable=False),
        sa.Column("architecture_id", sa.String(36), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id", "application_id"],
            ["applications.organization_id", "applications.id"],
            name="fk_arch_activity_application", ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "application_id", "architecture_id"],
            ["architectures.organization_id", "architectures.application_id", "architectures.id"],
            name="fk_arch_activity_version", ondelete="CASCADE",
        ),
        sa.UniqueConstraint("architecture_id", name="uq_arch_activity_version"),
    )
    op.create_index("ix_architecture_version_activity_id", "architecture_version_activity", ["id"])


def downgrade():
    raise RuntimeError("Forward-only: version activity contains customer conversations and approvals; restore the pre-migration backup if required.")
