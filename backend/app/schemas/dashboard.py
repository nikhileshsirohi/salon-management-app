from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.booking import BookingRead


class DashboardMetricRead(BaseModel):
    today_bookings: int
    today_revenue: Decimal
    upcoming_bookings: int
    completed_bookings: int
    cancelled_bookings: int


class StylistUtilizationRead(BaseModel):
    stylist_id: int
    stylist_name: str
    available_minutes: int
    booked_minutes: int
    utilization_percent: float


class DashboardSummaryRead(BaseModel):
    salon_id: int
    date: date
    generated_at_utc: datetime
    metrics: DashboardMetricRead
    upcoming_appointments: list[BookingRead]
    stylist_utilization: list[StylistUtilizationRead]
