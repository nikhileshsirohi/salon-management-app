from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.salon import Salon
from app.models.service import Service
from app.schemas.service import ServiceCreate, ServiceRead, ServiceUpdate

router = APIRouter()


@router.get("/status")
def services_status() -> dict[str, str]:
    return {"module": "services", "status": "ready"}


@router.get("", response_model=list[ServiceRead])
def list_services(
    salon_id: int = Query(..., description="Salon id to list services for"),
    include_inactive: bool = False,
    db: Session = Depends(get_db),
) -> list[Service]:
    query = select(Service).where(Service.salon_id == salon_id).order_by(Service.name)

    if not include_inactive:
        query = query.where(Service.is_active.is_(True))

    return list(db.scalars(query).all())


@router.post("", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
def create_service(payload: ServiceCreate, db: Session = Depends(get_db)) -> Service:
    salon = db.get(Salon, payload.salon_id)
    if salon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found",
        )

    service = Service(**payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.get("/{service_id}", response_model=ServiceRead)
def get_service(service_id: int, db: Session = Depends(get_db)) -> Service:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )
    return service


@router.put("/{service_id}", response_model=ServiceRead)
def update_service(
    service_id: int,
    payload: ServiceUpdate,
    db: Session = Depends(get_db),
) -> Service:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        setattr(service, field_name, value)

    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.delete("/{service_id}", response_model=ServiceRead)
def deactivate_service(service_id: int, db: Session = Depends(get_db)) -> Service:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )

    service.is_active = False
    db.add(service)
    db.commit()
    db.refresh(service)
    return service
