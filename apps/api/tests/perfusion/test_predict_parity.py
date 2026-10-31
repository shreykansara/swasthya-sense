"""
Perfusion Predict Parity Tests
Verifies mathematical parity against ground truth predictions across clinical presets.
"""

import json
from pathlib import Path
import pytest

from apps.api.app.perfusion.schemas import PatientInputSchema
from apps.api.app.perfusion.service import predict_patient

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / "app" / "perfusion" / "tests_fixtures"

EXPECTED_PREDICTIONS = {
    "normal": {
        "cad": 0.1311,
        "lad": 0.1246,
        "lcx": 0.1398,
        "rca": 0.1379,
        "high_risk": [],
        "risk_tiers": {"cad": "LOW", "lad": "LOW", "lcx": "LOW", "rca": "LOW"},
    },
    "high_risk_lad": {
        "cad": 0.9461,
        "lad": 0.9062,
        "lcx": 0.2181,
        "rca": 0.2285,
        "high_risk": ["LAD"],
        "risk_tiers": {"cad": "CRITICAL", "lad": "CRITICAL", "lcx": "LOW", "rca": "LOW"},
    },
    "rca_ischemia": {
        "cad": 0.9213,
        "lad": 0.3650,
        "lcx": 0.4486,
        "rca": 0.8250,
        "high_risk": ["LCX", "RCA"],
        "risk_tiers": {"cad": "CRITICAL", "lad": "LOW", "lcx": "BORDERLINE", "rca": "CRITICAL"},
    },
    "triple_vessel": {
        "cad": 0.9637,
        "lad": 0.8935,
        "lcx": 0.7800,
        "rca": 0.8200,
        "high_risk": ["LAD", "LCX", "RCA"],
        "risk_tiers": {"cad": "CRITICAL", "lad": "CRITICAL", "lcx": "CRITICAL", "rca": "CRITICAL"},
    },
}


@pytest.mark.parametrize("preset_key", ["normal", "high_risk_lad", "rca_ischemia", "triple_vessel"])
def test_preset_prediction_parity(preset_key: str):
    """Asserts that inference probabilities match ground truth within 1e-4 rounding."""
    preset_path = FIXTURES_DIR / f"{preset_key}.json"
    assert preset_path.exists(), f"Missing preset fixture: {preset_path}"

    with open(preset_path, "r", encoding="utf-8") as f:
        doc = json.load(f)

    patient = PatientInputSchema(**doc["data"])
    res = predict_patient(patient)

    expected = EXPECTED_PREDICTIONS[preset_key]

    assert abs(res.overall_cad.probability - expected["cad"]) < 1e-4
    assert abs(res.vessels["lad"].probability - expected["lad"]) < 1e-4
    assert abs(res.vessels["lcx"].probability - expected["lcx"]) < 1e-4
    assert abs(res.vessels["rca"].probability - expected["rca"]) < 1e-4

    assert res.high_risk_vessels == expected["high_risk"]
    assert res.overall_cad.risk_tier.value == expected["risk_tiers"]["cad"]
    assert res.vessels["lad"].risk_tier.value == expected["risk_tiers"]["lad"]
    assert res.vessels["lcx"].risk_tier.value == expected["risk_tiers"]["lcx"]
    assert res.vessels["rca"].risk_tier.value == expected["risk_tiers"]["rca"]
