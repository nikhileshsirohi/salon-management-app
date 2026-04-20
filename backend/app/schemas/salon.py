from datetime import time
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.phone import normalize_phone_number


class SalonBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    address: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=50)
    timezone: str = Field(default="Asia/Kolkata", max_length=100)
    default_slot_duration_minutes: int = Field(default=30, gt=0, le=240)

    @model_validator(mode="after")
    def validate_timezone(self) -> "SalonBase":
        if self.phone is not None:
            self.phone = normalize_phone_number(self.phone)
        try:
            ZoneInfo(self.timezone)
        except ZoneInfoNotFoundError as error:
            raise ValueError("timezone must be a valid IANA timezone") from error
        return self


class SalonUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    address: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=50)
    timezone: str | None = Field(default=None, max_length=100)
    default_slot_duration_minutes: int | None = Field(default=None, gt=0, le=240)

    @model_validator(mode="after")
    def validate_timezone(self) -> "SalonUpdate":
        if self.phone is not None:
            self.phone = normalize_phone_number(self.phone)
        if self.timezone is None:
            return self

        try:
            ZoneInfo(self.timezone)
        except ZoneInfoNotFoundError as error:
            raise ValueError("timezone must be a valid IANA timezone") from error
        return self


class SalonRead(SalonBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    admin_user_id: int


class OperatingHourBase(BaseModel):
    day_of_week: int = Field(ge=0, le=6, description="0=Monday, 6=Sunday")
    opens_at: time | None = None
    closes_at: time | None = None
    is_closed: bool = False

    @model_validator(mode="after")
    def validate_open_close_times(self) -> "OperatingHourBase":
        if self.is_closed:
            return self

        if self.opens_at is None or self.closes_at is None:
            raise ValueError("opens_at and closes_at are required when is_closed is false")

        if self.opens_at >= self.closes_at:
            raise ValueError("opens_at must be before closes_at")

        return self


class OperatingHourUpdate(OperatingHourBase):
    pass


class OperatingHourRead(OperatingHourBase):
    id: int | None = None
    salon_id: int


class OperatingHoursUpdate(BaseModel):
    hours: list[OperatingHourUpdate] = Field(min_length=1, max_length=7)

    @model_validator(mode="after")
    def validate_unique_days(self) -> "OperatingHoursUpdate":
        days = [hour.day_of_week for hour in self.hours]
        if len(days) != len(set(days)):
            raise ValueError("each day_of_week can appear only once")
        return self
