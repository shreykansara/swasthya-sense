"""
Consent Management & Enforcement Subsystem
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype

Non-negotiable principle: Consent first.
Consent is captured before upload and messaging, is revocable at any time,
and gates every feature. No consent means stop and store nothing.
"""

from datetime import datetime, timezone
from typing import Annotated, Callable, Literal
from uuid import UUID, uuid4
from fastapi import Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from apps.api.app.auth import CurrentUser, get_current_user
from apps.api.app.utils.logger import logger

ConsentScope = Literal["data_storage", "report_upload", "messaging"]
MessagingChannel = Literal["sms", "whatsapp"]


class ConsentRecord(BaseModel):
    id: UUID
    patient_id: UUID
    scope: ConsentScope
    channel: MessagingChannel | None = None
    granted_at: datetime
    revoked_at: datetime | None = None
    consent_version: str = "v1.0"
    captured_by: UUID


class ConsentGrantRequest(BaseModel):
    patient_id: UUID
    scope: ConsentScope
    channel: MessagingChannel | None = None
    consent_version: str = "v1.0"


class ConsentStatusResponse(BaseModel):
    patient_id: UUID
    has_data_storage: bool = False
    has_report_upload: bool = False
    has_messaging: bool = False
    active_channels: list[MessagingChannel] = Field(default_factory=list)
    active_consents: list[ConsentRecord] = Field(default_factory=list)


# In-memory store for active and historical consent records (mirrors Supabase consent_records table)
_CONSENT_DB: dict[UUID, ConsentRecord] = {}


def reset_consent_store():
    """Testing helper to clear consent records."""
    _CONSENT_DB.clear()


def store_consent_record(
    patient_id: UUID,
    scope: ConsentScope,
    captured_by: UUID,
    channel: MessagingChannel | None = None,
    consent_version: str = "v1.0",
) -> ConsentRecord:
    """Creates an active consent record in the store."""
    rec = ConsentRecord(
        id=uuid4(),
        patient_id=patient_id,
        scope=scope,
        channel=channel,
        granted_at=datetime.now(timezone.utc),
        revoked_at=None,
        consent_version=consent_version,
        captured_by=captured_by,
    )
    _CONSENT_DB[rec.id] = rec
    logger.info(f"Consent granted: patient={patient_id}, scope={scope}, channel={channel}")
    return rec


def revoke_consent_record(consent_id: UUID) -> ConsentRecord | None:
    """Revokes a specific consent record by ID."""
    rec = _CONSENT_DB.get(consent_id)
    if not rec:
        return None
    if rec.revoked_at is None:
        rec.revoked_at = datetime.now(timezone.utc)
        logger.info(f"Consent revoked: id={consent_id}, patient={rec.patient_id}, scope={rec.scope}")
    return rec


def revoke_patient_scope(patient_id: UUID, scope: ConsentScope) -> int:
    """Revokes all active consents for a patient and scope."""
    count = 0
    now = datetime.now(timezone.utc)
    for rec in _CONSENT_DB.values():
        if rec.patient_id == patient_id and rec.scope == scope and rec.revoked_at is None:
            rec.revoked_at = now
            count += 1
    return count


def get_patient_consent_status(patient_id: UUID) -> ConsentStatusResponse:
    """Aggregates all active consents for a patient."""
    active = [
        rec for rec in _CONSENT_DB.values()
        if rec.patient_id == patient_id and rec.revoked_at is None
    ]

    has_storage = any(r.scope == "data_storage" for r in active)
    has_upload = any(r.scope == "report_upload" for r in active)
    messaging_records = [r for r in active if r.scope == "messaging"]
    has_msg = len(messaging_records) > 0
    channels = [r.channel for r in messaging_records if r.channel is not None]

    return ConsentStatusResponse(
        patient_id=patient_id,
        has_data_storage=has_storage,
        has_report_upload=has_upload,
        has_messaging=has_msg,
        active_channels=channels,
        active_consents=active,
    )


def check_consent(patient_id: UUID, scope: ConsentScope, channel: MessagingChannel | None = None) -> bool:
    """Pure check whether a patient has active consent."""
    status = get_patient_consent_status(patient_id)
    if scope == "data_storage":
        return status.has_data_storage
    elif scope == "report_upload":
        return status.has_report_upload and status.has_data_storage
    elif scope == "messaging":
        if not status.has_messaging:
            return False
        if channel and channel not in status.active_channels:
            return False
        return True
    return False


def require_consent(scope: ConsentScope, channel: MessagingChannel | None = None) -> Callable:
    """
    FastAPI dependency factory enforcing that the target patient_id
    has active, unrevoked consent for the requested scope.
    """
    async def consent_dependency(
        patient_id: Annotated[UUID, Query(description="Target patient UUID")],
        current_user: Annotated[CurrentUser, Depends(get_current_user)],
    ) -> bool:
        # Check active consent in system
        if not check_consent(patient_id, scope, channel):
            logger.warning(
                f"Blocked action: patient {patient_id} lacks active consent for scope '{scope}' "
                f"(channel={channel}). Actor: {current_user.id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "CONSENT_REQUIRED",
                    "message": f"Active consent for scope '{scope}' has not been granted or was revoked.",
                    "scope": scope,
                    "patient_id": str(patient_id),
                },
            )
        return True

    return consent_dependency
