"""Remove deprecated tipo_turno field from horarios and asistencias

Revision ID: 003_remove_tipo_turno
Revises: 002_add_huella_to_users
Create Date: 2025-10-16 13:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_remove_tipo_turno'
down_revision = '002_add_huella_to_users'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove tipo_turno column from horarios and asistencias tables."""
    # Remove tipo_turno from horarios table
    op.drop_column('horarios', 'tipo_turno')
    
    # Remove tipo_turno from asistencias table
    op.drop_column('asistencias', 'tipo_turno')


def downgrade() -> None:
    """Re-add tipo_turno column to horarios and asistencias tables."""
    # Re-add tipo_turno to asistencias table
    op.add_column(
        'asistencias',
        sa.Column('tipo_turno', sa.String(20), nullable=True)
    )
    
    # Re-add tipo_turno to horarios table
    op.add_column(
        'horarios',
        sa.Column(
            'tipo_turno',
            sa.Enum('manana', 'tarde', 'noche', 'completo', 'especial', name='tipoturno'),
            nullable=True,
            server_default='completo'
        )
    )
