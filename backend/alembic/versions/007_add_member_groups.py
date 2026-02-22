"""add member_groups table and group_id to members

Revision ID: 007
Revises: 006
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'member_groups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('beitrag_override', sa.Numeric(10, 2), nullable=True),
        sa.Column('color', sa.String(7), nullable=True, server_default='#3b82f6'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_member_groups_user_id', 'member_groups', ['user_id'])

    op.add_column('members', sa.Column('group_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_members_group_id',
        'members', 'member_groups',
        ['group_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade():
    op.drop_constraint('fk_members_group_id', 'members', type_='foreignkey')
    op.drop_column('members', 'group_id')
    op.drop_index('ix_member_groups_user_id', 'member_groups')
    op.drop_table('member_groups')
