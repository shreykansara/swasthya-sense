"""
Tests for Privacy Hardening, PII De-identification, and Append-Only Audit (Phase 5).
"""

import pytest
from apps.api.app.services.privacy_guard import (
    PrivacyGuard,
    ImmutableAuditException,
    log_access_event,
    get_patient_access_log,
    _AUDIT_STORE,
)


def test_groq_llm_input_pii_deidentification():
    """
    DONE WHEN: De-identify Groq inputs (Gap 8).
    Verify that patient name, phone number, patient ID, and ABHA ID are sanitized.
    """
    raw_prompt = (
        "Generate clinical readout for patient Ramesh Kumar (ID: PAT-1048), "
        "Phone: +91-9876543210, ABHA: 14-4829-1920-5821. "
        "BP measured was 142/90 mmHg, resting heart rate was 76 bpm."
    )

    sanitized = PrivacyGuard.deidentify_text_for_llm(raw_prompt, patient_name="Ramesh Kumar")

    assert "Ramesh Kumar" not in sanitized
    assert "[PATIENT]" in sanitized

    assert "9876543210" not in sanitized
    assert "[PHONE]" in sanitized

    assert "PAT-1048" not in sanitized
    assert "[PATIENT_ID]" in sanitized

    assert "14-4829-1920-5821" not in sanitized
    assert "[ABHA_ID]" in sanitized

    # Clinical physiological values MUST be preserved!
    assert "142/90" in sanitized
    assert "76" in sanitized


def test_patient_erasure_and_minimization_on_consent_revocation():
    """Verify retention and erasure flow removes direct identifiers upon consent revocation."""
    patient = {
        "patient_id": "PAT-2026",
        "full_name": "Sunita Devi",
        "masked_phone": "+91-XXXXX-9821",
        "cohort": "Cohort C: Heart Failure",
        "automated_messaging_enabled": True,
    }

    erased = PrivacyGuard.execute_patient_erasure(patient, requested_by="PAT-2026")

    assert erased["full_name"] == "[ERASED_ON_REVOCATION]"
    assert erased["masked_phone"] == "[ERASED]"
    assert erased["consent_status"] == "REVOKED"
    assert erased["automated_messaging_enabled"] is False
    assert "erased_at" in erased

    # Verify erasure action was recorded in the audit trail
    history = get_patient_access_log("PAT-2026")
    assert len(history) >= 1
    assert any(h.action_type == "ERASE_RECORD" for h in history)


def test_append_only_audit_log_rejects_modifications():
    """Verify audit log records cannot be modified or deleted."""
    entry = log_access_event(
        patient_id="PAT-501",
        actor_id="ASHA-02",
        actor_name="Pooja Sharma",
        actor_role="worker",
        action_type="VIEW_RECORD",
        purpose_of_access="Routine home check-in follow-up",
    )

    assert entry.action_type == "VIEW_RECORD"

    # Attempting to update or delete must raise ImmutableAuditException
    with pytest.raises(ImmutableAuditException, match="Audit log is strictly append-only"):
        entry.update(purpose_of_access="Tampered purpose")

    with pytest.raises(ImmutableAuditException, match="Audit log is strictly append-only"):
        entry.delete()

