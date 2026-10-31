"""
API V1 Route Definitions
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype
"""

from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status

from apps.api.app.auth import CurrentUser, get_current_user, require_role
from apps.api.app.config import settings
from apps.api.app.consent import (
    ConsentGrantRequest,
    ConsentRecord,
    ConsentStatusResponse,
    get_patient_consent_status,
    require_consent,
    revoke_consent_record,
    store_consent_record,
)

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


# ==========================================
# Phase 3: Consent Management Endpoints
# ==========================================

@api_router.post("/consent", response_model=ConsentRecord, tags=["Consent"])
def grant_consent(
    payload: ConsentGrantRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """
    Grants a specific scope of consent (data_storage, report_upload, or messaging).
    Can be executed by the patient themselves or by their assigned health worker.
    """
    record = store_consent_record(
        patient_id=payload.patient_id,
        scope=payload.scope,
        channel=payload.channel,
        consent_version=payload.consent_version,
        captured_by=current_user.id,
    )
    return record


@api_router.post("/consent/{consent_id}/revoke", response_model=ConsentRecord, tags=["Consent"])
def revoke_consent(
    consent_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """
    Immediately revokes a specific consent record.
    Revocation gates all future access and cancels pending message reminders.
    """
    revoked = revoke_consent_record(consent_id)
    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consent record not found",
        )
    return revoked


@api_router.get("/consent/status", response_model=ConsentStatusResponse, tags=["Consent"])
def get_consent_status(
    patient_id: Annotated[UUID, Query(...)],
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """Returns active scopes and channels for a given patient."""
    return get_patient_consent_status(patient_id)


# ==========================================
# Consent-Gated Feature Test Probes
# ==========================================

@api_router.post("/reports/upload-probe", tags=["Reports"])
def report_upload_probe(
    patient_id: Annotated[UUID, Query(...)],
    _has_consent: Annotated[bool, Depends(require_consent("report_upload"))],
):
    """Consent-gated upload route: fails with 403 if report_upload consent is inactive."""
    return {
        "status": "authorized",
        "message": "Report intake authorized by active consent.",
        "patient_id": str(patient_id),
    }


@api_router.post("/messages/send-probe", tags=["Messaging"])
def message_send_probe(
    patient_id: Annotated[UUID, Query(...)],
    _has_consent: Annotated[bool, Depends(require_consent("messaging", "sms"))],
):
    """Consent-gated messaging route: fails with 403 if messaging SMS consent is inactive."""
    return {
        "status": "authorized",
        "message": "Message dispatch authorized by active consent.",
        "patient_id": str(patient_id),
    }
