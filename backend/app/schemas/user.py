from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    role: UserRole


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class TokenRead(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
