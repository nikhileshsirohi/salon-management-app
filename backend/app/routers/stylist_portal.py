from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
def stylist_portal_status() -> dict[str, str]:
    return {"module": "stylist_portal", "status": "ready"}
