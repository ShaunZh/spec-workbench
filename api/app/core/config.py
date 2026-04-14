"""Application configuration settings."""

from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Settings for the ReqPilot API."""

    # App
    app_name: str = "ReqPilot"
    app_version: str = "0.1.0"
    app_env: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000

    # Database
    database_url: str = "sqlite:///./reqpilot.db"

    # DeepSeek LLM (OpenAI-compatible)
    deepseek_api_key: Optional[str] = None
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()