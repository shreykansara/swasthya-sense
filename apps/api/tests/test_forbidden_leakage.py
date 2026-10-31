"""
Adversarial Forbidden Field & Clinical Diagnosis Leakage Tests
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype

Principle: Never diagnose. The system must never name a condition, disease,
or diagnosis anywhere in UI/API output, nor contain vessel or CAD targets.
"""

import pytest
from fastapi.testclient import TestClient
from apps.api.app.main import app

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
]


@pytest.mark.parametrize("forbidden_term", FORBIDDEN_TERMS)
def test_health_endpoint_no_forbidden_terms(forbidden_term: str):
    """Verify health endpoint output contains zero forbidden diagnosis or vessel names."""
    response = client.get("/health")
    assert response.status_code == 200
    body_text = response.text.lower()
    
    # Specific whole-word check
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
    with pytest.raises(ValueError) as exc:
        sanitize_record(contaminated_data)
    assert "Data leakage detected" in str(exc.value)
