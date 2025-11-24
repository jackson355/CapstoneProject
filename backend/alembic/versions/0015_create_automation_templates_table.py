"""create automation templates table

Revision ID: 0015_create_automation_templates
Revises: 0014_add_doc_fields_set_null
Create Date: 2025-11-08 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0015_create_automation_templates'
down_revision = '0014_add_doc_fields_set_null'
branch_labels = None
depends_on = None


def upgrade():
    # Create automation_templates table
    op.create_table(
        'automation_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('trigger_type', sa.String(length=50), nullable=False),
        sa.Column('trigger_event', sa.String(length=100), nullable=False),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_automation_templates_id', 'automation_templates', ['id'])
    op.create_index('ix_automation_templates_trigger_type', 'automation_templates', ['trigger_type'])
    op.create_index('ix_automation_templates_trigger_event', 'automation_templates', ['trigger_event'])

    # Create unique constraint on trigger_event
    op.create_unique_constraint('uq_automation_templates_trigger_event', 'automation_templates', ['trigger_event'])

    # Insert default templates
    op.execute("""
        INSERT INTO automation_templates (trigger_type, trigger_event, subject, body, is_enabled)
        VALUES
        ('status_change', 'quotation_accepted', 'Quotation {{quotation_number}} Accepted',
         '<html><body><p>Dear {{contact_name}},</p><p>Thank you for accepting our quotation {{quotation_number}}.</p><p>We will process your order and keep you updated on the progress.</p><p>If you have any questions, please don''t hesitate to contact us.</p><p>Best regards,<br>{{company_name}}</p></body></html>',
         true),

        ('status_change', 'quotation_rejected', 'Quotation {{quotation_number}} Status Update',
         '<html><body><p>Dear {{contact_name}},</p><p>We received your response regarding quotation {{quotation_number}}.</p><p>We appreciate you taking the time to review our proposal. If you would like to discuss any modifications or have questions about our services, please feel free to reach out.</p><p>We look forward to potentially working with you in the future.</p><p>Best regards,<br>{{company_name}}</p></body></html>',
         true),

        ('status_change', 'invoice_paid', 'Payment Received - Invoice {{invoice_number}}',
         '<html><body><p>Dear {{contact_name}},</p><p>Thank you for your payment on invoice {{invoice_number}}.</p><p>We have received your payment and your invoice has been marked as paid.</p><p>If you need a receipt or have any questions, please contact us.</p><p>Best regards,<br>{{company_name}}</p></body></html>',
         true),

        ('deadline', 'quotation_deadline', 'Reminder: Quotation {{quotation_number}} Expires Soon',
         '<html><body><p>Dear {{contact_name}},</p><p>This is a friendly reminder that quotation {{quotation_number}} will expire on {{due_date}}.</p><p>If you would like to proceed with this quotation, please let us know before the expiration date.</p><p>If you have any questions or need more time, please contact us.</p><p>Best regards,<br>{{company_name}}</p></body></html>',
         true),

        ('deadline', 'invoice_deadline', 'Payment Reminder - Invoice {{invoice_number}} Due Soon',
         '<html><body><p>Dear {{contact_name}},</p><p>This is a friendly reminder that invoice {{invoice_number}} is due on {{due_date}}.</p><p>If you have already made the payment, please disregard this message.</p><p>If you have any questions about the invoice, please don''t hesitate to contact us.</p><p>Best regards,<br>{{company_name}}</p></body></html>',
         true)
    """)


def downgrade():
    # Drop unique constraint
    op.drop_constraint('uq_automation_templates_trigger_event', 'automation_templates', type_='unique')

    # Drop indexes
    op.drop_index('ix_automation_templates_trigger_event', 'automation_templates')
    op.drop_index('ix_automation_templates_trigger_type', 'automation_templates')
    op.drop_index('ix_automation_templates_id', 'automation_templates')

    # Drop table
    op.drop_table('automation_templates')
