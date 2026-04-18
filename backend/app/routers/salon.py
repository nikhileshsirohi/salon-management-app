from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.availability import SalonOperatingHour
from app.models.salon import Salon
from app.schemas.salon import (
    OperatingHourRead,
    OperatingHoursUpdate,
    SalonRead,
    SalonUpdate,
)

router = APIRouter()


@router.get("/status")
def salon_status() -> dict[str, str]:
    return {"module": "salon", "status": "ready"}


def closed_day(salon_id: int, day_of_week: int) -> OperatingHourRead:
    return OperatingHourRead(
        id=None,
        salon_id=salon_id,
        day_of_week=day_of_week,
        opens_at=None,
        closes_at=None,
        is_closed=True,
    )


def to_operating_hour_read(hour: SalonOperatingHour) -> OperatingHourRead:
    return OperatingHourRead.model_validate(
        {
            "id": hour.id,
            "salon_id": hour.salon_id,
            "day_of_week": hour.day_of_week,
            "opens_at": hour.opens_at,
            "closes_at": hour.closes_at,
            "is_closed": hour.is_closed,
        }
    )


@router.get("/{salon_id}", response_model=SalonRead)
def get_salon(salon_id: int, db: Session = Depends(get_db)) -> Salon:
    salon = db.get(Salon, salon_id)
    if salon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found",
        )
    return salon


@router.put("/{salon_id}", response_model=SalonRead)
def update_salon(
    salon_id: int,
    payload: SalonUpdate,
    db: Session = Depends(get_db),
) -> Salon:
    salon = db.get(Salon, salon_id)
    if salon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        setattr(salon, field_name, value)

    db.add(salon)
    db.commit()
    db.refresh(salon)
    return salon


@router.get("/{salon_id}/operating-hours", response_model=list[OperatingHourRead])
def get_operating_hours(
    salon_id: int,
    db: Session = Depends(get_db),
) -> list[OperatingHourRead]:
    salon = db.get(Salon, salon_id)
    if salon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found",
        )

    query = (
        select(SalonOperatingHour)
        .where(SalonOperatingHour.salon_id == salon_id)
        .order_by(SalonOperatingHour.day_of_week)
    )
    saved_hours = {hour.day_of_week: hour for hour in db.scalars(query).all()}

    return [
        to_operating_hour_read(saved_hours[day])
        if day in saved_hours
        else closed_day(salon_id, day)
        for day in range(7)
    ]


@router.put("/{salon_id}/operating-hours", response_model=list[OperatingHourRead])
def update_operating_hours(
    salon_id: int,
    payload: OperatingHoursUpdate,
    db: Session = Depends(get_db),
) -> list[OperatingHourRead]:
    salon = db.get(Salon, salon_id)
    if salon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found",
        )

    query = select(SalonOperatingHour).where(SalonOperatingHour.salon_id == salon_id)
    existing_by_day = {hour.day_of_week: hour for hour in db.scalars(query).all()}

    for incoming_hour in payload.hours:
        hour = existing_by_day.get(incoming_hour.day_of_week)
        if hour is None:
            hour = SalonOperatingHour(
                salon_id=salon_id,
                day_of_week=incoming_hour.day_of_week,
            )

        hour.is_closed = incoming_hour.is_closed
        hour.opens_at = None if incoming_hour.is_closed else incoming_hour.opens_at
        hour.closes_at = None if incoming_hour.is_closed else incoming_hour.closes_at
        db.add(hour)

    db.commit()
    return get_operating_hours(salon_id, db)
