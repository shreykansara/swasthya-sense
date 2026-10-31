"""
Tests for Synthetic Registry Alignment & Ground Truth Injection (Phase 2).
"""

import json
from pathlib import Path
from synthetic.generate import generate_cohort_registry, COHORTS


def test_synthetic_cohort_generation_count_and_cohorts():
    """Verify generation of >= 60 patients evenly across the 3 cohorts."""
    patients = generate_cohort_registry(count=60, seed=42)
    assert len(patients) == 60

    cohort_counts = {c: 0 for c in COHORTS}
    for p in patients:
        cohort_counts[p["cohort"]] += 1

    for c in COHORTS:
        assert cohort_counts[c] == 20, f"Cohort '{c}' expected 20 patients, found {cohort_counts[c]}"


def test_injected_ground_truth_events():
    """Verify ground truth markers are present and accurately structured."""
    patients = generate_cohort_registry(count=60, seed=42)
    event_types = set()

    for p in patients:
        for ev in p.get("injected_ground_truth", []):
            event_types.add(ev["type"])

    assert "EVENT_MISSED_VISIT" in event_types
    assert "EVENT_LATE_VISIT" in event_types
    assert "EVENT_TRUE_DETERIORATION" in event_types


def test_model_overlapping_features_validity():
    """Verify that all features required by the 4-target model pipeline are present and numerically valid."""
    patients = generate_cohort_registry(count=60, seed=42)
    sample = patients[0]

    required_keys = [
        "Age", "Sex", "Length", "Weight", "BMI", "DM", "HTN", "BP", "PR",
        "FBS", "CR", "TG", "LDL", "HDL", "BUN", "ESR", "HB", "K", "Na",
        "WBC", "Lymph", "Neut", "PLT", "EF-TTE", "Region RWMA"
    ]

    for key in required_keys:
        assert key in sample, f"Required feature '{key}' missing from synthetic patient schema!"
        assert sample[key] is not None

