"""
Synthetic Clinical Generator Unit & Integrity Tests
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype
"""

import json
from pathlib import Path
import pytest
import yaml

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
SYNTHETIC_DIR = ROOT_DIR / "synthetic"
CATALOG_PATH = SYNTHETIC_DIR / "value_catalog.yaml"
PATIENTS_JSON = SYNTHETIC_DIR / "synthetic_patients.json"
MANIFEST_JSON = SYNTHETIC_DIR / "reports" / "manifest.json"


def test_value_catalog_schema():
    """Verify value_catalog.yaml structure and clinical ranges."""
    assert CATALOG_PATH.exists()
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    catalogs = data["catalogs"]
    assert len(catalogs) >= 10

    for c in catalogs:
        assert "id" in c
        assert "name" in c
        assert "unit" in c
        assert "reference_range" in c
        assert c["reference_range"]["low"] <= c["reference_range"]["high"]
        assert c["plausible_range"]["min"] <= c["plausible_range"]["max"]
        assert len(c["cohorts"]) >= 1


def test_synthetic_patients_count_and_distribution():
    """Verify 120 synthetic patients (40 per cohort) with longitudinal visits."""
    assert PATIENTS_JSON.exists()
    with open(PATIENTS_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    patients = data["patients"]
    visits = data["visits"]
    truth = data["synthetic_truth"]

    assert len(patients) == 120
    assert len(truth) == 120
    assert len(visits) > 800

    cohort_counts = {}
    for p in patients:
        cid = p["cohort_id"]
        cohort_counts[cid] = cohort_counts.get(cid, 0) + 1
        assert p["phone_masked"].startswith("+91")
        assert "XXX-XX" in p["phone_masked"]

    assert cohort_counts == {
        "hypertension_lipids": 40,
        "post_event_discharge": 40,
        "heart_failure": 40,
    }


def test_synthetic_truth_labels():
    """Verify ground truth labels exist for Phase 16 alert evaluation."""
    with open(PATIENTS_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    for item in data["synthetic_truth"]:
        assert item["ground_truth_label"] in (
            "urgent_clinical_review",
            "soon_clinical_review",
            "administrative_overdue",
            "stable_routine",
        )
        assert item["expected_tier"] in ("urgent", "soon", "routine")


def test_reports_manifest_and_files():
    """Verify 9 report files generated and mapped in manifest.json."""
    assert MANIFEST_JSON.exists()
    with open(MANIFEST_JSON, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    assert len(manifest) == 9

    for fname, meta in manifest.items():
        fpath = SYNTHETIC_DIR / "reports" / fname
        assert fpath.exists(), f"Report file {fname} not found"
        assert fpath.stat().st_size > 1000
        assert len(meta["expected_values"]) >= 5
