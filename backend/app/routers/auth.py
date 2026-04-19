from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.salon import Salon
from app.models.user import User, UserRole
from app.schemas.user import OwnerSignup, PasswordChange, TokenRead, UserRead

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


@router.post("/owner-signup", response_model=TokenRead, status_code=status.HTTP_201_CREATED)
def owner_signup(
    payload: OwnerSignup,
    db: Session = Depends(get_db),
) -> TokenRead:
    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    owner = User(
        email=str(payload.email),
        password_hash=get_password_hash(payload.password),
        role=UserRole.OWNER,
    )
    try:
        db.add(owner)
        db.flush()
        db.add(
            Salon(
                owner_user_id=owner.id,
                name=payload.salon_name,
                address=payload.salon_address,
                phone=payload.salon_phone,
                timezone=payload.timezone,
                default_slot_duration_minutes=30,
            )
        )
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Owner account could not be created",
        ) from error

    db.refresh(owner)
    return TokenRead(
        access_token=create_access_token(subject=str(owner.id)),
        user=UserRead.model_validate(owner),
    )


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.put("/me/password", response_model=UserRead)
def change_my_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/owner-only", response_model=UserRead)
def owner_only(current_user: User = Depends(require_role(UserRole.OWNER))) -> User:
    return current_user


@router.get("/stylist-only", response_model=UserRead)
def stylist_only(current_user: User = Depends(require_role(UserRole.STYLIST))) -> User:
    return current_user
