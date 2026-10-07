"""phase15_customer_operating_period

Revision ID: e15a9901f4c2
Revises: c8e412a89df1
Create Date: 2026-10-05 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e15a9901f4c2'
down_revision: Union[str, Sequence[str], None] = 'c8e412a89df1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Organizations Phase 15 fields
    with op.batch_alter_table('organizations') as batch_op:
        batch_op.add_column(sa.Column('target_date', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('current_outcome_status', sa.String(length=50), server_default='IN_PROGRESS', nullable=False))
        batch_op.add_column(sa.Column('paid_customer_gate_passed', sa.Boolean(), server_default='0', nullable=False))
        batch_op.add_column(sa.Column('first_real_payment_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('first_real_mrr', sa.Float(), server_default='0.0', nullable=False))
        batch_op.add_column(sa.Column('retention_status', sa.String(length=50), server_default='PENDING', nullable=False))
        batch_op.add_column(sa.Column('primary_product_interest', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('purchase_reason', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('last_customer_contact', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('next_action', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('next_action_due', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('technical_owner', sa.String(length=255), server_default='DevOps Architect', nullable=False))
        batch_op.add_column(sa.Column('commercial_owner', sa.String(length=255), server_default='Commercial Lead', nullable=False))

    # 2. Customer Stage History Table
    op.create_table(
        'customer_stage_history',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('organization_id', sa.String(length=36), nullable=False),
        sa.Column('stage', sa.String(length=50), nullable=False),
        sa.Column('entered_at', sa.DateTime(), nullable=False),
        sa.Column('exited_at', sa.DateTime(), nullable=True),
        sa.Column('duration_days', sa.Float(), nullable=True),
        sa.Column('blocker', sa.String(length=255), nullable=True),
        sa.Column('internal_owner', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_customer_stage_history_org', 'customer_stage_history', ['organization_id'])
    op.create_index('ix_customer_stage_history_stage', 'customer_stage_history', ['stage'])

    # 3. Customer Interviews Table
    op.create_table(
        'customer_interviews',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('organization_id', sa.String(length=36), nullable=False),
        sa.Column('interview_type', sa.String(length=50), nullable=False),
        sa.Column('interview_date', sa.DateTime(), nullable=False),
        sa.Column('participants', sa.String(length=255), nullable=False),
        sa.Column('key_problem', sa.Text(), nullable=False),
        sa.Column('value_driver', sa.Text(), nullable=False),
        sa.Column('blocker', sa.Text(), nullable=True),
        sa.Column('quote', sa.Text(), nullable=True),
        sa.Column('permission_to_use_quote', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(length=255), server_default='Founder / CS Lead', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_customer_interviews_org', 'customer_interviews', ['organization_id'])
    op.create_index('ix_customer_interviews_type', 'customer_interviews', ['interview_type'])

    # 4. First Payment Events Table
    op.create_table(
        'first_payment_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('organization_id', sa.String(length=36), nullable=False),
        sa.Column('invoice_id', sa.String(length=36), nullable=False),
        sa.Column('payment_id', sa.String(length=36), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('currency', sa.String(length=10), server_default='INR', nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('reconciled_at', sa.DateTime(), nullable=False),
        sa.Column('verified_by', sa.String(length=255), nullable=False),
        sa.Column('provider_reference', sa.String(length=150), nullable=False),
        sa.Column('is_mrr', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invoice_id'], ['commercial_invoices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['payment_id'], ['commercial_payments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_first_payment_events_org', 'first_payment_events', ['organization_id'])


def downgrade() -> None:
    op.drop_table('first_payment_events')
    op.drop_table('customer_interviews')
    op.drop_table('customer_stage_history')
    with op.batch_alter_table('organizations') as batch_op:
        batch_op.drop_column('commercial_owner')
        batch_op.drop_column('technical_owner')
        batch_op.drop_column('next_action_due')
        batch_op.drop_column('next_action')
        batch_op.drop_column('last_customer_contact')
        batch_op.drop_column('purchase_reason')
        batch_op.drop_column('primary_product_interest')
        batch_op.drop_column('retention_status')
        batch_op.drop_column('first_real_mrr')
        batch_op.drop_column('first_real_payment_at')
        batch_op.drop_column('paid_customer_gate_passed')
        batch_op.drop_column('current_outcome_status')
        batch_op.drop_column('target_date')
