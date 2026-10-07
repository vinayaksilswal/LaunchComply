"""Reconcile indexes, missing AWS foreign keys and invoice states.

Supports both migration-built databases and development databases previously
created through SQLAlchemy metadata. Recovery is a verified backup restore;
this additive revision deliberately refuses schema downgrade.
"""
from alembic import op
import sqlalchemy as sa

revision = 'f9d8161e682b'
down_revision = '7462d21be55a'
branch_labels = None
depends_on = None

INDEXES = {'aws_external_id_rotations': [('ix_aws_external_id_rotations_cloud_account_id', ['cloud_account_id'], False), ('ix_aws_external_id_rotations_external_id', ['external_id'], True), ('ix_aws_external_id_rotations_id', ['id'], False), ('ix_aws_external_id_rotations_organization_id', ['organization_id'], False)], 'aws_onboarding_template_versions': [('ix_aws_onboarding_template_versions_id', ['id'], False), ('ix_aws_onboarding_template_versions_version', ['version'], True)], 'aws_stack_observations': [('ix_aws_stack_observations_cloud_account_id', ['cloud_account_id'], False), ('ix_aws_stack_observations_id', ['id'], False), ('ix_aws_stack_observations_organization_id', ['organization_id'], False), ('ix_aws_stack_observations_stack_name', ['stack_name'], False)], 'commercial_experiments': [('ix_commercial_experiments_id', ['id'], False)], 'commercial_manual_assistance_tasks': [('ix_commercial_manual_assistance_tasks_id', ['id'], False), ('ix_commercial_manual_assistance_tasks_organization_id', ['organization_id'], False)], 'commercial_payments': [('ix_commercial_payments_utr_number', ['utr_number'], False)], 'commercial_support_tickets': [('ix_commercial_support_tickets_root_cause', ['root_cause'], False)], 'customer_delivery_milestones': [('ix_customer_delivery_milestones_id', ['id'], False), ('ix_customer_delivery_milestones_milestone_key', ['milestone_key'], False), ('ix_customer_delivery_milestones_organization_id', ['organization_id'], False)], 'customer_deployment_approvals': [('ix_customer_deployment_approvals_application_id', ['application_id'], False), ('ix_customer_deployment_approvals_id', ['id'], False), ('ix_customer_deployment_approvals_organization_id', ['organization_id'], False)], 'customer_interviews': [('ix_customer_interviews_id', ['id'], False), ('ix_customer_interviews_interview_type', ['interview_type'], False), ('ix_customer_interviews_organization_id', ['organization_id'], False)], 'customer_stage_history': [('ix_customer_stage_history_id', ['id'], False), ('ix_customer_stage_history_organization_id', ['organization_id'], False)], 'first_payment_events': [('ix_first_payment_events_id', ['id'], False), ('ix_first_payment_events_invoice_id', ['invoice_id'], False), ('ix_first_payment_events_organization_id', ['organization_id'], False), ('ix_first_payment_events_payment_id', ['payment_id'], False)], 'organizations': [('ix_organizations_commercial_state', ['commercial_state'], False), ('ix_organizations_customer_classification', ['customer_classification'], False)]}
LEGACY_INDEXES = {'aws_external_id_rotations': ['ix_aws_external_id_rotations_ext_id', 'ix_aws_external_id_rotations_org'], 'aws_onboarding_template_versions': ['ix_aws_onboarding_template_versions_ver'], 'aws_stack_observations': ['ix_aws_stack_observations_org', 'ix_aws_stack_observations_stack'], 'commercial_manual_assistance_tasks': ['ix_commercial_manual_tasks_org_id'], 'customer_delivery_milestones': ['ix_cdm_key', 'ix_cdm_org_id'], 'customer_deployment_approvals': ['ix_cda_app_id', 'ix_cda_org_id'], 'customer_interviews': ['ix_customer_interviews_org', 'ix_customer_interviews_type'], 'customer_stage_history': ['ix_customer_stage_history_org'], 'first_payment_events': ['ix_first_payment_events_org']}

def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for table, indexes in INDEXES.items():
        existing = {index['name'] for index in inspector.get_indexes(table)}
        for name, columns, unique in indexes:
            if name not in existing:
                op.create_index(name, table, columns, unique=unique)
        for name in LEGACY_INDEXES.get(table, []):
            if name in existing:
                op.drop_index(name, table_name=table)

    for table in ('aws_external_id_rotations', 'aws_stack_observations'):
        existing = {tuple(fk['constrained_columns']) for fk in inspector.get_foreign_keys(table)}
        missing = [(column, target) for column, target in (
            ('organization_id', 'organizations'), ('cloud_account_id', 'cloud_accounts')
        ) if (column,) not in existing]
        if missing:
            with op.batch_alter_table(table) as batch:
                for column, target in missing:
                    batch.create_foreign_key(f'fk_{table}_{column}', target, [column], ['id'], ondelete='CASCADE')

    if bind.dialect.name == 'postgresql':
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE invoicestatus ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID'")
    else:
        with op.batch_alter_table('commercial_invoices') as batch:
            batch.alter_column('status', existing_type=sa.String(13), type_=sa.String(14), existing_nullable=False)


def downgrade():
    raise RuntimeError('This reconciliation is forward-only. Restore a verified backup into an isolated database for schema recovery.')
