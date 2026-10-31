"""
Perfusion API Routes
Swasthya Sense — Perfusion3D Restored Service
"""

from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status

from apps.api.app.auth import CurrentUser, get_current_user
from apps.api.app.consent import enforce_consent
from apps.api.app.perfusion.audit import log_perfusion_audit
from apps.api.app.perfusion.schemas import (
    CompleteAnalysisResponse,
    LatestPerfusionResponse,
    PatientInputSchema,
    PatientPerfusionResponse,
)
from apps.api.app.perfusion.service import analyze_patient
from apps.api.app.perfusion.storage import (
    get_latest_perfusion_record,
    save_perfusion_input,
    save_perfusion_result,
)

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
    Logs an immutable audit record for every prediction request.
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

    res = analyze_patient(patient)

    # Log immutable audit entry
    log_perfusion_audit(
        actor_id=current_user.id,
        action="perfusion_predict",
        patient_id=patient.patient_id,
        details={
            "cad_probability": res.predictions.overall_cad.probability,
            "cad_risk_tier": res.predictions.overall_cad.risk_tier.value,
            "high_risk_vessels": res.predictions.high_risk_vessels,
            "latency_ms": res.latency_ms,
        },
    )

    return res


@router.post("/patients/{patient_id}/perfusion", response_model=PatientPerfusionResponse)
async def record_patient_perfusion(
    patient_id: UUID,
    patient_input: PatientInputSchema,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    source: str = Query(default="manual", pattern="^(manual|report_prefill|preset)$"),
) -> PatientPerfusionResponse:
    """
    (a) Checks active data_storage consent for patient.
    (b) Saves inputs row into perfusion_inputs.
    (c) Executes inference & TreeSHAP analysis.
    (d) Saves results row into perfusion_results.
    (e) Returns CompleteAnalysisResponse plus input_id.
    """
    if current_user.role not in ALLOWED_PERFUSION_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role}' not permitted to submit perfusion inputs",
        )

    # Patient role isolation
    if current_user.role == "patient" and current_user.id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: patients may only record perfusion inputs for their own record",
        )

    # Step (a): Verify active data_storage consent
    enforce_consent(patient_id, "data_storage", actor_id=current_user.id)

    # Set patient_id on payload
    patient_input.patient_id = str(patient_id)

    # Step (b): Save input row
    input_row = save_perfusion_input(
        patient_id=patient_id,
        inputs=patient_input.model_dump(by_alias=True),
        created_by=current_user.id,
        source=source,
    )

    # Step (c): Run inference & TreeSHAP
    analysis = analyze_patient(patient_input)

    # Step (d): Save result row
    save_perfusion_result(
        input_id=input_row.id,
        patient_id=patient_id,
        cad_p=analysis.predictions.overall_cad.probability,
        lad_p=analysis.predictions.vessels["lad"].probability,
        lcx_p=analysis.predictions.vessels["lcx"].probability,
        rca_p=analysis.predictions.vessels["rca"].probability,
        shap={v: [feat.model_dump() for feat in exp.top_features] for v, exp in analysis.explanations.items()},
        model_version="v1.0.0",
    )

    # Log audit entry
    log_perfusion_audit(
        actor_id=current_user.id,
        action="perfusion_record_created",
        patient_id=str(patient_id),
        details={
            "input_id": str(input_row.id),
            "source": source,
            "cad_p": analysis.predictions.overall_cad.probability,
            "latency_ms": analysis.latency_ms,
        },
    )

    # Step (e): Return analysis + input_id
    return PatientPerfusionResponse(
        input_id=input_row.id,
        patient_id=str(patient_id),
        timestamp=analysis.timestamp,
        predictions=analysis.predictions,
        explanations=analysis.explanations,
        latency_ms=analysis.latency_ms,
        disclaimer=analysis.disclaimer,
    )


@router.get("/patients/{patient_id}/perfusion/latest", response_model=LatestPerfusionResponse)
async def get_latest_patient_perfusion(
    patient_id: UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> LatestPerfusionResponse:
    """
    Retrieves the most recent recorded perfusion input and result for a patient.
    Enforces RBAC and consent check.
    """
    if current_user.role not in ALLOWED_PERFUSION_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: role '{current_user.role}' not permitted to access perfusion records",
        )

    if current_user.role == "patient" and current_user.id != patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: patients may only read their own perfusion records",
        )

    # Check consent
    enforce_consent(patient_id, "data_storage", actor_id=current_user.id)

    input_rec, result_rec = get_latest_perfusion_record(patient_id)
    if not input_rec or not result_rec:
        return LatestPerfusionResponse(patient_id=patient_id)

    # Reconstitute predictions and explanations from stored inputs/results
    patient = PatientInputSchema(**input_rec.inputs)
    analysis = analyze_patient(patient)

    return LatestPerfusionResponse(
        patient_id=patient_id,
        input_id=input_rec.id,
        inputs=input_rec.inputs,
        source=input_rec.source,
        created_at=input_rec.created_at.isoformat(),
        predictions=analysis.predictions,
        explanations=analysis.explanations,
        model_version=result_rec.model_version,
    )
