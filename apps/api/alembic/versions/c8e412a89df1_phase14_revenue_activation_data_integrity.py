"""phase14_revenue_activation_data_integrity

Revision ID: c8e412a89df1
Revises: 7ad6261cb495
Create Date: 2026-10-04 12:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8e412a89df1'
down_revision: Union[str, Sequence[str], None] = '7ad6261cb495'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Organizations Phase 14 classification & outcome fields
    with op.batch_alter_table('organizations') as batch_op:
        batch_op.add_column(sa.Column('is_test', sa.Boolean(), server_default='0', nullable=False))
        batch_op.add_column(sa.Column('is_internal', sa.Boolean(), server_default='0', nullable=False))
        batch_op.add_column(sa.Column('customer_classification', sa.String(length=50), server_default='REAL_CUSTOMER', nullable=False))
        batch_op.add_column(sa.Column('commercial_state', sa.String(length=50), server_default='TRIAL', nullable=False))
        batch_op.add_column(sa.Column('stage_entered_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('onboarding_blocker', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('desired_outcome', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('success_definition', sa.Text(), nullable=True))

    # 2. Commercial Subscriptions Revenue Provenance
    with op.batch_alter_table('commercial_subscriptions') as batch_op:
        batch_op.add_column(sa.Column('payment_source', sa.String(length=50), server_default='TEST', nullable=False))
        batch_op.add_column(sa.Column('reality_status', sa.String(length=50), server_default='TEST', nullable=False))
        batch_op.add_column(sa.Column('is_real_payment_verified', sa.Boolean(), server_default='0', nullable=False))

    # 3. Commercial Invoices Provenance
    with op.batch_alter_table('commercial_invoices') as batch_op:
        batch_op.add_column(sa.Column('payment_source', sa.String(length=50), server_default='MANUAL_INVOICE', nullable=True))
        batch_op.add_column(sa.Column('reality_status', sa.String(length=50), server_default='TEST', nullable=False))
        batch_op.add_column(sa.Column('bank_reference', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('reconciled_by', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('reconciled_at', sa.DateTime(), nullable=True))

    # 4. Commercial Payments Provenance
    with op.batch_alter_table('commercial_payments') as batch_op:
        batch_op.add_column(sa.Column('payment_source', sa.String(length=50), server_default='TEST', nullable=False))
        batch_op.add_column(sa.Column('reality_status', sa.String(length=50), server_default='TEST', nullable=False))
        batch_op.add_column(sa.Column('reconciled_by', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('reconciled_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('reconciliation_notes', sa.Text(), nullable=True))

    # 5. Support Tickets Root Cause & Area
    with op.batch_alter_table('commercial_support_tickets') as batch_op:
        batch_op.add_column(sa.Column('root_cause', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('product_area', sa.String(length=50), server_default='DEPLOYMENT', nullable=False))
        batch_op.add_column(sa.Column('linked_incident_id', sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column('is_demo', sa.Boolean(), server_default='0', nullable=False))

    # 6. CRM Opportunities Win/Loss Intelligence
    with op.batch_alter_table('commercial_crm_opportunities') as batch_op:
        batch_op.add_column(sa.Column('closed_lost_reason', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('closed_won_reason', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('primary_objection', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('is_demo', sa.Boolean(), server_default='0', nullable=False))

    # 7. Customer Feedback Roadmap & Source Tracking
    with op.batch_alter_table('production_customer_feedback') as batch_op:
        batch_op.add_column(sa.Column('source_type', sa.String(length=50), server_default='CUSTOMER_FEEDBACK', nullable=True))
        batch_op.add_column(sa.Column('source_id', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('revenue_or_retention_impact', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('priority', sa.String(length=20), server_default='MEDIUM', nullable=True))
        batch_op.add_column(sa.Column('workaround', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('roadmap_status', sa.String(length=50), server_default='DISCOVERED', nullable=True))
        batch_op.add_column(sa.Column('is_demo', sa.Boolean(), server_default='0', nullable=False))

    # 8. Customer Success Health Trends & Components
    with op.batch_alter_table('commercial_customer_success_health') as batch_op:
        batch_op.add_column(sa.Column('components_json', sa.Text(), server_default='{}', nullable=False))
        batch_op.add_column(sa.Column('health_trend', sa.String(length=20), server_default='STABLE', nullable=False))
        batch_op.add_column(sa.Column('trend_reason', sa.String(length=255), nullable=True))

    # 9. Create Commercial Experiments Table
    op.create_table(
        'commercial_experiments',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('hypothesis', sa.Text(), nullable=False),
        sa.Column('metric', sa.String(length=100), nullable=False),
        sa.Column('audience', sa.String(length=100), server_default='ALL_TRAFFIC', nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=True),
        sa.Column('end_date', sa.DateTime(), nullable=True),
        sa.Column('variant', sa.String(length=100), server_default='A_CONTROL', nullable=False),
        sa.Column('result_json', sa.Text(), server_default='{}', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='DRAFT', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index('ix_commercial_experiments_name', 'commercial_experiments', ['name'], unique=True)

    # 10. Create Manual Assistance Tasks Table
    op.create_table(
        'commercial_manual_assistance_tasks',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('organization_id', sa.String(length=36), nullable=False),
        sa.Column('task_name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), server_default='30', nullable=False),
        sa.Column('operator', sa.String(length=255), nullable=False),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('is_automation_candidate', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_commercial_manual_tasks_org_id', 'commercial_manual_assistance_tasks', ['organization_id'])


def downgrade() -> None:
    op.drop_table('commercial_manual_assistance_tasks')
    op.drop_table('commercial_experiments')
    with op.batch_alter_table('commercial_customer_success_health') as batch_op:
        batch_op.drop_column('trend_reason')
        batch_op.drop_column('health_trend')
        batch_op.drop_column('components_json')
    with op.batch_alter_table('production_customer_feedback') as batch_op:
        batch_op.drop_column('is_demo')
        batch_op.drop_column('roadmap_status')
        batch_op.drop_column('workaround')
        batch_op.drop_column('priority')
        batch_op.drop_column('revenue_or_retention_impact')
        batch_op.drop_column('source_id')
        batch_op.drop_column('source_type')
    with op.batch_alter_table('commercial_crm_opportunities') as batch_op:
        batch_op.drop_column('is_demo')
        batch_op.drop_column('primary_objection')
        batch_op.drop_column('closed_won_reason')
        batch_op.drop_column('closed_lost_reason')
    with op.batch_alter_table('commercial_support_tickets') as batch_op:
        batch_op.drop_column('is_demo')
        batch_op.drop_column('linked_incident_id')
        batch_op.drop_column('product_area')
        batch_op.drop_column('root_cause')
    with op.batch_alter_table('commercial_payments') as batch_op:
        batch_op.drop_column('reconciliation_notes')
        batch_op.drop_column('reconciled_at')
        batch_op.drop_column('reconciled_by')
        batch_op.drop_column('reality_status')
        batch_op.drop_column('payment_source')
    with op.batch_alter_table('commercial_invoices') as batch_op:
        batch_op.drop_column('reconciled_at')
        batch_op.drop_column('reconciled_by')
        batch_op.drop_column('bank_reference')
        batch_op.drop_column('reality_status')
        batch_op.drop_column('payment_source')
    with op.batch_alter_table('commercial_subscriptions') as batch_op:
        batch_op.drop_column('is_real_payment_verified')
        batch_op.drop_column('reality_status')
        batch_op.drop_column('payment_source')
    with op.batch_alter_table('organizations') as batch_op:
        batch_op.drop_column('success_definition')
        batch_op.drop_column('desired_outcome')
        batch_op.drop_column('onboarding_blocker')
        batch_op.drop_column('stage_entered_at')
        batch_op.drop_column('commercial_state')
        batch_op.drop_column('customer_classification')
        batch_op.drop_column('is_internal')
        batch_op.drop_column('is_test')
