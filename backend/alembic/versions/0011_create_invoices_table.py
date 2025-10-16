"""create invoices table

Revision ID: 0011_create_invoices_table
Revises: 0010_add_due_date_status
Create Date: 2025-10-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, TIMESTAMP

# revision identifiers, used by Alembic.
revision = '0011_create_invoices_table'
down_revision = '0010_add_due_date_status'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('invoice_number', sa.String(length=100), nullable=False, unique=True, index=True),

        # Quotation relationship - invoice created from paid quotation
        sa.Column('quotation_id', sa.Integer, sa.ForeignKey('quotations.id'), nullable=False, index=True),

        # Client relationship (copied from quotation)
        sa.Column('client_id', sa.Integer, sa.ForeignKey('clients.id'), nullable=False, index=True),
        sa.Column('selected_contact', JSON, nullable=False),

        # Template relationship
        sa.Column('template_id', sa.Integer, sa.ForeignKey('templates.id'), nullable=False, index=True),

        # User's company information
        sa.Column('my_company_info', JSON, nullable=True),

        # Invoice document
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('file_name', sa.String(length=255), nullable=True),
        sa.Column('file_size', sa.Integer, nullable=True),

        # Due date
        sa.Column('due_date', TIMESTAMP(timezone=True), nullable=True),

        # Status tracking
        sa.Column('status', sa.String(length=50), nullable=False, server_default='unpaid', index=True),

        # Placeholder tracking
        sa.Column('unfilled_placeholders', JSON, nullable=True),

        # Metadata
        sa.Column('created_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('created_at', TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False, index=True),
        sa.Column('updated_at', TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )


def downgrade():
    op.drop_table('invoices')
