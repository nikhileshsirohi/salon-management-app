from datetime import UTC, datetime
from zoneinfo import ZoneInfo


def local_datetime_to_utc(value: datetime, timezone_name: str) -> datetime:
    local_timezone = ZoneInfo(timezone_name)
    local_value = value.replace(tzinfo=local_timezone)
    return local_value.astimezone(UTC)


def utc_datetime_to_local(value: datetime, timezone_name: str) -> datetime:
    return value.astimezone(ZoneInfo(timezone_name))
