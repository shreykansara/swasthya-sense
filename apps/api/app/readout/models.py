"""
Data models for Plain-Language Readout Generation
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype
"""

from typing import Literal
from uuid import UUID
from pydantic import BaseModel, Field

ReadoutStatus = Literal["within_range", "higher", "lower", "informational"]
SupportedLanguage = Literal["en", "hi"]
ReadoutSource = Literal["groq", "deterministic_template"]


class AnalyteReadoutItem(BaseModel):
    analyte_key: str
    display_name: str
    value: float
    unit: str
    reference_low: float | None = None
    reference_high: float | None = None
    status: ReadoutStatus = "informational"


class ReadoutRequest(BaseModel):
    patient_id: UUID
    report_upload_id: UUID | None = None
    items: list[AnalyteReadoutItem] = Field(default_factory=list)
    language: SupportedLanguage = "en"


class ReadoutResponse(BaseModel):
    patient_id: UUID
    language: SupportedLanguage
    source: ReadoutSource
    readout_text: str
    items: list[AnalyteReadoutItem]
    disclaimer: str = (
        "Prototype — synthetic data only — not a medical device. "
        "This readout explains your laboratory values against reference ranges. "
        "It does not diagnose any illness. A clinician will review these values and discuss next steps with you."
    )
