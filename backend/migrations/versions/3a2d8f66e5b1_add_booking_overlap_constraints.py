"""add booking overlap constraints

Revision ID: 3a2d8f66e5b1
Revises: 71452eee3e3f
Create Date: 2026-04-18 22:18:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "3a2d8f66e5b1"
down_revision: str | None = "71452eee3e3f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    op.execute(
        """
        ALTER TABLE bookings
        ADD CONSTRAINT ck_bookings_time_order
        CHECK (starts_at_utc < ends_at_utc)
        """
    )
    op.execute(
        """
        ALTER TABLE bookings
        ADD CONSTRAINT ex_bookings_no_overlap
        EXCLUDE USING gist (
            stylist_id WITH =,
            tstzrange(starts_at_utc, ends_at_utc, '[)') WITH &&
        )
        WHERE (status IN ('booked'::bookingstatus, 'completed'::bookingstatus))
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ex_bookings_no_overlap")
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ck_bookings_time_order")
