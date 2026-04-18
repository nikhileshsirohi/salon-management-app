from datetime import UTC, date
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.booking import Booking, BookingCharge, BookingStatus, BookingType, PaymentStatus
from app.models.stylist import Stylist
from app.routers.bookings import booking_rows_query, to_booking_read
from app.routers.public import calculate_available_slots, get_active_stylist_service_salon
from app.schemas.booking import BookingRead, WalkInBookingCreate

router = APIRouter()


@router.get("/status")
def stylist_portal_status() -> dict[str, str]:
    return {"module": "stylist_portal", "status": "ready"}


def get_active_stylist(db: Session, stylist_id: int) -> Stylist:
    stylist = db.get(Stylist, stylist_id)
    if stylist is None or not stylist.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active stylist not found",
        )
    return stylist


@router.get("/schedule", response_model=list[BookingRead])
def get_stylist_schedule(
    stylist_id: int = Query(...),
    target_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
) -> list[BookingRead]:
    get_active_stylist(db, stylist_id)
    query = (
        booking_rows_query()
        .where(
            Booking.stylist_id == stylist_id,
            Booking.local_date == target_date,
            Booking.status != BookingStatus.CANCELLED,
        )
        .order_by(Booking.starts_at_utc)
    )
    rows = db.execute(query).all()
    return [to_booking_read(booking, charge, stylist, service) for booking, charge, stylist, service in rows]


@router.get("/booking-history", response_model=list[BookingRead])
def get_stylist_booking_history(
    stylist_id: int = Query(...),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
) -> list[BookingRead]:
    get_active_stylist(db, stylist_id)
    query = booking_rows_query().where(Booking.stylist_id == stylist_id)

    if date_from is not None:
        query = query.where(Booking.local_date >= date_from)
    if date_to is not None:
        query = query.where(Booking.local_date <= date_to)

    query = query.order_by(Booking.starts_at_utc.desc())
    rows = db.execute(query).all()
    return [to_booking_read(booking, charge, stylist, service) for booking, charge, stylist, service in rows]


@router.post("/walk-ins", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
def create_walk_in_booking(
    payload: WalkInBookingCreate,
    db: Session = Depends(get_db),
) -> BookingRead:
    stylist, service, salon = get_active_stylist_service_salon(
        db,
        payload.stylist_id,
        payload.service_id,
    )

    starts_at_utc = payload.starts_at_utc
    if starts_at_utc.tzinfo is None:
        starts_at_utc = starts_at_utc.replace(tzinfo=UTC)
    starts_at_utc = starts_at_utc.astimezone(UTC)

    local_start = starts_at_utc.astimezone(ZoneInfo(salon.timezone))
    available_slots = calculate_available_slots(db, stylist, service, salon, local_start.date())
    matching_slot = next(
        (slot for slot in available_slots if slot.starts_at_utc == starts_at_utc),
        None,
    )

    if matching_slot is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Selected slot is not available for this walk-in",
        )

    booking = Booking(
        salon_id=salon.id,
        stylist_id=stylist.id,
        service_id=service.id,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        starts_at_utc=matching_slot.starts_at_utc,
        ends_at_utc=matching_slot.ends_at_utc,
        local_date=local_start.date(),
        status=BookingStatus.BOOKED,
        booking_type=BookingType.WALK_IN,
        notes=payload.notes,
    )
    db.add(booking)
    db.flush()

    charge = BookingCharge(
        booking_id=booking.id,
        amount=service.price,
        status=PaymentStatus.UNPAID,
    )
    db.add(charge)
    db.commit()

    row = db.execute(booking_rows_query().where(Booking.id == booking.id)).one()
    created_booking, created_charge, created_stylist, created_service = row
    return to_booking_read(created_booking, created_charge, created_stylist, created_service)
