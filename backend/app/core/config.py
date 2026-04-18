from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    project_name: str = "Salon Management App API"
    api_v1_prefix: str = "/api/v1"
    secret_key: str = "dev-change-this-secret-key"
    access_token_expire_minutes: int = 60 * 24 * 7
    database_url: str = "postgresql+psycopg://salon_user:salon_password@localhost:5432/salon_db"
    backend_cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])


settings = Settings()
