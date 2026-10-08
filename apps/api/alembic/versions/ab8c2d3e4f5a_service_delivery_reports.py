"""Persist immutable service delivery reports."""
from alembic import op
import sqlalchemy as sa
revision = "ab8c2d3e4f5a"
down_revision = "aa7b1c2d3e4f"
branch_labels = None
depends_on = None
def upgrade():
    op.create_table("service_delivery_reports",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("request_id", sa.String(36), sa.ForeignKey("service_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("published_by", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False), sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_sha256", sa.String(64), nullable=False))
    for column in ("id", "organization_id", "request_id"):
        op.create_index(f"ix_service_delivery_reports_{column}", "service_delivery_reports", [column])
def downgrade():
    op.drop_table("service_delivery_reports")
