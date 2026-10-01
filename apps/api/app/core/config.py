import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "LaunchComply"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=True)
    
    # Database (Defaults to local SQLite async DB for effortless zero-setup dev & automated testing)
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./launchcomply.db"
    )
    
    # JWT & Cryptography
    JWT_SECRET: str = Field(
        default="launchcomply_super_secure_jwt_secret_key_change_in_production_32chars"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    
    # AWS Integration Settings
    LAUNCHCOMPLY_AWS_ACCOUNT_ID: str = "012345678901"
    LAUNCHCOMPLY_EXTERNAL_ID_PREFIX: str = "launchcomply-ext-"

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
