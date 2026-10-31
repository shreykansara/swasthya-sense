"""
Swasthya Sense Clinical Platform & Registry Endpoints.
Provides:
- Lab technician report upload & instant patient profile generation
- Automated urgent WhatsApp/SMS notifications for high-priority cardiac cases
- Clinician manual opinion sign-off and 3D heart data delivery
- Two-lane triage worklists (Clinical Review vs Administrative Follow-Up)
- Full immutable audit trail & simulated message delivery logs
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Response, status
from pydantic import BaseModel, Field

from apps.api.app.config import settings
from apps.api.app.services.registry_service import registry_service

swasthya_router = APIRouter(prefix="/registry", tags=["Swasthya Sense Registry"])


class LabReportUploadRequest(BaseModel):
    report: Dict[str, Any] = Field(..., description="Standard lab report dictionary")
    uploaded_by: str = Field(default="Rajesh Kumar (Lab Tech)", description="Lab technician / medical staff name")


class DoctorOpinionRequest(BaseModel):
    clinical_notes: str = Field(..., min_length=5, description="Doctor manual clinical impression & notes")
    recommendation: str = Field(..., description="Clinical recommendation (e.g. Cath Lab Referral, Urgent OPD, Medication Titration)")
    triage_decision: str = Field(..., description="Action category (e.g. urgent_cath_lab, opd_urgent, opd_routine, home_follow_up)")
    doctor_name: str = Field(default="Dr. Aditi Sharma, MD", description="Cardiologist name")
    doctor_id: str = Field(default="DOC-CARDIO-01", description="Doctor identification number")


class SendReminderRequest(BaseModel):
    channel: str = Field(default="WhatsApp", description="Channel: WhatsApp or SMS")
    message_type: str = Field(default="ROUTINE_REMINDER", description="ROUTINE_REMINDER, OVERDUE_ALERT, or MEDICATION_CHECK")
    custom_body: Optional[str] = Field(default=None, description="Custom message body (optional)")
    sender: str = Field(default="Frontline ASHA Worker", description="Worker name or automated dispatch agent")


@swasthya_router.get("/patients", summary="List All Registry Patients with Triage Filtering")
def list_registry_patients(
    lane: Optional[str] = Query(None, description="Triage lane: 'clinical' or 'administrative'"),
    status: Optional[str] = Query(None, description="Status: 'PENDING_DOCTOR_CONSULTATION' or 'CONSULTED'"),
    priority_only: bool = Query(False, description="Filter for high priority cases only"),
    search: Optional[str] = Query(None, description="Search query by name, ID, or cohort"),
):
    """Returns prioritized patient cohort registry with current follow-up & clinical review status."""
    return registry_service.list_patients(
        lane=lane,
        status_filter=status,
        priority_only=priority_only,
        search=search,
    )


@swasthya_router.get("/patients/{patient_id}", summary="Get Single Patient Profile & Diagnostic Twin")
def get_patient_profile(patient_id: str):
    """Returns full patient profile including uploaded report, ML risk scores, TreeSHAP, and doctor notes."""
    patient = registry_service.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found in registry.")
    return patient


@swasthya_router.post("/upload-report", summary="Lab Technician: Upload Report & Auto-Create Patient Profile")
def upload_lab_report(req: LabReportUploadRequest, response: Response):
    """
    Lab technician endpoint:
    1. Ingests standard cardiac diagnostic lab report.
    2. Instantly generates patient record in registry.
    3. Runs calibrated 4-head ML predictions & TreeSHAP explainability.
    4. Automatically dispatches simulated urgent WhatsApp/SMS if high priority.
    """
    response.headers["X-Clinical-Disclaimer"] = "Decision-Support-Only"
    try:
        result = registry_service.create_patient_from_report(
            report_data=req.report,
            uploaded_by=req.uploaded_by,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating patient profile from report: {e}")


@swasthya_router.post("/patients/{patient_id}/doctor-opinion", summary="Doctor: Sign Off Manual Clinical Opinion")
def sign_doctor_opinion(patient_id: str, req: DoctorOpinionRequest, response: Response):
    """
    Doctor endpoint:
    Allows qualified clinician to review 3D heart model and diagnostic reports,
    then record and digitally sign off their manual medical opinion & escalation plan.
    """
    response.headers["X-Clinical-Disclaimer"] = "Decision-Support-Only"
    try:
        return registry_service.record_doctor_opinion(
            patient_id=patient_id,
            doctor_name=req.doctor_name,
            doctor_id=req.doctor_id,
            clinical_notes=req.clinical_notes,
            recommendation=req.recommendation,
            triage_decision=req.triage_decision,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record doctor opinion: {e}")


@swasthya_router.post("/patients/{patient_id}/send-reminder", summary="Send Simulated WhatsApp / SMS Reminder")
def send_reminder(patient_id: str, req: SendReminderRequest):
    """Dispatches a simulated WhatsApp/SMS reminder to patient for scheduled or overdue check-ins."""
    try:
        return registry_service.send_simulated_reminder(
            patient_id=patient_id,
            channel=req.channel,
            message_type=req.message_type,
            custom_body=req.custom_body,
            sender=req.sender,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@swasthya_router.get("/audit-trail", summary="Get Immutable Audit Trail")
def get_audit_trail(limit: int = Query(50, ge=1, le=200)):
    """Returns chronological audit records of all medical staff actions."""
    return registry_service.get_audit_trail(limit=limit)


@swasthya_router.get("/dispatched-messages", summary="Get Simulated Communication History")
def get_dispatched_messages(limit: int = Query(50, ge=1, le=200)):
    """Returns history of all simulated SMS and WhatsApp messages sent to patients."""
    return registry_service.get_dispatched_messages(limit=limit)


@swasthya_router.get("/standard-report-presets", summary="Get 1-Click Standard Lab Report Demo Presets")
def get_standard_presets():
    """Returns ready-to-test standard diagnostic lab report templates."""
    return registry_service.get_presets()
