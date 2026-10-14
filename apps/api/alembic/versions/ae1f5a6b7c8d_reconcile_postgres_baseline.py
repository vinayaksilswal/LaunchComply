"""Reconcile PostgreSQL-only schema drift without changing recorded UTC instants.

Revision ID: ae1f5a6b7c8d
Revises: ad0e4f5a6b7c
"""
from alembic import op
import sqlalchemy as sa

revision = "ae1f5a6b7c8d"
down_revision = "ad0e4f5a6b7c"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    inspector = sa.inspect(bind)
    # The historical migration created BOTH a unique constraint and unique index.
    # Retain the runtime model's unique index, so uniqueness is never relaxed.
    indexes = inspector.get_indexes("commercial_experiments")
    if not any(i["name"] == "ix_commercial_experiments_name" and i["unique"]
               and i["column_names"] == ["name"] for i in indexes):
        raise RuntimeError("Expected unique experiment-name index is missing; review schema before migration.")
    for constraint in inspector.get_unique_constraints("commercial_experiments"):
        if constraint["column_names"] == ["name"]:
            op.drop_constraint(constraint["name"], "commercial_experiments", type_="unique")
    # BaseModel writes UTC. Explicit USING avoids dependence on session timezone.
    for table in ("customer_delivery_milestones", "customer_deployment_approvals"):
        columns = {c["name"]: c for c in inspector.get_columns(table)}
        for column in ("created_at", "updated_at"):
            if not columns[column]["type"].timezone:
                op.alter_column(table, column, existing_type=sa.DateTime(),
                    type_=sa.DateTime(timezone=True), existing_nullable=False,
                    postgresql_using=f"{column} AT TIME ZONE 'UTC'")


def downgrade():
    raise RuntimeError("Forward-only reconciliation; restore a verified backup for schema recovery.")
