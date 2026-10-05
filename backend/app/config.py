from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://recycling:recycling@localhost:5433/recycling"
    jwt_secret: str = "dev-only-change-me"
    jwt_expire_minutes: int = 720
    google_maps_api_key: str = ""
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    seed_demo: bool = True
    timezone: str = "America/Santiago"


settings = Settings()


def local_tz() -> ZoneInfo:
    return ZoneInfo(settings.timezone)


def local_today() -> date:
    return datetime.now(timezone.utc).astimezone(local_tz()).date()
