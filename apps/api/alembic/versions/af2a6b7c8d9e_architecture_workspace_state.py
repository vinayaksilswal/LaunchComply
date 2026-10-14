"""Add workspace heads without rewriting saved architecture versions.

Revision ID: af2a6b7c8d9e
Revises: ae1f5a6b7c8d
"""
import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa

revision = "af2a6b7c8d9e"
down_revision = "ae1f5a6b7c8d"
branch_labels = None
depends_on = None


def upgrade():
    # Unique indexes support composite tenant references without rebuilding the
    # large existing tables (particularly important for SQLite rehearsal).
    op.create_index("uq_applications_org_id", "applications", ["organization_id", "id"], unique=True)
    op.create_index("uq_environments_org_app_id", "environments", ["organization_id", "application_id", "id"], unique=True)
    op.create_index("uq_architectures_org_app_id", "architectures", ["organization_id", "application_id", "id"], unique=True)
    workspace = op.create_table(
        "architecture_workspace_states",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("organization_id", sa.String(36), nullable=False),
        sa.Column("application_id", sa.String(36), nullable=False),
        sa.Column("environment_id", sa.String(36), nullable=True),
        sa.Column("head_architecture_id", sa.String(36), nullable=True),
        sa.Column("source_epoch", sa.Integer(), server_default="0", nullable=False),
        sa.Column("analyzed_source_epoch", sa.Integer(), nullable=True),
        sa.Column("state_version", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(["organization_id", "application_id"], ["applications.organization_id", "applications.id"], name="fk_arch_workspace_application", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id", "application_id", "environment_id"], ["environments.organization_id", "environments.application_id", "environments.id"], name="fk_arch_workspace_environment", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id", "application_id", "head_architecture_id"], ["architectures.organization_id", "architectures.application_id", "architectures.id"], name="fk_arch_workspace_head"),
        sa.CheckConstraint("source_epoch >= 0", name="ck_arch_workspace_source_epoch"),
        sa.CheckConstraint("state_version >= 0", name="ck_arch_workspace_state_version"),
        sa.CheckConstraint("analyzed_source_epoch IS NULL OR (analyzed_source_epoch >= 0 AND analyzed_source_epoch <= source_epoch)", name="ck_arch_workspace_analyzed_epoch"),
    )
    op.create_index("ix_architecture_workspace_states_id", "architecture_workspace_states", ["id"])
    for name, columns, condition in (
        ("uq_arch_workspace_unassigned", ["organization_id", "application_id"], "environment_id IS NULL"),
        ("uq_arch_workspace_environment", ["organization_id", "application_id", "environment_id"], "environment_id IS NOT NULL"),
    ):
        op.create_index(name, "architecture_workspace_states", columns, unique=True,
                        sqlite_where=sa.text(condition), postgresql_where=sa.text(condition))

    # Legacy versions have no environment identity. Do not invent one or copy
    # approvals as current authority. Rank only supported, tenant-consistent drafts.
    connection = op.get_bind()
    architectures = sa.table("architectures", sa.column("id", sa.String), sa.column("organization_id", sa.String),
                             sa.column("application_id", sa.String), sa.column("created_at", sa.DateTime), sa.column("spec_json", sa.JSON))
    applications = sa.table("applications", sa.column("id", sa.String), sa.column("organization_id", sa.String))
    ranked = sa.select(
        architectures.c.id, architectures.c.organization_id, architectures.c.application_id, architectures.c.spec_json,
        sa.func.row_number().over(partition_by=[architectures.c.organization_id, architectures.c.application_id],
                                  order_by=[architectures.c.created_at.desc(), architectures.c.id.desc()]).label("rank"),
    ).join(applications, sa.and_(architectures.c.application_id == applications.c.id,
                               architectures.c.organization_id == applications.c.organization_id)).where(
        architectures.c.spec_json["format"].as_string() == "repository-draft-v1",
    ).subquery()
    now = datetime.now(timezone.utc)
    for row in connection.execute(sa.select(ranked).where(ranked.c.rank == 1)).mappings():
        stale = bool(row["spec_json"].get("source_changed"))
        connection.execute(workspace.insert().values(
            id=str(uuid.uuid4()), created_at=now, updated_at=now,
            organization_id=row["organization_id"], application_id=row["application_id"],
            head_architecture_id=row["id"], source_epoch=1 if stale else 0,
            analyzed_source_epoch=None if stale else 0, state_version=0,
        ))


def downgrade():
    raise RuntimeError("Forward-only: workspace identity must not be discarded; restore the pre-migration backup if required.")
