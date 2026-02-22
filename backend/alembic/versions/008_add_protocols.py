"""add protocols table

Revision ID: 008
Revises: 007
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'protocols',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('protocol_type', sa.String(50), nullable=False),
        sa.Column('meeting_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('attendees', JSON(), nullable=True),
        sa.Column('agenda_items', JSON(), nullable=True),
        sa.Column('resolutions', JSON(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='draft'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_protocols_user_id', 'protocols', ['user_id'])


def downgrade():
    op.drop_index('ix_protocols_user_id', 'protocols')
    op.drop_table('protocols')
