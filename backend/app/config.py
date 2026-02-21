from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/football_betting"
    JWT_SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours
    FOOTBALL_API_KEY: str = ""
    FOOTBALL_API_BASE_URL: str = "https://api.football-data.org/v4"
    ENVIRONMENT: str = "development"
    DEFAULT_BALANCE: int = 1000
    CORS_ORIGINS: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
