"""update clients for json contacts

Revision ID: 0005_json_contacts
Revises: 0004_create_clients_table
Create Date: 2025-01-21 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '0005_json_contacts'
down_revision = '0004_create_clients_table'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns
    op.add_column('clients', sa.Column('uen', sa.String(50), nullable=True))
    op.add_column('clients', sa.Column('industry', sa.String(100), nullable=True))
    op.add_column('clients', sa.Column('contacts', sa.JSON(), nullable=True))
    
    # Migrate existing data: convert single contact/email into JSON array
    connection = op.get_bind()
    connection.execute(text("""
        UPDATE clients 
        SET contacts = json_build_array(
            json_build_object(
                'name', contact_name,
                'phone', contact_phone,
                'email', email
            )
        )
        WHERE contacts IS NULL
    """))
    
    # Make contacts NOT NULL after migration
    op.alter_column('clients', 'contacts', nullable=False)
    
    # Drop old columns and their constraints
    op.drop_index('ix_clients_email', table_name='clients')
    op.drop_column('clients', 'contact_name')
    op.drop_column('clients', 'contact_phone')
    op.drop_column('clients', 'email')


def downgrade():
    # Add back old columns
    op.add_column('clients', sa.Column('contact_name', sa.String(66), nullable=True))
    op.add_column('clients', sa.Column('contact_phone', sa.String(20), nullable=True))
    op.add_column('clients', sa.Column('email', sa.String(50), nullable=True))
    
    # Migrate data back: extract first contact from JSON
    connection = op.get_bind()
    connection.execute(text("""
        UPDATE clients 
        SET 
            contact_name = contacts->0->>'name',
            contact_phone = contacts->0->>'phone',
            email = contacts->0->>'email'
        WHERE contacts IS NOT NULL
    """))
    
    # Make old columns NOT NULL and restore constraints
    op.alter_column('clients', 'contact_name', nullable=False)
    op.alter_column('clients', 'email', nullable=False)
    op.create_index('ix_clients_email', 'clients', ['email'], unique=True)
    
    # Drop new columns
    op.drop_column('clients', 'contacts')
    op.drop_column('clients', 'industry')
    op.drop_column('clients', 'uen')