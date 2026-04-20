"""Provision a salon admin account from the command line.

Example:
    python -m app.scripts.create_admin \
        --email admin@example.com --password "s3cret!" \
        --salon-name "Maison Salon — SoMa" \
        --timezone "America/Los_Angeles"

Admin accounts are intentionally not exposed via a public signup endpoint —
use this script (or the seed_demo script) to create them.
"""

from __future__ import annotations

import argparse
import sys
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.salon import Salon
from app.models.user import User, UserRole


def create_admin(
    *,
    email: str,
    password: str,
    salon_name: str,
    salon_address: str | None,
    salon_phone: str | None,
    timezone: str,
    slot_duration: int,
) -> None:
    try:
        ZoneInfo(timezone)
    except ZoneInfoNotFoundError as exc:
        raise SystemExit(f"Invalid timezone '{timezone}': {exc}") from exc

    db = SessionLocal()
    try:
        existing_user = db.scalar(select(User).where(User.email == email))
        if existing_user is not None:
            raise SystemExit(f"A user with email {email!r} already exists.")

        admin = User(
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.ADMIN,
        )
        db.add(admin)
        db.flush()

        existing_salon = db.scalar(select(Salon).where(Salon.admin_user_id == admin.id))
        if existing_salon is not None:
            raise SystemExit("Admin already has a salon; refusing to double-create.")

        salon = Salon(
            admin_user_id=admin.id,
            name=salon_name,
            address=salon_address,
            phone=salon_phone,
            timezone=timezone,
            default_slot_duration_minutes=slot_duration,
        )
        db.add(salon)
        db.commit()

        print("Admin account provisioned:")
        print(f"  Email:    {email}")
        print(f"  Salon id: {salon.id} ({salon.name})")
    finally:
        db.close()


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Create a salon admin + salon.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--salon-name", required=True)
    parser.add_argument("--salon-address", default=None)
    parser.add_argument("--salon-phone", default=None)
    parser.add_argument("--timezone", default="Asia/Kolkata")
    parser.add_argument("--slot-duration", type=int, default=30)
    return parser


def main(argv: list[str] | None = None) -> None:
    args = _build_parser().parse_args(argv)
    create_admin(
        email=args.email,
        password=args.password,
        salon_name=args.salon_name,
        salon_address=args.salon_address,
        salon_phone=args.salon_phone,
        timezone=args.timezone,
        slot_duration=args.slot_duration,
    )


if __name__ == "__main__":
    main(sys.argv[1:])
