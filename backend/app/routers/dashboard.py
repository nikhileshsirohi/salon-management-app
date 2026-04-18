from datetime import UTC, date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_owner, get_owned_salon
from app.models.availability import StylistAvailability
from app.models.booking import Booking, BookingCharge, BookingStatus, PaymentStatus
from app.models.stylist import Stylist
from app.models.user import User
from app.routers.bookings import booking_rows_query, to_booking_read
from app.schemas.booking import BookingRead
from app.schemas.dashboard import (
    DashboardMetricRead,
    DashboardSummaryRead,
    StylistUtilizationRead,
)

router = APIRouter()


@router.get("/status")
def dashboard_status() -> dict[str, str]:
    return {"module": "dashboard", "status": "ready"}


ACTIVE_UTILIZATION_STATUSES = [BookingStatus.BOOKED, BookingStatus.COMPLETED]


def minutes_between(start_time, end_time) -> int:
    start_minutes = start_time.hour * 60 + start_time.minute
    end_minutes = end_time.hour * 60 + end_time.minute
    return max(end_minutes - start_minutes, 0)


def booking_duration_minutes(booking: Booking) -> int:
    return int((booking.ends_at_utc - booking.starts_at_utc).total_seconds() // 60)


def get_upcoming_appointments(
    db: Session,
    salon_id: int,
    target_date: date,
    limit: int,
) -> list[BookingRead]:
    query = (
        booking_rows_query()
        .where(
            Booking.salon_id == salon_id,
            Booking.local_date >= target_date,
            Booking.status == BookingStatus.BOOKED,
        )
        .order_by(Booking.starts_at_utc)
        .limit(limit)
    )
    rows = db.execute(query).all()
    return [to_booking_read(booking, charge, stylist, service) for booking, charge, stylist, service in rows]


def get_today_revenue(db: Session, salon_id: int, target_date: date) -> Decimal:
    query = (
        select(BookingCharge.amount)
        .join(Booking, Booking.id == BookingCharge.booking_id)
        .where(
            Booking.salon_id == salon_id,
            Booking.local_date == target_date,
            BookingCharge.status == PaymentStatus.PAID,
        )
    )
    amounts = db.scalars(query).all()
    return sum(amounts, Decimal("0.00"))


def get_stylist_utilization(
    db: Session,
    salon_id: int,
    target_date: date,
) -> list[StylistUtilizationRead]:
    day_of_week = target_date.weekday()
    stylists = db.scalars(
        select(Stylist)
        .where(Stylist.salon_id == salon_id, Stylist.is_active.is_(True))
        .order_by(Stylist.name)
    ).all()

    results: list[StylistUtilizationRead] = []

    for stylist in stylists:
        availability_windows = db.scalars(
            select(StylistAvailability).where(
                StylistAvailability.stylist_id == stylist.id,
                StylistAvailability.day_of_week == day_of_week,
                StylistAvailability.is_available.is_(True),
            )
        ).all()
        available_minutes = sum(
            minutes_between(window.starts_at, window.ends_at)
            for window in availability_windows
        )

        bookings = db.scalars(
            select(Booking).where(
                Booking.stylist_id == stylist.id,
                Booking.local_date == target_date,
                Booking.status.in_(ACTIVE_UTILIZATION_STATUSES),
            )
        ).all()
        booked_minutes = sum(booking_duration_minutes(booking) for booking in bookings)
        utilization_percent = (
            round((booked_minutes / available_minutes) * 100, 2)
            if available_minutes > 0
            else 0.0
        )

        results.append(
            StylistUtilizationRead(
                stylist_id=stylist.id,
                stylist_name=stylist.name,
                available_minutes=available_minutes,
                booked_minutes=booked_minutes,
                utilization_percent=utilization_percent,
            )
        )

    return results


@router.get("/summary", response_model=DashboardSummaryRead)
def get_dashboard_summary(
    salon_id: int = Query(...),
    target_date: date = Query(..., alias="date"),
    upcoming_limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
) -> DashboardSummaryRead:
    get_owned_salon(salon_id, db, owner)

    today_bookings = db.scalar(
        select(func.count())
        .select_from(Booking)
        .where(Booking.salon_id == salon_id, Booking.local_date == target_date)
    )
    completed_bookings = db.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.salon_id == salon_id,
            Booking.local_date == target_date,
            Booking.status == BookingStatus.COMPLETED,
        )
    )
    cancelled_bookings = db.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.salon_id == salon_id,
            Booking.local_date == target_date,
            Booking.status == BookingStatus.CANCELLED,
        )
    )
    upcoming_bookings = db.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.salon_id == salon_id,
            Booking.local_date >= target_date,
            Booking.status == BookingStatus.BOOKED,
        )
    )

    return DashboardSummaryRead(
        salon_id=salon_id,
        date=target_date,
        generated_at_utc=datetime.now(UTC),
        metrics=DashboardMetricRead(
            today_bookings=today_bookings or 0,
            today_revenue=get_today_revenue(db, salon_id, target_date),
            upcoming_bookings=upcoming_bookings or 0,
            completed_bookings=completed_bookings or 0,
            cancelled_bookings=cancelled_bookings or 0,
        ),
        upcoming_appointments=get_upcoming_appointments(
            db,
            salon_id,
            target_date,
            upcoming_limit,
        ),
        stylist_utilization=get_stylist_utilization(db, salon_id, target_date),
    )
