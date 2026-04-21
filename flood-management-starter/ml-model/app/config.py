from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ml_host: str = "0.0.0.0"
    ml_port: int = 8000
    default_model: str = "random_forest"
    model_dir: Path = Path(__file__).resolve().parent.parent / "models"


settings = Settings()
