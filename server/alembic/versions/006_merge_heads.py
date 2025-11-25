"""merge heads

Revision ID: 006_merge_heads
Revises: 004_remove_iv_huella, 005_modify_horarios_unique_constraint
Create Date: 2025-11-24 00:10:00.000000
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '006_merge_heads'
down_revision = ('004_remove_iv_huella', '005_modify_horarios_unique_constraint')
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Merge migration: no DB operations required, this revision just unifies heads.
    pass


def downgrade() -> None:
    # No-op
    pass
