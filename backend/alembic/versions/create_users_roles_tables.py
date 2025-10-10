"""create users, roles, and user_roles tables

Revision ID: 0001_create_users_roles
Revises: 
Create Date: 2024-06-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0001_create_users_roles'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(length=50), unique=True, nullable=False)
    )

    op.create_table(
        'users',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(length=66), nullable=False),
        sa.Column('department', sa.String(length=30), nullable=False),
        sa.Column('email', sa.String(length=50), unique=True, nullable=False),
        sa.Column('password', sa.String(length=128), nullable=False),
        sa.Column('role_id', sa.Integer, sa.ForeignKey('roles.id'), nullable=False)
    )

    # Removed user_roles association table


def downgrade():
    op.drop_table('users')
    op.drop_table('roles')