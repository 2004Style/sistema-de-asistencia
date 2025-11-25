"""modify horarios unique constraint

Revision ID: 005_modify_horarios_unique_constraint
Revises: 1b61c6235f0f
Create Date: 2025-11-24 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005_modify_horarios_unique_constraint'
down_revision = '1b61c6235f0f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop old unique constraint and create a new one that includes hora_entrada and hora_salida
    with op.batch_alter_table('horarios') as batch_op:
        batch_op.drop_constraint('uq_user_dia_turno', type_='unique')
        batch_op.create_unique_constraint(
            'uq_user_dia_turno_horas',
            ['user_id', 'dia_semana', 'turno_id', 'hora_entrada', 'hora_salida']
        )


def downgrade() -> None:
    # Revert to previous unique constraint
    with op.batch_alter_table('horarios') as batch_op:
        batch_op.drop_constraint('uq_user_dia_turno_horas', type_='unique')
        batch_op.create_unique_constraint('uq_user_dia_turno', ['user_id', 'dia_semana', 'turno_id'])
