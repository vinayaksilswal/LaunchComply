"""Store bounded encrypted customer source archives without altering existing records."""
from alembic import op
import sqlalchemy as sa

revision = "ad0e4f5a6b7c"
down_revision = "ac9d3e4f5a6b"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("application_source_archives",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("application_id", sa.String(36), sa.ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("uploaded_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("file_count", sa.Integer(), nullable=False),
        sa.Column("encrypted_archive", sa.LargeBinary(), nullable=False),
        sa.Column("evidence_json", sa.JSON(), nullable=False))
    op.create_index("ix_application_source_archives_organization_id", "application_source_archives", ["organization_id"])
    op.create_index("ix_application_source_archives_id", "application_source_archives", ["id"])


def downgrade():
    op.drop_table("application_source_archives")
