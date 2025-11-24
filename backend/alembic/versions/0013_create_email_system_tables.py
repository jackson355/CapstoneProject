"""create email system tables

Revision ID: 0013_create_email_system_tables
Revises: 0012_update_quotation_status
Create Date: 2025-11-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, TIMESTAMP

# revision identifiers, used by Alembic.
revision = '0013_create_email_system_tables'
down_revision = '0012_update_quotation_status'
branch_labels = None
depends_on = None


def upgrade():
    # Create email_templates table
    op.create_table(
        'email_templates',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('body', sa.Text, nullable=False),
        sa.Column('template_type', sa.String(length=50), nullable=False, index=True),
        sa.Column('variables', JSON, nullable=True),
        sa.Column('is_default', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('created_at', TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False, index=True),
        sa.Column('updated_at', TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )

    # Create email_history table
    op.create_table(
        'email_history',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('recipient_email', sa.String(length=255), nullable=False, index=True),
        sa.Column('recipient_name', sa.String(length=255), nullable=True),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('body', sa.Text, nullable=False),
        sa.Column('quotation_id', sa.Integer, sa.ForeignKey('quotations.id'), nullable=True, index=True),
        sa.Column('invoice_id', sa.Integer, sa.ForeignKey('invoices.id'), nullable=True, index=True),
        sa.Column('email_template_id', sa.Integer, sa.ForeignKey('email_templates.id'), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='sent', index=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('attachments', JSON, nullable=True),
        sa.Column('sent_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('sent_at', TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False, index=True),
    )

    # Create scheduled_emails table
    op.create_table(
        'scheduled_emails',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('recipient_email', sa.String(length=255), nullable=False, index=True),
        sa.Column('recipient_name', sa.String(length=255), nullable=True),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('body', sa.Text, nullable=False),
        sa.Column('quotation_id', sa.Integer, sa.ForeignKey('quotations.id'), nullable=True, index=True),
        sa.Column('invoice_id', sa.Integer, sa.ForeignKey('invoices.id'), nullable=True, index=True),
        sa.Column('email_template_id', sa.Integer, sa.ForeignKey('email_templates.id'), nullable=True),
        sa.Column('scheduled_time', TIMESTAMP(timezone=True), nullable=False, index=True),
        sa.Column('is_recurring', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('recurrence_pattern', JSON, nullable=True),
        sa.Column('trigger_type', sa.String(length=50), nullable=True, index=True),
        sa.Column('trigger_config', JSON, nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending', index=True),
        sa.Column('last_sent_at', TIMESTAMP(timezone=True), nullable=True),
        sa.Column('next_send_at', TIMESTAMP(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('attachments', JSON, nullable=True),
        sa.Column('created_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('created_at', TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False, index=True),
        sa.Column('updated_at', TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )

    # Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.String(length=500), nullable=False),
        sa.Column('notification_type', sa.String(length=50), nullable=False, index=True),
        sa.Column('related_type', sa.String(length=50), nullable=True),
        sa.Column('related_id', sa.Integer, nullable=True),
        sa.Column('notification_metadata', JSON, nullable=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('is_read', sa.Boolean, nullable=False, server_default='false', index=True),
        sa.Column('read_at', TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False, index=True),
    )

    # Create email_settings table
    op.create_table(
        'email_settings',
        sa.Column('id', sa.Integer, primary_key=True, index=True),
        sa.Column('smtp_server', sa.String(length=255), nullable=False),
        sa.Column('smtp_port', sa.Integer, nullable=False),
        sa.Column('smtp_username', sa.String(length=255), nullable=False),
        sa.Column('smtp_password', sa.String(length=255), nullable=False),
        sa.Column('use_tls', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('use_ssl', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('from_email', sa.String(length=255), nullable=False),
        sa.Column('from_name', sa.String(length=255), nullable=True),
        sa.Column('reply_to', sa.String(length=255), nullable=True),
        sa.Column('email_signature', sa.Text, nullable=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
    )


def downgrade():
    op.drop_table('email_settings')
    op.drop_table('notifications')
    op.drop_table('scheduled_emails')
    op.drop_table('email_history')
    op.drop_table('email_templates')
