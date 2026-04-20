from pydantic import BaseModel, ConfigDict, EmailStr, Field

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


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
