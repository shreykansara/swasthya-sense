"""
Perfusion API Routes
Swasthya Sense — Perfusion3D Restored Service
"""

from __future__ import annotations

from fastapi import APIRouter
from apps.api.app.perfusion.schemas import (
    CompleteAnalysisResponse,
    PatientInputSchema,
)
from apps.api.app.perfusion.service import analyze_patient

router = APIRouter(tags=["Perfusion"])


@router.post("/perfusion/predict", response_model=CompleteAnalysisResponse)
@router.post("/predict", response_model=CompleteAnalysisResponse)
async def predict_and_explain(patient: PatientInputSchema) -> CompleteAnalysisResponse:
    """
    Executes end-to-end inference across all 4 calibrated target heads (CAD, LAD, LCX, RCA),
    extracts localized TreeSHAP feature attributions, and returns WebGL color mappings
    along with latency metrics.
    """
    return analyze_patient(patient)
