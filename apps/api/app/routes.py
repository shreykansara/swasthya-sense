"""
API V1 Route Definitions
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype
"""

from pathlib import Path
from typing import Annotated
from uuid import UUID
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)

from apps.api.app.auth import CurrentUser, get_current_user, require_role
from apps.api.app.config import settings
from apps.api.app.consent import (
    ConsentGrantRequest,
    ConsentRecord,
    ConsentStatusResponse,
    get_patient_consent_status,
    require_consent,
    enforce_consent,
    revoke_consent_record,
    store_consent_record,
)
from apps.api.app.extraction.models import (
    ConfirmReportRequest,
    ReportUploadRecord,
)
from apps.api.app.extraction.service import extraction_service
from apps.api.app.rules.models import CaseFlagRecord, ClinicalRule
from apps.api.app.rules.service import case_flag_service
from apps.api.app.rules.engine import rule_engine
from pydantic import BaseModel
from apps.api.app.readout.models import (
    AnalyteReadoutItem,
    ReadoutRequest,
    ReadoutResponse,
)
from apps.api.app.readout.groq_client import generate_readout

api_router = APIRouter()


# ==========================================
# System & Health
# ==========================================

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
# Consent Management Endpoints
# ==========================================

@api_router.post("/consent", response_model=ConsentRecord, tags=["Consent"])
def grant_consent(
    payload: ConsentGrantRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
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
    return get_patient_consent_status(patient_id)


# ==========================================
# Phase 5: Report Intake & Extraction Endpoints
# ==========================================

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit


@api_router.post(
    "/reports/upload",
    response_model=ReportUploadRecord,
    tags=["Reports"],
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_clinical_report(
    background_tasks: BackgroundTasks,
    patient_id: Annotated[UUID, Form(...)],
    file: UploadFile = File(...),
    current_user: Annotated[CurrentUser, Depends(get_current_user)] = None,
):
    enforce_consent(patient_id, "report_upload", actor_id=current_user.id if current_user else None)
    """
    Consent-gated report intake endpoint:
    - Enforces file type (.pdf, .jpg, .jpeg, .png) and max size (10MB).
    - Stores file safely with randomized UUID name.
    - Launches background extraction task.
    - Returns HTTP 202 Accepted immediately.
    """
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum allowed limit of 10MB.",
        )

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {ALLOWED_EXTENSIONS}",
        )

    # Create upload record and save file safely
    upload_record = extraction_service.create_upload_record(
        patient_id=patient_id,
        file_name=file.filename or f"report{ext}",
        mime_type=file.content_type or "application/octet-stream",
        file_bytes=file_bytes,
        actor_id=current_user.id,
    )

    # Enqueue background extraction task
    background_tasks.add_task(extraction_service.process_report_intake, upload_record.id)

    return upload_record


@api_router.get("/reports/{upload_id}", response_model=ReportUploadRecord, tags=["Reports"])
def get_report_upload(
    upload_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """Polls extraction status: 'uploaded', 'extracting', 'needs_confirmation', 'confirmed'."""
    record = extraction_service.get_upload_record(upload_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report upload not found",
        )
    return record


@api_router.post("/reports/{upload_id}/confirm", response_model=ReportUploadRecord, tags=["Reports"])
def confirm_report_values(
    upload_id: UUID,
    payload: ConfirmReportRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """
    Human verification checkpoint:
    Stores confirmed values with audit trail.
    Downstream clinical rules and patient readouts strictly reject unconfirmed data.
    """
    try:
        updated = extraction_service.confirm_extracted_values(
            upload_id=upload_id,
            confirmations=payload.confirmed_values,
            confirmed_by=current_user.id,
        )
        # Phase 7: Evaluate rules across confirmed values & persist case flags
        case_flag_service.evaluate_and_persist_flags(
            patient_id=updated.patient_id,
            upload_id=updated.id,
            confirmed_values=updated.extracted_values,
        )
        return updated
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@api_router.get("/patients/{patient_id}/confirmed-values", tags=["Reports"])
def get_confirmed_values(
    patient_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """Retrieves only values confirmed by a human; unconfirmed values are strictly excluded."""
    confirmed = extraction_service.get_confirmed_values_for_patient(patient_id)
    return {
        "patient_id": str(patient_id),
        "total_confirmed": len(confirmed),
        "values": confirmed,
    }


# ==========================================
# Legacy feature test probes
# ==========================================

@api_router.post("/reports/upload-probe", tags=["Reports"])
def report_upload_probe(
    patient_id: Annotated[UUID, Query(...)],
    _has_consent: Annotated[bool, Depends(require_consent("report_upload"))],
):
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
    return {
        "status": "authorized",
        "message": "Message dispatch authorized by active consent.",
        "patient_id": str(patient_id),
    }


# ==========================================
# Phase 6: Plain-Language Readout Endpoints
# ==========================================

@api_router.post(
    "/readout/generate",
    response_model=ReadoutResponse,
    tags=["Readout"],
)
def generate_plain_language_readout(
    req: ReadoutRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    enforce_consent(req.patient_id, "data_storage", actor_id=current_user.id)

    items = list(req.items)
    # If report_upload_id is provided and items list is empty, fetch confirmed values
    if req.report_upload_id and not items:
        upload = extraction_service.get_upload_record(req.report_upload_id)
        if not upload:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report upload '{req.report_upload_id}' not found.",
            )
        for ev in upload.extracted_values:
            if ev.is_confirmed:
                items.append(
                    AnalyteReadoutItem(
                        analyte_key=ev.analyte_key,
                        display_name=ev.display_name,
                        value=ev.value,
                        unit=ev.unit,
                        reference_low=ev.reference_low,
                        reference_high=ev.reference_high,
                    )
                )

    readout_text, source = generate_readout(items, language=req.language)

    return ReadoutResponse(
        patient_id=req.patient_id,
        language=req.language,
        source=source,
        readout_text=readout_text,
        items=items,
    )


# ==========================================
# Phase 7: Clinical Case Flags & Rule Governance
# ==========================================

class FlagOverrideRequest(BaseModel):
    new_urgency: str
    reason: str


@api_router.get("/patients/{patient_id}/case-flags", response_model=list[CaseFlagRecord], tags=["Clinical Rules"])
def get_patient_case_flags(
    patient_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
):
    """Fetches all active clinical urgency flags and 'why flagged' contributions for a patient."""
    return case_flag_service.get_flags_for_patient(patient_id)


@api_router.post("/case-flags/{flag_id}/override", response_model=CaseFlagRecord, tags=["Clinical Rules"])
def override_case_flag(
    flag_id: UUID,
    req: FlagOverrideRequest,
    current_user: Annotated[CurrentUser, Depends(require_role("clinician"))],
):
    """Clinician override endpoint: modifies flag urgency tier with mandatory audit reason."""
    try:
        return case_flag_service.record_clinician_override(
            flag_id=flag_id,
            clinician_id=current_user.id,
            new_urgency=req.new_urgency,  # type: ignore
            reason=req.reason,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@api_router.get("/admin/rules", response_model=list[ClinicalRule], tags=["Rule Governance"])
def list_clinical_rules(
    current_user: Annotated[CurrentUser, Depends(require_role("admin"))],
):
    """Lists all versioned clinical rules with sign-off status."""
    return rule_engine.rules


@api_router.post("/admin/rules/{rule_id}/sign-off", response_model=ClinicalRule, tags=["Rule Governance"])
def sign_off_clinical_rule(
    rule_id: str,
    current_user: Annotated[CurrentUser, Depends(require_role("admin"))],
):
    """Admin workflow to sign off and activate a clinical rule."""
    from datetime import datetime, timezone
    for r in rule_engine.rules:
        if r.rule_id == rule_id:
            r.signed_off_by = current_user.email
            r.signed_off_at = datetime.now(timezone.utc).isoformat()
            return r
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Rule '{rule_id}' not found.")
