"""
Structured Clinical Check-in Schema for Frontline Workers (Gap 5).
Captures home visit vitals, patient-reported symptoms, and medication compliance.
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class CheckInVitals(BaseModel):
    systolic_bp: float = Field(..., ge=60, le=280, description="Systolic Blood Pressure (mmHg)")
    diastolic_bp: float = Field(..., ge=30, le=160, description="Diastolic Blood Pressure (mmHg)")
    heart_rate: float = Field(..., ge=30, le=220, description="Resting Heart Rate (bpm)")
    weight_kg: Optional[float] = Field(None, ge=25, le=250, description="Patient Weight (kg)")
    blood_glucose_mg_dl: Optional[float] = Field(None, ge=30, le=600, description="Random Blood Glucose (mg/dL)")


class CheckInSymptoms(BaseModel):
    has_chest_pain: bool = False
    has_shortness_of_breath: bool = False
    has_orthopnea: bool = False
    has_ankle_edema: bool = False
    medication_adherent: bool = True
    missed_doses_count: int = 0
    symptom_notes: Optional[str] = None


class PatientCheckInCreate(BaseModel):
    patient_id: str
    worker_id: str
    vitals: CheckInVitals
    symptoms: CheckInSymptoms
    check_in_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CheckInEvaluationResult(BaseModel):
    check_in_id: str
    patient_id: str
    recorded_at: datetime
    is_clinical_alert_triggered: bool
    alert_tier: Optional[str] = None
    reason_code: Optional[str] = None
    recommendations: List[str] = Field(default_factory=list)
