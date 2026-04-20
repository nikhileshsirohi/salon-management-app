from datetime import UTC, date
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_admin_salon, get_current_admin
from app.models.booking import Booking, BookingCharge, BookingService, BookingStatus, PaymentStatus
from app.models.service import Service
from app.models.stylist import Stylist
from app.models.user import User
from app.routers.public import calculate_available_slots, get_active_stylist_service_salon
from app.schemas.booking import (
    BookingCancel,
    BookingRead,
    BookingReschedule,
    BookingServiceRead,
    BookingStatusUpdate,
    PaymentStatusUpdate,
)

router = APIRouter()


@router.get("/status")
def bookings_status() -> dict[str, str]:
    return {"module": "bookings", "status": "ready"}


def load_booking_services(db: Session, booking_id: int) -> list[BookingServiceRead]:
    rows = db.execute(
        select(BookingService, Service)
        .join(Service, Service.id == BookingService.service_id)
        .where(BookingService.booking_id == booking_id)
        .order_by(BookingService.order_index, BookingService.id)
    ).all()
    return [
        BookingServiceRead(
            service_id=service.id,
            name=service.name,
            duration_minutes=link.duration_minutes,
            price=link.price,
            order_index=link.order_index,
        )
        for link, service in rows
    ]


def to_booking_read(
    booking: Booking,
    charge: BookingCharge | None,
    stylist: Stylist | None,
    service: Service | None,
    services: list[BookingServiceRead] | None = None,
) -> BookingRead:
    resolved_services = services or []
    total_duration = (
        sum(svc.duration_minutes for svc in resolved_services)
        if resolved_services
        else None
    )
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
        services=resolved_services,
        total_duration_minutes=total_duration,
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
    admin: User = Depends(get_current_admin),
) -> list[BookingRead]:
    get_admin_salon(salon_id, db, admin)
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
    return [
        to_booking_read(
            booking,
            charge,
            stylist,
            service,
            services=load_booking_services(db, booking.id),
        )
        for booking, charge, stylist, service in rows
    ]


@router.get("/{booking_id}", response_model=BookingRead)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> BookingRead:
    row = db.execute(booking_rows_query().where(Booking.id == booking_id)).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    booking, charge, stylist, service = row
    get_admin_salon(booking.salon_id, db, admin)
    return to_booking_read(
        booking,
        charge,
        stylist,
        service,
        services=load_booking_services(db, booking.id),
    )


@router.put("/{booking_id}/status", response_model=BookingRead)
def update_booking_status(
    booking_id: int,
    payload: BookingStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> BookingRead:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    get_admin_salon(booking.salon_id, db, admin)
    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cancelled bookings cannot be changed",
        )
    if payload.status == BookingStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use the cancel endpoint to cancel a booking",
        )

    booking.status = payload.status
    db.add(booking)
    db.commit()

    return get_booking(booking_id, db, admin)


@router.put("/{booking_id}/payment-status", response_model=BookingRead)
def update_booking_payment_status(
    booking_id: int,
    payload: PaymentStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> BookingRead:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    get_admin_salon(booking.salon_id, db, admin)
    if booking.status == BookingStatus.CANCELLED and payload.status == PaymentStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cancelled bookings cannot be marked paid",
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

    return get_booking(booking_id, db, admin)


@router.post("/{booking_id}/cancel", response_model=BookingRead)
def cancel_booking(
    booking_id: int,
    payload: BookingCancel,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> BookingRead:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    get_admin_salon(booking.salon_id, db, admin)
    if booking.status != BookingStatus.BOOKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only booked appointments can be cancelled",
        )

    booking.status = BookingStatus.CANCELLED
    if payload.reason:
        booking.notes = f"{booking.notes or ''}\nCancellation reason: {payload.reason}".strip()

    db.add(booking)
    db.commit()
    return get_booking(booking_id, db, admin)


@router.put("/{booking_id}/reschedule", response_model=BookingRead)
def reschedule_booking(
    booking_id: int,
    payload: BookingReschedule,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
) -> BookingRead:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found",
        )

    get_admin_salon(booking.salon_id, db, admin)
    if booking.status != BookingStatus.BOOKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only booked appointments can be rescheduled",
        )

    stylist, service, salon = get_active_stylist_service_salon(
        db,
        booking.stylist_id,
        booking.service_id,
    )
    booking_services = load_booking_services(db, booking.id)
    total_duration = (
        sum(svc.duration_minutes for svc in booking_services)
        if booking_services
        else service.duration_minutes
    )

    starts_at_utc = payload.starts_at_utc
    if starts_at_utc.tzinfo is None:
        starts_at_utc = starts_at_utc.replace(tzinfo=UTC)
    starts_at_utc = starts_at_utc.astimezone(UTC)

    local_start = starts_at_utc.astimezone(ZoneInfo(salon.timezone))
    available_slots = calculate_available_slots(
        db,
        stylist,
        service,
        salon,
        local_start.date(),
        exclude_booking_id=booking.id,
        duration_minutes=total_duration,
    )
    matching_slot = next(
        (slot for slot in available_slots if slot.starts_at_utc == starts_at_utc),
        None,
    )

    if matching_slot is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Selected reschedule slot is not available",
        )

    booking.starts_at_utc = matching_slot.starts_at_utc
    booking.ends_at_utc = matching_slot.ends_at_utc
    booking.local_date = local_start.date()
    if payload.notes is not None:
        booking.notes = payload.notes

    db.add(booking)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Selected reschedule slot is no longer available",
        ) from error

    return get_booking(booking_id, db, admin)
