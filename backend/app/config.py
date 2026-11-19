from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NEERIKKHA_", extra="ignore")

    database_url: SecretStr = SecretStr(
        "postgresql://neerikkha:local-development-only@127.0.0.1:5432/neerikkha"
    )
    redis_url: SecretStr = SecretStr("redis://127.0.0.1:6379/0")
    storage_url: str = "http://127.0.0.1:8333"
    storage_access_key: SecretStr = SecretStr("neerikkha")
    storage_secret_key: SecretStr = SecretStr("local-storage-only")
    storage_bucket: str = "neerikkha-documents"
    encryption_key_file: str = "/run/neerikkha-keys/documents.key"
    vector_url: str = "http://127.0.0.1:8001"
    ocr_engine: str = "tesseract"
    gemini_key_file: str = "/run/secrets/gemini-api-key.txt"
    gemini_model: str = "gemini-3.5-flash"
    gemini_timeout: int = 120
    gemini_passes: int = 2
    tesseract_fallback: bool = False
    cors_origins: list[str] = ["http://127.0.0.1:5174", "http://localhost:5174"]
