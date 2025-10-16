"""update quotation status to pending/accepted/rejected

Revision ID: 0012_update_quotation_status
Revises: 0011_create_invoices_table
Create Date: 2025-10-14 02:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0012_update_quotation_status'
down_revision = '0011_create_invoices_table'
branch_labels = None
depends_on = None


def upgrade():
    # Update existing quotation status values
    # Map: unpaid -> pending, paid -> accepted
    op.execute("""
        UPDATE quotations
        SET status = CASE
            WHEN status = 'paid' THEN 'accepted'
            WHEN status = 'unpaid' THEN 'pending'
            ELSE 'pending'
        END
    """)

    # Update the default value for new quotations
    op.alter_column('quotations', 'status',
                    existing_type=sa.String(length=50),
                    server_default='pending',
                    existing_nullable=False)


def downgrade():
    # Revert status values back to unpaid/paid
    op.execute("""
        UPDATE quotations
        SET status = CASE
            WHEN status = 'accepted' THEN 'paid'
            WHEN status = 'rejected' THEN 'unpaid'
            WHEN status = 'pending' THEN 'unpaid'
            ELSE 'unpaid'
        END
    """)

    # Revert the default value
    op.alter_column('quotations', 'status',
                    existing_type=sa.String(length=50),
                    server_default='unpaid',
                    existing_nullable=False)
