"""Add service quotes and verified hosted checkout records without changing customer data."""
from alembic import op
import sqlalchemy as sa

revision = "ac9d3e4f5a6b"
down_revision = "ab8c2d3e4f5a"
branch_labels = None
depends_on = None


def base_columns():
    return [sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False)]


def upgrade():
    op.create_table("service_quotes", *base_columns(),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("request_id", sa.String(36), sa.ForeignKey("service_requests.id"), nullable=False, unique=True),
        sa.Column("architecture_id", sa.String(36), sa.ForeignKey("architectures.id"), nullable=True),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False), sa.Column("scope", sa.Text(), nullable=False),
        sa.Column("amount_minor", sa.Integer(), nullable=False), sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("status", sa.String(30), nullable=False), sa.Column("delivery_mode", sa.String(30), nullable=False))
    op.create_index("ix_service_quotes_organization_id", "service_quotes", ["organization_id"])
    op.create_index("ix_service_quotes_id", "service_quotes", ["id"])
    op.create_table("service_checkouts", *base_columns(),
        sa.Column("organization_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("quote_id", sa.String(36), sa.ForeignKey("service_quotes.id"), unique=True, nullable=False),
        sa.Column("provider", sa.String(15), nullable=False), sa.Column("mode", sa.String(8), nullable=False),
        sa.Column("status", sa.String(30), nullable=False), sa.Column("provider_reference", sa.String(120), unique=True),
        sa.Column("checkout_url", sa.Text()), sa.Column("paid_at", sa.DateTime(timezone=True)),
        sa.Column("expires_at", sa.DateTime(timezone=True)), sa.Column("is_real_payment_verified", sa.Boolean(), nullable=False))
    op.create_index("ix_service_checkouts_organization_id", "service_checkouts", ["organization_id"])
    op.create_index("ix_service_checkouts_id", "service_checkouts", ["id"])
    op.create_table("service_payment_events", *base_columns(),
        sa.Column("provider", sa.String(15), nullable=False), sa.Column("provider_event_id", sa.String(150), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False), sa.Column("payload_sha256", sa.String(64), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("checkout_id", sa.String(36), sa.ForeignKey("service_checkouts.id")),
        sa.UniqueConstraint("provider", "provider_event_id", name="uq_service_payment_provider_event"))
    op.create_index("ix_service_payment_events_id", "service_payment_events", ["id"])


def downgrade():
    op.drop_table("service_payment_events")
    op.drop_table("service_checkouts")
    op.drop_table("service_quotes")
