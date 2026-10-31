"""
Patient Perfusion Endpoints Tests
Tests consent gating, persistence, prediction execution, and latest retrieval.
"""

from uuid import uuid4
from fastapi.testclient import TestClient
import pytest

from apps.api.app.consent import store_consent_record, reset_consent_store
from apps.api.app.main import app
from apps.api.app.perfusion.storage import clear_perfusion_store
from apps.api.tests.test_auth import create_test_token


@pytest.fixture(autouse=True)
def setup_teardown():
    reset_consent_store()
    clear_perfusion_store()
    yield
    reset_consent_store()
    clear_perfusion_store()


def test_post_perfusion_without_consent_returns_403():
    """Unconsented patient request must be rejected with 403."""
    patient_id = uuid4()
    token = create_test_token("patient", user_id=str(patient_id))

    with TestClient(app) as client:
        resp = client.post(
            f"/patients/{patient_id}/perfusion",
            json={"Age": 58.0, "Sex": "Male"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403
        assert "CONSENT_REQUIRED" in resp.text


def test_post_perfusion_with_consent_saves_and_returns_input_id():
    """Consented patient request succeeds, records input and result, and returns input_id."""
    patient_id = uuid4()
    # Grant data_storage consent
    store_consent_record(patient_id=patient_id, scope="data_storage", captured_by=patient_id)

    token = create_test_token("patient", user_id=str(patient_id))

    with TestClient(app) as client:
        payload = {
            "Age": 62.0,
            "Sex": "Male",
            "Weight": 78.0,
            "Length": 172.0,
            "Typical Chest Pain": "1",
            "DM": "1",
        }
        resp = client.post(
            f"/patients/{patient_id}/perfusion",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200, f"Error: {resp.text}"
        data = resp.json()
        assert "input_id" in data
        assert data["patient_id"] == str(patient_id)
        assert "predictions" in data
        assert "overall_cad" in data["predictions"]
        assert "explanations" in data
        assert "lad" in data["explanations"]

        # Now test GET /patients/{patient_id}/perfusion/latest
        get_resp = client.get(
            f"/patients/{patient_id}/perfusion/latest",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert get_resp.status_code == 200
        latest_data = get_resp.json()
        assert latest_data["patient_id"] == str(patient_id)
        assert latest_data["input_id"] == data["input_id"]
        assert latest_data["inputs"]["Age"] == 62.0
        assert "predictions" in latest_data


def test_patient_cannot_access_other_patient_perfusion():
    """A patient attempting to access another patient's perfusion record gets 403."""
    p1_id = uuid4()
    p2_id = uuid4()
    store_consent_record(patient_id=p2_id, scope="data_storage", captured_by=p2_id)

    token_p1 = create_test_token("patient", user_id=str(p1_id))

    with TestClient(app) as client:
        resp = client.post(
            f"/patients/{p2_id}/perfusion",
            json={"Age": 55.0},
            headers={"Authorization": f"Bearer {token_p1}"},
        )
        assert resp.status_code == 403
