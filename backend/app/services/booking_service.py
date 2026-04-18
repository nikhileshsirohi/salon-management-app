from datetime import datetime

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.booking import Booking, BookingStatus


ACTIVE_BOOKING_STATUSES = [BookingStatus.BOOKED, BookingStatus.COMPLETED]


def overlapping_bookings_query(
    stylist_id: int,
    starts_at_utc: datetime,
    ends_at_utc: datetime,
) -> Select[tuple[Booking]]:
    return select(Booking).where(
        Booking.stylist_id == stylist_id,
        Booking.status.in_(ACTIVE_BOOKING_STATUSES),
        Booking.starts_at_utc < ends_at_utc,
        Booking.ends_at_utc > starts_at_utc,
    )


def has_overlapping_booking(
    db: Session,
    stylist_id: int,
    starts_at_utc: datetime,
    ends_at_utc: datetime,
) -> bool:
    existing = db.execute(
        overlapping_bookings_query(stylist_id, starts_at_utc, ends_at_utc)
    ).first()
    return existing is not None
