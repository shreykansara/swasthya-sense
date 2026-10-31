"""
API V1 Route Definitions
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype
"""

from typing import Annotated
from fastapi import APIRouter, Depends

from apps.api.app.auth import CurrentUser, get_current_user, require_role
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


@api_router.get("/auth/me", tags=["Auth"])
def get_my_profile(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """Returns authenticated user's id, role, and email."""
    return {
        "id": str(current_user.id),
        "role": current_user.role,
        "email": current_user.email,
    }


@api_router.get("/clinician/queue", tags=["Clinician"])
def clinician_queue_probe(
    current_user: Annotated[CurrentUser, Depends(require_role("clinician"))],
):
    """Gated route accessible only to clinicians."""
    return {
        "message": "Clinician queue access authorized",
        "clinician_id": str(current_user.id),
    }


@api_router.get("/admin/config", tags=["Admin"])
def admin_config_probe(
    current_user: Annotated[CurrentUser, Depends(require_role("admin"))],
):
    """Gated route accessible only to admins."""
    return {
        "message": "Admin configuration access authorized",
        "admin_id": str(current_user.id),
    }
