"""
Unit and Integration Tests for Swasthya Sense End-to-End Clinical Flow:
1. Standard report upload & instant patient profile creation by Lab Tech.
2. Automated high-risk detection & simulated urgent WhatsApp/SMS alert dispatch.
3. Doctor review, 3D twin data availability, and manual clinical opinion sign-off.
4. Frontline simulated reminder messaging and immutable audit trail.
"""

import pytest
from fastapi.testclient import TestClient

from apps.api.app.main import app
from apps.api.app.services.model_service import model_service


@pytest.fixture(scope="module", autouse=True)
def ensure_models_loaded():
    model_service.load_artifacts()


@pytest.fixture
def client():
    return TestClient(app)


def test_get_standard_report_presets(client):
    res = client.get("/api/v1/registry/standard-report-presets")
    assert res.status_code == 200
    presets = res.json()
    assert len(presets) >= 4
    preset_ids = [p["preset_id"] for p in presets]
    assert "critical_lad_ischemia" in preset_ids
    assert "moderate_rca_ischemia" in preset_ids
    assert "overdue_post_mi" in preset_ids
    assert "routine_normal_screening" in preset_ids


def test_list_registry_patients(client):
    res = client.get("/api/v1/registry/patients")
    assert res.status_code == 200
    patients = res.json()
    assert isinstance(patients, list)
    assert len(patients) > 0
    first = patients[0]
    assert "patient_id" in first
    assert "triage_lane" in first


def test_lab_tech_upload_critical_report_triggers_urgent_alert(client):
    # Ramesh Patel Critical LAD report
    payload = {
        "uploaded_by": "Rajesh Kumar (Sr. Lab Tech)",
        "report": {
            "full_name": "Ramesh Patel",
            "age": 62,
            "sex": "Male",
            "phone": "+91-98201-44123",
            "cohort": "Cohort B: Post-Event Discharge",
            "lab_name": "Apex Central Diagnostic Center",
            "BP": 168.0,
            "Diastolic_BP": 98.0,
            "PR": 92.0,
            "DM": "1",
            "HTN": "1",
            "Current_Smoker": "1",
            "Typical_Chest_Pain": "1",
            "Dyspnea": "Y",
            "St_Elevation": "1",
            "Region_RWMA": "1",  # Anterior Wall (LAD)
            "EF_TTE": 42.0,
            "FBS": 184.0,
            "CR": 1.3,
            "TG": 245.0,
            "LDL": 165.0,
            "HDL": 31.0,
        },
    }

    res = client.post("/api/v1/registry/upload-report", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    pid = data["patient_id"]
    patient = data["patient"]

    # Verify patient created and flagged high priority
    assert patient["full_name"] == "Ramesh Patel"
    assert patient["status"] == "PENDING_DOCTOR_CONSULTATION"
    assert patient["is_high_priority"] is True
    assert patient["triage_lane"] == "clinical"

    # Verify 4-head ML predictions and 3D uniforms exist
    assert "predictions" in patient
    assert "uniforms" in patient
    assert patient["predictions"]["vessels"]["lad"]["probability"] > 0.50

    # Verify automated simulated urgent WhatsApp/SMS was dispatched
    alert = data["dispatched_alert"]
    assert alert is not None
    assert alert["patient_id"] == pid
    assert alert["channel"] == "WhatsApp / SMS"
    assert alert["status"] == "DELIVERED"
    assert "URGENT" in alert["body"]
    assert "Cardiology OPD" in alert["body"]


def test_lab_tech_upload_report_for_existing_patient_updates_most_recent_values(client):
    # Fetch an existing patient
    patients_res = client.get("/api/v1/registry/patients")
    assert patients_res.status_code == 200
    existing = patients_res.json()[0]
    pid = existing["patient_id"]

    update_payload = {
        "uploaded_by": "Rajesh Kumar (Sr. Lab Tech)",
        "report": {
            "patient_id": pid,
            "full_name": existing["full_name"],
            "BP": 178.0,  # Updated new high BP
            "Diastolic_BP": 105.0,
            "FBS": 195.0,
            "LDL": 172.0,
            "St_Elevation": "1",
            "Region_RWMA": "1",
        },
    }

    res = client.post("/api/v1/registry/upload-report", json=update_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["is_update"] is True
    assert data["patient_id"] == pid
    assert data["patient"]["report_data"]["vitals"]["BP"] == 178.0
    assert "updated with most recent laboratory report" in data["message"]


def test_doctor_sign_off_manual_clinical_opinion(client):
    # Fetch a patient in pending status
    patients_res = client.get("/api/v1/registry/patients?status=PENDING_DOCTOR_CONSULTATION")
    assert patients_res.status_code == 200
    pending = patients_res.json()
    assert len(pending) > 0
    target_pid = pending[0]["patient_id"]

    opinion_payload = {
        "doctor_name": "Dr. Aditi Sharma, MD",
        "doctor_id": "DOC-CARDIO-01",
        "clinical_notes": "Significant anterior ischemic markers. Recommended emergent coronary angiography and admission to CCU.",
        "recommendation": "Emergent Cath Lab Referral",
        "triage_decision": "urgent_cath_lab",
    }

    res = client.post(f"/api/v1/registry/patients/{target_pid}/doctor-opinion", json=opinion_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["patient"]["status"] == "CONSULTED"
    assert data["patient"]["doctor_consultation"]["consulted"] is True
    assert data["patient"]["doctor_consultation"]["doctor_name"] == "Dr. Aditi Sharma, MD"


def test_frontline_send_simulated_reminder_and_audit(client):
    patients_res = client.get("/api/v1/registry/patients")
    pid = patients_res.json()[0]["patient_id"]

    reminder_payload = {
        "channel": "WhatsApp",
        "message_type": "OVERDUE_ALERT",
        "sender": "Sunita Devi (Frontline ASHA Worker)",
    }

    res = client.post(f"/api/v1/registry/patients/{pid}/send-reminder", json=reminder_payload)
    assert res.status_code == 200
    receipt = res.json()
    assert receipt["status"] == "DELIVERED"
    assert receipt["channel"] == "WhatsApp"

    # Verify message appears in dispatched log
    msgs_res = client.get("/api/v1/registry/dispatched-messages")
    assert msgs_res.status_code == 200
    msgs = msgs_res.json()
    assert any(m["message_id"] == receipt["message_id"] for m in msgs)

    # Verify audit trail contains the action
    audit_res = client.get("/api/v1/registry/audit-trail")
    assert audit_res.status_code == 200
    audit = audit_res.json()
    assert any(a["action"] == "SIMULATED_COMMUNICATION_DISPATCHED" for a in audit)

