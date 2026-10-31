"""
Report Intake, Extraction, and Human Confirmation Integration Tests
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype
"""

import io
import time
from pathlib import Path
import uuid
import pytest
from fastapi.testclient import TestClient
import jwt

from apps.api.app.config import settings
from apps.api.app.consent import reset_consent_store, store_consent_record
from apps.api.app.extraction.service import extraction_service
from apps.api.app.main import app

client = TestClient(app)
SECRET = settings.SUPABASE_JWT_SECRET or "super-secret-jwt-token-with-at-least-32-characters-long"
SAMPLE_PDF = settings.ROOT_DIR / "synthetic" / "reports" / "template_A_clean.pdf"


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
    extraction_service.reset()


def test_upload_requires_consent():
    """Upload without active report_upload consent returns 403."""
    patient_id = str(uuid.uuid4())
    token = create_token("patient", user_id=patient_id)
    headers = {"Authorization": f"Bearer {token}"}

    dummy_pdf = io.BytesIO(b"%PDF-1.4 dummy content")
    response = client.post(
        "/api/v1/reports/upload",
        headers=headers,
        data={"patient_id": patient_id},
        files={"file": ("report.pdf", dummy_pdf, "application/pdf")},
    )
    assert response.status_code == 403
    assert response.json()["detail"]["error"] == "CONSENT_REQUIRED"


def test_report_intake_extract_and_confirm_lifecycle():
    """Full end-to-end report upload, background extraction, polling, and confirmation."""
    patient_id = uuid.uuid4()
    user_id = uuid.uuid4()
    token = create_token("patient", user_id=str(user_id))
    headers = {"Authorization": f"Bearer {token}"}

    # Grant both data_storage and report_upload consent
    store_consent_record(patient_id=patient_id, scope="data_storage", captured_by=user_id)
    store_consent_record(patient_id=patient_id, scope="report_upload", captured_by=user_id)

    # Read sample clean PDF
    assert SAMPLE_PDF.exists(), f"Sample PDF not found at {SAMPLE_PDF}"
    with open(SAMPLE_PDF, "rb") as f:
        pdf_bytes = f.read()

    # 1. Upload report
    upload_res = client.post(
        "/api/v1/reports/upload",
        headers=headers,
        data={"patient_id": str(patient_id)},
        files={"file": ("lab_report.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )
    assert upload_res.status_code == 202
    upload_data = upload_res.json()
    upload_id = upload_data["id"]
    assert upload_data["status"] in ("uploaded", "extracting", "needs_confirmation")

    # 2. Wait/Poll for extraction completion
    retries = 10
    final_record = None
    while retries > 0:
        poll_res = client.get(f"/api/v1/reports/{upload_id}", headers=headers)
        assert poll_res.status_code == 200
        rec = poll_res.json()
        if rec["status"] == "needs_confirmation":
            final_record = rec
            break
        time.sleep(0.5)
        retries -= 1

    assert final_record is not None, "Extraction did not transition to needs_confirmation"
    extracted = final_record["extracted_values"]
    assert len(extracted) >= 5, f"Expected at least 5 analytes, found {len(extracted)}"

    # Check that initially NO values are confirmed
    for val in extracted:
        assert val["confirmed_value"] is None

    # Check unconfirmed endpoint returns 0 values
    unconf_res = client.get(f"/api/v1/patients/{patient_id}/confirmed-values", headers=headers)
    assert unconf_res.status_code == 200
    assert unconf_res.json()["total_confirmed"] == 0

    # 3. Confirm values
    confirmations = [
        {"analyte_id": e["analyte_id"], "confirmed_value": e["value"]}
        for e in extracted
        if e["value"] is not None
    ]

    confirm_res = client.post(
        f"/api/v1/reports/{upload_id}/confirm",
        headers=headers,
        json={"confirmed_values": confirmations},
    )
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "confirmed"

    # 4. Now confirmed-values endpoint returns verified values
    conf_res = client.get(f"/api/v1/patients/{patient_id}/confirmed-values", headers=headers)
    assert conf_res.status_code == 200
    assert conf_res.json()["total_confirmed"] == len(confirmations)
    for c_val in conf_res.json()["values"]:
        assert c_val["confirmed_value"] is not None
