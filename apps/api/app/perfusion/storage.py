"""
Perfusion Database Storage Service
Mirrors Supabase perfusion_inputs and perfusion_results tables.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field

from apps.api.app.utils.logger import logger


class PerfusionInputRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    patient_id: UUID
    inputs: dict[str, Any]
    source: str = "manual"  # 'manual', 'report_prefill', 'preset'
    created_by: UUID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PerfusionResultRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    input_id: UUID
    patient_id: UUID
    cad_p: float
    lad_p: float
    lcx_p: float
    rca_p: float
    shap: dict[str, Any]
    model_version: str = "v1.0.0"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# In-memory stores mirroring Supabase tables
_PERFUSION_INPUTS_DB: dict[UUID, PerfusionInputRecord] = {}
_PERFUSION_RESULTS_DB: dict[UUID, PerfusionResultRecord] = {}


def save_perfusion_input(
    patient_id: UUID,
    inputs: dict[str, Any],
    created_by: UUID,
    source: str = "manual",
) -> PerfusionInputRecord:
    """Persists a new perfusion_inputs record."""
    record = PerfusionInputRecord(
        id=uuid4(),
        patient_id=patient_id,
        inputs=inputs,
        source=source if source in ("manual", "report_prefill", "preset") else "manual",
        created_by=created_by,
        created_at=datetime.now(timezone.utc),
    )
    _PERFUSION_INPUTS_DB[record.id] = record
    logger.info(f"Saved perfusion input {record.id} for patient {patient_id}")
    return record


def save_perfusion_result(
    input_id: UUID,
    patient_id: UUID,
    cad_p: float,
    lad_p: float,
    lcx_p: float,
    rca_p: float,
    shap: dict[str, Any],
    model_version: str = "v1.0.0",
) -> PerfusionResultRecord:
    """Persists a new perfusion_results record."""
    record = PerfusionResultRecord(
        id=uuid4(),
        input_id=input_id,
        patient_id=patient_id,
        cad_p=round(cad_p, 4),
        lad_p=round(lad_p, 4),
        lcx_p=round(lcx_p, 4),
        rca_p=round(rca_p, 4),
        shap=shap,
        model_version=model_version,
        created_at=datetime.now(timezone.utc),
    )
    _PERFUSION_RESULTS_DB[record.id] = record
    logger.info(f"Saved perfusion result {record.id} for input {input_id}")
    return record


def get_latest_perfusion_record(patient_id: UUID) -> tuple[PerfusionInputRecord | None, PerfusionResultRecord | None]:
    """Retrieves the most recent perfusion input and result for a patient."""
    patient_inputs = [inp for inp in _PERFUSION_INPUTS_DB.values() if inp.patient_id == patient_id]
    if not patient_inputs:
        return None, None

    latest_input = sorted(patient_inputs, key=lambda x: x.created_at, reverse=True)[0]
    results = [res for res in _PERFUSION_RESULTS_DB.values() if res.input_id == latest_input.id]
    latest_result = results[0] if results else None
    return latest_input, latest_result


def clear_perfusion_store():
    """Testing helper to clear all records."""
    _PERFUSION_INPUTS_DB.clear()
    _PERFUSION_RESULTS_DB.clear()
