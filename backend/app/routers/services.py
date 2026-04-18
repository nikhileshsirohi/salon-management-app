from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
def services_status() -> dict[str, str]:
    return {"module": "services", "status": "ready"}
