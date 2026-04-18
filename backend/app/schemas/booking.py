from datetime import date, datetime

from pydantic import BaseModel, EmailStr


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
