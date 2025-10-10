"""add my_company_info JSON field to quotations

Revision ID: 0009_add_company_info
Revises: 0008_remove_quotation_fields
Create Date: 2025-10-10 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = '0009_add_company_info'
down_revision = '0008_remove_quotation_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Add my_company_info JSON column to quotations table
    op.add_column('quotations', sa.Column('my_company_info', JSON, nullable=True))


def downgrade():
    # Remove my_company_info column if needed to rollback
    op.drop_column('quotations', 'my_company_info')
