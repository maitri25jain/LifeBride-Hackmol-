# app/core/config.py

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "fallback-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24

    MONGO_URL: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "lifebridge"

    MATCHING_ENGINE_URL: str = "http://localhost:8001"
    CONTRACT_ADDRESS: str = "not-deployed"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()