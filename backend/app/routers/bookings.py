from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.booking import Booking, BookingCharge, BookingStatus
from app.models.service import Service
from app.models.stylist import Stylist
from app.schemas.booking import BookingRead, BookingStatusUpdate, PaymentStatusUpdate

router = APIRouter()


@router.get("/status")
def bookings_status() -> dict[str, str]:
    return {"module": "bookings", "status": "ready"}


def to_booking_read(
    booking: Booking,
    charge: BookingCharge | None,
    stylist: Stylist | None,
    service: Service | None,
) -> BookingRead:
    return BookingRead(
        id=booking.id,
        salon_id=booking.salon_id,
        stylist_id=booking.stylist_id,
        service_id=booking.service_id,
        customer_name=booking.customer_name,
        customer_phone=booking.customer_phone,
        customer_email=booking.customer_email,
        starts_at_utc=booking.starts_at_utc,
        ends_at_utc=booking.ends_at_utc,
        local_date=booking.local_date,
        status=booking.status.value,
        booking_type=booking.booking_type.value,
        notes=booking.notes,
        amount=charge.amount if charge else None,
        payment_status=charge.status.value if charge else None,
        stylist_name=stylist.name if stylist else None,
        service_name=service.name if service else None,
    )


def booking_rows_query():
    return (
        select(Booking, BookingCharge, Stylist, Service)
        .join(Stylist, Stylist.id == Booking.stylist_id)
        .join(Service, Service.id == Booking.service_id)
        .outerjoin(BookingCharge, BookingCharge.booking_id == Booking.id)
    )


@router.get("", response_model=list[BookingRead])
def list_bookings(
    salon_id: int = Query(...),
    stylist_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    booking_status: BookingStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[BookingRead]:
    query = booking_rows_query().where(Booking.salon_id == salon_id)

    if stylist_id is not None:
        query = query.where(Booking.stylist_id == stylist_id)
    if date_from is not None:
        query = query.where(Booking.local_date >= date_from)
    if date_to is not None:
        query = query.where(Booking.local_date <= date_to)
    if booking_status is not None:
        query = query.where(Booking.status == booking_status)

    query = query.order_by(Booking.starts_at_utc)
    rows = db.execute(query).all()
    return [to_booking_read(booking, charge, stylist, service) for booking, charge, stylist, service in rows]


@router.get("/{booking_id}", response_model=BookingRead)
def get_booking(booking_id: int, db: Session = Depends(get_db)) -> BookingRead:
    row = db.execute(booking_rows_query().where(Booking.id == booking_id)).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    booking, charge, stylist, service = row
    return to_booking_read(booking, charge, stylist, service)


@router.put("/{booking_id}/status", response_model=BookingRead)
def update_booking_status(
    booking_id: int,
    payload: BookingStatusUpdate,
    db: Session = Depends(get_db),
) -> BookingRead:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    booking.status = payload.status
    db.add(booking)
    db.commit()

    return get_booking(booking_id, db)


@router.put("/{booking_id}/payment-status", response_model=BookingRead)
def update_booking_payment_status(
    booking_id: int,
    payload: PaymentStatusUpdate,
    db: Session = Depends(get_db),
) -> BookingRead:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    charge = db.scalar(select(BookingCharge).where(BookingCharge.booking_id == booking_id))
    if charge is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking charge not found",
        )

    charge.status = payload.status
    db.add(charge)
    db.commit()

    return get_booking(booking_id, db)
