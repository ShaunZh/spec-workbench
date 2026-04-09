"""Health check endpoint."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/healthz")
async def health_check():
    """Return health status."""
    return {"status": "ok"}