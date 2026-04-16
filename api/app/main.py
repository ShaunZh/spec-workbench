"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.models import Conversation, Message, Artifact
from app.routes import health, conversations, chat, artifacts

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables on startup
Base.metadata.create_all(bind=engine)

# Mount routers
app.include_router(health.router)
app.include_router(conversations.router)
app.include_router(chat.router)
app.include_router(artifacts.router)