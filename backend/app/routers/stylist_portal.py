from datetime import UTC, date
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_stylist
from app.models.booking import (
    Booking,
    BookingCharge,
    BookingService,
    BookingStatus,
    BookingType,
    PaymentStatus,
)
from app.models.service import Service
from app.models.salon import Salon
from app.models.stylist import Stylist
from app.routers.stylists import replace_specialties, to_stylist_read
from app.routers.bookings import booking_rows_query, load_booking_services, to_booking_read
from app.routers.public import (
    calculate_available_slots,
    get_active_stylist_service_salon,
    resolve_services,
    total_duration_minutes,
    total_price,
)
from app.schemas.booking import (
    BookingCancel,
    BookingRead,
    BookingReschedule,
    BookingStatusUpdate,
    PaymentStatusUpdate,
    WalkInBookingCreate,
)
from app.schemas.public import AvailabilityRead
from app.schemas.service import ServiceRead
from app.schemas.salon import SalonRead
from app.schemas.stylist import StylistRead, StylistSelfUpdate

router = APIRouter()


@router.get("/status")
def stylist_portal_status() -> dict[str, str]:
    return {"module": "stylist_portal", "status": "ready"}


@router.get("/schedule", response_model=list[BookingRead])
def get_stylist_schedule(
    target_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
    current_stylist: Stylist = Depends(get_current_stylist),
) -> list[BookingRead]:
    query = (
        booking_rows_query()
        .where(
            Booking.stylist_id == current_stylist.id,
            Booking.local_date == target_date,
            Booking.status != BookingStatus.CANCELLED,
        )
        .order_by(Booking.starts_at_utc)
    )
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


@router.get("/booking-history", response_model=list[BookingRead])
def get_stylist_booking_history(
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    current_stylist: Stylist = Depends(get_current_stylist),
) -> list[BookingRead]:
    query = booking_rows_query().where(Booking.stylist_id == current_stylist.id)

    if date_from is not None:
        query = query.where(Booking.local_date >= date_from)
    if date_to is not None:
        query = query.where(Booking.local_date <= date_to)

    query = query.order_by(Booking.starts_at_utc.desc())
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


def get_current_stylist_booking(
    booking_id: int,
    db: Session,
    current_stylist: Stylist,
) -> Booking:
    booking = db.get(Booking, booking_id)
    if booking is None or booking.stylist_id != current_stylist.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found for this stylist",
        )
    return booking


def read_stylist_booking(db: Session, booking_id: int, current_stylist: Stylist) -> BookingRead:
    row = db.execute(
        booking_rows_query().where(
            Booking.id == booking_id,
            Booking.stylist_id == current_stylist.id,
        )
    ).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found for this stylist",
        )

    booking, charge, stylist, service = row
    return to_booking_read(
        booking,
        charge,
        stylist,
        service,
        services=load_booking_services(db, booking.id),
    )


@router.put("/bookings/{booking_id}/status", response_model=BookingRead)
def update_my_booking_status(
    booking_id: int,
    payload: BookingStatusUpdate,
    db: Session = Depends(get_db),
    current_stylist: Stylist = Depends(get_current_stylist),
) -> BookingRead:
    booking = get_current_stylist_booking(booking_id, db, current_stylist)

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
    return read_stylist_booking(db, booking_id, current_stylist)


@router.put("/bookings/{booking_id}/payment-status", response_model=BookingRead)
def update_my_booking_payment_status(
    booking_id: int,
    payload: PaymentStatusUpdate,
    db: Session = Depends(get_db),
    current_stylist: Stylist = Depends(get_current_stylist),
) -> BookingRead:
    booking = get_current_stylist_booking(booking_id, db, current_stylist)
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
    return read_stylist_booking(db, booking_id, current_stylist)


@router.post("/bookings/{booking_id}/cancel", response_model=BookingRead)
def cancel_my_booking(
    booking_id: int,
    payload: BookingCancel,
    db: Session = Depends(get_db),
    current_stylist: Stylist = Depends(get_current_stylist),
) -> BookingRead:
    booking = get_current_stylist_booking(booking_id, db, current_stylist)
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
    return read_stylist_booking(db, booking_id, current_stylist)


@router.put("/bookings/{booking_id}/reschedule", response_model=BookingRead)
def reschedule_my_booking(
    booking_id: int,
    payload: BookingReschedule,
    db: Session = Depends(get_db),
    current_stylist: Stylist = Depends(get_current_stylist),
) -> BookingRead:
    booking = get_current_stylist_booking(booking_id, db, current_stylist)
    if booking.status != BookingStatus.BOOKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only booked appointments can be rescheduled",
        )

    stylist, service, salon = get_active_stylist_service_salon(
        db,
        current_stylist.id,
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

    return read_stylist_booking(db, booking_id, current_stylist)


@router.get("/services", response_model=list[ServiceRead])
def get_my_services(
    db: Session = Depends(get_db),
    current_stylist: Stylist = Depends(get_current_stylist),
) -> list[ServiceRead]:
    services = db.scalars(
        select(Service)
        .where(Service.salon_id == current_stylist.salon_id, Service.is_active.is_(True))
        .order_by(Service.name)
    ).all()
    return [ServiceRead.model_validate(service) for service in services]


@router.get("/profile", response_model=StylistRead)
def get_my_profile(
    db: Session = Depends(get_db),
    current_stylist: Stylist = Depends(get_current_stylist),
) -> StylistRead:
    return to_stylist_read(db, current_stylist)


@router.put("/profile", response_model=StylistRead)
def update_my_profile(
    payload: StylistSelfUpdate,
    db: Session = Depends(get_db),
    current_stylist: Stylist = Depends(get_current_stylist),
) -> StylistRead:
    update_data = payload.model_dump(exclude_unset=True, exclude={"specialties"})
    for field_name, value in update_data.items():
        setattr(current_stylist, field_name, value)

    if payload.specialties is not None:
        replace_specialties(db, current_stylist.id, payload.specialties)

    db.add(current_stylist)
    db.commit()
    db.refresh(current_stylist)
    return to_stylist_read(db, current_stylist)


@router.get("/salon", response_model=SalonRead)
def get_my_salon(
    db: Session = Depends(get_db),
    current_stylist: Stylist = Depends(get_current_stylist),
) -> Salon:
    salon = db.get(Salon, current_stylist.salon_id)
    if salon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found",
        )
    return salon


@router.get("/availability", response_model=AvailabilityRead)
def get_my_availability(
    service_id: int,
    target_date: date = Query(..., alias="date"),
    additional_service_ids: list[int] = Query(default_factory=list),
    db: Session = Depends(get_db),
    current_stylist: Stylist = Depends(get_current_stylist),
) -> AvailabilityRead:
    stylist, service, salon = get_active_stylist_service_salon(
        db,
        current_stylist.id,
        service_id,
    )
    services = resolve_services(db, salon.id, service.id, additional_service_ids)
    duration = total_duration_minutes(services)
    slots = calculate_available_slots(
        db,
        stylist,
        service,
        salon,
        target_date,
        duration_minutes=duration,
    )

    return AvailabilityRead(
        salon_id=salon.id,
        stylist_id=stylist.id,
        service_id=service.id,
        service_ids=[svc.id for svc in services],
        total_duration_minutes=duration,
        date=target_date,
        timezone=salon.timezone,
        slots=slots,
    )


@router.post("/walk-ins", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
def create_walk_in_booking(
    payload: WalkInBookingCreate,
    db: Session = Depends(get_db),
    current_stylist: Stylist = Depends(get_current_stylist),
) -> BookingRead:
    stylist, service, salon = get_active_stylist_service_salon(
        db,
        current_stylist.id,
        payload.service_id,
    )
    services = resolve_services(db, salon.id, service.id, payload.additional_service_ids)
    duration = total_duration_minutes(services)
    amount = total_price(services)

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
        duration_minutes=duration,
    )
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
    try:
        db.add(booking)
        db.flush()

        for order_index, svc in enumerate(services):
            db.add(
                BookingService(
                    booking_id=booking.id,
                    service_id=svc.id,
                    order_index=order_index,
                    duration_minutes=svc.duration_minutes,
                    price=svc.price,
                )
            )

        charge = BookingCharge(
            booking_id=booking.id,
            amount=amount,
            status=PaymentStatus.UNPAID,
        )
        db.add(charge)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Selected slot is no longer available",
        ) from error

    row = db.execute(booking_rows_query().where(Booking.id == booking.id)).one()
    created_booking, created_charge, created_stylist, created_service = row
    return to_booking_read(
        created_booking,
        created_charge,
        created_stylist,
        created_service,
        services=load_booking_services(db, created_booking.id),
    )
