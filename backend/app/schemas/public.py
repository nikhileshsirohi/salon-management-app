from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field

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


class PublicBookingCreate(BaseModel):
    stylist_id: int
    service_id: int
    customer_name: str = Field(min_length=1, max_length=255)
    customer_phone: str = Field(min_length=1, max_length=50)
    customer_email: EmailStr | None = None
    starts_at_utc: datetime
    notes: str | None = None


class PublicBookingRead(BaseModel):
    id: int
    salon_id: int
    stylist_id: int
    service_id: int
    customer_name: str
    customer_phone: str
    customer_email: EmailStr | None = None
    starts_at_utc: datetime
    ends_at_utc: datetime
    local_date: date
    status: str
    booking_type: str
    amount: Decimal
