"""Change huella column to TEXT

Revision ID: 002_change_huella_to_text
Revises: 1b61c6235f0f
Create Date: 2025-11-02

Cambia el campo huella de VARCHAR(500) a TEXT para permitir
huellas encriptadas más grandes (base64).

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_change_huella_to_text'
down_revision = '1b61c6235f0f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Cambiar huella a TEXT"""
    # Alterar la columna huella de VARCHAR(500) a TEXT
    op.alter_column(
        'users',
        'huella',
        existing_type=sa.VARCHAR(length=500),
        type_=sa.Text(),
        existing_nullable=True,
        nullable=True
    )


def downgrade() -> None:
    """Revertir huella a VARCHAR(500)"""
    op.alter_column(
        'users',
        'huella',
        existing_type=sa.Text(),
        type_=sa.VARCHAR(length=500),
        existing_nullable=True,
        nullable=True
    )
