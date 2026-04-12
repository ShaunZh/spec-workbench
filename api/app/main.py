"""FastAPI application entry point."""

from fastapi import FastAPI
from app.core.config import settings
from app.core.database import engine, Base
from app.models import Conversation, Message, Artifact
from app.routes import health, conversations

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

# Create database tables on startup
Base.metadata.create_all(bind=engine)

# Mount routers
app.include_router(health.router)
app.include_router(conversations.router)