"""initial: baseline with existing tables

Revision ID: 001_baseline
Revises: 
Create Date: 2025-10-15

This is a baseline migration for an existing database.
All tables were created before Alembic was introduced.
This migration is a no-op and serves only to establish the baseline version.

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '001_baseline'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Baseline: no changes needed, tables already exist
    pass


def downgrade() -> None:
    # Downgrade baseline is not possible, as it represents initial state
    pass
