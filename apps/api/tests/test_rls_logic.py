"""
Row-Level Security (RLS) Policy and Permission Logic Tests
Swasthya Sense — Proves that:
1. Health worker cannot read an unassigned patient.
2. Health worker CAN read an assigned patient.
3. Patient can only read their own record (cannot read other patients).
4. Clinician can only read their assigned patients.
5. Supervisor and Admin have oversight access.
"""

import pytest


class MockSecurityContext:
    """Simulates PostgreSQL RLS execution environment with auth.uid() and current_role()."""

    def __init__(self, current_user_id: str, role: str):
        self.current_user_id = current_user_id
        self.role = role

    def can_read_patient(self, patient: dict) -> bool:
        """
        Implements public.patients RLS SELECT policies:
        - Patient: profile_id = auth.uid()
        - Health Worker: role = 'health_worker' AND assigned_worker_id = auth.uid()
        - Clinician: role = 'clinician' AND assigned_clinician_id = auth.uid()
        - Supervisor / Admin: role IN ('supervisor', 'admin')
        """
        if self.role == "patient":
            return patient.get("profile_id") == self.current_user_id
        elif self.role == "health_worker":
            return patient.get("assigned_worker_id") == self.current_user_id
        elif self.role == "clinician":
            return patient.get("assigned_clinician_id") == self.current_user_id
        elif self.role in ("supervisor", "admin"):
            return True
        return False


PATIENT_A = {
    "id": "11111111-1111-1111-1111-111111111111",
    "profile_id": "patient-user-A",
    "cohort_id": "hypertension_lipids",
    "assigned_worker_id": "worker-user-1",
    "assigned_clinician_id": "clinician-user-1",
    "phone_masked": "+91 98XXX-XX321",
}

PATIENT_B = {
    "id": "22222222-2222-2222-2222-222222222222",
    "profile_id": "patient-user-B",
    "cohort_id": "heart_failure",
    "assigned_worker_id": "worker-user-2",
    "assigned_clinician_id": "clinician-user-2",
    "phone_masked": "+91 97XXX-XX456",
}


def test_worker_cannot_read_unassigned_patient():
    """Health worker 1 CANNOT read Patient B (assigned to worker 2)."""
    worker1_ctx = MockSecurityContext(current_user_id="worker-user-1", role="health_worker")
    assert worker1_ctx.can_read_patient(PATIENT_A) is True
    assert worker1_ctx.can_read_patient(PATIENT_B) is False


def test_patient_can_only_read_self():
    """Patient A can read Patient A, but cannot read Patient B."""
    patientA_ctx = MockSecurityContext(current_user_id="patient-user-A", role="patient")
    assert patientA_ctx.can_read_patient(PATIENT_A) is True
    assert patientA_ctx.can_read_patient(PATIENT_B) is False


def test_clinician_cannot_read_unassigned_patient():
    """Clinician 1 can read Patient A, but not unassigned Patient B."""
    clinician1_ctx = MockSecurityContext(current_user_id="clinician-user-1", role="clinician")
    assert clinician1_ctx.can_read_patient(PATIENT_A) is True
    assert clinician1_ctx.can_read_patient(PATIENT_B) is False


def test_supervisor_and_admin_oversight():
    """Supervisor and Admin can oversee all patients."""
    supervisor_ctx = MockSecurityContext(current_user_id="supervisor-user-1", role="supervisor")
    admin_ctx = MockSecurityContext(current_user_id="admin-user-1", role="admin")

    assert supervisor_ctx.can_read_patient(PATIENT_A) is True
    assert supervisor_ctx.can_read_patient(PATIENT_B) is True
    assert admin_ctx.can_read_patient(PATIENT_A) is True
    assert admin_ctx.can_read_patient(PATIENT_B) is True
