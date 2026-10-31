"""
Perfusion API Routes
Swasthya Sense — Perfusion3D Restored Service
"""

from __future__ import annotations

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status

from apps.api.app.auth import CurrentUser, get_current_user
from apps.api.app.perfusion.schemas import (
    CompleteAnalysisResponse,
    PatientInputSchema,
)
from apps.api.app.perfusion.service import analyze_patient

router = APIRouter(tags=["Perfusion"])

ALLOWED_PERFUSION_ROLES = {"patient", "worker", "health_worker", "clinician", "supervisor", "admin"}


@router.post("/perfusion/predict", response_model=CompleteAnalysisResponse)
@router.post("/predict", response_model=CompleteAnalysisResponse)
async def predict_and_explain(
    patient: PatientInputSchema,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CompleteAnalysisResponse:
    """
    Executes end-to-end inference across all 4 calibrated target heads (CAD, LAD, LCX, RCA),
    extracts localized TreeSHAP feature attributions, and returns WebGL color mappings
    along with latency metrics.
    Enforces JWT authentication and RBAC:
    - Patient can only access their own data.
    - Worker/Clinician/Supervisor/Admin can access any patient.
    """
    if current_user.role not in ALLOWED_PERFUSION_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role}' not permitted to run perfusion inference",
        )

    # Patient role isolation: patient can only access their own data
    if current_user.role == "patient":
        if patient.patient_id and patient.patient_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: patients may only execute predictions for their own record",
            )
        patient.patient_id = str(current_user.id)

    return analyze_patient(patient)
