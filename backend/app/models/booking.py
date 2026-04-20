from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BookingStatus(StrEnum):
    BOOKED = "booked"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class BookingType(StrEnum):
    ONLINE = "online"
    WALK_IN = "walk_in"


class PaymentStatus(StrEnum):
    UNPAID = "unpaid"
    PAID = "paid"
    REFUNDED = "refunded"


def enum_values(enum: type[StrEnum]) -> list[str]:
    return [item.value for item in enum]


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    salon_id: Mapped[int] = mapped_column(ForeignKey("salons.id"), index=True)
    stylist_id: Mapped[int] = mapped_column(ForeignKey("stylists.id"), index=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), index=True)
    customer_name: Mapped[str] = mapped_column(String(255))
    customer_phone: Mapped[str] = mapped_column(String(50))
    customer_email: Mapped[str | None] = mapped_column(String(255))
    starts_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    ends_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    local_date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, values_callable=enum_values),
        default=BookingStatus.BOOKED,
    )
    booking_type: Mapped[BookingType] = mapped_column(
        Enum(BookingType, values_callable=enum_values),
        default=BookingType.ONLINE,
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class BookingCharge(Base):
    __tablename__ = "booking_charges"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), unique=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, values_callable=enum_values),
        default=PaymentStatus.UNPAID,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BookingService(Base):
    """Join row tying a booking to one of its services.

    A booking can have 1..N services. The primary service is also mirrored in
    Booking.service_id (order_index == 0) for backward-compatible displays.
    Duration and price are snapshotted at booking time so later service edits
    don't retroactively change completed appointments.
    """

    __tablename__ = "booking_services"
    __table_args__ = (UniqueConstraint("booking_id", "service_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), index=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), index=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
