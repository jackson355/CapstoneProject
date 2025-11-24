"""create company settings table and remove user company fields

Revision ID: 0017_company_settings
Revises: 0016_add_company_fields
Create Date: 2025-11-08 15:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0017_company_settings'
down_revision = '0016_add_company_fields_to_users'
branch_labels = None
depends_on = None


def upgrade():
    # Remove company fields from users table (they were just added, now moving to company_settings)
    op.drop_column('users', 'company_phone')
    op.drop_column('users', 'company_email')
    op.drop_column('users', 'company_name')

    # Create company_settings table
    op.create_table(
        'company_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_name', sa.String(length=200), nullable=True),
        sa.Column('company_email', sa.String(length=100), nullable=True),
        sa.Column('company_phone', sa.String(length=50), nullable=True),
        sa.Column('company_address', sa.String(length=500), nullable=True),
        sa.Column('company_website', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create index
    op.create_index('ix_company_settings_id', 'company_settings', ['id'])

    # Insert default empty row (singleton pattern - only one row should exist)
    op.execute("""
        INSERT INTO company_settings (company_name, company_email, company_phone, company_address, company_website)
        VALUES (NULL, NULL, NULL, NULL, NULL)
    """)


def downgrade():
    # Drop company_settings table
    op.drop_index('ix_company_settings_id', 'company_settings')
    op.drop_table('company_settings')

    # Re-add company fields to users table
    op.add_column('users', sa.Column('company_name', sa.String(length=200), nullable=True))
    op.add_column('users', sa.Column('company_email', sa.String(length=100), nullable=True))
    op.add_column('users', sa.Column('company_phone', sa.String(length=50), nullable=True))
