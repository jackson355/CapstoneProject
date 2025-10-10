"""create clients table

Revision ID: 0004_create_clients_table
Revises: 0003_create_activity_logs
Create Date: 2025-08-18 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0004_create_clients_table'
down_revision = '0003_create_activity_logs'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'clients',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('company_name', sa.String(length=100), nullable=False),
        sa.Column('contact_name', sa.String(length=66), nullable=False),
        sa.Column('contact_phone', sa.String(length=20), nullable=True),
        sa.Column('email', sa.String(length=50), nullable=False, unique=True),
        sa.Column('address', sa.String(length=200), nullable=True),
        sa.Column('postal_code', sa.String(length=10), nullable=True),
    )
    # Optional index to speed up lookups by email; unique is already enforced above
    op.create_index('ix_clients_email', 'clients', ['email'], unique=True)


def downgrade():
    op.drop_index('ix_clients_email', table_name='clients')
    op.drop_table('clients')