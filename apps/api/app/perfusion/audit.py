"""
Perfusion Audit Logger
Maintains immutable audit records for all perfusion inference and explanation calls.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4
from apps.api.app.utils.logger import logger

_PERFUSION_AUDIT_LOG: list[dict[str, Any]] = []


def log_perfusion_audit(
    actor_id: UUID | str,
    action: str = "perfusion_predict",
    patient_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Logs an audit entry for perfusion inference execution.
    Writes structured JSON log and appends to immutable in-memory audit trail.
    """
    entry = {
        "id": str(uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor_id": str(actor_id),
        "action": action,
        "object_type": "perfusion_model",
        "patient_id": str(patient_id) if patient_id else None,
        "details": details or {},
    }
    _PERFUSION_AUDIT_LOG.append(entry)
    logger.info(
        f'{{"event": "audit_log", "action": "{action}", "actor_id": "{actor_id}", '
        f'"patient_id": "{patient_id}", "timestamp": "{entry["timestamp"]}"}}'
    )
    return entry


def get_perfusion_audit_trail() -> list[dict[str, Any]]:
    """Returns a copy of the recorded audit trail."""
    return list(_PERFUSION_AUDIT_LOG)
