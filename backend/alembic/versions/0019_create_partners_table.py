"""Create partners table and add partner_id to clients

Revision ID: 0019_partners
Revises: 0018_add_sendgrid
Create Date: 2025-01-26
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = '0019_partners'
down_revision = '0018_add_sendgrid'
branch_labels = None
depends_on = None


def upgrade():
    # Create partners table
    op.create_table(
        'partners',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('company_name', sa.String(100), nullable=False),
        sa.Column('contact_person_name', sa.String(100), nullable=False),
        sa.Column('phone_number', sa.String(20), nullable=True),
        sa.Column('email_address', sa.String(100), nullable=True),
        sa.Column('contract_file_path', sa.String(500), nullable=True),
        sa.Column('contract_file_name', sa.String(255), nullable=True),
        sa.Column('contract_file_size', sa.Integer(), nullable=True),
        sa.Column('contract_mime_type', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Add partner_id column to clients table
    op.add_column('clients', sa.Column('partner_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_clients_partner_id'), 'clients', ['partner_id'], unique=False)
    op.create_foreign_key('fk_clients_partner_id', 'clients', 'partners', ['partner_id'], ['id'])


def downgrade():
    # Remove partner_id from clients table
    op.drop_constraint('fk_clients_partner_id', 'clients', type_='foreignkey')
    op.drop_index(op.f('ix_clients_partner_id'), table_name='clients')
    op.drop_column('clients', 'partner_id')

    # Drop partners table
    op.drop_table('partners')
