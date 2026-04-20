"""add booking_services join table with backfill

Revision ID: a7f3d2c8e901
Revises: 9c1a4b7d2e90
Create Date: 2026-04-19 15:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "a7f3d2c8e901"
down_revision = "9c1a4b7d2e90"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "booking_services",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "booking_id",
            sa.Integer(),
            sa.ForeignKey("bookings.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "service_id",
            sa.Integer(),
            sa.ForeignKey("services.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("booking_id", "service_id", name="uq_booking_services_booking_service"),
    )
    op.create_index(
        "ix_booking_services_id",
        "booking_services",
        ["id"],
    )

    # Backfill: every existing booking already has a single service pinned on
    # Booking.service_id. Mirror it into booking_services with the service's
    # current duration and the charge amount (or service price as fallback).
    op.execute(
        """
        INSERT INTO booking_services (
            booking_id, service_id, order_index, duration_minutes, price
        )
        SELECT
            b.id,
            b.service_id,
            0,
            s.duration_minutes,
            COALESCE(bc.amount, s.price)
        FROM bookings b
        JOIN services s ON s.id = b.service_id
        LEFT JOIN booking_charges bc ON bc.booking_id = b.id
        """
    )


def downgrade() -> None:
    op.drop_index("ix_booking_services_id", table_name="booking_services")
    op.drop_table("booking_services")
