from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.availability import SalonOperatingHour, StylistAvailability
from app.models.booking import (
    Booking,
    BookingCharge,
    BookingService,
    BookingStatus,
    BookingType,
    PaymentStatus,
)
from app.models.salon import Salon
from app.models.service import Service
from app.models.stylist import Stylist, StylistSpecialty
from app.schemas.booking import BookingServiceRead
from app.schemas.public import (
    AvailabilityRead,
    AvailableSlotRead,
    PublicBookingCreate,
    PublicBookingRead,
    PublicSalonRead,
    PublicSalonsRead,
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
            "clients_served": stylist.lifetime_clients,
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


def resolve_services(
    db: Session,
    salon_id: int,
    primary_service_id: int,
    additional_service_ids: list[int],
) -> list[Service]:
    """Resolve the full ordered list of services for a booking.

    The primary service is always first. Additional services must belong to
    the same salon and be active. Duplicates are rejected.
    """

    ordered_ids: list[int] = [primary_service_id]
    seen = {primary_service_id}
    for extra_id in additional_service_ids:
        if extra_id in seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate service in booking",
            )
        ordered_ids.append(extra_id)
        seen.add(extra_id)

    if not ordered_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one service is required",
        )

    services_by_id = {
        service.id: service
        for service in db.scalars(select(Service).where(Service.id.in_(ordered_ids)))
    }
    resolved: list[Service] = []
    for sid in ordered_ids:
        svc = services_by_id.get(sid)
        if svc is None or not svc.is_active or svc.salon_id != salon_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Active service {sid} not found for this salon",
            )
        resolved.append(svc)
    return resolved


def total_duration_minutes(services: list[Service]) -> int:
    return sum(service.duration_minutes for service in services)


def total_price(services: list[Service]):
    total = services[0].price.__class__(0)
    for svc in services:
        total += svc.price
    return total


def calculate_available_slots(
    db: Session,
    stylist: Stylist,
    service: Service,
    salon: Salon,
    target_date: date,
    exclude_booking_id: int | None = None,
    *,
    duration_minutes: int | None = None,
    slot_step_minutes: int | None = None,
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

    effective_duration = duration_minutes or service.duration_minutes
    service_duration = timedelta(minutes=effective_duration)
    slots: list[AvailableSlotRead] = []

    for window in availability_windows:
        step_minutes = slot_step_minutes or window.slot_duration_minutes
        slot_step = timedelta(minutes=step_minutes)
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


@router.get("/salons", response_model=PublicSalonsRead)
def list_public_salons(db: Session = Depends(get_db)) -> PublicSalonsRead:
    salons = db.scalars(select(Salon).order_by(Salon.name)).all()
    return PublicSalonsRead(
        salons=[
            PublicSalonRead(
                id=salon.id,
                name=salon.name,
                address=salon.address,
                phone=salon.phone,
                timezone=salon.timezone,
            )
            for salon in salons
        ]
    )


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
    additional_service_ids: list[int] = Query(
        default_factory=list,
        description="Optional extra service ids to book back-to-back with the primary service",
    ),
    db: Session = Depends(get_db),
) -> AvailabilityRead:
    stylist, service, salon = get_active_stylist_service_salon(db, stylist_id, service_id)
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


@router.get("/availability/any", response_model=AvailabilityRead)
def get_public_availability_any_stylist(
    salon_id: int,
    service_id: int,
    target_date: date = Query(..., alias="date", description="booking date in YYYY-MM-DD format"),
    additional_service_ids: list[int] = Query(default_factory=list),
    db: Session = Depends(get_db),
) -> AvailabilityRead:
    """Return merged availability across every active stylist in the salon.

    For each time slot we pin the first stylist that has it free. The client
    uses `slot.stylist_id` when posting the booking so the right chair is
    reserved.
    """

    salon = db.get(Salon, salon_id)
    if salon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found",
        )

    service = db.get(Service, service_id)
    if service is None or not service.is_active or service.salon_id != salon_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active service not found for this salon",
        )

    services = resolve_services(db, salon.id, service.id, additional_service_ids)
    duration = total_duration_minutes(services)

    stylists = list(
        db.scalars(
            select(Stylist)
            .where(Stylist.salon_id == salon_id, Stylist.is_active.is_(True))
            .order_by(Stylist.lifetime_clients.desc(), Stylist.name)
        ).all()
    )

    merged: dict[datetime, AvailableSlotRead] = {}
    for stylist in stylists:
        stylist_slots = calculate_available_slots(
            db,
            stylist,
            service,
            salon,
            target_date,
            duration_minutes=duration,
        )
        for slot in stylist_slots:
            if slot.starts_at_utc not in merged:
                merged[slot.starts_at_utc] = AvailableSlotRead(
                    starts_at_local=slot.starts_at_local,
                    ends_at_local=slot.ends_at_local,
                    starts_at_utc=slot.starts_at_utc,
                    ends_at_utc=slot.ends_at_utc,
                    stylist_id=stylist.id,
                    stylist_name=stylist.name,
                )

    ordered_slots = [merged[key] for key in sorted(merged.keys())]

    return AvailabilityRead(
        salon_id=salon.id,
        stylist_id=0,
        service_id=service.id,
        service_ids=[svc.id for svc in services],
        total_duration_minutes=duration,
        date=target_date,
        timezone=salon.timezone,
        slots=ordered_slots,
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
    services = resolve_services(db, salon.id, service.id, payload.additional_service_ids)
    duration = total_duration_minutes(services)
    amount = total_price(services)

    starts_at_utc = payload.starts_at_utc
    if starts_at_utc.tzinfo is None:
        starts_at_utc = starts_at_utc.replace(tzinfo=UTC)
    starts_at_utc = starts_at_utc.astimezone(UTC)

    local_start = starts_at_utc.astimezone(ZoneInfo(salon.timezone))
    target_date = local_start.date()
    available_slots = calculate_available_slots(
        db,
        stylist,
        service,
        salon,
        target_date,
        duration_minutes=duration,
    )
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
        total_duration_minutes=duration,
        services=[
            BookingServiceRead(
                service_id=svc.id,
                name=svc.name,
                duration_minutes=svc.duration_minutes,
                price=svc.price,
                order_index=idx,
            )
            for idx, svc in enumerate(services)
        ],
    )
