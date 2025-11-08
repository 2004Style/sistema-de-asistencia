"""Add iv_huella column to users table.

Revision ID: 003_add_iv_huella
Revises: 002_change_huella_to_text
Create Date: 2025-11-02 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_add_iv_huella'
down_revision = '002_change_huella_to_text'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Agregar columna iv_huella a la tabla users
    op.add_column('users', sa.Column('iv_huella', sa.String(24), nullable=True))
    print("✓ Columna 'iv_huella' agregada a tabla 'users'")


def downgrade() -> None:
    # Remover columna iv_huella de la tabla users
    op.drop_column('users', 'iv_huella')
    print("✓ Columna 'iv_huella' removida de tabla 'users'")
