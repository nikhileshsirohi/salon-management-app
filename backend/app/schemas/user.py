from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

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


class OwnerSignup(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    salon_name: str = Field(min_length=1, max_length=255)
    salon_address: str | None = Field(default=None, max_length=500)
    salon_phone: str | None = Field(default=None, max_length=50)
    timezone: str = Field(default="Asia/Kolkata", max_length=100)

    @model_validator(mode="after")
    def validate_timezone(self) -> "OwnerSignup":
        try:
            ZoneInfo(self.timezone)
        except ZoneInfoNotFoundError as error:
            raise ValueError("timezone must be a valid IANA timezone") from error
        return self


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)
