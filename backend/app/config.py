from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://vereinskasse:password@localhost:5432/vereinskasse"

    # Security
    SECRET_KEY: str = "changeme-generate-with-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # SMTP
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "VereinsKasse <noreply@vereinskasse.de>"
    SMTP_TLS: bool = True

    # App
    FRONTEND_URL: str = "http://localhost"
    ENVIRONMENT: str = "production"
    APP_NAME: str = "VereinsKasse"
    APP_VERSION: str = "1.0.0"

    # Subscription
    FREE_MEMBER_LIMIT: int = 50
    PREMIUM_PRICE: float = 0.99

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
