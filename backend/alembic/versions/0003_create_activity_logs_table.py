"""create activity_logs table

Revision ID: 0003_create_activity_logs
Revises: 0002_drop_department_from_users
Create Date: 2025-08-18 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0003_create_activity_logs'
down_revision = '0002_drop_department_from_users'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'activity_logs',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('actor_user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=True),
        sa.Column('target_type', sa.String(length=50), nullable=True),
        sa.Column('target_id', sa.Integer, nullable=True),
        sa.Column('message', sa.String(length=500), nullable=True),
    sa.Column('log_metadata', sa.JSON, nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # Indexes for common queries
    op.create_index('ix_activity_logs_action', 'activity_logs', ['action'])
    op.create_index('ix_activity_logs_actor_user_id', 'activity_logs', ['actor_user_id'])
    op.create_index('ix_activity_logs_target_type', 'activity_logs', ['target_type'])
    op.create_index('ix_activity_logs_created_at', 'activity_logs', ['created_at'])


def downgrade():
    op.drop_index('ix_activity_logs_created_at', table_name='activity_logs')
    op.drop_index('ix_activity_logs_target_type', table_name='activity_logs')
    op.drop_index('ix_activity_logs_actor_user_id', table_name='activity_logs')
    op.drop_index('ix_activity_logs_action', table_name='activity_logs')
    op.drop_table('activity_logs')