from collections.abc import Generator
from datetime import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.main import app
from app.models import *  # noqa: F403
from app.models.availability import SalonOperatingHour, StylistAvailability
from app.models.salon import Salon
from app.models.service import Service
from app.models.stylist import Stylist
from app.models.user import User, UserRole


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture()
def seeded_salon(db_session: Session) -> dict[str, int]:
    owner = User(
        email="owner@test.com",
        password_hash=get_password_hash("password123"),
        role=UserRole.OWNER,
    )
    other_owner = User(
        email="other@test.com",
        password_hash=get_password_hash("password123"),
        role=UserRole.OWNER,
    )
    stylist_user = User(
        email="stylist@test.com",
        password_hash=get_password_hash("password123"),
        role=UserRole.STYLIST,
    )
    db_session.add_all([owner, other_owner, stylist_user])
    db_session.flush()

    salon = Salon(
        owner_user_id=owner.id,
        name="Test Salon",
        timezone="Asia/Kolkata",
        default_slot_duration_minutes=30,
    )
    other_salon = Salon(
        owner_user_id=other_owner.id,
        name="Other Salon",
        timezone="Asia/Kolkata",
        default_slot_duration_minutes=30,
    )
    db_session.add_all([salon, other_salon])
    db_session.flush()

    service = Service(
        salon_id=salon.id,
        name="Haircut",
        duration_minutes=30,
        price="25.00",
        is_active=True,
    )
    stylist = Stylist(
        salon_id=salon.id,
        user_id=stylist_user.id,
        name="Test Stylist",
        is_active=True,
    )
    db_session.add_all([service, stylist])
    db_session.flush()

    db_session.add(
        SalonOperatingHour(
            salon_id=salon.id,
            day_of_week=0,
            opens_at=time(9, 0),
            closes_at=time(18, 0),
            is_closed=False,
        )
    )
    db_session.add(
        StylistAvailability(
            stylist_id=stylist.id,
            day_of_week=0,
            starts_at=time(10, 0),
            ends_at=time(12, 0),
            slot_duration_minutes=30,
            is_available=True,
        )
    )
    db_session.commit()

    return {
        "owner_id": owner.id,
        "other_owner_id": other_owner.id,
        "stylist_user_id": stylist_user.id,
        "salon_id": salon.id,
        "other_salon_id": other_salon.id,
        "service_id": service.id,
        "stylist_id": stylist.id,
    }


def auth_headers(client: TestClient, email: str, password: str = "password123") -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
