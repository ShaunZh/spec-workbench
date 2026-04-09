"""Application configuration settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Settings for the ReqPilot API."""

    app_name: str = "ReqPilot"
    app_version: str = "0.1.0"


settings = Settings()