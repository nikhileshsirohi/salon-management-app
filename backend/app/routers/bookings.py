from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
def bookings_status() -> dict[str, str]:
    return {"module": "bookings", "status": "ready"}
