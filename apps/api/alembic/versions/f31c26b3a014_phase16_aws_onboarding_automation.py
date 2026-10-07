"""phase16_aws_onboarding_automation

Revision ID: f31c26b3a014
Revises: e15a9901f4c2
Create Date: 2026-10-05 17:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f31c26b3a014'
down_revision: Union[str, Sequence[str], None] = 'e15a9901f4c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Update or create cloud_accounts with Phase 16 lifecycle columns
    if 'cloud_accounts' in tables:
        cols = [c['name'] for c in inspector.get_columns('cloud_accounts')]
        with op.batch_alter_table('cloud_accounts') as batch_op:
            if 'connection_state' not in cols:
                batch_op.add_column(sa.Column('connection_state', sa.String(length=50), server_default='NOT_STARTED', nullable=False))
            if 'setup_method' not in cols:
                batch_op.add_column(sa.Column('setup_method', sa.String(length=50), server_default='CLOUDFORMATION', nullable=False))
            if 'stack_name' not in cols:
                batch_op.add_column(sa.Column('stack_name', sa.String(length=255), nullable=True))
            if 'stack_status' not in cols:
                batch_op.add_column(sa.Column('stack_status', sa.String(length=50), server_default='UNKNOWN', nullable=True))
            if 'template_version' not in cols:
                batch_op.add_column(sa.Column('template_version', sa.String(length=50), server_default='v1.0.0', nullable=True))
            if 'template_checksum' not in cols:
                batch_op.add_column(sa.Column('template_checksum', sa.String(length=64), nullable=True))
            if 'permission_profiles_json' not in cols:
                batch_op.add_column(sa.Column('permission_profiles_json', sa.JSON(), nullable=True))
            if 'sts_result_hash' not in cols:
                batch_op.add_column(sa.Column('sts_result_hash', sa.String(length=64), nullable=True))
            if 'assumed_role_arn' not in cols:
                batch_op.add_column(sa.Column('assumed_role_arn', sa.String(length=500), nullable=True))
            if 'session_expiry' not in cols:
                batch_op.add_column(sa.Column('session_expiry', sa.DateTime(), nullable=True))
            if 'health_status' not in cols:
                batch_op.add_column(sa.Column('health_status', sa.String(length=50), server_default='HEALTHY', nullable=False))
            if 'last_verified_at' not in cols:
                batch_op.add_column(sa.Column('last_verified_at', sa.DateTime(), nullable=True))
            if 'drift_detected' not in cols:
                batch_op.add_column(sa.Column('drift_detected', sa.Boolean(), server_default='0', nullable=False))
            if 'drift_details_json' not in cols:
                batch_op.add_column(sa.Column('drift_details_json', sa.JSON(), nullable=True))
            if 'discovered_resources_json' not in cols:
                batch_op.add_column(sa.Column('discovered_resources_json', sa.JSON(), nullable=True))
            if 'setup_started_at' not in cols:
                batch_op.add_column(sa.Column('setup_started_at', sa.DateTime(), nullable=True))
            if 'connected_at' not in cols:
                batch_op.add_column(sa.Column('connected_at', sa.DateTime(), nullable=True))
            if 'operator_minutes_spent' not in cols:
                batch_op.add_column(sa.Column('operator_minutes_spent', sa.Integer(), server_default='0', nullable=False))
            if 'help_requested' not in cols:
                batch_op.add_column(sa.Column('help_requested', sa.Boolean(), server_default='0', nullable=False))

    # 2. AWS Onboarding Template Versions Table (§13)
    if 'aws_onboarding_template_versions' not in tables:
        op.create_table(
            'aws_onboarding_template_versions',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('version', sa.String(length=50), nullable=False),
            sa.Column('permissions_revision', sa.String(length=50), nullable=False),
            sa.Column('trust_revision', sa.String(length=50), nullable=False),
            sa.Column('checksum', sa.String(length=64), nullable=False),
            sa.Column('template_yaml', sa.Text(), nullable=False),
            sa.Column('active', sa.Boolean(), server_default='1', nullable=False),
            sa.Column('deprecated', sa.Boolean(), server_default='0', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_aws_onboarding_template_versions_ver', 'aws_onboarding_template_versions', ['version'], unique=True)

    # 3. AWS ExternalId Rotations Table (§11)
    if 'aws_external_id_rotations' not in tables:
        op.create_table(
            'aws_external_id_rotations',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('organization_id', sa.String(length=36), nullable=False),
            sa.Column('cloud_account_id', sa.String(length=36), nullable=True),
            sa.Column('external_id', sa.String(length=100), nullable=False),
            sa.Column('status', sa.String(length=50), server_default='ACTIVE', nullable=False),
            sa.Column('rotated_at', sa.DateTime(), nullable=True),
            sa.Column('grace_period_deadline', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_aws_external_id_rotations_org', 'aws_external_id_rotations', ['organization_id'])
        op.create_index('ix_aws_external_id_rotations_ext_id', 'aws_external_id_rotations', ['external_id'], unique=True)

    # 4. AWS Stack Observations Table (§18, §19)
    if 'aws_stack_observations' not in tables:
        op.create_table(
            'aws_stack_observations',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('organization_id', sa.String(length=36), nullable=False),
            sa.Column('cloud_account_id', sa.String(length=36), nullable=True),
            sa.Column('stack_name', sa.String(length=255), nullable=False),
            sa.Column('region', sa.String(length=50), server_default='ap-south-1', nullable=False),
            sa.Column('stack_status', sa.String(length=50), nullable=False),
            sa.Column('events_json', sa.JSON(), nullable=True),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('customer_safe_summary', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_aws_stack_observations_org', 'aws_stack_observations', ['organization_id'])
        op.create_index('ix_aws_stack_observations_stack', 'aws_stack_observations', ['stack_name'])


def downgrade() -> None:
    op.drop_table('aws_stack_observations')
    op.drop_table('aws_external_id_rotations')
    op.drop_table('aws_onboarding_template_versions')
    with op.batch_alter_table('cloud_accounts') as batch_op:
        batch_op.drop_column('help_requested')
        batch_op.drop_column('operator_minutes_spent')
        batch_op.drop_column('connected_at')
        batch_op.drop_column('setup_started_at')
        batch_op.drop_column('discovered_resources_json')
        batch_op.drop_column('drift_details_json')
        batch_op.drop_column('drift_detected')
        batch_op.drop_column('last_verified_at')
        batch_op.drop_column('health_status')
        batch_op.drop_column('session_expiry')
        batch_op.drop_column('assumed_role_arn')
        batch_op.drop_column('sts_result_hash')
        batch_op.drop_column('permission_profiles_json')
        batch_op.drop_column('template_checksum')
        batch_op.drop_column('template_version')
        batch_op.drop_column('stack_status')
        batch_op.drop_column('stack_name')
        batch_op.drop_column('setup_method')
        batch_op.drop_column('connection_state')
