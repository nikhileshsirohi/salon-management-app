from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
def stylists_status() -> dict[str, str]:
    return {"module": "stylists", "status": "ready"}
