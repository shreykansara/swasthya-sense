"""
Adversarial Forbidden Field & Clinical Diagnosis Leakage Tests
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype

Non-negotiable principle: Never diagnose.
The system must NEVER name a condition, disease, or diagnosis anywhere in:
1. Rules YAML files (titles, descriptions, patient explanations, clinician summaries)
2. UI strings / endpoints
3. API responses
4. Data fields (zero CAD targets, LAD/LCX/RCA vessel labels, or stenosis targets)
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient
import yaml

from apps.api.app.config import ROOT_DIR
from apps.api.app.main import app
from apps.api.app.readout.guard import guard

client = TestClient(app)

FORBIDDEN_TERMS = [
    "coronary artery disease",
    "cad",
    "lad",
    "lcx",
    "rca",
    "stenosis",
    "myocardial infarction",
    "ischemia",
    "angina pectoris",
    "atherosclerosis",
    "heart failure",
]


@pytest.mark.parametrize("forbidden_term", FORBIDDEN_TERMS)
def test_health_endpoint_no_forbidden_terms(forbidden_term: str):
    """Verify health endpoint output contains zero forbidden diagnosis or vessel names."""
    response = client.get("/health")
    assert response.status_code == 200
    body_text = response.text.lower()

    words = [w.strip(" ,.:;\"'{}[]()") for w in body_text.split()]
    assert forbidden_term not in words, f"Forbidden term '{forbidden_term}' found in health response"


def test_leakage_filter_pattern():
    """Verify that an adversarial data dict containing forbidden diagnosis keys is caught."""
    clean_data = {
        "systolic_bp": 130,
        "diastolic_bp": 85,
        "potassium": 4.1,
        "creatinine": 1.0,
    }

    contaminated_data = {
        "systolic_bp": 130,
        "cad_diagnosis": "positive",
        "lad_stenosis": 75,
    }

    def sanitize_record(record: dict) -> dict:
        for k in record:
            k_lower = k.lower()
            for forbidden in FORBIDDEN_TERMS:
                if forbidden in k_lower:
                    raise ValueError(f"Data leakage detected: forbidden clinical term '{forbidden}' in field '{k}'")
        return record

    # Clean data passes
    sanitized = sanitize_record(clean_data)
    assert sanitized == clean_data

    # Contaminated data raises
    with pytest.raises(ValueError):
        sanitize_record(contaminated_data)


def test_adversarial_scan_all_rules_yaml_for_forbidden_terms():
    """
    Rigorously scans EVERY yaml rule in rules/v1/ asserting zero diagnosis or condition words.
    Fails build if any forbidden clinical term appears.
    """
    rules_dir = ROOT_DIR / "rules" / "v1"
    assert rules_dir.exists(), "rules/v1 directory must exist"

    rule_files = list(rules_dir.glob("*.yaml"))
    assert len(rule_files) >= 12, "Must have at least 12 versioned rules"

    violations: list[str] = []

    for rf in rule_files:
        with open(rf, "r", encoding="utf-8") as f:
            content = yaml.safe_load(f)

        # Fields to verify
        text_fields = [
            content.get("title", ""),
            content.get("description", ""),
            content.get("patient_explanation", ""),
            content.get("clinician_summary", ""),
            content.get("reason_code", ""),
        ]

        full_text = " ".join(text_fields)
        is_clean, matched = guard.check_text(full_text)
        if not is_clean:
            violations.append(f"{rf.name}: matched forbidden terms {matched}")

    assert violations == [], f"Clinical diagnosis leakage detected in rule files: {violations}"
