"""add_huella_field_to_users

Revision ID: 002_add_huella_to_users
Revises: 001_baseline
Create Date: 2025-10-16

Agrega el campo opcional de huella digital a la tabla de usuarios.
La huella se puede registrar al momento de crear el usuario o 
actualizar posteriormente usando el endpoint actualizar_huella.

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_huella_to_users'
down_revision = '001_baseline'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Agregar columna huella a la tabla users
    op.add_column(
        'users',
        sa.Column('huella', sa.String(500), nullable=True)
    )


def downgrade() -> None:
    # Remover columna huella de la tabla users
    op.drop_column('users', 'huella')
