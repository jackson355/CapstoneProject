"""Add attach_document field to scheduled_emails table

Revision ID: 0020_attach_document
Revises: 0019_partners
Create Date: 2025-02-06

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0020_attach_document'
down_revision = '0019_partners'
branch_labels = None
depends_on = None


def upgrade():
    # Add attach_document column to scheduled_emails table
    op.add_column('scheduled_emails', sa.Column('attach_document', sa.Boolean(), nullable=True, server_default='false'))


def downgrade():
    # Remove attach_document column
    op.drop_column('scheduled_emails', 'attach_document')
