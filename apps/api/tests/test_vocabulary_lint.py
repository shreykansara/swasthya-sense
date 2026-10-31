"""
Tests for Vocabulary & Diagnostic Term Lint (Phase 0).
Asserts that the system strictly adheres to the non-diagnostic constraint:
"Do not claim to diagnose disease. Risk rules must be transparent and labelled as a prototype, with clinician oversight."
"""

import re
from pathlib import Path
from apps.api.app.services.triage import (
    PatientTriageInput,
    evaluate_triage,
    generate_two_lane_worklist,
    TriageReasonCode,
)

# Forbidden diagnostic phrases that should NEVER appear in decision-support outputs
FORBIDDEN_DIAGNOSTIC_PATTERNS = [
    r"\bdiagnosed with\b",
    r"\bwe diagnose\b",
    r"\bconfirms myocardial infarction\b",
    r"\bpatient has cad\b",
    r"\bpositive for coronary artery disease\b",
    r"\bdefinite diagnosis\b",
    r"\bconclusive diagnosis\b",
    r"\bclinical diagnosis confirmed\b",
    r"\bstenosis present\b",
]

# Mandatory prototype & decision support disclaimer strings
MANDATORY_DISCLAIMER_SNIPPETS = [
    "Decision support only",
    "Not for primary clinical diagnosis",
    "prototype",
]


def test_triage_descriptions_contain_zero_diagnostic_claims():
    """Verify that every reason description in the triage service uses descriptive physiological terms."""
    # Test across multiple boundary patients
    test_inputs = [
        PatientTriageInput(patient_id="1", patient_name="Test", cohort="Cohort A", systolic_bp=190.0),
        PatientTriageInput(patient_id="2", patient_name="Test", cohort="Cohort B", troponin_i_ng_ml=0.15),
        PatientTriageInput(patient_id="3", patient_name="Test", cohort="Cohort C", weight_delta_48h_kg=3.5),
        PatientTriageInput(patient_id="4", patient_name="Test", cohort="Cohort A", has_resting_chest_pain=True),
        PatientTriageInput(patient_id="5", patient_name="Test", cohort="Cohort B", heart_rate=135.0),
    ]

    for patient in test_inputs:
        item = evaluate_triage(patient)
        assert item is not None
        desc = item.reason_description.lower()
        for pattern in FORBIDDEN_DIAGNOSTIC_PATTERNS:
            match = re.search(pattern, desc)
            assert match is None, f"Forbidden diagnostic claim matching '{pattern}' found in triage description: '{item.reason_description}'"


def test_ui_footer_contains_mandatory_disclaimer():
    """Verify FooterDisclaimer component contains the mandatory regulatory disclaimer."""
    ui_footer_path = Path("apps/web/src/components/ui/FooterDisclaimer.tsx")
    assert ui_footer_path.exists(), "FooterDisclaimer.tsx must exist"
    
    content = ui_footer_path.read_text(encoding="utf-8").lower()
    assert "decision support only" in content
    assert "not for primary clinical diagnosis" in content or "not constitute formal medical diagnosis" in content


def test_frontend_risk_labels_are_framed_as_estimates():
    """Verify RiskLabel and viewer config frames risk numerically or as decision support."""
    risk_label_path = Path("apps/web/src/components/ui/RiskLabel.tsx")
    assert risk_label_path.exists(), "RiskLabel.tsx must exist"
    
    content = risk_label_path.read_text(encoding="utf-8").lower()
    for pattern in FORBIDDEN_DIAGNOSTIC_PATTERNS:
        assert re.search(pattern, content) is None, f"Forbidden diagnostic term '{pattern}' found in RiskLabel.tsx"
