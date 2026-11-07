"""Add durable guided-launch step records.

Revision ID: d25e3f4a5b6c
Revises: c14d2e3f4a5b
"""
from alembic import op
import sqlalchemy as sa

revision = "d25e3f4a5b6c"
down_revision = "c14d2e3f4a5b"
branch_labels = None
depends_on = None


def upgrade():
    # Additive only.
    op.create_table(
        "launch_steps",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("application_id", sa.String(36), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("part_id", sa.String(64), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("connection_id", sa.String(36), sa.ForeignKey("hosting_provider_connections.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resource_name", sa.String(64), nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("provider_resource_id", sa.String(120), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("attempt_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.String(36), nullable=False),
        sa.UniqueConstraint("organization_id", "application_id", "part_id", name="uq_launch_step_part"),
    )
    op.create_index("ix_launch_steps_id", "launch_steps", ["id"])
    op.create_index("ix_launch_steps_organization_id", "launch_steps", ["organization_id"])
    op.create_index("ix_launch_steps_application_id", "launch_steps", ["application_id"])


def downgrade():
    op.drop_index("ix_launch_steps_application_id", table_name="launch_steps")
    op.drop_index("ix_launch_steps_organization_id", table_name="launch_steps")
    op.drop_index("ix_launch_steps_id", table_name="launch_steps")
    op.drop_table("launch_steps")
