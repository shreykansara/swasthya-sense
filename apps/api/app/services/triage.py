"""
Triage Service for Swasthya Sense: Two-Lane Worklist Prioritization.
Enforces strict mathematical isolation between Clinical Lane and Administrative Lane.
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone, timedelta


class TriageLane(str, Enum):
    CLINICAL = "clinical"
    ADMINISTRATIVE = "administrative"


class AlertTier(str, Enum):
    TIER_1_ACUTE = "tier_1_acute"         # Red: Immediate physiological review required (SLA < 4h)
    TIER_2_SUBACUTE = "tier_2_subacute"   # Amber: Boundary vitals / symptom change (SLA < 24h)
    TIER_3_ROUTINE = "tier_3_routine"     # Blue: Operational lateness / scheduled follow-up


class TriageReasonCode(str, Enum):
    # Clinical triggers (Physiological only - No Diagnostic claims)
    CRITICAL_SYSTOLIC_BP = "CRITICAL_SYSTOLIC_BP"
    CRITICAL_DIASTOLIC_BP = "CRITICAL_DIASTOLIC_BP"
    ELEVATED_CARDIAC_BIOMARKER = "ELEVATED_CARDIAC_BIOMARKER"
    RAPID_WEIGHT_GAIN = "RAPID_WEIGHT_GAIN"
    SEVERE_SYMPTOM_REPORT = "SEVERE_SYMPTOM_REPORT"
    ABNORMAL_HEART_RATE = "ABNORMAL_HEART_RATE"

    # Administrative triggers (Lateness / Scheduling only)
    APPOINTMENT_OVERDUE = "APPOINTMENT_OVERDUE"
    GRACE_PERIOD_EXPIRING = "GRACE_PERIOD_EXPIRING"
    UNACKNOWLEDGED_REMINDER = "UNACKNOWLEDGED_REMINDER"
    MISSED_HOME_VISIT = "MISSED_HOME_VISIT"


class WorklistItem(BaseModel):
    patient_id: str
    patient_masked_id: str
    cohort: str
    lane: TriageLane
    tier: AlertTier
    reason_code: TriageReasonCode
    reason_description: str
    rule_id: Optional[str] = None
    input_values: Dict[str, Any] = Field(default_factory=dict)
    sla_deadline: datetime
    days_overdue: int = 0
    assigned_worker_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(frozen=True)


class PatientTriageInput(BaseModel):
    patient_id: str
    patient_name: str
    cohort: str
    assigned_worker_id: Optional[str] = None
    
    # Scheduling fields
    last_visit_date: Optional[datetime] = None
    next_scheduled_date: Optional[datetime] = None
    grace_period_days: int = 3
    
    # Physiological & symptom fields (from recent check-in or lab intake)
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    heart_rate: Optional[float] = None
    weight_kg: Optional[float] = None
    weight_delta_48h_kg: Optional[float] = None
    troponin_i_ng_ml: Optional[float] = None
    has_resting_chest_pain: bool = False
    has_acute_shortness_of_breath: bool = False


class TwoLaneWorklist(BaseModel):
    clinical_lane: List[WorklistItem] = Field(default_factory=list)
    administrative_lane: List[WorklistItem] = Field(default_factory=list)
    total_clinical_alerts: int = 0
    total_administrative_overdues: int = 0
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def mask_patient_id(patient_id: str) -> str:
    """Mask patient identifier for data minimization (e.g. PAT-***89)."""
    if len(patient_id) <= 4:
        return f"***{patient_id[-2:]}"
    return f"{patient_id[:3]}-***{patient_id[-3:]}"


def evaluate_triage(patient: PatientTriageInput, now: Optional[datetime] = None) -> Optional[WorklistItem]:
    """
    Evaluates a patient's clinical vitals and schedule status to assign them
    to either the Clinical Lane or the Administrative Lane.

    INVARIANT (Gap 4):
    1. Clinical Lane takes strict precedence: Any acute physiological trigger routes
       immediately to the Clinical Lane.
    2. Administrative Lane contains strictly non-acute scheduling lateness.
    3. No diagnostic labels are generated; only transparent physiological thresholds.
    """
    if now is None:
        now = datetime.now(timezone.utc)

    masked_id = mask_patient_id(patient.patient_id)

    # --------------------------------------------------------------------------
    # 1. EVALUATE CLINICAL LANE TRIGGERS (Physiological warning signs)
    # --------------------------------------------------------------------------
    
    # Biomarker: Troponin-I elevation (> 0.04 ng/mL indicates acute myocardial strain)
    if patient.troponin_i_ng_ml is not None and patient.troponin_i_ng_ml > 0.04:
        return WorklistItem(
            patient_id=patient.patient_id,
            patient_masked_id=masked_id,
            cohort=patient.cohort,
            lane=TriageLane.CLINICAL,
            tier=AlertTier.TIER_1_ACUTE,
            reason_code=TriageReasonCode.ELEVATED_CARDIAC_BIOMARKER,
            reason_description=f"Elevated cardiac biomarker: Troponin-I {patient.troponin_i_ng_ml:.3f} ng/mL (threshold > 0.04 ng/mL). Urgent clinician review required.",
            rule_id="RULE-BIO-01-v1.0",
            input_values={"troponin_i_ng_ml": patient.troponin_i_ng_ml, "threshold": 0.04},
            sla_deadline=now + timedelta(hours=2),
            assigned_worker_id=patient.assigned_worker_id,
        )

    # Critical Hypertension: Systolic >= 180 mmHg or Diastolic >= 110 mmHg (Hypertensive Urgency)
    if patient.systolic_bp is not None and patient.systolic_bp >= 180.0:
        return WorklistItem(
            patient_id=patient.patient_id,
            patient_masked_id=masked_id,
            cohort=patient.cohort,
            lane=TriageLane.CLINICAL,
            tier=AlertTier.TIER_1_ACUTE,
            reason_code=TriageReasonCode.CRITICAL_SYSTOLIC_BP,
            reason_description=f"Severely elevated systolic blood pressure: {patient.systolic_bp:.0f} mmHg (threshold >= 180 mmHg).",
            rule_id="RULE-BP-01-v1.0",
            input_values={"systolic_bp": patient.systolic_bp, "threshold": 180.0},
            sla_deadline=now + timedelta(hours=4),
            assigned_worker_id=patient.assigned_worker_id,
        )

    if patient.diastolic_bp is not None and patient.diastolic_bp >= 110.0:
        return WorklistItem(
            patient_id=patient.patient_id,
            patient_masked_id=masked_id,
            cohort=patient.cohort,
            lane=TriageLane.CLINICAL,
            tier=AlertTier.TIER_1_ACUTE,
            reason_code=TriageReasonCode.CRITICAL_DIASTOLIC_BP,
            reason_description=f"Severely elevated diastolic blood pressure: {patient.diastolic_bp:.0f} mmHg (threshold >= 110 mmHg).",
            rule_id="RULE-BP-02-v1.0",
            input_values={"diastolic_bp": patient.diastolic_bp, "threshold": 110.0},
            sla_deadline=now + timedelta(hours=4),
            assigned_worker_id=patient.assigned_worker_id,
        )

    # Severe acute symptoms: Resting chest discomfort or acute shortness of breath
    if patient.has_resting_chest_pain or patient.has_acute_shortness_of_breath:
        symptoms = []
        if patient.has_resting_chest_pain:
            symptoms.append("resting chest discomfort")
        if patient.has_acute_shortness_of_breath:
            symptoms.append("acute exertional dyspnea")
        return WorklistItem(
            patient_id=patient.patient_id,
            patient_masked_id=masked_id,
            cohort=patient.cohort,
            lane=TriageLane.CLINICAL,
            tier=AlertTier.TIER_1_ACUTE,
            reason_code=TriageReasonCode.SEVERE_SYMPTOM_REPORT,
            reason_description=f"Patient-reported concerning symptoms: {', '.join(symptoms)}. Clinician contact recommended.",
            rule_id="RULE-SYM-01-v1.0",
            input_values={"resting_chest_pain": patient.has_resting_chest_pain, "acute_dyspnea": patient.has_acute_shortness_of_breath},
            sla_deadline=now + timedelta(hours=4),
            assigned_worker_id=patient.assigned_worker_id,
        )

    # Heart Failure Cohort: Rapid weight gain (>= 2 kg in 48 hours indicates fluid retention)
    if patient.weight_delta_48h_kg is not None and patient.weight_delta_48h_kg >= 2.0:
        return WorklistItem(
            patient_id=patient.patient_id,
            patient_masked_id=masked_id,
            cohort=patient.cohort,
            lane=TriageLane.CLINICAL,
            tier=AlertTier.TIER_2_SUBACUTE,
            reason_code=TriageReasonCode.RAPID_WEIGHT_GAIN,
            reason_description=f"Rapid weight gain of {patient.weight_delta_48h_kg:.1f} kg within 48 hours (possible fluid accumulation in {patient.cohort}).",
            rule_id="RULE-HF-01-v1.0",
            input_values={"weight_delta_48h_kg": patient.weight_delta_48h_kg, "threshold": 2.0},
            sla_deadline=now + timedelta(hours=24),
            assigned_worker_id=patient.assigned_worker_id,
        )

    # Sub-acute Blood Pressure (Stage 2 Hypertension: SBP >= 160 or DBP >= 100)
    if (patient.systolic_bp is not None and patient.systolic_bp >= 160.0) or \
       (patient.diastolic_bp is not None and patient.diastolic_bp >= 100.0):
        return WorklistItem(
            patient_id=patient.patient_id,
            patient_masked_id=masked_id,
            cohort=patient.cohort,
            lane=TriageLane.CLINICAL,
            tier=AlertTier.TIER_2_SUBACUTE,
            reason_code=TriageReasonCode.CRITICAL_SYSTOLIC_BP,
            reason_description=f"Elevated blood pressure reading ({patient.systolic_bp:.0f}/{patient.diastolic_bp:.0f} mmHg). Clinician review advised.",
            rule_id="RULE-BP-03-v1.0",
            input_values={"systolic_bp": patient.systolic_bp, "diastolic_bp": patient.diastolic_bp},
            sla_deadline=now + timedelta(hours=24),
            assigned_worker_id=patient.assigned_worker_id,
        )

    # Abnormal resting heart rate (Tachycardia > 115 bpm or Bradycardia < 45 bpm)
    if patient.heart_rate is not None and (patient.heart_rate > 115.0 or patient.heart_rate < 45.0):
        return WorklistItem(
            patient_id=patient.patient_id,
            patient_masked_id=masked_id,
            cohort=patient.cohort,
            lane=TriageLane.CLINICAL,
            tier=AlertTier.TIER_2_SUBACUTE,
            reason_code=TriageReasonCode.ABNORMAL_HEART_RATE,
            reason_description=f"Resting heart rate out of standard range: {patient.heart_rate:.0f} bpm (expected 50-100 bpm).",
            rule_id="RULE-HR-01-v1.0",
            input_values={"heart_rate": patient.heart_rate},
            sla_deadline=now + timedelta(hours=24),
            assigned_worker_id=patient.assigned_worker_id,
        )

    # --------------------------------------------------------------------------
    # 2. EVALUATE ADMINISTRATIVE LANE TRIGGERS (Operational lateness)
    # --------------------------------------------------------------------------
    if patient.next_scheduled_date is not None:
        target_date = patient.next_scheduled_date
        grace_deadline = target_date + timedelta(days=patient.grace_period_days)

        if now > grace_deadline:
            days_late = (now - target_date).days
            return WorklistItem(
                patient_id=patient.patient_id,
                patient_masked_id=masked_id,
                cohort=patient.cohort,
                lane=TriageLane.ADMINISTRATIVE,
                tier=AlertTier.TIER_3_ROUTINE,
                reason_code=TriageReasonCode.APPOINTMENT_OVERDUE,
                reason_description=f"Follow-up visit overdue by {days_late} days (scheduled for {target_date.strftime('%Y-%m-%d')}, grace period was {patient.grace_period_days} days).",
                rule_id="RULE-SCHED-01-v1.0",
                input_values={"scheduled_date": target_date.isoformat(), "grace_days": patient.grace_period_days, "days_late": days_late},
                sla_deadline=now + timedelta(days=1),
                days_overdue=days_late,
                assigned_worker_id=patient.assigned_worker_id,
            )
        elif now > target_date:
            days_in_grace = (now - target_date).days
            return WorklistItem(
                patient_id=patient.patient_id,
                patient_masked_id=masked_id,
                cohort=patient.cohort,
                lane=TriageLane.ADMINISTRATIVE,
                tier=AlertTier.TIER_3_ROUTINE,
                reason_code=TriageReasonCode.GRACE_PERIOD_EXPIRING,
                reason_description=f"Scheduled check-in date passed ({days_in_grace} days into {patient.grace_period_days}-day grace period). Automated reminder recommended.",
                rule_id="RULE-SCHED-02-v1.0",
                input_values={"scheduled_date": target_date.isoformat(), "grace_days": patient.grace_period_days},
                sla_deadline=grace_deadline,
                days_overdue=0,
                assigned_worker_id=patient.assigned_worker_id,
            )

    return None


def generate_two_lane_worklist(patients: List[PatientTriageInput], now: Optional[datetime] = None) -> TwoLaneWorklist:
    """
    Partitions a cohort of patients into the strict Two-Lane Worklist.
    Clinical Lane: Sorted by urgency tier (Tier 1 acute first, then Tier 2), then SLA deadline.
    Administrative Lane: Sorted by days overdue (descending).
    """
    clinical_items: List[WorklistItem] = []
    admin_items: List[WorklistItem] = []

    for patient in patients:
        item = evaluate_triage(patient, now=now)
        if item is None:
            continue
        if item.lane == TriageLane.CLINICAL:
            clinical_items.append(item)
        elif item.lane == TriageLane.ADMINISTRATIVE:
            admin_items.append(item)

    # Sort Clinical Lane: Tier 1 Acute first, then earliest SLA deadline
    clinical_items.sort(key=lambda x: (0 if x.tier == AlertTier.TIER_1_ACUTE else 1, x.sla_deadline))

    # Sort Administrative Lane: Highest days overdue first
    admin_items.sort(key=lambda x: x.days_overdue, reverse=True)

    return TwoLaneWorklist(
        clinical_lane=clinical_items,
        administrative_lane=admin_items,
        total_clinical_alerts=len(clinical_items),
        total_administrative_overdues=len(admin_items),
        generated_at=now or datetime.now(timezone.utc),
    )
