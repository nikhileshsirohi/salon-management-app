from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.salon import Salon
from app.models.stylist import Stylist
from app.models.user import User, UserRole


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        subject = payload.get("sub")
    except ValueError as error:
        raise credentials_error from error

    if subject is None:
        raise credentials_error

    user = db.get(User, int(subject))
    if user is None:
        raise credentials_error

    return user


def require_role(required_role: UserRole) -> Callable[[User], User]:
    def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )
        return current_user

    return role_dependency


def get_current_admin(current_user: User = Depends(require_role(UserRole.ADMIN))) -> User:
    return current_user


def get_current_stylist_user(current_user: User = Depends(require_role(UserRole.STYLIST))) -> User:
    return current_user


def get_admin_salon(
    salon_id: int,
    db: Session,
    admin: User,
) -> Salon:
    salon = db.get(Salon, salon_id)
    if salon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Salon not found",
        )

    if salon.admin_user_id != admin.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not administer this salon",
        )

    return salon


def get_admin_stylist(
    stylist_id: int,
    db: Session,
    admin: User,
) -> Stylist:
    stylist = db.get(Stylist, stylist_id)
    if stylist is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stylist not found",
        )

    get_admin_salon(stylist.salon_id, db, admin)
    return stylist


def get_current_stylist(
    db: Session = Depends(get_db),
    stylist_user: User = Depends(get_current_stylist_user),
) -> Stylist:
    stylist = db.scalar(select(Stylist).where(Stylist.user_id == stylist_user.id))
    if stylist is None or not stylist.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active stylist profile not found",
        )
    return stylist
