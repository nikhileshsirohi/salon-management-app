from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_owner, get_owned_salon
from app.models.service import Service
from app.models.user import User
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
    owner: User = Depends(get_current_owner),
) -> list[Service]:
    get_owned_salon(salon_id, db, owner)
    query = select(Service).where(Service.salon_id == salon_id).order_by(Service.name)

    if not include_inactive:
        query = query.where(Service.is_active.is_(True))

    return list(db.scalars(query).all())


@router.post("", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
def create_service(
    payload: ServiceCreate,
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
) -> Service:
    get_owned_salon(payload.salon_id, db, owner)

    service = Service(**payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.get("/{service_id}", response_model=ServiceRead)
def get_service(
    service_id: int,
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
) -> Service:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )
    get_owned_salon(service.salon_id, db, owner)
    return service


@router.put("/{service_id}", response_model=ServiceRead)
def update_service(
    service_id: int,
    payload: ServiceUpdate,
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
) -> Service:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )

    get_owned_salon(service.salon_id, db, owner)
    update_data = payload.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        setattr(service, field_name, value)

    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.delete("/{service_id}", response_model=ServiceRead)
def deactivate_service(
    service_id: int,
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
) -> Service:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )

    get_owned_salon(service.salon_id, db, owner)
    service.is_active = False
    db.add(service)
    db.commit()
    db.refresh(service)
    return service
