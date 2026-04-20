from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field

from app.schemas.booking import BookingServiceRead
from app.schemas.service import ServiceRead
from app.schemas.stylist import StylistRead


class AvailableSlotRead(BaseModel):
    starts_at_local: time
    ends_at_local: time
    starts_at_utc: datetime
    ends_at_utc: datetime
    stylist_id: int | None = None
    stylist_name: str | None = None


class AvailabilityRead(BaseModel):
    salon_id: int
    stylist_id: int
    service_id: int
    service_ids: list[int] = Field(default_factory=list)
    total_duration_minutes: int
    date: date
    timezone: str
    slots: list[AvailableSlotRead]


class PublicServicesRead(BaseModel):
    services: list[ServiceRead]


class PublicStylistsRead(BaseModel):
    stylists: list[StylistRead]


class PublicSalonRead(BaseModel):
    id: int
    name: str
    address: str | None = None
    phone: str | None = None
    timezone: str


class PublicSalonsRead(BaseModel):
    salons: list[PublicSalonRead]


class PublicBookingCreate(BaseModel):
    stylist_id: int
    service_id: int
    additional_service_ids: list[int] = Field(default_factory=list)
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
    services: list[BookingServiceRead] = Field(default_factory=list)
    total_duration_minutes: int | None = None
