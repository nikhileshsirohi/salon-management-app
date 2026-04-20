"""add lifetime_clients to stylists

Revision ID: b2c7d9a1f034
Revises: a7f3d2c8e901
Create Date: 2026-04-19 16:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "b2c7d9a1f034"
down_revision = "a7f3d2c8e901"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "stylists",
        sa.Column(
            "lifetime_clients",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("stylists", "lifetime_clients")
