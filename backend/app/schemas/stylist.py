from pydantic import BaseModel


class StylistBase(BaseModel):
    name: str
    phone: str | None = None
    bio: str | None = None
    profile_photo_url: str | None = None
    is_active: bool = True
