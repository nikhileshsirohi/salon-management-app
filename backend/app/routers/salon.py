from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
def salon_status() -> dict[str, str]:
    return {"module": "salon", "status": "ready"}
