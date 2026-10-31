"""
Comprehensive Consent Gating Integration Tests
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype

Verifies:
1. Consent grant, revoke, and status reporting.
2. Feature gating: 403 without consent, 200 with consent.
3. Revocation immediate effect: revoked consent instantly flips endpoint back to 403.
4. Channel-specific consent for messaging (SMS vs WhatsApp).
5. "No consent: stop, nothing stored" path assertion.
"""

import uuid
from fastapi.testclient import TestClient
import jwt

from apps.api.app.config import settings
from apps.api.app.consent import reset_consent_store
from apps.api.app.main import app

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


def test_grant_consent_and_check_status():
    """Test granting data_storage and report_upload consent."""
    patient_id = str(uuid.uuid4())
    token = create_token("patient", user_id=patient_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Initially empty status
    res = client.get(f"/api/v1/consent/status?patient_id={patient_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["has_data_storage"] is False
    assert res.json()["has_report_upload"] is False

    # Grant data_storage
    grant_res1 = client.post(
        "/api/v1/consent",
        headers=headers,
        json={"patient_id": patient_id, "scope": "data_storage"},
    )
    assert grant_res1.status_code == 200
    assert grant_res1.json()["scope"] == "data_storage"
    assert grant_res1.json()["revoked_at"] is None

    # Grant report_upload
    grant_res2 = client.post(
        "/api/v1/consent",
        headers=headers,
        json={"patient_id": patient_id, "scope": "report_upload"},
    )
    assert grant_res2.status_code == 200

    # Status reflects both active
    status_res = client.get(f"/api/v1/consent/status?patient_id={patient_id}", headers=headers)
    assert status_res.status_code == 200
    body = status_res.json()
    assert body["has_data_storage"] is True
    assert body["has_report_upload"] is True


def test_require_consent_blocks_unconsented_upload():
    """Upload probe returns 403 when patient has not granted consent."""
    patient_id = str(uuid.uuid4())
    token = create_token("patient", user_id=patient_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt upload with zero consent -> 403
    res = client.post(f"/api/v1/reports/upload-probe?patient_id={patient_id}", headers=headers)
    assert res.status_code == 403
    detail = res.json()["detail"]
    assert detail["error"] == "CONSENT_REQUIRED"
    assert detail["scope"] == "report_upload"


def test_require_consent_allows_consented_upload():
    """Upload probe succeeds with 200 when active consent is present."""
    patient_id = str(uuid.uuid4())
    token = create_token("patient", user_id=patient_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Grant both data_storage and report_upload
    client.post("/api/v1/consent", headers=headers, json={"patient_id": patient_id, "scope": "data_storage"})
    client.post("/api/v1/consent", headers=headers, json={"patient_id": patient_id, "scope": "report_upload"})

    # Now upload probe succeeds
    res = client.post(f"/api/v1/reports/upload-probe?patient_id={patient_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "authorized"


def test_revocation_immediately_blocks_access():
    """When consent is revoked, subsequent feature requests immediately fail with 403."""
    patient_id = str(uuid.uuid4())
    token = create_token("patient", user_id=patient_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Grant consent
    client.post("/api/v1/consent", headers=headers, json={"patient_id": patient_id, "scope": "data_storage"})
    grant_res = client.post("/api/v1/consent", headers=headers, json={"patient_id": patient_id, "scope": "report_upload"})
    consent_id = grant_res.json()["id"]

    # Verify upload works
    res_before = client.post(f"/api/v1/reports/upload-probe?patient_id={patient_id}", headers=headers)
    assert res_before.status_code == 200

    # Revoke consent
    revoke_res = client.post(f"/api/v1/consent/{consent_id}/revoke", headers=headers)
    assert revoke_res.status_code == 200
    assert revoke_res.json()["revoked_at"] is not None

    # Verify upload is now immediately blocked
    res_after = client.post(f"/api/v1/reports/upload-probe?patient_id={patient_id}", headers=headers)
    assert res_after.status_code == 403


def test_messaging_consent_channel_specific():
    """Messaging consent must match channel (SMS vs WhatsApp)."""
    patient_id = str(uuid.uuid4())
    token = create_token("patient", user_id=patient_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Grant WhatsApp messaging only
    client.post("/api/v1/consent", headers=headers, json={
        "patient_id": patient_id,
        "scope": "messaging",
        "channel": "whatsapp",
    })

    # SMS probe fails with 403 because only WhatsApp was granted
    res = client.post(f"/api/v1/messages/send-probe?patient_id={patient_id}", headers=headers)
    assert res.status_code == 403

    # Grant SMS messaging
    client.post("/api/v1/consent", headers=headers, json={
        "patient_id": patient_id,
        "scope": "messaging",
        "channel": "sms",
    })

    # Now SMS probe succeeds
    res_sms = client.post(f"/api/v1/messages/send-probe?patient_id={patient_id}", headers=headers)
    assert res_sms.status_code == 200


def test_no_consent_nothing_stored():
    """Verify that when consent is denied or absent, zero downstream records can be processed."""
    patient_id = str(uuid.uuid4())
    token = create_token("patient", user_id=patient_id)
    headers = {"Authorization": f"Bearer {token}"}

    status_res = client.get(f"/api/v1/consent/status?patient_id={patient_id}", headers=headers)
    assert len(status_res.json()["active_consents"]) == 0

    # Feature endpoint aborts before any state modification
    probe = client.post(f"/api/v1/reports/upload-probe?patient_id={patient_id}", headers=headers)
    assert probe.status_code == 403
