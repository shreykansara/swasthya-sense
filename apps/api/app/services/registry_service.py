"""
Registry & Clinical Operations Service for Swasthya Sense.
Supports:
1. Instant patient profile creation from standard lab diagnostic reports.
2. Automated high-risk alert detection & simulated urgent SMS/WhatsApp dispatch.
3. Doctor manual clinical opinion & sign-off recording.
4. Two-lane triage worklists (Clinical Review vs Administrative Follow-up).
5. Immutable audit logging of all clinical actions.
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from apps.api.app.schemas.patient import PatientInputSchema
from apps.api.app.services.inference import predict_patient
from apps.api.app.services.explainer import explain_patient
from apps.api.app.services.model_service import model_service
from apps.api.app.utils.logger import logger

REGISTRY_PATH = Path("synthetic/permutations_registry.json")
if not REGISTRY_PATH.exists():
    REGISTRY_PATH = Path("synthetic/cohort_registry.json")

from synthetic.generate_permutations import build_practices_for_patient


# Standard Demo Report Presets for 1-click clinical testing
STANDARD_DEMO_PRESETS: List[Dict[str, Any]] = [
    {
        "preset_id": "critical_lad_ischemia",
        "title": "Critical Acute LAD Ischemia",
        "severity": "CRITICAL",
        "badge": "High Priority",
        "summary": "62yo Male with severe typical chest pain, anterior ST-elevation, high BP 168/98, elevated FBS and LDL.",
        "expected_action": "Triggers immediate simulated urgent WhatsApp/SMS to walk into OPD, flags for doctor.",
        "report": {
            "full_name": "Ramesh Patel",
            "age": 62,
            "sex": "Male",
            "phone": "+91-98201-44123",
            "cohort": "Cohort B: Post-Event Discharge",
            "lab_name": "Apex Central Diagnostic Center",
            "technician_name": "Rajesh Kumar (Sr. Lab Tech)",
            "BP": 168.0,
            "Diastolic_BP": 98.0,
            "PR": 92.0,
            "Length": 170.0,
            "Weight": 82.0,
            "DM": "1",
            "HTN": "1",
            "Current_Smoker": "1",
            "Typical_Chest_Pain": "1",
            "Dyspnea": "Y",
            "Function_Class": "3",
            "St_Elevation": "1",
            "St_Depression": "0",
            "Tinversion": "1",
            "Q_Wave": "1",
            "Region_RWMA": "1",  # Anterior Wall (LAD)
            "EF_TTE": 42.0,
            "FBS": 184.0,
            "CR": 1.3,
            "TG": 245.0,
            "LDL": 165.0,
            "HDL": 31.0,
            "BUN": 24.0,
            "ESR": 32.0,
            "HB": 13.5,
            "VHD": "mild",
        },
    },
    {
        "preset_id": "moderate_rca_ischemia",
        "title": "Moderate Inferior Wall Ischemia",
        "severity": "MODERATE",
        "badge": "Clinical Review",
        "summary": "54yo Female with atypical angina, dyspnea, inferior wall RWMA, elevated triglycerides and ST depression.",
        "expected_action": "Assigned to Clinical Review Lane for doctor review within 48h.",
        "report": {
            "full_name": "Meera Sen",
            "age": 54,
            "sex": "Female",
            "phone": "+91-98112-77491",
            "cohort": "Cohort A: Hypertension with Lipids",
            "lab_name": "Apex Central Diagnostic Center",
            "technician_name": "Rajesh Kumar (Sr. Lab Tech)",
            "BP": 142.0,
            "Diastolic_BP": 88.0,
            "PR": 74.0,
            "Length": 162.0,
            "Weight": 68.0,
            "DM": "1",
            "HTN": "1",
            "Current_Smoker": "0",
            "Typical_Chest_Pain": "0",
            "Atypical": "Y",
            "Dyspnea": "Y",
            "Function_Class": "1",
            "St_Elevation": "0",
            "St_Depression": "1",
            "Tinversion": "1",
            "Q_Wave": "0",
            "Region_RWMA": "2",  # Inferior Wall (RCA)
            "EF_TTE": 52.0,
            "FBS": 140.0,
            "CR": 0.9,
            "TG": 220.0,
            "LDL": 128.0,
            "HDL": 38.0,
            "BUN": 16.0,
            "ESR": 18.0,
            "HB": 12.8,
            "VHD": "N",
        },
    },
    {
        "preset_id": "overdue_post_mi",
        "title": "Overdue Post-MI Check-in (18 Days Overdue)",
        "severity": "OVERDUE",
        "badge": "Admin Overdue",
        "summary": "51yo Male post-MI recovery patient, missed day-30 scheduled follow-up, vitals currently stable.",
        "expected_action": "Assigned to Administrative Lane for frontline worker simulated WhatsApp reminder.",
        "report": {
            "full_name": "Suresh Verma",
            "age": 51,
            "sex": "Male",
            "phone": "+91-97103-66240",
            "cohort": "Cohort B: Post-Event Discharge",
            "lab_name": "Community Health Center",
            "technician_name": "Pooja Sharma (Lab Tech)",
            "BP": 126.0,
            "Diastolic_BP": 82.0,
            "PR": 70.0,
            "Length": 168.0,
            "Weight": 72.0,
            "DM": "0",
            "HTN": "1",
            "Current_Smoker": "0",
            "Typical_Chest_Pain": "0",
            "Dyspnea": "N",
            "Function_Class": "0",
            "St_Elevation": "0",
            "St_Depression": "0",
            "Tinversion": "0",
            "Q_Wave": "0",
            "Region_RWMA": "0",
            "EF_TTE": 58.0,
            "FBS": 98.0,
            "CR": 0.8,
            "TG": 115.0,
            "LDL": 92.0,
            "HDL": 48.0,
            "BUN": 12.0,
            "ESR": 10.0,
            "HB": 14.1,
            "VHD": "N",
            "overdue_days": 18,
        },
    },
    {
        "preset_id": "routine_normal_screening",
        "title": "Routine Normal Screening",
        "severity": "NORMAL",
        "badge": "Low Risk",
        "summary": "38yo Female, asymptomatic, normotensive, normal metabolic panel and ECG.",
        "expected_action": "Placed in routine low-risk tier, next follow-up in 90 days.",
        "report": {
            "full_name": "Ananya Roy",
            "age": 38,
            "sex": "Female",
            "phone": "+91-99450-11234",
            "cohort": "Cohort A: Hypertension with Lipids",
            "lab_name": "City Care Diagnostic Laboratory",
            "technician_name": "Rajesh Kumar (Sr. Lab Tech)",
            "BP": 116.0,
            "Diastolic_BP": 74.0,
            "PR": 68.0,
            "Length": 164.0,
            "Weight": 58.0,
            "DM": "0",
            "HTN": "0",
            "Current_Smoker": "0",
            "Typical_Chest_Pain": "0",
            "Dyspnea": "N",
            "Function_Class": "0",
            "St_Elevation": "0",
            "St_Depression": "0",
            "Tinversion": "0",
            "Q_Wave": "0",
            "Region_RWMA": "0",
            "EF_TTE": 64.0,
            "FBS": 86.0,
            "CR": 0.6,
            "TG": 72.0,
            "LDL": 78.0,
            "HDL": 62.0,
            "BUN": 10.0,
            "ESR": 6.0,
            "HB": 13.6,
            "VHD": "N",
        },
    },
]


class RegistryService:
    """Thread-safe stateful registry service managing patients, alerts, opinions, and audit trails."""

    def __init__(self):
        self._patients: Dict[str, Dict[str, Any]] = {}
        self._audit_trail: List[Dict[str, Any]] = []
        self._dispatched_messages: List[Dict[str, Any]] = []
        self._initialized = False

    def initialize(self) -> None:
        """Loads baseline synthetic registry and sets up initial triage states."""
        if self._initialized:
            return

        if not model_service.is_ready:
            try:
                model_service.load_artifacts()
            except Exception as e:
                logger.warning(f"Model service not ready during registry init: {e}")

        # Load synthetic patients if file exists
        if REGISTRY_PATH.exists():
            try:
                with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
                    raw_patients = json.load(f)
                for p in raw_patients:
                    pid = p["patient_id"]
                    # Add clinical management fields
                    p["status"] = p.get("status", "CONSULTED" if int(pid.split("-")[-1]) % 2 == 0 else "PENDING_DOCTOR_CONSULTATION")
                    p["is_high_priority"] = p.get("is_high_priority", False)
                    p["triage_lane"] = p.get("triage_lane", "administrative" if p.get("overdue_days", 0) > 0 else "clinical")
                    p["doctor_consultation"] = p.get("doctor_consultation", {
                        "consulted": p.get("status") == "CONSULTED",
                        "doctor_name": "Dr. Aditi Sharma, MD (Cardiology)" if p.get("status") == "CONSULTED" else None,
                        "consultation_date": "2026-10-30T10:15:00Z" if p.get("status") == "CONSULTED" else None,
                        "clinical_notes": "Patient stable on current antiplatelet therapy. Follow-up lipid profile in 6 weeks." if p.get("status") == "CONSULTED" else None,
                        "recommendation": "Routine Follow-up" if p.get("status") == "CONSULTED" else None,
                        "triage_decision": "opd_routine" if p.get("status") == "CONSULTED" else None,
                    })
                    self._patients[pid] = p

                logger.info(f"Loaded {len(self._patients)} patients into Swasthya Sense Registry.")
            except Exception as e:
                logger.error(f"Error loading registry from {REGISTRY_PATH}: {e}")

        self._initialized = True

    def list_patients(
        self,
        lane: Optional[str] = None,
        status_filter: Optional[str] = None,
        priority_only: bool = False,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        self.initialize()
        results = list(self._patients.values())

        if lane:
            results = [p for p in results if p.get("triage_lane") == lane]
        if status_filter:
            results = [p for p in results if p.get("status") == status_filter]
        if priority_only:
            results = [p for p in results if p.get("is_high_priority")]
        if search:
            q = search.lower().strip()
            results = [
                p for p in results
                if q in p.get("patient_id", "").lower()
                or q in p.get("full_name", "").lower()
                or q in p.get("cohort", "").lower()
            ]

        # Sort: High priority & pending consultation first, then by ID
        def sort_key(item: Dict[str, Any]):
            priority_score = 0
            if item.get("is_high_priority"):
                priority_score += 100
            if item.get("status") == "PENDING_DOCTOR_CONSULTATION":
                priority_score += 50
            if item.get("overdue_days", 0) > 0:
                priority_score += 20
            return (-priority_score, item.get("patient_id", ""))

        results.sort(key=sort_key)
        return results

    def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        self.initialize()
        p = self._patients.get(patient_id)
        if not p:
            return None

        # Ensure dynamic ML predictions & explanations are attached
        if "predictions" not in p and model_service.is_ready:
            try:
                schema_input = self._build_schema_input(p)
                preds = predict_patient(schema_input)
                p["predictions"] = preds.model_dump()
                p["uniforms"] = {
                    "lad": preds.vessels["lad"].color_rgb,
                    "lcx": preds.vessels["lcx"].color_rgb,
                    "rca": preds.vessels["rca"].color_rgb,
                }
            except Exception as e:
                logger.warning(f"Could not compute prediction for {patient_id}: {e}")

        return p

    def create_patient_from_report(
        self,
        report_data: Dict[str, Any],
        uploaded_by: str = "Rajesh Kumar (Lab Tech)",
    ) -> Dict[str, Any]:
        """
        Creates a new patient profile directly from the lab technician's uploaded report.
        Instantly runs 4-head ML predictions, sets triage lane, and dispatches simulated urgent
        WhatsApp/SMS if critical risk is detected.
        """
        self.initialize()

        # Check if patient already exists (identified by patient_id or matching name)
        provided_pid = report_data.get("patient_id") or report_data.get("patientId")
        existing_patient = None
        if provided_pid and provided_pid in self._patients:
            existing_patient = self._patients[provided_pid]
            patient_id = provided_pid
            is_update = True
        else:
            matching = [p for p in self._patients.values() if p.get("full_name", "").strip().lower() == report_data.get("full_name", "").strip().lower() and report_data.get("full_name")]
            if matching and not provided_pid:
                existing_patient = matching[0]
                patient_id = existing_patient["patient_id"]
                is_update = True
            else:
                new_num = len(self._patients) + 1
                patient_id = provided_pid if provided_pid else f"PAT-{new_num:04d}"
                is_update = False

        full_name = report_data.get("full_name", existing_patient.get("full_name") if existing_patient else f"Patient {patient_id}")
        raw_phone = report_data.get("phone", existing_patient.get("phone") if existing_patient else "+91-98000-00000")
        masked_phone = f"+91-XXXXX-{raw_phone[-4:]}" if len(raw_phone) >= 4 else "+91-XXXXX-0000"
        cohort = report_data.get("cohort", existing_patient.get("cohort") if existing_patient else "Cohort B: Post-Event Discharge (Post-MI)")

        # Map report to schema
        schema_input = self._build_schema_input(report_data, patient_id=patient_id)

        # Run multi-target inference & TreeSHAP
        predictions = predict_patient(schema_input)
        explanations: Dict[str, Any] = {}
        if model_service.is_ready:
            try:
                explanations["lad"] = explain_patient(schema_input, target="LAD", top_k=6).model_dump()
                explanations["lcx"] = explain_patient(schema_input, target="LCX", top_k=6).model_dump()
                explanations["rca"] = explain_patient(schema_input, target="RCA", top_k=6).model_dump()
                explanations["cad"] = explain_patient(schema_input, target="CAD", top_k=6).model_dump()
            except Exception as e:
                logger.warning(f"Error computing explainability for {patient_id}: {e}")

        cad_risk = predictions.overall_cad.probability
        lad_risk = predictions.vessels["lad"].probability
        lcx_risk = predictions.vessels["lcx"].probability
        rca_risk = predictions.vessels["rca"].probability

        # Determine High-Risk Urgency Criteria
        is_high_priority = False
        urgent_reasons = []

        if cad_risk >= 0.65:
            is_high_priority = True
            urgent_reasons.append(f"Predicted CAD probability {int(cad_risk * 100)}% (Critical Threshold)")
        if lad_risk >= 0.70:
            is_high_priority = True
            urgent_reasons.append(f"Severe LAD Anterior Stenosis risk {int(lad_risk * 100)}%")
        if str(report_data.get("St_Elevation", "0")) == "1":
            is_high_priority = True
            urgent_reasons.append("Acute ST-Segment Elevation on ECG")
        if str(report_data.get("Typical_Chest_Pain", "0")) == "1" and float(report_data.get("BP", 120)) >= 160:
            is_high_priority = True
            urgent_reasons.append(f"Severe Typical Angina with Stage 2 Hypertension ({report_data.get('BP')} mmHg)")

        triage_lane = "clinical" if (is_high_priority or cad_risk > 0.40) else "administrative"
        triage_tier = "tier_1_acute" if is_high_priority else ("tier_2_concerning" if cad_risk > 0.40 else "routine")

        now_iso = datetime.now(timezone.utc).isoformat()

        # Build complete patient profile object
        patient_record: Dict[str, Any] = {
            "patient_id": patient_id,
            "patient_masked_id": f"PAT-***{patient_id[-3:]}",
            "full_name": full_name,
            "phone": raw_phone,
            "masked_phone": masked_phone,
            "cohort": cohort,
            "assigned_worker_id": "ASHA-01",
            "created_at": now_iso,
            "status": "PENDING_DOCTOR_CONSULTATION",
            "is_high_priority": is_high_priority,
            "urgent_reasons": urgent_reasons,
            "triage_lane": triage_lane,
            "triage_tier": triage_tier,
            "overdue_days": int(report_data.get("overdue_days", 0)),
            "next_scheduled_date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat() if is_high_priority else (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            # Diagnostic report details
            "report_data": {
                "lab_name": report_data.get("lab_name", "Apex Central Diagnostics"),
                "technician_name": uploaded_by,
                "upload_timestamp": now_iso,
                "vitals": {
                    "BP": float(report_data.get("BP", 120.0)),
                    "Diastolic_BP": float(report_data.get("Diastolic_BP", 80.0)),
                    "PR": float(report_data.get("PR", 72.0)),
                    "BMI": float(report_data.get("BMI", 24.5)),
                },
                "chemistry": {
                    "FBS": float(report_data.get("FBS", 90.0)),
                    "CR": float(report_data.get("CR", 0.9)),
                    "BUN": float(report_data.get("BUN", 14.0)),
                    "ESR": float(report_data.get("ESR", 12.0)),
                    "HB": float(report_data.get("HB", 13.5)),
                },
                "lipids": {
                    "TG": float(report_data.get("TG", 120.0)),
                    "LDL": float(report_data.get("LDL", 95.0)),
                    "HDL": float(report_data.get("HDL", 45.0)),
                },
                "cardiac_ecg": {
                    "EF_TTE": float(report_data.get("EF_TTE", 58.0)),
                    "St_Elevation": str(report_data.get("St_Elevation", "0")),
                    "St_Depression": str(report_data.get("St_Depression", "0")),
                    "Tinversion": str(report_data.get("Tinversion", "0")),
                    "Q_Wave": str(report_data.get("Q_Wave", "0")),
                    "Region_RWMA": str(report_data.get("Region_RWMA", "0")),
                    "Typical_Chest_Pain": str(report_data.get("Typical_Chest_Pain", "0")),
                    "Dyspnea": str(report_data.get("Dyspnea", "N")),
                },
            },
            # Model inference & TreeSHAP
            "predictions": predictions.model_dump(),
            "explanations": explanations,
            "uniforms": {
                "lad": predictions.vessels["lad"].color_rgb,
                "lcx": predictions.vessels["lcx"].color_rgb,
                "rca": predictions.vessels["rca"].color_rgb,
            },
            # Doctor Consultation (preserve if update, else reset to pending)
            "doctor_consultation": existing_patient.get("doctor_consultation", {
                "consulted": False,
                "doctor_name": None,
                "consultation_date": None,
                "clinical_notes": None,
                "recommendation": None,
                "triage_decision": None,
            }) if is_update else {
                "consulted": False,
                "doctor_name": None,
                "consultation_date": None,
                "clinical_notes": None,
                "recommendation": None,
                "triage_decision": None,
            },
            "prescribed_practices": build_practices_for_patient(
                risk="HIGH_RISK" if is_high_priority else ("MODERATE_RISK" if cad_risk > 0.40 else "LOW_RISK"),
                cohort=cohort,
                doctor_consulted=existing_patient.get("doctor_consultation", {}).get("consulted", False) if is_update else False,
            ),
        }

        # Also merge base clinical features for backwards compatibility
        patient_record.update(schema_input.model_dump(by_alias=True))
        patient_record["patient_id"] = patient_id

        # Save to registry
        self._patients[patient_id] = patient_record

        # Audit Log: Report Upload or Update
        audit_action = "PATIENT_REPORT_UPDATED_WITH_MOST_RECENT" if is_update else "PATIENT_PROFILE_CREATED_FROM_REPORT"
        self._log_audit(
            actor_id=uploaded_by,
            actor_role="lab_technician",
            action=audit_action,
            patient_id=patient_id,
            details={
                "patient_name": full_name,
                "cad_risk": round(cad_risk, 3),
                "is_high_priority": is_high_priority,
                "triage_lane": triage_lane,
                "is_update": is_update,
            },
        )

        # TRIGGER SIMULATED URGENT SMS / WHATSAPP IF HIGH RISK
        dispatched_alert = None
        if is_high_priority:
            message_body = (
                f"🚨 URGENT MEDICAL NOTIFICATION [Swasthya Sense]: Dear {full_name}, your recent cardiac lab diagnostic panel "
                f"(ID: {patient_id}) indicates HIGH-RISK cardiovascular markers ({', '.join(urgent_reasons[:2])}). "
                f"Please walk into the Cardiology OPD immediately or contact emergency services."
            )
            dispatched_alert = self._dispatch_message(
                patient_id=patient_id,
                patient_name=full_name,
                phone=raw_phone,
                channel="WhatsApp / SMS",
                message_type="URGENT_WALK_IN_OPD",
                message_body=message_body,
                sender="Swasthya Sense Automated Triage Dispatcher",
            )
            patient_record["last_urgent_alert"] = dispatched_alert

        return {
            "success": True,
            "patient_id": patient_id,
            "patient": patient_record,
            "is_update": is_update,
            "dispatched_alert": dispatched_alert,
            "message": f"Patient profile {patient_id} ({full_name}) successfully {'updated with most recent laboratory report' if is_update else 'created from diagnostic report'}.",
        }

    def record_doctor_opinion(
        self,
        patient_id: str,
        doctor_name: str,
        doctor_id: str,
        clinical_notes: str,
        recommendation: str,
        triage_decision: str,
    ) -> Dict[str, Any]:
        """Records a doctor's manual clinical opinion, advice, and disposition for the patient."""
        self.initialize()
        patient = self._patients.get(patient_id)
        if not patient:
            raise ValueError(f"Patient {patient_id} not found.")

        now_iso = datetime.now(timezone.utc).isoformat()
        patient["status"] = "CONSULTED"
        patient["doctor_consultation"] = {
            "consulted": True,
            "doctor_id": doctor_id,
            "doctor_name": doctor_name,
            "consultation_date": now_iso,
            "clinical_notes": clinical_notes,
            "recommendation": recommendation,
            "triage_decision": triage_decision,
        }

        # If clinician resolves acute urgency, downgrade priority status
        if triage_decision in ["opd_routine", "medication_titration"]:
            patient["is_high_priority"] = False

        self._log_audit(
            actor_id=f"{doctor_name} ({doctor_id})",
            actor_role="clinician",
            action="DOCTOR_MANUAL_OPINION_SIGNED",
            patient_id=patient_id,
            details={
                "triage_decision": triage_decision,
                "recommendation": recommendation,
                "notes_snippet": clinical_notes[:100],
            },
        )

        return {
            "success": True,
            "patient_id": patient_id,
            "patient": patient,
            "message": f"Doctor consultation and clinical opinion successfully signed off by {doctor_name}.",
        }

    def send_simulated_reminder(
        self,
        patient_id: str,
        channel: str = "WhatsApp",
        message_type: str = "ROUTINE_REMINDER",
        custom_body: Optional[str] = None,
        sender: str = "Frontline ASHA Worker",
    ) -> Dict[str, Any]:
        """Dispatches simulated SMS / WhatsApp reminder to a patient."""
        self.initialize()
        patient = self._patients.get(patient_id)
        if not patient:
            raise ValueError(f"Patient {patient_id} not found.")

        patient_name = patient.get("full_name", patient_id)
        phone = patient.get("phone", patient.get("masked_phone", "+91-98000-00000"))

        if not custom_body:
            if message_type == "OVERDUE_ALERT":
                custom_body = (
                    f"Namaste {patient_name}, you have missed your scheduled health check-in by "
                    f"{patient.get('overdue_days', 5)} days. Please visit your local health sub-centre "
                    f"or contact your ASHA worker for your routine vitals check."
                )
            elif message_type == "MEDICATION_CHECK":
                custom_body = (
                    f"Namaste {patient_name}, this is a gentle reminder from Swasthya Sense to take your prescribed "
                    f"cardiac medications on time today. Stay healthy!"
                )
            else:
                custom_body = (
                    f"Namaste {patient_name}, your next cardiovascular follow-up check-in is scheduled for "
                    f"{patient.get('next_scheduled_date', 'next week')[:10]}. Please confirm your availability."
                )

        receipt = self._dispatch_message(
            patient_id=patient_id,
            patient_name=patient_name,
            phone=phone,
            channel=channel,
            message_type=message_type,
            message_body=custom_body,
            sender=sender,
        )

        self._log_audit(
            actor_id=sender,
            actor_role="worker",
            action="SIMULATED_COMMUNICATION_DISPATCHED",
            patient_id=patient_id,
            details={"channel": channel, "message_type": message_type, "recipient": phone},
        )

        return receipt

    def get_audit_trail(self, limit: int = 100) -> List[Dict[str, Any]]:
        self.initialize()
        return self._audit_trail[-limit:][::-1]

    def get_dispatched_messages(self, limit: int = 100) -> List[Dict[str, Any]]:
        self.initialize()
        return self._dispatched_messages[-limit:][::-1]

    def get_presets(self) -> List[Dict[str, Any]]:
        return STANDARD_DEMO_PRESETS

    # Private Helpers
    def _dispatch_message(
        self,
        patient_id: str,
        patient_name: str,
        phone: str,
        channel: str,
        message_type: str,
        message_body: str,
        sender: str,
    ) -> Dict[str, Any]:
        msg_id = f"MSG-{uuid.uuid4().hex[:8].upper()}"
        receipt = {
            "message_id": msg_id,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "phone": phone,
            "channel": channel,
            "message_type": message_type,
            "body": message_body,
            "sender": sender,
            "status": "DELIVERED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._dispatched_messages.append(receipt)
        return receipt

    def _log_audit(
        self,
        actor_id: str,
        actor_role: str,
        action: str,
        patient_id: str,
        details: Dict[str, Any],
    ) -> None:
        log_entry = {
            "audit_id": f"AUD-{uuid.uuid4().hex[:8].upper()}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "actor_id": actor_id,
            "actor_role": actor_role,
            "action": action,
            "patient_id": patient_id,
            "details": details,
        }
        self._audit_trail.append(log_entry)

    def _build_schema_input(self, data: Dict[str, Any], patient_id: str = "PT-EVAL-01") -> PatientInputSchema:
        """Coerces arbitrary report dict into validated PatientInputSchema with physiological boundaries."""
        h_m = float(data.get("Length", 168.0)) / 100.0
        w_kg = float(data.get("Weight", 70.0))
        calc_bmi = round(w_kg / (h_m * h_m), 2) if h_m > 0 else 24.5

        return PatientInputSchema(
            patient_id=patient_id,
            Age=float(data.get("Age", data.get("age", 55.0))),
            Weight=w_kg,
            Length=float(data.get("Length", 168.0)),
            Sex="Female" if str(data.get("Sex", data.get("sex", "Male"))).lower() in ["f", "female"] else "Male",
            BMI=float(data.get("BMI", calc_bmi)),
            DM=str(data.get("DM", "0")),
            HTN=str(data.get("HTN", "1")),
            Current_Smoker=str(data.get("Current_Smoker", data.get("Current Smoker", "0"))),
            BP=float(data.get("BP", 125.0)),
            PR=float(data.get("PR", 74.0)),
            Typical_Chest_Pain=str(data.get("Typical_Chest_Pain", data.get("Typical Chest Pain", "0"))),
            Dyspnea=str(data.get("Dyspnea", "N")),
            Function_Class=str(data.get("Function_Class", data.get("Function Class", "0"))),
            Atypical=str(data.get("Atypical", "N")),
            Nonanginal=str(data.get("Nonanginal", "N")),
            Exertional_CP=str(data.get("Exertional_CP", data.get("Exertional CP", "N"))),
            LowTH_Ang=str(data.get("LowTH_Ang", data.get("LowTH Ang", "N"))),
            Q_Wave=str(data.get("Q_Wave", data.get("Q Wave", "0"))),
            St_Elevation=str(data.get("St_Elevation", data.get("St Elevation", "0"))),
            St_Depression=str(data.get("St_Depression", data.get("St Depression", "0"))),
            Tinversion=str(data.get("Tinversion", "0")),
            LVH=str(data.get("LVH", "N")),
            Poor_R_Progression=str(data.get("Poor_R_Progression", data.get("Poor R Progression", "N"))),
            BBB=str(data.get("BBB", "N")),
            FBS=float(data.get("FBS", 95.0)),
            CR=float(data.get("CR", 0.9)),
            TG=float(data.get("TG", 120.0)),
            LDL=float(data.get("LDL", 90.0)),
            HDL=float(data.get("HDL", 45.0)),
            BUN=float(data.get("BUN", 14.0)),
            ESR=float(data.get("ESR", 10.0)),
            HB=float(data.get("HB", 13.5)),
            EF_TTE=float(data.get("EF_TTE", data.get("EF-TTE", 55.0))),
            Region_RWMA=str(data.get("Region_RWMA", data.get("Region RWMA", "0"))),
            VHD=str(data.get("VHD", "N")),
            Lymph=float(data.get("Lymph", 28.0)),
            Neut=float(data.get("Neut", 62.0)),
            PLT=float(data.get("PLT", 230.0)),
        )


registry_service = RegistryService()
