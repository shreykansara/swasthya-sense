"""
Tests for Check-ins, Schedule Templates, and Escalation Ladder (Phase 3).
"""

from datetime import datetime, timezone, timedelta
from apps.api.app.services.schedule_templates import (
    get_all_templates,
    get_template,
    update_template,
    determine_escalation_step,
    DEFAULT_SCHEDULES,
)
from apps.api.app.services.triage import (
    PatientTriageInput,
    evaluate_triage,
    TriageLane,
    AlertTier,
    TriageReasonCode,
)
from apps.api.app.schemas.check_in import (
    PatientCheckInCreate,
    CheckInVitals,
    CheckInSymptoms,
)


def test_default_templates_contain_escalation_steps():
    """Verify all 3 cohorts have configured schedule templates with escalation ladders."""
    templates = get_all_templates()
    assert len(templates) >= 3

    cohort_a = get_template("cohort_a")
    assert cohort_a is not None
    assert cohort_a.grace_period_days == 3
    assert len(cohort_a.escalation_steps) == 4

    step1 = cohort_a.escalation_steps[0]
    assert step1.channel == "whatsapp"
    assert step1.days_overdue == 0

    step4 = cohort_a.escalation_steps[3]
    assert step4.channel == "supervisor_alert"
    assert step4.days_overdue == 8


def test_admin_modifying_grace_period_recalculates_overdue_state():
    """
    DONE WHEN: An administrator modifies a cohort's grace period from 3 to 5 days,
    and a patient 4 days past scheduled date transitions from OVERDUE to IN_GRACE.
    """
    now = datetime(2026, 11, 5, 12, 0, 0, tzinfo=timezone.utc)
    scheduled = now - timedelta(days=4)  # 4 days past scheduled date

    # Initial state: Grace period is 3 days -> 4 days is OVERDUE
    update_template("cohort_a", grace_period_days=3)
    template = get_template("cohort_a")
    assert template.grace_period_days == 3

    patient = PatientTriageInput(
        patient_id="PAT-ADMIN-01",
        patient_name="Test Patient",
        cohort="Cohort A: Hypertension with Lipids",
        next_scheduled_date=scheduled,
        grace_period_days=template.grace_period_days,
        systolic_bp=124.0,
        diastolic_bp=80.0,
    )
    item_before = evaluate_triage(patient, now=now)
    assert item_before is not None
    assert item_before.lane == TriageLane.ADMINISTRATIVE
    assert item_before.reason_code == TriageReasonCode.APPOINTMENT_OVERDUE

    # Admin updates grace period to 5 days -> 4 days is now within grace period!
    update_template("cohort_a", grace_period_days=5)
    template_updated = get_template("cohort_a")
    assert template_updated.grace_period_days == 5

    patient.grace_period_days = template_updated.grace_period_days
    item_after = evaluate_triage(patient, now=now)
    assert item_after is not None
    assert item_after.lane == TriageLane.ADMINISTRATIVE
    assert item_after.reason_code == TriageReasonCode.GRACE_PERIOD_EXPIRING  # Now within grace period, not yet overdue!


def test_escalation_ladder_progression():
    """Verify that days overdue maps to the correct escalation tier."""
    # Day 0: Automated message
    step_0 = determine_escalation_step("cohort_a", days_overdue=0)
    assert step_0 is not None
    assert step_0.step_number == 1
    assert step_0.channel == "whatsapp"

    # Day 3: Frontline phone call
    step_3 = determine_escalation_step("cohort_a", days_overdue=3)
    assert step_3 is not None
    assert step_3.step_number == 2
    assert step_3.channel == "phone_call"

    # Day 6: Home visit
    step_6 = determine_escalation_step("cohort_a", days_overdue=6)
    assert step_6 is not None
    assert step_6.step_number == 3
    assert step_6.channel == "field_visit"

    # Day 10: Supervisor alert
    step_10 = determine_escalation_step("cohort_a", days_overdue=10)
    assert step_10 is not None
    assert step_10.step_number == 4
    assert step_10.channel == "supervisor_alert"


def test_structured_check_in_vitals_validation():
    """Verify check-in schema validates physiological ranges."""
    check_in = PatientCheckInCreate(
        patient_id="PAT-101",
        worker_id="ASHA-01",
        vitals=CheckInVitals(
            systolic_bp=142.0,
            diastolic_bp=90.0,
            heart_rate=78.0,
            weight_kg=68.5,
            blood_glucose_mg_dl=110.0,
        ),
        symptoms=CheckInSymptoms(
            has_chest_pain=False,
            has_shortness_of_breath=False,
            medication_adherent=True,
        ),
    )
    assert check_in.vitals.systolic_bp == 142.0
    assert check_in.symptoms.medication_adherent is True

