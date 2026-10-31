"""
Clinical Rule Engine Data Models
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype

Non-negotiable principles:
1. Urgency tiers: urgent, soon, routine. NEVER a condition or disease name.
2. Signed-off governance: rules must have a valid sign-off to execute.
3. Waterfall contribution schema: provides data for why-flagged visual component.
"""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID
from pydantic import BaseModel, Field

UrgencyTier = Literal["urgent", "soon", "routine"]
RuleOperator = Literal[">", ">=", "<", "<=", "==", "delta_gte", "delta_lte"]


class RuleCondition(BaseModel):
    analyte: str
    operator: RuleOperator
    threshold: float
    unit: str
    lookback_days: int | None = None


class ClinicalRule(BaseModel):
    rule_id: str
    version: str = "1.0"
    title: str
    description: str
    cohort: str = "any"
    urgency: UrgencyTier
    reason_code: str
    conditions: list[RuleCondition]
    patient_explanation: str
    clinician_summary: str
    signed_off_by: str | None = None
    signed_off_at: str | None = None

    @property
    def is_signed_off(self) -> bool:
        return bool(self.signed_off_by and self.signed_off_by.strip())


class AnalyteMeasurement(BaseModel):
    analyte_key: str
    value: float
    unit: str
    recorded_at: datetime | None = None


class PatientEvaluationContext(BaseModel):
    patient_id: UUID
    cohort: str = "any"
    current_values: list[AnalyteMeasurement] = Field(default_factory=list)
    historical_values: list[AnalyteMeasurement] = Field(default_factory=list)


class RuleContribution(BaseModel):
    analyte: str
    current_value: float
    baseline_value: float | None = None
    threshold: float
    unit: str
    delta: float | None = None
    divergence_score: float = 0.0  # Normalized difference for waterfall visualization
    summary: str


class RuleMatchResult(BaseModel):
    rule_id: str
    rule_version: str
    title: str
    urgency: UrgencyTier
    reason_code: str
    patient_explanation: str
    clinician_summary: str
    contributions: list[RuleContribution] = Field(default_factory=list)


class EvaluationResult(BaseModel):
    patient_id: UUID
    highest_urgency: UrgencyTier
    matched_rules: list[RuleMatchResult] = Field(default_factory=list)


class CaseFlagRecord(BaseModel):
    id: UUID
    patient_id: UUID
    upload_id: UUID | None = None
    urgency: UrgencyTier
    rule_id: str
    rule_version: str
    reason_code: str
    contributions: list[dict[str, Any]] = Field(default_factory=list)
    patient_explanation: str
    clinician_summary: str
    status: Literal["open", "acknowledged", "resolved", "overridden"] = "open"
    clinician_override: dict[str, Any] | None = None
    created_at: datetime
