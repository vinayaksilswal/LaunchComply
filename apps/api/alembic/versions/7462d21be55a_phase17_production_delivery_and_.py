"""phase17_production_delivery_and_acceptance

Revision ID: 7462d21be55a
Revises: f31c26b3a014
Create Date: 2026-10-06 12:23:21.791538

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7462d21be55a'
down_revision: Union[str, Sequence[str], None] = 'f31c26b3a014'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. customer_deployment_approvals Table (§6, §7)
    if 'customer_deployment_approvals' not in tables:
        op.create_table(
            'customer_deployment_approvals',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
            sa.Column('application_id', sa.String(length=36), nullable=False),
            sa.Column('environment', sa.String(length=50), server_default='production', nullable=False),
            sa.Column('release_version', sa.String(length=50), nullable=False),
            sa.Column('architecture_version', sa.String(length=50), server_default='v1.0.0', nullable=False),
            sa.Column('infrastructure_plan_id', sa.String(length=100), nullable=False),
            sa.Column('plan_checksum', sa.String(length=64), nullable=False),
            sa.Column('estimated_monthly_cost', sa.String(length=50), server_default='₹55,000', nullable=False),
            sa.Column('approved_by_customer', sa.String(length=255), nullable=False),
            sa.Column('customer_contact_email', sa.String(length=255), nullable=False),
            sa.Column('customer_role', sa.String(length=100), server_default='CTO', nullable=False),
            sa.Column('approved_at', sa.DateTime(), nullable=False),
            sa.Column('scope', sa.String(length=100), server_default='CUSTOMER_PRODUCTION', nullable=False),
            sa.Column('status', sa.String(length=50), server_default='APPROVED', nullable=False),
            sa.Column('delete_confirmation_granted', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
        )
        op.create_index('ix_cda_org_id', 'customer_deployment_approvals', ['organization_id'])
        op.create_index('ix_cda_app_id', 'customer_deployment_approvals', ['application_id'])

    # 2. customer_delivery_milestones Table (§102, §103)
    if 'customer_delivery_milestones' not in tables:
        op.create_table(
            'customer_delivery_milestones',
            sa.Column('id', sa.String(length=36), primary_key=True),
            sa.Column('organization_id', sa.String(length=36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
            sa.Column('milestone_key', sa.String(length=100), nullable=False),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('status', sa.String(length=50), server_default='NOT_STARTED', nullable=False),
            sa.Column('evidence_level', sa.String(length=50), server_default='NOT_STARTED', nullable=False),
            sa.Column('owner_role', sa.String(length=100), server_default='Technical Lead', nullable=False),
            sa.Column('owner_name', sa.String(length=255), server_default='DevOps Architect', nullable=False),
            sa.Column('blocker_type', sa.String(length=50), nullable=True),
            sa.Column('blocker_description', sa.Text(), nullable=True),
            sa.Column('blocker_days', sa.Float(), server_default='0.0', nullable=False),
            sa.Column('due_date', sa.DateTime(), nullable=True),
            sa.Column('completed_at', sa.DateTime(), nullable=True),
            sa.Column('evidence_notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
        )
        op.create_index('ix_cdm_org_id', 'customer_delivery_milestones', ['organization_id'])
        op.create_index('ix_cdm_key', 'customer_delivery_milestones', ['milestone_key'])

    # 3. Update deployments with Phase 17 columns
    if 'deployments' in tables:
        cols = [c['name'] for c in inspector.get_columns('deployments')]
        with op.batch_alter_table('deployments') as batch_op:
            if 'deployment_mode' not in cols:
                batch_op.add_column(sa.Column('deployment_mode', sa.String(length=50), server_default='SIMULATED', nullable=False))
            if 'evidence_level' not in cols:
                batch_op.add_column(sa.Column('evidence_level', sa.String(length=50), server_default='SIMULATED', nullable=False))
            if 'is_customer_approved' not in cols:
                batch_op.add_column(sa.Column('is_customer_approved', sa.Boolean(), server_default='0', nullable=False))
            if 'approval_id' not in cols:
                batch_op.add_column(sa.Column('approval_id', sa.String(length=36), nullable=True))

    # 4. Update commercial_payments with Phase 17 UTR and revenue_type columns
    if 'commercial_payments' in tables:
        cols = [c['name'] for c in inspector.get_columns('commercial_payments')]
        with op.batch_alter_table('commercial_payments') as batch_op:
            if 'utr_number' not in cols:
                batch_op.add_column(sa.Column('utr_number', sa.String(length=100), nullable=True))
            if 'finance_verifier_role' not in cols:
                batch_op.add_column(sa.Column('finance_verifier_role', sa.String(length=100), nullable=True))
            if 'revenue_type' not in cols:
                batch_op.add_column(sa.Column('revenue_type', sa.String(length=50), server_default='SERVICE', nullable=False))


def downgrade() -> None:
    pass
