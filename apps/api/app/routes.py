"""
API V1 Route Definitions
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype
"""

from fastapi import APIRouter
from apps.api.app.config import settings

api_router = APIRouter()


@api_router.get("/health", tags=["System"])
def api_health():
    """V1 API health check endpoint."""
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "disclaimer": settings.CLINICAL_DISCLAIMER,
    }
