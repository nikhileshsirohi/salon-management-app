import argparse
from datetime import time
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy import text

from app import models  # noqa: F401 - register all tables on Base.metadata for reset mode
from app.core.database import Base, SessionLocal
from app.core.security import get_password_hash
from app.models.availability import SalonOperatingHour, StylistAvailability
from app.models.salon import Salon
from app.models.service import Service
from app.models.stylist import Stylist, StylistSpecialty
from app.models.user import User, UserRole


SERVICES = [
    ("Signature Cut & Finish", "Bespoke consultation, precision cut, and editorial blow-out.", 60, "85.00"),
    ("Balayage & Colour", "Hand-painted dimension with gloss, toner, and bond protection.", 150, "220.00"),
    ("Keratin Smoothing", "Frizz-defining treatment with luminous, silk-soft results.", 120, "260.00"),
    ("Bridal Styling", "Editorial up-dos and soft finishes tailored to your moment.", 90, "180.00"),
    ("Classic Manicure", "Precise shaping, cuticle care, and high-shine polish.", 45, "45.00"),
    ("Spa Pedicure", "Soothing soak, exfoliation, and restorative foot massage.", 60, "65.00"),
]


STYLISTS = [
    {
        "name": "Aria Moreau",
        "email": "aria@example.com",
        "password": "password123",
        "phone": "+1 415 555 0111",
        "bio": "Senior colourist specialising in dimensional balayage and living blondes.",
        "photo": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
        "specialties": ["Colour", "Balayage", "Blondes"],
        "lifetime_clients": 1287,
    },
    {
        "name": "Luca Bennett",
        "email": "luca@example.com",
        "password": "password123",
        "phone": "+1 415 555 0122",
        "bio": "Master cutter with an editorial eye for modern, lived-in shapes.",
        "photo": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80",
        "specialties": ["Cuts", "Men's styling", "Texture"],
        "lifetime_clients": 942,
    },
    {
        "name": "Noor Rahimi",
        "email": "noor@example.com",
        "password": "password123",
        "phone": "+1 415 555 0133",
        "bio": "Bridal and special-event specialist. Soft finishes, elegant up-dos.",
        "photo": "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80",
        "specialties": ["Bridal", "Up-dos", "Editorial"],
        "lifetime_clients": 564,
    },
    {
        "name": "Sana Patel",
        "email": "sana@example.com",
        "password": "password123",
        "phone": "+1 415 555 0144",
        "bio": "Nail artist—clean, quiet manicures and restorative pedicures.",
        "photo": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        "specialties": ["Nails", "Pedicure", "Gel"],
        "lifetime_clients": 389,
    },
]


def _ensure_user(db, *, email: str, password: str, role: UserRole) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, password_hash=get_password_hash(password), role=role)
        db.add(user)
        db.flush()
    return user


def _ensure_operating_hours(db, salon_id: int) -> None:
    existing = {
        oh.day_of_week
        for oh in db.scalars(select(SalonOperatingHour).where(SalonOperatingHour.salon_id == salon_id))
    }
    # Monday (0) .. Sunday (6). Open Tue–Sun 10:00–19:00, closed Monday.
    for dow in range(7):
        if dow in existing:
            continue
        if dow == 0:
            db.add(
                SalonOperatingHour(
                    salon_id=salon_id,
                    day_of_week=dow,
                    opens_at=None,
                    closes_at=None,
                    is_closed=True,
                )
            )
        else:
            db.add(
                SalonOperatingHour(
                    salon_id=salon_id,
                    day_of_week=dow,
                    opens_at=time(10, 0),
                    closes_at=time(19, 0),
                    is_closed=False,
                )
            )


def _ensure_services(db, salon_id: int) -> None:
    existing = {s.name for s in db.scalars(select(Service).where(Service.salon_id == salon_id))}
    for name, description, duration, price in SERVICES:
        if name in existing:
            continue
        db.add(
            Service(
                salon_id=salon_id,
                name=name,
                description=description,
                duration_minutes=duration,
                price=Decimal(price),
                is_active=True,
            )
        )


def _ensure_stylists(db, salon_id: int) -> None:
    for stylist_data in STYLISTS:
        stylist_user = _ensure_user(
            db,
            email=stylist_data["email"],
            password=stylist_data["password"],
            role=UserRole.STYLIST,
        )

        stylist = db.scalar(select(Stylist).where(Stylist.user_id == stylist_user.id))
        if stylist is None:
            stylist = Stylist(
                salon_id=salon_id,
                user_id=stylist_user.id,
                name=stylist_data["name"],
                phone=stylist_data["phone"],
                bio=stylist_data["bio"],
                profile_photo_url=stylist_data["photo"],
                is_active=True,
                lifetime_clients=stylist_data.get("lifetime_clients", 0),
            )
            db.add(stylist)
            db.flush()
        elif stylist.lifetime_clients == 0 and stylist_data.get("lifetime_clients"):
            stylist.lifetime_clients = stylist_data["lifetime_clients"]
            db.add(stylist)

        existing_specialties = {
            sp.name
            for sp in db.scalars(
                select(StylistSpecialty).where(StylistSpecialty.stylist_id == stylist.id)
            )
        }
        for specialty in stylist_data["specialties"]:
            if specialty in existing_specialties:
                continue
            db.add(StylistSpecialty(stylist_id=stylist.id, name=specialty))

        existing_avail = {
            a.day_of_week
            for a in db.scalars(
                select(StylistAvailability).where(StylistAvailability.stylist_id == stylist.id)
            )
        }
        for dow in range(7):
            if dow in existing_avail or dow == 0:
                continue
            db.add(
                StylistAvailability(
                    stylist_id=stylist.id,
                    day_of_week=dow,
                    starts_at=time(10, 0),
                    ends_at=time(19, 0),
                    slot_duration_minutes=30,
                    is_available=True,
                )
            )


def reset_database_data(db) -> None:
    tables = list(reversed(Base.metadata.sorted_tables))
    if not tables:
        return

    preparer = db.get_bind().dialect.identifier_preparer
    table_names = ", ".join(preparer.format_table(table) for table in tables)
    db.execute(text(f"TRUNCATE TABLE {table_names} RESTART IDENTITY CASCADE"))


def seed_demo_data() -> None:
    db = SessionLocal()
    try:
        admin = _ensure_user(
            db, email="admin@example.com", password="password123", role=UserRole.ADMIN
        )

        salon = db.scalar(select(Salon).where(Salon.admin_user_id == admin.id))
        if salon is None:
            salon = Salon(
                admin_user_id=admin.id,
                name="Maison Salon — SoMa",
                address="220 Mission Street, San Francisco",
                phone="+1 415 555 0100",
                timezone="America/Los_Angeles",
                default_slot_duration_minutes=30,
            )
            db.add(salon)
            db.flush()

        _ensure_operating_hours(db, salon.id)
        _ensure_services(db, salon.id)
        _ensure_stylists(db, salon.id)

        db.commit()

        print("— Maison Salon demo seeded —")
        print(f"  Admin email:      {admin.email}")
        print(f"  Admin password:   password123")
        print(f"  Salon id:         {salon.id} ({salon.name})")
        print(f"  Stylist logins:   {', '.join(s['email'] for s in STYLISTS)} / password123")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the Maison Salon demo data.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Clear all app data and restart identities before seeding.",
    )
    args = parser.parse_args()

    if args.reset:
        db = SessionLocal()
        try:
            reset_database_data(db)
            db.commit()
            print("— Existing salon app data cleared —")
        finally:
            db.close()

    seed_demo_data()


if __name__ == "__main__":
    main()
