"""
Tests for Rule Governance, Clinician Overrides, and Emergency Fast-Path (Phase 4).
"""

import pytest
from apps.api.app.services.rule_governance import (
    GOVERNED_RULES,
    OverrideReasonCode,
    record_clinician_override,
    evaluate_emergency_red_flag,
    get_alert_quality_metrics,
    OVERRIDE_AUDIT_LOG,
)


def test_governed_rules_have_clinician_sign_off():
    """Verify all production rules possess a registered physician sign-off."""
    assert len(GOVERNED_RULES) >= 4
    for rule_id, rule in GOVERNED_RULES.items():
        assert rule.rule_id == rule_id
        assert rule.signed_by_clinician_name.startswith("Dr.")
        assert rule.clinician_reg_no.startswith("MCI-")
        assert len(rule.threshold_criteria) > 0
        assert len(rule.clinical_evidence_source) > 0


def test_emergency_red_flag_triggers_on_crisis_vitals():
    """
    DONE WHEN: Triggering an emergency vital creates an immediate red-flag banner (Gap 7).
    """
    # SBP >= 200 mmHg triggers emergency red-flag
    alert = evaluate_emergency_red_flag(
        patient_id="PAT-EMERG-01",
        systolic_bp=205.0,
        diastolic_bp=122.0,
    )
    assert alert is not None
    assert alert.is_emergency is True
    assert alert.requires_immediate_transfer is True
    assert alert.ambulance_routing_number == "108"
    assert "Hypertensive Crisis" in alert.trigger_criteria
    assert alert.patient_masked_id == "PAT-***-01"

    # Resting pain + acute shortness of breath triggers emergency red-flag
    alert_symptom = evaluate_emergency_red_flag(
        patient_id="PAT-EMERG-02",
        has_resting_chest_pain=True,
        has_acute_shortness_of_breath=True,
    )
    assert alert_symptom is not None
    assert alert_symptom.is_emergency is True
    assert "Acute Resting Chest Pain" in alert_symptom.trigger_criteria


def test_clinician_override_recording_and_audit():
    """
    DONE WHEN: Overriding any alert requires an audit-trailed reason code.
    """
    OVERRIDE_AUDIT_LOG.clear()

    rec = record_clinician_override(
        alert_rule_id="RULE-BP-01-v1.0",
        patient_id="PAT-HYP-101",
        clinician_id="DOC-01",
        clinician_name="Dr. Vikram Sen",
        reason_code=OverrideReasonCode.BASELINE_ABNORMALITY,
        clinical_rationale="Patient has chronic long-standing stage 2 hypertension. Already initiated on triple therapy; follow-up scheduled in 48h.",
    )

    assert rec.override_id == "OVR-0001"
    assert rec.reason_code == OverrideReasonCode.BASELINE_ABNORMALITY
    assert "triple therapy" in rec.clinical_rationale
    assert len(OVERRIDE_AUDIT_LOG) == 1

    # Quality metrics reflection
    metrics = get_alert_quality_metrics()
    assert metrics["total_overrides_logged"] == 1
    assert metrics["overrides_by_reason"]["BASELINE_ABNORMALITY"] == 1
    assert metrics["overrides_by_rule"]["RULE-BP-01-v1.0"] == 1


def test_clinician_override_rejects_missing_rationale():
    """Override must be rejected if clinical rationale is omitted or too brief."""
    with pytest.raises(ValueError, match="explanatory clinical rationale"):
        record_clinician_override(
            alert_rule_id="RULE-BIO-01-v1.0",
            patient_id="PAT-101",
            clinician_id="DOC-01",
            clinician_name="Dr. Sen",
            reason_code=OverrideReasonCode.FALSE_POSITIVE,
            clinical_rationale="Short",  # under 10 chars
        )
