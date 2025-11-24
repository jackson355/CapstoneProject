"""add document fields and set null to email tables

Revision ID: 0014_add_doc_fields_set_null
Revises: 0013_create_email_system_tables
Create Date: 2025-11-06 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0014_add_doc_fields_set_null'
down_revision = '0013_create_email_system_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Step 1: Add new columns to email_history
    op.add_column('email_history', sa.Column('document_number', sa.String(length=100), nullable=True))
    op.add_column('email_history', sa.Column('document_type', sa.String(length=20), nullable=True))

    # Step 2: Add new columns to scheduled_emails
    op.add_column('scheduled_emails', sa.Column('document_number', sa.String(length=100), nullable=True))
    op.add_column('scheduled_emails', sa.Column('document_type', sa.String(length=20), nullable=True))

    # Step 3: Create indexes for new columns
    op.create_index('ix_email_history_document_number', 'email_history', ['document_number'])
    op.create_index('ix_scheduled_emails_document_number', 'scheduled_emails', ['document_number'])

    # Step 4: Drop existing foreign key constraints for email_history
    op.drop_constraint('email_history_quotation_id_fkey', 'email_history', type_='foreignkey')
    op.drop_constraint('email_history_invoice_id_fkey', 'email_history', type_='foreignkey')

    # Step 5: Drop existing foreign key constraints for scheduled_emails
    op.drop_constraint('scheduled_emails_quotation_id_fkey', 'scheduled_emails', type_='foreignkey')
    op.drop_constraint('scheduled_emails_invoice_id_fkey', 'scheduled_emails', type_='foreignkey')

    # Step 6: Recreate foreign keys with ON DELETE SET NULL for email_history
    op.create_foreign_key(
        'email_history_quotation_id_fkey',
        'email_history', 'quotations',
        ['quotation_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'email_history_invoice_id_fkey',
        'email_history', 'invoices',
        ['invoice_id'], ['id'],
        ondelete='SET NULL'
    )

    # Step 7: Recreate foreign keys with ON DELETE SET NULL for scheduled_emails
    op.create_foreign_key(
        'scheduled_emails_quotation_id_fkey',
        'scheduled_emails', 'quotations',
        ['quotation_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'scheduled_emails_invoice_id_fkey',
        'scheduled_emails', 'invoices',
        ['invoice_id'], ['id'],
        ondelete='SET NULL'
    )

    # Step 8: Populate document_number and document_type for existing records
    # For email_history with quotations
    op.execute("""
        UPDATE email_history eh
        SET document_number = q.quotation_number,
            document_type = 'quotation'
        FROM quotations q
        WHERE eh.quotation_id = q.id
        AND eh.quotation_id IS NOT NULL
    """)

    # For email_history with invoices
    op.execute("""
        UPDATE email_history eh
        SET document_number = i.invoice_number,
            document_type = 'invoice'
        FROM invoices i
        WHERE eh.invoice_id = i.id
        AND eh.invoice_id IS NOT NULL
    """)

    # For scheduled_emails with quotations
    op.execute("""
        UPDATE scheduled_emails se
        SET document_number = q.quotation_number,
            document_type = 'quotation'
        FROM quotations q
        WHERE se.quotation_id = q.id
        AND se.quotation_id IS NOT NULL
    """)

    # For scheduled_emails with invoices
    op.execute("""
        UPDATE scheduled_emails se
        SET document_number = i.invoice_number,
            document_type = 'invoice'
        FROM invoices i
        WHERE se.invoice_id = i.id
        AND se.invoice_id IS NOT NULL
    """)


def downgrade():
    # Step 1: Drop foreign keys with SET NULL
    op.drop_constraint('email_history_quotation_id_fkey', 'email_history', type_='foreignkey')
    op.drop_constraint('email_history_invoice_id_fkey', 'email_history', type_='foreignkey')
    op.drop_constraint('scheduled_emails_quotation_id_fkey', 'scheduled_emails', type_='foreignkey')
    op.drop_constraint('scheduled_emails_invoice_id_fkey', 'scheduled_emails', type_='foreignkey')

    # Step 2: Recreate original foreign keys without ON DELETE
    op.create_foreign_key(
        'email_history_quotation_id_fkey',
        'email_history', 'quotations',
        ['quotation_id'], ['id']
    )
    op.create_foreign_key(
        'email_history_invoice_id_fkey',
        'email_history', 'invoices',
        ['invoice_id'], ['id']
    )
    op.create_foreign_key(
        'scheduled_emails_quotation_id_fkey',
        'scheduled_emails', 'quotations',
        ['quotation_id'], ['id']
    )
    op.create_foreign_key(
        'scheduled_emails_invoice_id_fkey',
        'scheduled_emails', 'invoices',
        ['invoice_id'], ['id']
    )

    # Step 3: Drop indexes
    op.drop_index('ix_email_history_document_number', 'email_history')
    op.drop_index('ix_scheduled_emails_document_number', 'scheduled_emails')

    # Step 4: Drop columns
    op.drop_column('email_history', 'document_type')
    op.drop_column('email_history', 'document_number')
    op.drop_column('scheduled_emails', 'document_type')
    op.drop_column('scheduled_emails', 'document_number')
