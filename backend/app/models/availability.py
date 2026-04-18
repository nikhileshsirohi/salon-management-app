from datetime import datetime, time

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Time, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SalonOperatingHour(Base):
    __tablename__ = "salon_operating_hours"
    __table_args__ = (UniqueConstraint("salon_id", "day_of_week"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    salon_id: Mapped[int] = mapped_column(ForeignKey("salons.id"), index=True)
    day_of_week: Mapped[int] = mapped_column(Integer, index=True)
    opens_at: Mapped[time | None] = mapped_column(Time)
    closes_at: Mapped[time | None] = mapped_column(Time)
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class StylistAvailability(Base):
    __tablename__ = "stylist_availability"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    stylist_id: Mapped[int] = mapped_column(ForeignKey("stylists.id"), index=True)
    day_of_week: Mapped[int] = mapped_column(Integer, index=True)
    starts_at: Mapped[time] = mapped_column(Time)
    ends_at: Mapped[time] = mapped_column(Time)
    slot_duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
