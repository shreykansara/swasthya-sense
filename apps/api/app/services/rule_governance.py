"""
Rule Governance, Clinician Overrides, and Emergency Red-Flag Routing (Phase 4).
Enforces medical officer sign-off, override audit logging, and fast-path emergency escalation (Gap 7).
"""

from typing import List, Dict, Optional, Any
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class OverrideReasonCode(str, Enum):
    FALSE_POSITIVE = "FALSE_POSITIVE"                     # Artefact or spurious reading
    BASELINE_ABNORMALITY = "BASELINE_ABNORMALITY"         # Known chronic baseline (e.g. chronic stable dyspnea)
    ALTERNATIVE_ETIOLOGY = "ALTERNATIVE_ETIOLOGY"         # Non-cardiac etiology documented
    CARE_PLAN_ALREADY_ADJUSTED = "CARE_PLAN_ADJUSTED"     # Treatment already adjusted under direct care


class RuleSignOffRecord(BaseModel):
    rule_id: str
    version: str
    rule_name: str
    threshold_criteria: str
    clinical_evidence_source: str
    signed_by_clinician_name: str
    clinician_reg_no: str
    signed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True


class ClinicianOverrideRecord(BaseModel):
    override_id: str
    alert_rule_id: str
    patient_id: str
    clinician_id: str
    clinician_name: str
    reason_code: OverrideReasonCode
    clinical_rationale: str
    previous_tier: str
    overridden_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EmergencyRedFlagAlert(BaseModel):
    alert_id: str
    patient_id: str
    patient_masked_id: str
    trigger_criteria: str
    measured_value: str
    is_emergency: bool = True
    ambulance_routing_number: str = "108"
    requires_immediate_transfer: bool = True
    triggered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Active Versioned Rules with Sign-off Hashes
GOVERNED_RULES: Dict[str, RuleSignOffRecord] = {
    "RULE-BP-01-v1.0": RuleSignOffRecord(
        rule_id="RULE-BP-01-v1.0",
        version="1.0.0",
        rule_name="Critical Systolic Hypertension (Hypertensive Urgency)",
        threshold_criteria="Systolic BP >= 180 mmHg",
        clinical_evidence_source="AHA/ACC 2017 Guidelines for High Blood Pressure in Adults",
        signed_by_clinician_name="Dr. Vikram Sen, MD (Cardiology)",
        clinician_reg_no="MCI-48201",
    ),
    "RULE-BIO-01-v1.0": RuleSignOffRecord(
        rule_id="RULE-BIO-01-v1.0",
        version="1.0.0",
        rule_name="Acute Cardiac Biomarker Elevation",
        threshold_criteria="Serum Troponin-I > 0.04 ng/mL",
        clinical_evidence_source="Fourth Universal Definition of Myocardial Infarction (ESC/ACC/AHA/WHF 2018)",
        signed_by_clinician_name="Dr. Vikram Sen, MD (Cardiology)",
        clinician_reg_no="MCI-48201",
    ),
    "RULE-HF-01-v1.0": RuleSignOffRecord(
        rule_id="RULE-HF-01-v1.0",
        version="1.0.0",
        rule_name="Acute Fluid Retention in Heart Failure",
        threshold_criteria="Weight gain >= 2.0 kg within 48 hours",
        clinical_evidence_source="2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure",
        signed_by_clinician_name="Dr. Sunita Rao, MD (Cardiology)",
        clinician_reg_no="MCI-39512",
    ),
    "RULE-EMERGENCY-01-v1.0": RuleSignOffRecord(
        rule_id="RULE-EMERGENCY-01-v1.0",
        version="1.0.0",
        rule_name="Hypertensive Crisis Emergency Fast-Path",
        threshold_criteria="Systolic BP >= 200 mmHg or Diastolic BP >= 120 mmHg",
        clinical_evidence_source="Emergency Cardiac Care Protocol 2024",
        signed_by_clinician_name="Dr. Vikram Sen, MD (Cardiology)",
        clinician_reg_no="MCI-48201",
    ),
}

# In-memory audit stores for demonstration & testing
OVERRIDE_AUDIT_LOG: List[ClinicianOverrideRecord] = []


def evaluate_emergency_red_flag(
    patient_id: str,
    systolic_bp: Optional[float] = None,
    diastolic_bp: Optional[float] = None,
    has_resting_chest_pain: bool = False,
    has_acute_shortness_of_breath: bool = False,
) -> Optional[EmergencyRedFlagAlert]:
    """
    Evaluates direct fast-path red flags (Gap 7).
    Bypasses standard routine queues and prompts immediate emergency action.
    """
    masked_id = f"PAT-***{patient_id[-3:]}" if len(patient_id) > 4 else f"***{patient_id}"

    # Critical Crisis Blood Pressure: SBP >= 200 or DBP >= 120
    if (systolic_bp is not None and systolic_bp >= 200.0) or (diastolic_bp is not None and diastolic_bp >= 120.0):
        sbp_str = f"{systolic_bp:.0f}" if systolic_bp else "--"
        dbp_str = f"{diastolic_bp:.0f}" if diastolic_bp else "--"
        return EmergencyRedFlagAlert(
            alert_id=f"EMERG-{datetime.now(timezone.utc).strftime('%H%M%S')}-{patient_id}",
            patient_id=patient_id,
            patient_masked_id=masked_id,
            trigger_criteria="Hypertensive Crisis Threshold Exceeded (SBP >= 200 or DBP >= 120)",
            measured_value=f"{sbp_str}/{dbp_str} mmHg",
            ambulance_routing_number="108",
            requires_immediate_transfer=True,
        )

    # Active Resting Angina with Acute Shortness of Breath
    if has_resting_chest_pain and has_acute_shortness_of_breath:
        return EmergencyRedFlagAlert(
            alert_id=f"EMERG-{datetime.now(timezone.utc).strftime('%H%M%S')}-{patient_id}",
            patient_id=patient_id,
            patient_masked_id=masked_id,
            trigger_criteria="Acute Resting Chest Pain with Accompanying Respiratory Distress",
            measured_value="Severe resting symptoms reported",
            ambulance_routing_number="108",
            requires_immediate_transfer=True,
        )

    return None


def record_clinician_override(
    alert_rule_id: str,
    patient_id: str,
    clinician_id: str,
    clinician_name: str,
    reason_code: OverrideReasonCode,
    clinical_rationale: str,
    previous_tier: str = "tier_1_acute",
) -> ClinicianOverrideRecord:
    """Records an audit-trailed clinician override of an active rule flag."""
    if not clinical_rationale or len(clinical_rationale.strip()) < 10:
        raise ValueError("Clinician override requires an explanatory clinical rationale of at least 10 characters.")

    record = ClinicianOverrideRecord(
        override_id=f"OVR-{len(OVERRIDE_AUDIT_LOG) + 1:04d}",
        alert_rule_id=alert_rule_id,
        patient_id=patient_id,
        clinician_id=clinician_id,
        clinician_name=clinician_name,
        reason_code=reason_code,
        clinical_rationale=clinical_rationale.strip(),
        previous_tier=previous_tier,
    )
    OVERRIDE_AUDIT_LOG.append(record)
    return record


def get_alert_quality_metrics() -> Dict[str, Any]:
    """Computes alert-quality metrics across all rules and overrides."""
    total_overrides = len(OVERRIDE_AUDIT_LOG)
    overrides_by_reason: Dict[str, int] = {}
    overrides_by_rule: Dict[str, int] = {}

    for ovr in OVERRIDE_AUDIT_LOG:
        overrides_by_reason[ovr.reason_code.value] = overrides_by_reason.get(ovr.reason_code.value, 0) + 1
        overrides_by_rule[ovr.alert_rule_id] = overrides_by_rule.get(ovr.alert_rule_id, 0) + 1

    return {
        "total_active_rules": len(GOVERNED_RULES),
        "total_overrides_logged": total_overrides,
        "overrides_by_reason": overrides_by_reason,
        "overrides_by_rule": overrides_by_rule,
        "governed_rules": [r.model_dump() for r in GOVERNED_RULES.values()],
    }
