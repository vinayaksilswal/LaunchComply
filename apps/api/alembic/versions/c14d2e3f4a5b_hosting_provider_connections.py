"""Add encrypted hosting provider connections (Vercel, Render, Neon, Cloudinary).

Revision ID: c14d2e3f4a5b
Revises: b03c7d8e9f10
"""
from alembic import op
import sqlalchemy as sa

revision = "c14d2e3f4a5b"
down_revision = "b03c7d8e9f10"
branch_labels = None
depends_on = None


def upgrade():
    # Additive only: no existing table, design or version is touched.
    op.create_table(
        "hosting_provider_connections",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("account_ref", sa.String(120), nullable=False),
        sa.Column("account_name", sa.String(255), nullable=True),
        sa.Column("credential_encrypted", sa.Text(), nullable=False),
        sa.Column("credential_hint", sa.String(16), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("inventory_json", sa.JSON(), nullable=True),
        sa.Column("health_json", sa.JSON(), nullable=True),
        sa.Column("created_by", sa.String(36), nullable=False),
        sa.UniqueConstraint("organization_id", "provider", "account_ref", name="uq_hosting_connection_account"),
    )
    op.create_index("ix_hosting_provider_connections_id", "hosting_provider_connections", ["id"])
    op.create_index("ix_hosting_provider_connections_organization_id", "hosting_provider_connections", ["organization_id"])
    op.create_index("ix_hosting_provider_connections_provider", "hosting_provider_connections", ["provider"])


def downgrade():
    op.drop_index("ix_hosting_provider_connections_provider", table_name="hosting_provider_connections")
    op.drop_index("ix_hosting_provider_connections_organization_id", table_name="hosting_provider_connections")
    op.drop_index("ix_hosting_provider_connections_id", table_name="hosting_provider_connections")
    op.drop_table("hosting_provider_connections")
