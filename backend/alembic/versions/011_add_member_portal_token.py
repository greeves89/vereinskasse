"""Add portal_token to members

Revision ID: 011
Revises: 010
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa

revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('members', sa.Column('portal_token', sa.String(255), nullable=True))
    op.create_index('ix_members_portal_token', 'members', ['portal_token'], unique=True)


def downgrade():
    op.drop_index('ix_members_portal_token', table_name='members')
    op.drop_column('members', 'portal_token')
