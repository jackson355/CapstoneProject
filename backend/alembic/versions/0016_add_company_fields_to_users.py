"""add company fields to users

Revision ID: 0016_add_company_fields_to_users
Revises: 0015_create_automation_templates
Create Date: 2025-11-08 14:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0016_add_company_fields_to_users'
down_revision = '0015_create_automation_templates'
branch_labels = None
depends_on = None


def upgrade():
    # Add company fields to users table
    op.add_column('users', sa.Column('company_name', sa.String(length=200), nullable=True))
    op.add_column('users', sa.Column('company_email', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('company_phone', sa.String(length=50), nullable=True))


def downgrade():
    # Drop company fields from users table
    op.drop_column('users', 'company_phone')
    op.drop_column('users', 'company_email')
    op.drop_column('users', 'company_name')
