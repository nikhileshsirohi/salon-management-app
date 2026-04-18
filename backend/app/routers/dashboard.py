from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
def dashboard_status() -> dict[str, str]:
    return {"module": "dashboard", "status": "ready"}
