from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.availability import SalonOperatingHour, StylistAvailability
from app.models.salon import Salon
from app.models.stylist import Stylist, StylistSpecialty
from app.schemas.availability import (
    StylistAvailabilityRead,
    StylistAvailabilityReplace,
    StylistAvailabilityUpdate,
)
from app.schemas.stylist import StylistCreate, StylistRead, StylistUpdate

router = APIRouter()


@router.get("/status")
def stylists_status() -> dict[str, str]:
    return {"module": "stylists", "status": "ready"}


def clean_specialties(specialties: list[str]) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()

    for specialty in specialties:
        value = specialty.strip()
        key = value.lower()
        if value and key not in seen:
            cleaned.append(value)
            seen.add(key)

    return cleaned


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


def replace_specialties(db: Session, stylist_id: int, specialties: list[str]) -> None:
    db.execute(delete(StylistSpecialty).where(StylistSpecialty.stylist_id == stylist_id))

    for specialty in clean_specialties(specialties):
        db.add(StylistSpecialty(stylist_id=stylist_id, name=specialty))


def get_existing_stylist(db: Session, stylist_id: int) -> Stylist:
    stylist = db.get(Stylist, stylist_id)
    if stylist is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stylist not found",
        )
    return stylist


def to_availability_read(availability: StylistAvailability) -> StylistAvailabilityRead:
    return StylistAvailabilityRead.model_validate(availability)


def validate_against_salon_hours(
    db: Session,
    stylist: Stylist,
    availability_items: list[StylistAvailabilityUpdate],
) -> None:
    query = select(SalonOperatingHour).where(SalonOperatingHour.salon_id == stylist.salon_id)
    salon_hours_by_day = {hour.day_of_week: hour for hour in db.scalars(query).all()}

    for item in availability_items:
        if not item.is_available:
            continue

        salon_hour = salon_hours_by_day.get(item.day_of_week)
        if salon_hour is None:
            continue

        if salon_hour.is_closed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Salon is closed on day_of_week {item.day_of_week}",
            )

        if salon_hour.opens_at is None or salon_hour.closes_at is None:
            continue

        if item.starts_at < salon_hour.opens_at or item.ends_at > salon_hour.closes_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Stylist availability must be inside salon hours for day_of_week {item.day_of_week}",
            )


@router.get("", response_model=list[StylistRead])
def list_stylists(
    salon_id: int = Query(..., description="Salon id to list stylists for"),
    include_inactive: bool = False,
    db: Session = Depends(get_db),
) -> list[StylistRead]:
    query = select(Stylist).where(Stylist.salon_id == salon_id).order_by(Stylist.name)

    if not include_inactive:
        query = query.where(Stylist.is_active.is_(True))

    stylists = db.scalars(query).all()
    return [to_stylist_read(db, stylist) for stylist in stylists]


@router.post("", response_model=StylistRead, status_code=status.HTTP_201_CREATED)
def create_stylist(payload: StylistCreate, db: Session = Depends(get_db)) -> StylistRead:
    salon = db.get(Salon, payload.salon_id)
    if salon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found",
        )

    stylist_data = payload.model_dump(exclude={"specialties"})
    stylist = Stylist(**stylist_data)
    db.add(stylist)
    db.flush()
    replace_specialties(db, stylist.id, payload.specialties)
    db.commit()
    db.refresh(stylist)
    return to_stylist_read(db, stylist)


@router.get("/{stylist_id}", response_model=StylistRead)
def get_stylist(stylist_id: int, db: Session = Depends(get_db)) -> StylistRead:
    stylist = get_existing_stylist(db, stylist_id)
    return to_stylist_read(db, stylist)


@router.put("/{stylist_id}", response_model=StylistRead)
def update_stylist(
    stylist_id: int,
    payload: StylistUpdate,
    db: Session = Depends(get_db),
) -> StylistRead:
    stylist = get_existing_stylist(db, stylist_id)

    update_data = payload.model_dump(exclude_unset=True, exclude={"specialties"})
    for field_name, value in update_data.items():
        setattr(stylist, field_name, value)

    if payload.specialties is not None:
        replace_specialties(db, stylist.id, payload.specialties)

    db.add(stylist)
    db.commit()
    db.refresh(stylist)
    return to_stylist_read(db, stylist)


@router.delete("/{stylist_id}", response_model=StylistRead)
def deactivate_stylist(stylist_id: int, db: Session = Depends(get_db)) -> StylistRead:
    stylist = get_existing_stylist(db, stylist_id)

    stylist.is_active = False
    db.add(stylist)
    db.commit()
    db.refresh(stylist)
    return to_stylist_read(db, stylist)


@router.get("/{stylist_id}/availability", response_model=list[StylistAvailabilityRead])
def get_stylist_availability(
    stylist_id: int,
    db: Session = Depends(get_db),
) -> list[StylistAvailabilityRead]:
    get_existing_stylist(db, stylist_id)
    query = (
        select(StylistAvailability)
        .where(StylistAvailability.stylist_id == stylist_id)
        .order_by(StylistAvailability.day_of_week, StylistAvailability.starts_at)
    )
    availability = db.scalars(query).all()
    return [to_availability_read(item) for item in availability]


@router.put("/{stylist_id}/availability", response_model=list[StylistAvailabilityRead])
def replace_stylist_availability(
    stylist_id: int,
    payload: StylistAvailabilityReplace,
    db: Session = Depends(get_db),
) -> list[StylistAvailabilityRead]:
    stylist = get_existing_stylist(db, stylist_id)
    validate_against_salon_hours(db, stylist, payload.availability)

    db.execute(delete(StylistAvailability).where(StylistAvailability.stylist_id == stylist_id))

    for item in payload.availability:
        db.add(StylistAvailability(stylist_id=stylist_id, **item.model_dump()))

    db.commit()
    return get_stylist_availability(stylist_id, db)
