"""
Unit & Integration Tests for Clinical Rule Engine & Why-Flagged Subsystem
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype

Verifies:
1. Pure Python evaluation: rule conditions, urgency tiers, reason codes.
2. Sign-off governance: unsigned rules never execute.
3. Waterfall contribution calculation (delta & divergence score).
4. Report confirmation triggers case flag generation.
5. Clinician override of flag urgency with mandatory audit reason.
6. RBAC on rule administration and overrides.
"""

from datetime import datetime, timezone
import uuid
import pytest
from fastapi.testclient import TestClient
import jwt

from apps.api.app.config import settings
from apps.api.app.consent import reset_consent_store, store_consent_record
from apps.api.app.extraction.models import ExtractedAnalyte
from apps.api.app.extraction.service import extraction_service
from apps.api.app.main import app
from apps.api.app.rules.engine import rule_engine
from apps.api.app.rules.models import (
    AnalyteMeasurement,
    ClinicalRule,
    PatientEvaluationContext,
    RuleCondition,
)
from apps.api.app.rules.service import reset_case_flags_store, case_flag_service

client = TestClient(app)
SECRET = settings.SUPABASE_JWT_SECRET or "super-secret-jwt-token-with-at-least-32-characters-long"


def create_token(role: str, user_id: str | None = None, email: str | None = None) -> str:
    payload = {
        "sub": user_id or str(uuid.uuid4()),
        "aud": "authenticated",
        "email": email or f"{role}@swasthya.test",
        "app_metadata": {"role": role},
        "user_metadata": {"role": role},
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def setup_function():
    reset_consent_store()
    reset_case_flags_store()
    rule_engine.load_rules()


def test_rule_catalog_loaded_and_valid():
    """All rules in rules/v1 are loaded and pass strict schema validation."""
    assert len(rule_engine.rules) >= 14
    for r in rule_engine.rules:
        assert r.rule_id.startswith("RULE-")
        assert r.urgency in ["urgent", "soon", "routine"]
        assert len(r.conditions) > 0
        assert r.reason_code.isupper()
        assert r.patient_explanation
        assert r.clinician_summary


def test_pure_rule_engine_acute_troponin_rise():
    """Troponin I > 0.04 triggers urgent tier with why-flagged divergence score."""
    patient_id = uuid.uuid4()
    ctx = PatientEvaluationContext(
        patient_id=patient_id,
        cohort="any",
        current_values=[
            AnalyteMeasurement(analyte_key="troponin_i", value=0.12, unit="ng/mL"),
            AnalyteMeasurement(analyte_key="potassium", value=4.5, unit="mEq/L"),
        ],
    )

    result = rule_engine.evaluate(ctx)
    assert result.highest_urgency == "urgent"
    matched_ids = [m.rule_id for m in result.matched_rules]
    assert "RULE-TROP-001" in matched_ids

    trop_match = next(m for m in result.matched_rules if m.rule_id == "RULE-TROP-001")
    assert trop_match.contributions[0].analyte == "troponin_i"
    assert trop_match.contributions[0].current_value == 0.12
    assert trop_match.contributions[0].threshold == 0.04
    assert trop_match.contributions[0].divergence_score == pytest.approx(0.08, 0.001)


def test_pure_rule_engine_hyperkalemia_and_hypokalemia():
    """Potassium >= 5.5 triggers urgent hyperkalemia; < 3.5 triggers urgent hypokalemia."""
    patient_id = uuid.uuid4()

    # 1. High potassium
    ctx_high = PatientEvaluationContext(
        patient_id=patient_id,
        cohort="any",
        current_values=[AnalyteMeasurement(analyte_key="potassium", value=5.8, unit="mEq/L")],
    )
    res_high = rule_engine.evaluate(ctx_high)
    assert res_high.highest_urgency == "urgent"
    assert any(m.rule_id == "RULE-K-HYPER-001" for m in res_high.matched_rules)

    # 2. Low potassium
    ctx_low = PatientEvaluationContext(
        patient_id=patient_id,
        cohort="any",
        current_values=[AnalyteMeasurement(analyte_key="potassium", value=3.1, unit="mEq/L")],
    )
    res_low = rule_engine.evaluate(ctx_low)
    assert res_low.highest_urgency == "urgent"
    assert any(m.rule_id == "RULE-K-HYPO-001" for m in res_low.matched_rules)


def test_pure_rule_engine_sudden_weight_jump_with_history():
    """Weight gain >= 2.0 kg in <= 3 days triggers urgent tier based on delta."""
    patient_id = uuid.uuid4()
    ctx = PatientEvaluationContext(
        patient_id=patient_id,
        cohort="cohort_c",
        current_values=[
            AnalyteMeasurement(analyte_key="body_weight", value=74.5, unit="kg"),
        ],
        historical_values=[
            AnalyteMeasurement(analyte_key="body_weight", value=71.8, unit="kg"),
        ],
    )

    result = rule_engine.evaluate(ctx)
    assert result.highest_urgency == "urgent"
    wt_match = next((m for m in result.matched_rules if m.rule_id == "RULE-WT-JUMP-001"), None)
    assert wt_match is not None
    assert wt_match.contributions[0].delta == pytest.approx(2.7, 0.01)
    assert wt_match.contributions[0].divergence_score == pytest.approx(0.7, 0.01)


def test_sign_off_governance_blocks_unsigned_rule():
    """Rules without signed_off_by are strictly skipped during evaluation."""
    test_rule = ClinicalRule(
        rule_id="RULE-TEST-UNSIGNED",
        version="1.0",
        title="Unsigned Experimental Rule",
        description="Testing unsigned rule governance",
        cohort="any",
        urgency="urgent",
        reason_code="EXPERIMENTAL_TRIGGER",
        conditions=[RuleCondition(analyte="potassium", operator=">", threshold=4.0, unit="mEq/L")],
        patient_explanation="Test explanation",
        clinician_summary="Test summary",
        signed_off_by=None,  # Not signed off
        signed_off_at=None,
    )

    rule_engine.rules.append(test_rule)
    ctx = PatientEvaluationContext(
        patient_id=uuid.uuid4(),
        cohort="any",
        current_values=[AnalyteMeasurement(analyte_key="potassium", value=4.5, unit="mEq/L")],
    )

    result = rule_engine.evaluate(ctx)
    matched_ids = [m.rule_id for m in result.matched_rules]
    assert "RULE-TEST-UNSIGNED" not in matched_ids


def test_report_confirmation_persists_case_flags():
    """When human confirms report values, rules evaluate and case flags are persisted."""
    patient_id = uuid.uuid4()
    worker_id = uuid.uuid4()
    token = create_token("health_worker", user_id=str(worker_id))
    headers = {"Authorization": f"Bearer {token}"}

    # Grant consent
    store_consent_record(patient_id=patient_id, scope="data_storage", captured_by=worker_id)
    store_consent_record(patient_id=patient_id, scope="report_upload", captured_by=worker_id)

    # Create dummy upload record
    upload = extraction_service.create_upload_record(
        patient_id=patient_id,
        file_name="test.pdf",
        mime_type="application/pdf",
        file_bytes=b"%PDF dummy",
        actor_id=worker_id,
    )
    upload.status = "needs_confirmation"

    # Add extracted analyte with critical SBP of 185
    upload.extracted_values.append(
        ExtractedAnalyte(
            upload_id=upload.id,
            analyte_id="systolic_bp",
            analyte_name="Systolic BP",
            raw_text="185",
            value=185.0,
            unit="mmHg",
            reference_low=90.0,
            reference_high=120.0,
        )
    )

    confirm_payload = {
        "confirmed_values": [
            {
                "analyte_id": "systolic_bp",
                "confirmed_value": 185.0,
            }
        ]
    }

    # Post confirmation
    res = client.post(f"/api/v1/reports/{upload.id}/confirm", headers=headers, json=confirm_payload)
    assert res.status_code == 200

    # Fetch patient's case flags
    flags_res = client.get(f"/api/v1/patients/{patient_id}/case-flags", headers=headers)
    assert flags_res.status_code == 200
    flags = flags_res.json()
    assert len(flags) > 0

    sbp_flag = next((f for f in flags if f["rule_id"] == "RULE-SBP-CRIT-001"), None)
    assert sbp_flag is not None
    assert sbp_flag["urgency"] == "urgent"
    assert sbp_flag["status"] == "open"
    assert sbp_flag["patient_id"] == str(patient_id)
    assert len(sbp_flag["contributions"]) > 0


def test_clinician_override_workflow():
    """Clinician can override a flag urgency tier with a mandatory reason."""
    patient_id = uuid.uuid4()
    clinician_id = uuid.uuid4()
    clinician_token = create_token("clinician", user_id=str(clinician_id))
    clinician_headers = {"Authorization": f"Bearer {clinician_token}"}

    # Manually create a case flag via service
    dummy_extracted = [
        ExtractedAnalyte(
            upload_id=uuid.uuid4(),
            analyte_id="troponin_i",
            analyte_name="Troponin I",
            raw_text="0.09",
            value=0.09,
            confirmed_value=0.09,
            confirmed_at=datetime.now(timezone.utc),
            unit="ng/mL",
            confidence=0.99,
        )
    ]
    created = case_flag_service.evaluate_and_persist_flags(
        patient_id=patient_id,
        upload_id=None,
        confirmed_values=dummy_extracted,
    )
    flag = created[0]
    assert flag.urgency == "urgent"

    # 1. Non-clinician cannot override (e.g. patient)
    patient_token = create_token("patient", user_id=str(patient_id))
    patient_res = client.post(
        f"/api/v1/case-flags/{flag.id}/override",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={"new_urgency": "soon", "reason": "Patient tries to downgrade"},
    )
    assert patient_res.status_code == 403

    # 2. Blank reason is rejected
    blank_res = client.post(
        f"/api/v1/case-flags/{flag.id}/override",
        headers=clinician_headers,
        json={"new_urgency": "soon", "reason": ""},
    )
    assert blank_res.status_code == 400

    # 3. Valid clinician override succeeds
    override_res = client.post(
        f"/api/v1/case-flags/{flag.id}/override",
        headers=clinician_headers,
        json={
            "new_urgency": "soon",
            "reason": "Known chronic elevation under outpatient monitoring, asymptomatic.",
        },
    )
    assert override_res.status_code == 200
    updated_flag = override_res.json()
    assert updated_flag["urgency"] == "soon"
    assert updated_flag["status"] == "overridden"
    assert updated_flag["clinician_override"]["reason"] == "Known chronic elevation under outpatient monitoring, asymptomatic."
    assert updated_flag["clinician_override"]["clinician_id"] == str(clinician_id)


def test_admin_rule_listing_and_sign_off():
    """Admin can view rules and execute sign-off workflow."""
    admin_id = uuid.uuid4()
    admin_token = create_token("admin", user_id=str(admin_id), email="admin@swasthya.test")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # List rules
    list_res = client.get("/api/v1/admin/rules", headers=admin_headers)
    assert list_res.status_code == 200
    rules = list_res.json()
    assert len(rules) >= 14

    # Sign off a rule
    rule_id = rules[0]["rule_id"]
    sign_res = client.post(f"/api/v1/admin/rules/{rule_id}/sign-off", headers=admin_headers)
    assert sign_res.status_code == 200
    signed_rule = sign_res.json()
    assert signed_rule["signed_off_by"] == "admin@swasthya.test"
    assert signed_rule["signed_off_at"] is not None
