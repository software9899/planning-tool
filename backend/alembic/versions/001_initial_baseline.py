"""Initial baseline migration - existing database state

This migration establishes a baseline for existing databases.
No operations are performed as the schema already exists.

For new databases, use init-db.sql to create the initial schema,
then stamp with this revision.

Revision ID: 001
Revises:
Create Date: 2026-01-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    This is a baseline migration for existing databases.
    No changes are made as the schema is assumed to exist.

    For new databases:
    1. Run init-db.sql to create all tables
    2. Run: alembic stamp 001
    """
    pass


def downgrade() -> None:
    """Downgrade schema.

    Cannot downgrade from baseline.
    """
    pass
