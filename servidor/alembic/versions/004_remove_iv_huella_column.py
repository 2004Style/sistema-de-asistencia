"""Remove iv_huella column from users table.

Revision ID: 004_remove_iv_huella
Revises: 003_add_iv_huella
Create Date: 2025-11-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004_remove_iv_huella'
down_revision = '003_add_iv_huella'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Eliminar columna iv_huella
    op.drop_column('users', 'iv_huella')
    print("✓ Columna 'iv_huella' removida de tabla 'users'")


def downgrade() -> None:
    # Restaurar columna iv_huella en caso de rollback
    op.add_column('users',
        sa.Column('iv_huella', sa.String(24), nullable=True)
    )
    print("✓ Columna 'iv_huella' restaurada en tabla 'users'")
