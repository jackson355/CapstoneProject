"""Add SendGrid support to email settings

Revision ID: 0018_add_sendgrid
Revises: 0017_company_settings
Create Date: 2025-01-20
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = '0018_add_sendgrid'
down_revision = '0017_company_settings'
branch_labels = None
depends_on = None


def upgrade():
    # Add provider column (default to 'smtp' for existing records)
    op.add_column('email_settings', sa.Column('provider', sa.String(length=50), nullable=False, server_default='smtp'))

    # Add SendGrid API key column
    op.add_column('email_settings', sa.Column('sendgrid_api_key', sa.String(length=500), nullable=True))

    # Make SMTP fields nullable (since they're not needed for SendGrid)
    op.alter_column('email_settings', 'smtp_server', nullable=True)
    op.alter_column('email_settings', 'smtp_port', nullable=True)
    op.alter_column('email_settings', 'smtp_username', nullable=True)
    op.alter_column('email_settings', 'smtp_password', nullable=True)


def downgrade():
    # Remove SendGrid fields
    op.drop_column('email_settings', 'sendgrid_api_key')
    op.drop_column('email_settings', 'provider')

    # Make SMTP fields non-nullable again
    op.alter_column('email_settings', 'smtp_server', nullable=False)
    op.alter_column('email_settings', 'smtp_port', nullable=False)
    op.alter_column('email_settings', 'smtp_username', nullable=False)
    op.alter_column('email_settings', 'smtp_password', nullable=False)
