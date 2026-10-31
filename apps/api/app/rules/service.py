"""
Case Flags Service & Persistence
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype

Manages clinical urgency flags generated when report values are confirmed.
Stores immutable audit trails and supports clinician overrides with required reasons.
"""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from apps.api.app.extraction.models import ExtractedAnalyte
from apps.api.app.rules.engine import rule_engine
from apps.api.app.rules.models import (
    AnalyteMeasurement,
    CaseFlagRecord,
    EvaluationResult,
    PatientEvaluationContext,
    UrgencyTier,
)
from apps.api.app.utils.logger import logger

# In-memory store for case flags (mirrors Supabase case_flags table)
_CASE_FLAGS_DB: dict[UUID, CaseFlagRecord] = {}


def reset_case_flags_store():
    """Testing helper to clear case flags."""
    _CASE_FLAGS_DB.clear()


class CaseFlagService:
    def evaluate_and_persist_flags(
        self,
        patient_id: UUID,
        upload_id: UUID | None,
        confirmed_values: list[ExtractedAnalyte],
        cohort: str = "any",
        historical_values: list[AnalyteMeasurement] | None = None,
    ) -> list[CaseFlagRecord]:
        """
        Runs rule engine across confirmed values, persists generated flags,
        and returns all newly created case flag records.
        """
        current_measurements: list[AnalyteMeasurement] = []
        for v in confirmed_values:
            if v.is_confirmed:
                val = v.confirmed_value if v.confirmed_value is not None else v.value
                if val is not None:
                    current_measurements.append(
                        AnalyteMeasurement(
                            analyte_key=v.analyte_key,
                            value=val,
                            unit=v.unit or "",
                            recorded_at=datetime.now(timezone.utc),
                        )
                    )

        ctx = PatientEvaluationContext(
            patient_id=patient_id,
            cohort=cohort,
            current_values=current_measurements,
            historical_values=historical_values or [],
        )

        eval_result: EvaluationResult = rule_engine.evaluate(ctx)
        created_flags: list[CaseFlagRecord] = []

        now = datetime.now(timezone.utc)
        for match in eval_result.matched_rules:
            flag = CaseFlagRecord(
                id=uuid4(),
                patient_id=patient_id,
                upload_id=upload_id,
                urgency=match.urgency,
                rule_id=match.rule_id,
                rule_version=match.rule_version,
                reason_code=match.reason_code,
                contributions=[c.model_dump() for c in match.contributions],
                patient_explanation=match.patient_explanation,
                clinician_summary=match.clinician_summary,
                status="open",
                clinician_override=None,
                created_at=now,
            )
            _CASE_FLAGS_DB[flag.id] = flag
            created_flags.append(flag)
            logger.info(
                f"Generated CaseFlag {flag.id}: patient={patient_id}, rule={match.rule_id}, "
                f"urgency={match.urgency}, reason={match.reason_code}"
            )

        return created_flags

    def get_flags_for_patient(self, patient_id: UUID) -> list[CaseFlagRecord]:
        """Returns all case flags for a patient."""
        return [f for f in _CASE_FLAGS_DB.values() if f.patient_id == patient_id]

    def get_all_flags(self) -> list[CaseFlagRecord]:
        """Returns all case flags across all patients."""
        return list(_CASE_FLAGS_DB.values())

    def get_flag_by_id(self, flag_id: UUID) -> CaseFlagRecord | None:
        """Retrieves a single flag by ID."""
        return _CASE_FLAGS_DB.get(flag_id)

    def record_clinician_override(
        self,
        flag_id: UUID,
        clinician_id: UUID,
        new_urgency: UrgencyTier,
        reason: str,
    ) -> CaseFlagRecord:
        """
        Records a clinician's override of a rule urgency tier with a mandatory reason.
        """
        flag = _CASE_FLAGS_DB.get(flag_id)
        if not flag:
            raise ValueError(f"Case flag '{flag_id}' not found.")

        if not reason or not reason.strip():
            raise ValueError("Clinician override requires an explicit, non-empty reason.")

        now = datetime.now(timezone.utc)
        flag.urgency = new_urgency
        flag.status = "overridden"
        flag.clinician_override = {
            "clinician_id": str(clinician_id),
            "new_urgency": new_urgency,
            "reason": reason.strip(),
            "overridden_at": now.isoformat(),
        }
        logger.info(
            f"Clinician override recorded on flag {flag_id} by {clinician_id}: "
            f"new_urgency={new_urgency}, reason='{reason}'"
        )
        return flag


case_flag_service = CaseFlagService()
