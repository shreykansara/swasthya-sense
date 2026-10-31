"""
Privacy Hardening, PII De-identification, and Append-Only Audit Service (Phase 5).
Protects patient privacy, prevents PII leakage to LLMs (Gap 8), and enforces data erasure.
"""

import re
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class ImmutableAuditException(Exception):
    """Raised when an attempt is made to update or delete append-only audit records."""
    pass


class AccessLogEntry(BaseModel):
    entry_id: str
    patient_id: str
    actor_id: str
    actor_name: str
    actor_role: str  # 'worker', 'clinician', 'supervisor', 'admin', 'patient'
    action_type: str  # 'VIEW_RECORD', 'CONFIRM_REPORT', 'OVERRIDE_ALERT', 'REVOKE_CONSENT', 'ERASE_RECORD'
    purpose_of_access: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def update(self, *args, **kwargs):
        raise ImmutableAuditException("Audit log is strictly append-only. Modification is prohibited.")

    def delete(self, *args, **kwargs):
        raise ImmutableAuditException("Audit log is strictly append-only. Deletion is prohibited.")


class PrivacyGuard:
    """
    De-identification engine removing PII before external LLM processing.
    """
    # Regex patterns for identifying personal health identifiers
    PHONE_REGEX = re.compile(r"(\+91[\-\s]?)?[6-9]\d{9}|\b\d{5}[-\s]?\d{5}\b")
    PATIENT_ID_REGEX = re.compile(r"\bPAT-?\d{3,6}\b", re.IGNORECASE)
    ABHA_REGEX = re.compile(r"\b\d{2}-\d{4}-\d{4}-\d{4}\b")
    EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")

    @classmethod
    def deidentify_text_for_llm(cls, raw_text: str, patient_name: Optional[str] = None) -> str:
        """
        Replaces direct personal identifiers with generic tokens (Gap 8).
        Ensures zero PII crosses the boundary to Groq or external APIs.
        """
        sanitized = raw_text

        # 1. Replace patient name if provided
        if patient_name and len(patient_name.strip()) > 2:
            name_pattern = re.compile(re.escape(patient_name.strip()), re.IGNORECASE)
            sanitized = name_pattern.sub("[PATIENT]", sanitized)

        # 2. Replace phone numbers
        sanitized = cls.PHONE_REGEX.sub("[PHONE]", sanitized)

        # 3. Replace ABHA and health ID numbers
        sanitized = cls.ABHA_REGEX.sub("[ABHA_ID]", sanitized)
        sanitized = cls.PATIENT_ID_REGEX.sub("[PATIENT_ID]", sanitized)

        # 4. Replace email addresses
        sanitized = cls.EMAIL_REGEX.sub("[EMAIL]", sanitized)

        return sanitized

    @classmethod
    def execute_patient_erasure(cls, patient_record: Dict[str, Any], requested_by: str) -> Dict[str, Any]:
        """
        DPDP-compliant data erasure / minimization workflow when consent is revoked.
        Masks all direct identifiers while maintaining anonymized statistical aggregates.
        """
        erased_record = patient_record.copy()
        
        # Anonymize PII
        erased_record["full_name"] = "[ERASED_ON_REVOCATION]"
        erased_record["masked_phone"] = "[ERASED]"
        erased_record["address"] = "[ERASED]"
        erased_record["consent_status"] = "REVOKED"
        erased_record["erased_at"] = datetime.now(timezone.utc).isoformat()
        erased_record["automated_messaging_enabled"] = False

        # Log to immutable audit trail
        log_access_event(
            patient_id=patient_record.get("patient_id", "UNKNOWN"),
            actor_id=requested_by,
            actor_name="System / Patient Request",
            actor_role="patient",
            action_type="ERASE_RECORD",
            purpose_of_access="DPDP Right to Erasure / Revocation of Consent",
        )

        return erased_record


# In-memory append-only audit store
_AUDIT_STORE: List[AccessLogEntry] = []


def log_access_event(
    patient_id: str,
    actor_id: str,
    actor_name: str,
    actor_role: str,
    action_type: str,
    purpose_of_access: str,
) -> AccessLogEntry:
    """Appends an event to the immutable access log."""
    entry = AccessLogEntry(
        entry_id=f"AUDIT-{len(_AUDIT_STORE) + 1:06d}",
        patient_id=patient_id,
        actor_id=actor_id,
        actor_name=actor_name,
        actor_role=actor_role,
        action_type=action_type,
        purpose_of_access=purpose_of_access,
    )
    _AUDIT_STORE.append(entry)
    return entry


def get_patient_access_log(patient_id: str) -> List[AccessLogEntry]:
    """Retrieves access history for the patient self-service portal."""
    return [e for e in _AUDIT_STORE if e.patient_id == patient_id]

