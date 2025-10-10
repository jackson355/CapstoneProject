"""create quotations table

Revision ID: 0007_create_quotations_table
Revises: f2cafb42bb42
Create Date: 2025-10-08 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = '0007_create_quotations_table'
down_revision = 'f2cafb42bb42'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'quotations',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('quotation_number', sa.String(length=100), nullable=False, unique=True, index=True),

        # Client relationship
        sa.Column('client_id', sa.Integer, sa.ForeignKey('clients.id'), nullable=False, index=True),
        sa.Column('selected_contact', JSON, nullable=False),

        # Template relationship
        sa.Column('template_id', sa.Integer, sa.ForeignKey('templates.id'), nullable=False, index=True),

        # Quotation document
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('file_name', sa.String(length=255), nullable=True),
        sa.Column('file_size', sa.Integer, nullable=True),

        # Status tracking
        sa.Column('status', sa.String(length=50), nullable=False, server_default='draft', index=True),

        # Additional quotation details
        sa.Column('amount', sa.Integer, nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='SGD'),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),

        # Placeholder tracking
        sa.Column('unfilled_placeholders', JSON, nullable=True),

        # Metadata
        sa.Column('created_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), nullable=False, index=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()'), onupdate=sa.text('NOW()'), nullable=False),
    )


def downgrade():
    op.drop_table('quotations')
