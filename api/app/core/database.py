"""Database connection setup for SQLAlchemy."""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# SQLite sync engine
engine = create_engine(
    settings.database_url.replace("+aiosqlite", ""),
    echo=settings.app_env == "development",
)

# Session factory
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Base class for ORM models."""

    pass


def get_db():
    """Dependency for FastAPI routes to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()