"""update templates for rich functionality

Revision ID: 0006_update_templates
Revises: df0000e2f4e2
Create Date: 2025-09-18 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0006_update_templates'
down_revision = 'df0000e2f4e2'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to templates table
    op.add_column('templates', sa.Column('content', postgresql.JSON(), nullable=True))
    op.add_column('templates', sa.Column('variables', postgresql.JSON(), nullable=True))
    op.add_column('templates', sa.Column('is_ai_enhanced', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('templates', sa.Column('created_by', sa.Integer(), nullable=True))

    # Modify existing columns
    op.alter_column('templates', 'name', existing_type=sa.String(length=100), type_=sa.String(length=200))
    op.alter_column('templates', 'description', existing_type=sa.String(length=500), type_=sa.Text())
    op.alter_column('templates', 'status', server_default='unsaved')
    op.alter_column('templates', 'updated_at', server_default=sa.text('now()'), nullable=False)

    # Create foreign key constraint
    op.create_foreign_key('fk_templates_created_by', 'templates', 'users', ['created_by'], ['id'])

    # Create indexes
    op.create_index('ix_templates_created_by', 'templates', ['created_by'])
    op.create_index('ix_templates_updated_at', 'templates', ['updated_at'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_templates_updated_at', table_name='templates')
    op.drop_index('ix_templates_created_by', table_name='templates')

    # Drop foreign key constraint
    op.drop_constraint('fk_templates_created_by', 'templates', type_='foreignkey')

    # Revert column changes
    op.alter_column('templates', 'updated_at', server_default=None, nullable=True)
    op.alter_column('templates', 'status', server_default='draft')
    op.alter_column('templates', 'description', existing_type=sa.Text(), type_=sa.String(length=500))
    op.alter_column('templates', 'name', existing_type=sa.String(length=200), type_=sa.String(length=100))

    # Drop new columns
    op.drop_column('templates', 'created_by')
    op.drop_column('templates', 'is_ai_enhanced')
    op.drop_column('templates', 'variables')
    op.drop_column('templates', 'content')