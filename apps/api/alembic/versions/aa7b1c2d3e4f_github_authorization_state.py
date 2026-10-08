"""Add expiring, single-use GitHub authorization state."""
from alembic import op
import sqlalchemy as sa

revision = "aa7b1c2d3e4f"
down_revision = "f9d8161e682b"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("source_control_oauth_states",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("state_hash", sa.String(64), nullable=False),
        sa.Column("verifier_encrypted", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
    )
    for column in ("id", "organization_id", "user_id", "state_hash"):
        op.create_index(f"ix_source_control_oauth_states_{column}", "source_control_oauth_states", [column], unique=column == "state_hash")

def downgrade():
    op.drop_table("source_control_oauth_states")
