from fastapi import APIRouter

from app.routers import auth, bookings, dashboard, public, salon, services, stylist_portal, stylists

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(salon.router, prefix="/salon", tags=["salon"])
api_router.include_router(stylists.router, prefix="/stylists", tags=["stylists"])
api_router.include_router(services.router, prefix="/services", tags=["services"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
api_router.include_router(public.router, prefix="/public", tags=["public"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(stylist_portal.router, prefix="/stylist/me", tags=["stylist portal"])


@api_router.get("/health")
def api_health_check() -> dict[str, str]:
    return {"status": "ok"}
