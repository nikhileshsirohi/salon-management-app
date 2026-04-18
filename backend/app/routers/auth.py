from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
def auth_status() -> dict[str, str]:
    return {"module": "auth", "status": "ready"}
