"""one salon per owner

Revision ID: 9c1a4b7d2e90
Revises: 3a2d8f66e5b1
Create Date: 2026-04-19 13:30:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "9c1a4b7d2e90"
down_revision: str | None = "3a2d8f66e5b1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_unique_constraint("uq_salons_owner_user_id", "salons", ["owner_user_id"])


def downgrade() -> None:
    op.drop_constraint("uq_salons_owner_user_id", "salons", type_="unique")
