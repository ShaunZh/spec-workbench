"""FastAPI application entry point."""

from fastapi import FastAPI
from app.core.config import settings
from app.routes import health, conversations

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

# Mount routers
app.include_router(health.router)
app.include_router(conversations.router)