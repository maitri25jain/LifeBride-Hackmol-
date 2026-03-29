# app/core/config.py

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "fallback-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24

    web3_provider_uri:  str = "http://172.24.144.1:8545"
    server_private_key: str = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    CONTRACT_ADDRESS: str = "0x5FbDB2315678afecb367f032d93F642f64180aa3"


    MONGO_URL: str = "mongodb+srv://LifeBridge:25maitrijn@cluster0.2rqfb3j.mongodb.net/?appName=Cluster0"
    MONGO_DB_NAME: str = "LifeBridge"

    MATCHING_ENGINE_URL: str = "http://localhost:8001"
    CONTRACT_ADDRESS: str = "not-deployed"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()