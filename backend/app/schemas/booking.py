from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.booking import BookingStatus, PaymentStatus


class BookingServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    service_id: int
    name: str
    duration_minutes: int
    price: Decimal
    order_index: int = 0


class BookingCreate(BaseModel):
    salon_id: int
    stylist_id: int
    service_id: int
    customer_name: str
    customer_phone: str
    customer_email: EmailStr | None = None
    starts_at_utc: datetime
    ends_at_utc: datetime
    local_date: date
    notes: str | None = None


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
    notes: str | None = None
    amount: Decimal | None = None
    payment_status: str | None = None
    stylist_name: str | None = None
    service_name: str | None = None
    services: list[BookingServiceRead] = Field(default_factory=list)
    total_duration_minutes: int | None = None


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


class PaymentStatusUpdate(BaseModel):
    status: PaymentStatus


class BookingCancel(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class BookingReschedule(BaseModel):
    starts_at_utc: datetime
    notes: str | None = Field(default=None, max_length=500)


class WalkInBookingCreate(BaseModel):
    service_id: int
    additional_service_ids: list[int] = Field(default_factory=list)
    customer_name: str = Field(min_length=1, max_length=255)
    customer_phone: str = Field(min_length=1, max_length=50)
    customer_email: EmailStr | None = None
    starts_at_utc: datetime
    notes: str | None = None
