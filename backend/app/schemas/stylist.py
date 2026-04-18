from pydantic import BaseModel, ConfigDict, EmailStr, Field


class StylistBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    phone: str | None = None
    bio: str | None = None
    profile_photo_url: str | None = Field(default=None, max_length=1000)
    is_active: bool = True


class StylistCreate(StylistBase):
    salon_id: int
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    specialties: list[str] = Field(default_factory=list)


class StylistUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = None
    bio: str | None = None
    profile_photo_url: str | None = Field(default=None, max_length=1000)
    is_active: bool | None = None
    specialties: list[str] | None = None


class StylistRead(StylistBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    salon_id: int
    user_id: int | None = None
    email: EmailStr | None = None
    specialties: list[str] = Field(default_factory=list)
