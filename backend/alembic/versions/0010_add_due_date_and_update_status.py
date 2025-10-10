"""add due_date and update status to unpaid/paid

Revision ID: 0010_add_due_date_status
Revises: 0009_add_company_info
Create Date: 2025-10-10 01:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TIMESTAMP

# revision identifiers, used by Alembic.
revision = '0010_add_due_date_status'
down_revision = '0009_add_company_info'
branch_labels = None
depends_on = None


def upgrade():
    # Add due_date column
    op.add_column('quotations', sa.Column('due_date', TIMESTAMP(timezone=True), nullable=True))

    # Update existing status values from old system to new system
    # Map: draft -> unpaid, sent -> unpaid, accepted -> paid, rejected -> unpaid, expired -> unpaid
    op.execute("""
        UPDATE quotations
        SET status = CASE
            WHEN status = 'accepted' THEN 'paid'
            ELSE 'unpaid'
        END
    """)


def downgrade():
    # Remove due_date column
    op.drop_column('quotations', 'due_date')

    # Revert status values back (best effort)
    op.execute("""
        UPDATE quotations
        SET status = CASE
            WHEN status = 'paid' THEN 'accepted'
            WHEN status = 'unpaid' THEN 'draft'
            ELSE 'draft'
        END
    """)
