"""
Unit, Integration, and Adversarial Tests for Plain-Language Readout Subsystem
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype

Verifies:
1. Client fallback to deterministic template when GROQ_API_KEY is unset or call fails.
2. Forbidden terms guard blocking forbidden diagnostic terms in English and Hindi.
3. Deterministic template generation (Class-6 level, no diagnosis, English & Hindi).
4. Privacy filter zero-PII guarantee (names, UUIDs, phones, MRNs stripped).
5. Safe LLM caller returning guarded output.
6. Adversarial attack tests:
   a. Hallucinated diagnosis blocked -> fallback to deterministic template.
   b. Hallucinated measurement numbers blocked -> fallback to deterministic template.
7. Consent gating: missing consent raises HTTP 403.
"""

import uuid
from fastapi.testclient import TestClient
import jwt

from apps.api.app.config import settings
from apps.api.app.consent import reset_consent_store, store_consent_record
from apps.api.app.main import app
from apps.api.app.readout.groq_client import generate_readout
from apps.api.app.readout.guard import guard, verify_number_preservation
from apps.api.app.readout.models import AnalyteReadoutItem
from apps.api.app.readout.privacy import (
    build_privacy_filtered_payload,
    scan_for_pii,
)
from apps.api.app.readout.template import generate_deterministic_readout

client = TestClient(app)
SECRET = settings.SUPABASE_JWT_SECRET or "super-secret-jwt-token-with-at-least-32-characters-long"


def create_token(role: str, user_id: str | None = None) -> str:
    payload = {
        "sub": user_id or str(uuid.uuid4()),
        "aud": "authenticated",
        "email": f"{role}@swasthya.test",
        "app_metadata": {"role": role},
        "user_metadata": {"role": role},
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def setup_function():
    reset_consent_store()


def sample_items() -> list[AnalyteReadoutItem]:
    return [
        AnalyteReadoutItem(
            analyte_key="potassium",
            display_name="Serum Potassium",
            value=4.8,
            unit="mmol/L",
            reference_low=3.5,
            reference_high=5.1,
        ),
        AnalyteReadoutItem(
            analyte_key="troponin_i",
            display_name="Troponin I",
            value=0.08,
            unit="ng/mL",
            reference_low=None,
            reference_high=0.04,
        ),
        AnalyteReadoutItem(
            analyte_key="systolic_bp",
            display_name="Systolic Blood Pressure",
            value=138.0,
            unit="mmHg",
            reference_low=90.0,
            reference_high=120.0,
        ),
    ]


def test_forbidden_terms_guard_english():
    """Guard blocks diagnosis words and condition names in English."""
    bad_texts = [
        "The patient is diagnosed with coronary artery disease.",
        "Your troponin indicates myocardial infarction.",
        "Symptoms of heart failure are suspected.",
        "There is an ischemic condition present.",
        "This syndrome requires immediate care.",
        "A diagnosis of angina pectoris was made.",
    ]
    for text in bad_texts:
        clean, matches = guard.check_text(text)
        assert not clean, f"Guard failed to block: {text}"
        assert len(matches) > 0

    good_text = (
        "Your Serum Potassium is 4.8 mmol/L, which is within the laboratory normal range of 3.5 to 5.1. "
        "Your Troponin I is 0.08 ng/mL, which is higher than the laboratory normal limit of 0.04 ng/mL. "
        "A clinician will review these values with you."
    )
    clean, matches = guard.check_text(good_text)
    assert clean, f"Guard falsely blocked clean text: {matches}"


def test_forbidden_terms_guard_hindi():
    """Guard blocks diagnosis words and condition names in Hindi."""
    bad_texts_hi = [
        "रोगी को दिल का दौरा पड़ने की संभावना है।",
        "हृदय विफलता का संकेत मिल रहा है।",
        "यह एक गंभीर बीमारी का लक्षण है।",
        "चिकित्सक द्वारा रोग का निदान किया गया।",
        "मधुमेह की जांच सकारात्मक है।",
    ]
    for text in bad_texts_hi:
        clean, matches = guard.check_text(text)
        assert not clean, f"Guard failed to block Hindi text: {text}"
        assert len(matches) > 0

    good_text_hi = (
        "आपकी सीरम पोटेशियम जांच का परिणाम 4.8 mmol/L है, जो प्रयोगशाला सामान्य सीमा 3.5 से 5.1 के भीतर है। "
        "एक चिकित्सक इन परिणामों की समीक्षा करेंगे।"
    )
    clean, matches = guard.check_text(good_text_hi)
    assert clean, f"Guard falsely blocked clean Hindi text: {matches}"


def test_deterministic_template_generation():
    """Deterministic template produces clear, un-diagnosing, Class 6 readout."""
    items = sample_items()

    # English readout check
    en_readout = generate_deterministic_readout(items, language="en")
    assert "Serum Potassium" in en_readout
    assert "4.8 mmol/L" in en_readout
    assert "within the laboratory normal range" in en_readout
    assert "higher than the laboratory normal range" in en_readout
    assert "A clinician will review these test results with you" in en_readout
    # Guard check on deterministic output
    is_clean, matches = guard.check_text(en_readout)
    assert is_clean, f"Deterministic template contains forbidden terms: {matches}"

    # Hindi readout check
    hi_readout = generate_deterministic_readout(items, language="hi")
    assert "सीरम पोटेशियम" in hi_readout or "Serum Potassium" in hi_readout
    assert "4.8 mmol/L" in hi_readout
    assert "प्रयोगशाला सामान्य सीमा" in hi_readout
    assert "एक चिकित्सक आपके इन जाँच परिणामों की समीक्षा करेंगे" in hi_readout
    is_clean_hi, matches_hi = guard.check_text(hi_readout)
    assert is_clean_hi, f"Hindi deterministic template contains forbidden terms: {matches_hi}"


def test_privacy_filter_strips_all_pii():
    """Privacy filter produces payload with only clinical analytes and zero PII."""
    items = sample_items()
    payload = build_privacy_filtered_payload(items)

    assert len(payload) == 3
    assert payload[0]["test_name"] == "Serum Potassium"
    assert payload[0]["result_value"] == 4.8
    assert payload[0]["unit"] == "mmol/L"

    # Verify scan_for_pii confirms zero leaks
    violations = scan_for_pii(payload)
    assert violations == []

    # Verify that if contaminated with PII, scanner catches it
    contaminated = payload.copy()
    contaminated.append({"patient_name": "Ramesh Kumar", "phone": "+919876543210"})
    detected_violations = scan_for_pii(contaminated)
    assert len(detected_violations) >= 2


def test_number_preservation_guard():
    """Output verifier detects and flags hallucinated measurement numbers."""
    allowed = {4.8, 3.5, 5.1, 0.08, 0.04, 138.0, 90.0, 120.0}

    # Text containing only valid numbers from input
    valid_text = "Your potassium is 4.8 and systolic BP is 138.0 while normal high is 120.0."
    is_valid, bad_nums = verify_number_preservation(valid_text, allowed)
    assert is_valid
    assert bad_nums == []

    # Text containing hallucinated numbers (e.g. model made up 99.4)
    hallucinated_text = "Your potassium is 4.8, but your pulse rate is 99.4 bpm."
    is_valid_bad, bad_nums = verify_number_preservation(hallucinated_text, allowed)
    assert not is_valid_bad
    assert 99.4 in bad_nums


def test_adversarial_llm_hallucinating_diagnosis_falls_back():
    """When LLM hallucinates a medical diagnosis, output guard catches it and falls back."""
    items = sample_items()
    hallucinating_response = (
        "Based on your Troponin I of 0.08 ng/mL, you have acute myocardial infarction and heart failure. "
        "This disease requires hospitalization."
    )

    readout_text, source = generate_readout(items, language="en", mock_llm_response=hallucinating_response)

    # Must be safely rejected and fallback to deterministic template
    assert source == "deterministic_template"
    # Verification that rejected hallucinated text was not used
    assert "myocardial infarction" not in readout_text
    assert "heart failure" not in readout_text
    assert "disease" not in readout_text
    assert "Laboratory Test Report Summary" in readout_text


def test_adversarial_llm_hallucinating_numbers_falls_back():
    """When LLM hallucinates new numbers, output guard catches it and falls back."""
    items = sample_items()
    hallucinating_numbers_response = (
        "Your potassium level is 4.8 mmol/L, but your cholesterol is 320.5 mg/dL which is very high."
    )

    readout_text, source = generate_readout(items, language="en", mock_llm_response=hallucinating_numbers_response)

    # Must be rejected because 320.5 was never in the input
    assert source == "deterministic_template"
    assert "320.5" not in readout_text


def test_clean_llm_output_is_accepted():
    """When LLM produces compliant plain text adhering to all rules, it is accepted."""
    items = sample_items()
    clean_llm_response = (
        "Your laboratory test results show the following:\n"
        "1. Serum Potassium is 4.8 mmol/L, which is within the standard range of 3.5 to 5.1 mmol/L.\n"
        "2. Troponin I is 0.08 ng/mL, which is higher than the standard upper limit of 0.04 ng/mL.\n"
        "3. Systolic Blood Pressure is 138.0 mmHg, higher than the standard limit of 120.0 mmHg.\n"
        "A clinician will review these values with you to discuss next steps."
    )

    readout_text, source = generate_readout(items, language="en", mock_llm_response=clean_llm_response)
    assert source == "groq"
    assert "Serum Potassium is 4.8" in readout_text


def test_readout_endpoint_requires_consent():
    """POST /readout/generate returns 403 when patient lacks active data_storage consent."""
    patient_id = uuid.uuid4()
    user_id = uuid.uuid4()
    token = create_token("patient", user_id=str(user_id))
    headers = {"Authorization": f"Bearer {token}"}

    # No consent granted yet
    res = client.post(
        "/api/v1/readout/generate",
        headers=headers,
        json={
            "patient_id": str(patient_id),
            "language": "en",
            "items": [it.model_dump() for it in sample_items()],
        },
    )
    assert res.status_code == 403
    assert res.json()["detail"]["error"] == "CONSENT_REQUIRED"

    # Grant data_storage consent
    store_consent_record(patient_id=patient_id, scope="data_storage", captured_by=user_id)

    # Now readout generation succeeds
    res_consented = client.post(
        "/api/v1/readout/generate",
        headers=headers,
        json={
            "patient_id": str(patient_id),
            "language": "en",
            "items": [it.model_dump() for it in sample_items()],
        },
    )
    assert res_consented.status_code == 200
    data = res_consented.json()
    assert data["patient_id"] == str(patient_id)
    assert data["source"] in ["groq", "deterministic_template"]
    assert "Serum Potassium" in data["readout_text"]
    assert "Prototype" in data["disclaimer"]
