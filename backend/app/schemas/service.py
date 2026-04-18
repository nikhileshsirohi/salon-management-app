from decimal import Decimal

from pydantic import BaseModel


class ServiceBase(BaseModel):
    name: str
    description: str | None = None
    duration_minutes: int
    price: Decimal
    is_active: bool = True
