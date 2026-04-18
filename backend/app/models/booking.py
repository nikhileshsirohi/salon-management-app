from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
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
