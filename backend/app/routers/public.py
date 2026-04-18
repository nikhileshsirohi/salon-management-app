from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
def public_status() -> dict[str, str]:
    return {"module": "public", "status": "ready"}
