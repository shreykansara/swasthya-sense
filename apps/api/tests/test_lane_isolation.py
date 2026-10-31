"""
Tests for Two-Lane Worklist Isolation & Prioritization (Gap 4).
Verifies strict mathematical separation between Clinical Lane and Administrative Lane.
"""

import pytest
from datetime import datetime, timezone, timedelta
from apps.api.app.services.triage import (
    PatientTriageInput,
    TriageLane,
    AlertTier,
    TriageReasonCode,
    evaluate_triage,
    generate_two_lane_worklist,
    mask_patient_id,
)


@pytest.fixture
def base_now():
    return datetime(2026, 11, 1, 12, 0, 0, tzinfo=timezone.utc)


def test_pure_administrative_overdue_routes_to_administrative_lane(base_now):
    """A patient with normal vitals who missed an appointment must route to Administrative Lane ONLY."""
    patient = PatientTriageInput(
        patient_id="PAT-HYP-101",
        patient_name="Ramesh Kumar",
        cohort="Cohort A: Hypertension with Lipids",
        next_scheduled_date=base_now - timedelta(days=10),
        grace_period_days=3,
        systolic_bp=128.0,
        diastolic_bp=82.0,
        heart_rate=72.0,
        troponin_i_ng_ml=0.01,
    )
    item = evaluate_triage(patient, now=base_now)
    assert item is not None
    assert item.lane == TriageLane.ADMINISTRATIVE
    assert item.tier == AlertTier.TIER_3_ROUTINE
    assert item.reason_code == TriageReasonCode.APPOINTMENT_OVERDUE
    assert item.days_overdue == 10  # 10 days past scheduled date
    assert "overdue by 10 days" in item.reason_description
    assert item.patient_masked_id == "PAT-***101"


def test_pure_clinical_hypertensive_urgency_routes_to_clinical_lane(base_now):
    """A patient on schedule but with SBP >= 180 must route to Clinical Lane ONLY."""
    patient = PatientTriageInput(
        patient_id="PAT-HF-204",
        patient_name="Sunita Devi",
        cohort="Cohort C: Heart Failure",
        next_scheduled_date=base_now + timedelta(days=5),
        grace_period_days=3,
        systolic_bp=188.0,
        diastolic_bp=112.0,
        heart_rate=88.0,
    )
    item = evaluate_triage(patient, now=base_now)
    assert item is not None
    assert item.lane == TriageLane.CLINICAL
    assert item.tier == AlertTier.TIER_1_ACUTE
    assert item.reason_code == TriageReasonCode.CRITICAL_SYSTOLIC_BP
    assert "Severely elevated systolic blood pressure" in item.reason_description
    assert item.days_overdue == 0


def test_both_acute_clinical_and_overdue_prioritizes_clinical_lane(base_now):
    """
    CRITICAL INVARIANT (Gap 4):
    If a patient is BOTH overdue AND exhibiting acute clinical deterioration,
    they MUST appear in the Clinical Priority Lane so their deterioration is not buried.
    """
    patient = PatientTriageInput(
        patient_id="PAT-POST-309",
        patient_name="Abdul Karim",
        cohort="Cohort B: Post-Event Discharge",
        next_scheduled_date=base_now - timedelta(days=14),
        grace_period_days=3,
        systolic_bp=195.0,
        diastolic_bp=115.0,
        troponin_i_ng_ml=0.08,  # Acute biomarker spike
        has_resting_chest_pain=True,
    )
    item = evaluate_triage(patient, now=base_now)
    assert item is not None
    assert item.lane == TriageLane.CLINICAL  # Precedence over administrative lateness
    assert item.tier == AlertTier.TIER_1_ACUTE
    assert item.reason_code == TriageReasonCode.ELEVATED_CARDIAC_BIOMARKER
    assert item.sla_deadline <= base_now + timedelta(hours=4)


def test_heart_failure_weight_gain_triggers_tier_2_subacute(base_now):
    """Rapid weight gain >= 2 kg in 48h for heart failure triggers Tier 2 clinical alert."""
    patient = PatientTriageInput(
        patient_id="PAT-HF-502",
        patient_name="Lakshmi Narayanan",
        cohort="Cohort C: Heart Failure",
        next_scheduled_date=base_now + timedelta(days=7),
        weight_delta_48h_kg=2.8,
    )
    item = evaluate_triage(patient, now=base_now)
    assert item is not None
    assert item.lane == TriageLane.CLINICAL
    assert item.tier == AlertTier.TIER_2_SUBACUTE
    assert item.reason_code == TriageReasonCode.RAPID_WEIGHT_GAIN
    assert "fluid accumulation" in item.reason_description


def test_two_lane_worklist_strict_separation_and_sorting(base_now):
    """
    Verify complete batch generation:
    - Zero administrative cases in Clinical Lane.
    - Zero acute clinical cases in Administrative Lane.
    - Proper ordering in both lanes.
    """
    patients = [
        # Patient 1: Clinical Tier 2 (Sub-acute BP)
        PatientTriageInput(
            patient_id="P1",
            patient_name="P1",
            cohort="Cohort A",
            systolic_bp=165.0,
            diastolic_bp=102.0,
        ),
        # Patient 2: Clinical Tier 1 (Troponin spike)
        PatientTriageInput(
            patient_id="P2",
            patient_name="P2",
            cohort="Cohort B",
            troponin_i_ng_ml=0.09,
        ),
        # Patient 3: Admin Overdue 12 days
        PatientTriageInput(
            patient_id="P3",
            patient_name="P3",
            cohort="Cohort A",
            next_scheduled_date=base_now - timedelta(days=15),
            grace_period_days=3,
        ),
        # Patient 4: Admin Overdue 4 days
        PatientTriageInput(
            patient_id="P4",
            patient_name="P4",
            cohort="Cohort C",
            next_scheduled_date=base_now - timedelta(days=7),
            grace_period_days=3,
        ),
        # Patient 5: Perfectly normal and on-schedule (no triage alert)
        PatientTriageInput(
            patient_id="P5",
            patient_name="P5",
            cohort="Cohort A",
            next_scheduled_date=base_now + timedelta(days=10),
            systolic_bp=120.0,
            diastolic_bp=80.0,
        ),
    ]

    worklist = generate_two_lane_worklist(patients, now=base_now)

    assert worklist.total_clinical_alerts == 2
    assert worklist.total_administrative_overdues == 2

    # Verify Clinical Lane
    assert len(worklist.clinical_lane) == 2
    assert worklist.clinical_lane[0].patient_id == "P2"  # Tier 1 acute must come first
    assert worklist.clinical_lane[0].tier == AlertTier.TIER_1_ACUTE
    assert worklist.clinical_lane[1].patient_id == "P1"  # Tier 2 subacute second
    assert worklist.clinical_lane[1].tier == AlertTier.TIER_2_SUBACUTE
    for item in worklist.clinical_lane:
        assert item.lane == TriageLane.CLINICAL

    # Verify Administrative Lane
    assert len(worklist.administrative_lane) == 2
    assert worklist.administrative_lane[0].patient_id == "P3"  # 15 days past scheduled
    assert worklist.administrative_lane[1].patient_id == "P4"  # 7 days past scheduled
    for item in worklist.administrative_lane:
        assert item.lane == TriageLane.ADMINISTRATIVE
        assert item.tier == AlertTier.TIER_3_ROUTINE

    # Zero cross-contamination assertion
    clinical_ids = {x.patient_id for x in worklist.clinical_lane}
    admin_ids = {x.patient_id for x in worklist.administrative_lane}
    assert clinical_ids.isdisjoint(admin_ids), "Clinical and Administrative lanes must be completely disjoint!"


def test_masked_patient_id():
    """Verify data minimization patient masking."""
    assert mask_patient_id("PAT-12345") == "PAT-***345"
    assert mask_patient_id("P01") == "***01"
