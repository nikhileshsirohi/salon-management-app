from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.salon import Salon
from app.models.user import User, UserRole


def seed_demo_data() -> None:
    db = SessionLocal()
    try:
        owner = db.scalar(select(User).where(User.email == "owner@example.com"))
        if owner is None:
            owner = User(
                email="owner@example.com",
                password_hash=get_password_hash("password123"),
                role=UserRole.OWNER,
            )
            db.add(owner)
            db.flush()

        salon = db.scalar(select(Salon).where(Salon.name == "Demo Salon"))
        if salon is None:
            salon = Salon(
                owner_user_id=owner.id,
                name="Demo Salon",
                address="Demo Street",
                phone="+91 99999 99999",
                timezone="Asia/Kolkata",
                default_slot_duration_minutes=30,
            )
            db.add(salon)

        db.commit()
        print(f"Demo owner email: {owner.email}")
        print("Demo owner password: password123")
        print(f"Demo salon id: {salon.id}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
