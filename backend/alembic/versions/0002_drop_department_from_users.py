"""drop department column from users table

Revision ID: 0002_drop_department_from_users
Revises: 0001_create_users_roles
Create Date: 2024-06-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0002_drop_department_from_users'
down_revision = '0001_create_users_roles'
branch_labels = None
depends_on = None

def upgrade():
    op.drop_column('users', 'department')

def downgrade():
    op.add_column('users', sa.Column('department', sa.String(length=30), nullable=False))