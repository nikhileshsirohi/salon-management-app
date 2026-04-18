from datetime import date, datetime, time

from pydantic import BaseModel

from app.schemas.service import ServiceRead
from app.schemas.stylist import StylistRead


class AvailableSlotRead(BaseModel):
    starts_at_local: time
    ends_at_local: time
    starts_at_utc: datetime
    ends_at_utc: datetime


class AvailabilityRead(BaseModel):
    salon_id: int
    stylist_id: int
    service_id: int
    date: date
    timezone: str
    slots: list[AvailableSlotRead]


class PublicServicesRead(BaseModel):
    services: list[ServiceRead]


class PublicStylistsRead(BaseModel):
    stylists: list[StylistRead]
