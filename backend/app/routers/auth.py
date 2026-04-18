from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.security import create_access_token, verify_password
from app.models.user import User, UserRole
from app.schemas.user import TokenRead, UserRead

router = APIRouter()


@router.get("/status")
def auth_status() -> dict[str, str]:
    return {"module": "auth", "status": "ready"}


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user


@router.post("/login", response_model=TokenRead)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> TokenRead:
    user = authenticate_user(db, form_data.username, form_data.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenRead(
        access_token=create_access_token(subject=str(user.id)),
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.get("/owner-only", response_model=UserRead)
def owner_only(current_user: User = Depends(require_role(UserRole.OWNER))) -> User:
    return current_user


@router.get("/stylist-only", response_model=UserRead)
def stylist_only(current_user: User = Depends(require_role(UserRole.STYLIST))) -> User:
    return current_user
