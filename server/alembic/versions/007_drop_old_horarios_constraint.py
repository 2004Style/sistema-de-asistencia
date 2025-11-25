"""drop old horarios unique constraint

Revision ID: 007_drop_old_horarios_constraint
Revises: 006_merge_heads
Create Date: 2025-11-24 14:30:00.000000
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '007_drop_old_horarios_constraint'
down_revision = '006_merge_heads'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop legacy unique constraints if they exist. Use IF EXISTS to be safe.
    op.execute("""
    ALTER TABLE horarios DROP CONSTRAINT IF EXISTS uq_user_dia_turno;
    ALTER TABLE horarios DROP CONSTRAINT IF EXISTS ug_user_dia_turno;
    ALTER TABLE horarios DROP CONSTRAINT IF EXISTS uq_user_dia_tumno_hore;
    """)


def downgrade() -> None:
    # No-op: we intentionally drop legacy constraints and don't recreate them on downgrade.
    pass
