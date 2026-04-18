from pydantic import BaseModel


class SalonBase(BaseModel):
    name: str
    address: str | None = None
    phone: str | None = None
    timezone: str = "Asia/Kolkata"
    default_slot_duration_minutes: int = 30
