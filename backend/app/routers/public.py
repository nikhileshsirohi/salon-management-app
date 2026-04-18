from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.availability import SalonOperatingHour, StylistAvailability
from app.models.booking import Booking, BookingCharge, BookingStatus, BookingType, PaymentStatus
from app.models.salon import Salon
from app.models.service import Service
from app.models.stylist import Stylist, StylistSpecialty
from app.schemas.public import (
    AvailabilityRead,
    AvailableSlotRead,
    PublicBookingCreate,
    PublicBookingRead,
    PublicServicesRead,
    PublicStylistsRead,
)
from app.schemas.service import ServiceRead
from app.schemas.stylist import StylistRead

router = APIRouter()


@router.get("/status")
def public_status() -> dict[str, str]:
    return {"module": "public", "status": "ready"}


ACTIVE_BOOKING_STATUSES = [BookingStatus.BOOKED, BookingStatus.COMPLETED]


def local_to_utc(local_date: date, local_time: time, timezone_name: str) -> datetime:
    local_datetime = datetime.combine(local_date, local_time, tzinfo=ZoneInfo(timezone_name))
    return local_datetime.astimezone(UTC)


def datetime_to_utc(value: datetime, timezone_name: str) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=ZoneInfo(timezone_name))
    return value.astimezone(UTC)


def get_specialty_names(db: Session, stylist_id: int) -> list[str]:
    query = (
        select(StylistSpecialty.name)
        .where(StylistSpecialty.stylist_id == stylist_id)
        .order_by(StylistSpecialty.name)
    )
    return list(db.scalars(query).all())


def to_stylist_read(db: Session, stylist: Stylist) -> StylistRead:
    return StylistRead.model_validate(
        {
            "id": stylist.id,
            "salon_id": stylist.salon_id,
            "name": stylist.name,
            "phone": stylist.phone,
            "bio": stylist.bio,
            "profile_photo_url": stylist.profile_photo_url,
            "is_active": stylist.is_active,
            "specialties": get_specialty_names(db, stylist.id),
        }
    )


def overlaps_booking(
    bookings: list[Booking],
    starts_at_utc: datetime,
    ends_at_utc: datetime,
) -> bool:
    starts_at_utc = ensure_utc(starts_at_utc)
    ends_at_utc = ensure_utc(ends_at_utc)
    return any(
        ensure_utc(booking.starts_at_utc) < ends_at_utc
        and ensure_utc(booking.ends_at_utc) > starts_at_utc
        for booking in bookings
    )


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def get_active_stylist_service_salon(
    db: Session,
    stylist_id: int,
    service_id: int,
) -> tuple[Stylist, Service, Salon]:
    stylist = db.get(Stylist, stylist_id)
    if stylist is None or not stylist.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active stylist not found",
        )

    service = db.get(Service, service_id)
    if service is None or not service.is_active or service.salon_id != stylist.salon_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active service not found for this stylist's salon",
        )

    salon = db.get(Salon, stylist.salon_id)
    if salon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found",
        )

    return stylist, service, salon


def calculate_available_slots(
    db: Session,
    stylist: Stylist,
    service: Service,
    salon: Salon,
    target_date: date,
    exclude_booking_id: int | None = None,
) -> list[AvailableSlotRead]:
    day_of_week = target_date.weekday()
    salon_hour = db.scalar(
        select(SalonOperatingHour).where(
            SalonOperatingHour.salon_id == salon.id,
            SalonOperatingHour.day_of_week == day_of_week,
        )
    )
    if salon_hour is None or salon_hour.is_closed:
        return []

    availability_query = (
        select(StylistAvailability)
        .where(
            StylistAvailability.stylist_id == stylist.id,
            StylistAvailability.day_of_week == day_of_week,
            StylistAvailability.is_available.is_(True),
        )
        .order_by(StylistAvailability.starts_at)
    )
    availability_windows = db.scalars(availability_query).all()

    day_start_utc = local_to_utc(target_date, time.min, salon.timezone)
    day_end_utc = local_to_utc(target_date, time.max, salon.timezone)
    booking_query = select(Booking).where(
        Booking.stylist_id == stylist.id,
        Booking.status.in_(ACTIVE_BOOKING_STATUSES),
        Booking.starts_at_utc < day_end_utc,
        Booking.ends_at_utc > day_start_utc,
    )
    if exclude_booking_id is not None:
        booking_query = booking_query.where(Booking.id != exclude_booking_id)

    existing_bookings = list(db.scalars(booking_query).all())

    service_duration = timedelta(minutes=service.duration_minutes)
    slots: list[AvailableSlotRead] = []

    for window in availability_windows:
        slot_step = timedelta(minutes=window.slot_duration_minutes)
        slot_start = datetime.combine(target_date, window.starts_at)
        window_end = datetime.combine(target_date, window.ends_at)

        while slot_start + service_duration <= window_end:
            slot_end = slot_start + service_duration
            slot_start_utc = datetime_to_utc(slot_start, salon.timezone)
            slot_end_utc = datetime_to_utc(slot_end, salon.timezone)

            if not overlaps_booking(existing_bookings, slot_start_utc, slot_end_utc):
                slots.append(
                    AvailableSlotRead(
                        starts_at_local=slot_start.time(),
                        ends_at_local=slot_end.time(),
                        starts_at_utc=slot_start_utc,
                        ends_at_utc=slot_end_utc,
                    )
                )

            slot_start += slot_step

    return slots


@router.get("/services", response_model=PublicServicesRead)
def list_public_services(
    salon_id: int = Query(..., description="Salon id to list public services for"),
    db: Session = Depends(get_db),
) -> PublicServicesRead:
    query = (
        select(Service)
        .where(Service.salon_id == salon_id, Service.is_active.is_(True))
        .order_by(Service.name)
    )
    services = db.scalars(query).all()
    return PublicServicesRead(services=[ServiceRead.model_validate(service) for service in services])


@router.get("/stylists", response_model=PublicStylistsRead)
def list_public_stylists(
    salon_id: int = Query(..., description="Salon id to list public stylists for"),
    db: Session = Depends(get_db),
) -> PublicStylistsRead:
    query = (
        select(Stylist)
        .where(Stylist.salon_id == salon_id, Stylist.is_active.is_(True))
        .order_by(Stylist.name)
    )
    stylists = db.scalars(query).all()
    return PublicStylistsRead(stylists=[to_stylist_read(db, stylist) for stylist in stylists])


@router.get("/availability", response_model=AvailabilityRead)
def get_public_availability(
    stylist_id: int,
    service_id: int,
    target_date: date = Query(..., alias="date", description="booking date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
) -> AvailabilityRead:
    stylist, service, salon = get_active_stylist_service_salon(db, stylist_id, service_id)
    slots = calculate_available_slots(db, stylist, service, salon, target_date)

    return AvailabilityRead(
        salon_id=salon.id,
        stylist_id=stylist.id,
        service_id=service.id,
        date=target_date,
        timezone=salon.timezone,
        slots=slots,
    )


@router.post("/bookings", response_model=PublicBookingRead, status_code=status.HTTP_201_CREATED)
def create_public_booking(
    payload: PublicBookingCreate,
    db: Session = Depends(get_db),
) -> PublicBookingRead:
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
    target_date = local_start.date()
    available_slots = calculate_available_slots(db, stylist, service, salon, target_date)
    matching_slot = next(
        (slot for slot in available_slots if slot.starts_at_utc == starts_at_utc),
        None,
    )

    if matching_slot is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Selected slot is no longer available",
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
        local_date=target_date,
        status=BookingStatus.BOOKED,
        booking_type=BookingType.ONLINE,
        notes=payload.notes,
    )
    try:
        db.add(booking)
        db.flush()

        charge = BookingCharge(
            booking_id=booking.id,
            amount=service.price,
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
    db.refresh(booking)

    return PublicBookingRead(
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
        amount=charge.amount,
    )
