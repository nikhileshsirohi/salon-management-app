from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.booking import BookingStatus, PaymentStatus


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


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


class PaymentStatusUpdate(BaseModel):
    status: PaymentStatus


class WalkInBookingCreate(BaseModel):
    stylist_id: int
    service_id: int
    customer_name: str = Field(min_length=1, max_length=255)
    customer_phone: str = Field(min_length=1, max_length=50)
    customer_email: EmailStr | None = None
    starts_at_utc: datetime
    notes: str | None = None
