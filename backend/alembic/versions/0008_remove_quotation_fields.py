"""remove quotation amount, currency, valid_until, notes fields

Revision ID: 0008_remove_quotation_fields
Revises: 0007_create_quotations_table
Create Date: 2025-10-08 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TIMESTAMP

# revision identifiers, used by Alembic.
revision = '0008_remove_quotation_fields'
down_revision = '0007_create_quotations_table'
branch_labels = None
depends_on = None


def upgrade():
    # Remove columns from quotations table
    op.drop_column('quotations', 'amount')
    op.drop_column('quotations', 'currency')
    op.drop_column('quotations', 'valid_until')
    op.drop_column('quotations', 'notes')


def downgrade():
    # Add columns back if needed to rollback
    op.add_column('quotations', sa.Column('amount', sa.Integer, nullable=True))
    op.add_column('quotations', sa.Column('currency', sa.String(length=10), server_default='SGD', nullable=False))
    op.add_column('quotations', sa.Column('valid_until', TIMESTAMP(timezone=True), nullable=True))
    op.add_column('quotations', sa.Column('notes', sa.Text, nullable=True))
