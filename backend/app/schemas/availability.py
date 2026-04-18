from datetime import time

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StylistAvailabilityBase(BaseModel):
    day_of_week: int = Field(ge=0, le=6, description="0=Monday, 6=Sunday")
    starts_at: time
    ends_at: time
    slot_duration_minutes: int = Field(default=30, gt=0, le=240)
    is_available: bool = True

    @model_validator(mode="after")
    def validate_time_range(self) -> "StylistAvailabilityBase":
        if self.starts_at >= self.ends_at:
            raise ValueError("starts_at must be before ends_at")
        return self


class StylistAvailabilityUpdate(StylistAvailabilityBase):
    pass


class StylistAvailabilityRead(StylistAvailabilityBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    stylist_id: int


class StylistAvailabilityReplace(BaseModel):
    availability: list[StylistAvailabilityUpdate] = Field(default_factory=list, max_length=21)

    @model_validator(mode="after")
    def validate_no_overlaps(self) -> "StylistAvailabilityReplace":
        by_day: dict[int, list[StylistAvailabilityUpdate]] = {}

        for item in self.availability:
            if not item.is_available:
                continue
            by_day.setdefault(item.day_of_week, []).append(item)

        for day, items in by_day.items():
            sorted_items = sorted(items, key=lambda item: item.starts_at)
            for index, item in enumerate(sorted_items[1:], start=1):
                previous = sorted_items[index - 1]
                if previous.ends_at > item.starts_at:
                    raise ValueError(f"availability ranges overlap for day_of_week {day}")

        return self
