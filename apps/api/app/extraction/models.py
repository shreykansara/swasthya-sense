"""
Data Models for Report Intake and Extraction
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype
"""

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID, uuid4
from pydantic import BaseModel, Field

UploadStatus = Literal["uploaded", "extracting", "needs_confirmation", "confirmed", "failed"]


class BoundingBox(BaseModel):
    x: float
    y: float
    w: float
    h: float
    page: int = 1


class ExtractedAnalyte(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    upload_id: UUID
    analyte_id: str
    analyte_name: str
    raw_text: str = ""
    value: float | None = None
    unit: str | None = None
    reference_low: float | None = None
    reference_high: float | None = None
    confidence: float = 1.0  # 0.0 to 1.0
    page: int = 1
    bbox: BoundingBox | None = None
    flag_out_of_plausible_range: bool = False
    flag_unit_mismatch: bool = False
    flag_low_confidence: bool = False
    confirmed_value: float | None = None
    confirmed_by: UUID | None = None
    confirmed_at: datetime | None = None

    @property
    def analyte_key(self) -> str:
        return self.analyte_id

    @property
    def display_name(self) -> str:
        return self.analyte_name

    @property
    def is_confirmed(self) -> bool:
        return bool(self.confirmed_at is not None or self.confirmed_value is not None)


class ReportUploadRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    patient_id: UUID
    storage_path: str
    file_name: str
    mime_type: str
    file_size_bytes: int
    status: UploadStatus = "uploaded"
    error_message: str | None = None
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    extracted_values: list[ExtractedAnalyte] = Field(default_factory=list)


class ValueConfirmationItem(BaseModel):
    analyte_id: str
    confirmed_value: float


class ConfirmReportRequest(BaseModel):
    confirmed_values: list[ValueConfirmationItem]


class ExtractionSummary(BaseModel):
    upload_id: UUID
    patient_id: UUID
    status: UploadStatus
    method_used: Literal["pdf_text_layer", "tesseract_ocr"]
    total_extracted: int
    low_confidence_count: int
    plausible_range_flag_count: int
    extracted_values: list[ExtractedAnalyte]


# Backward/Inter-module compatibility aliases
ExtractedValueRecord = ExtractedAnalyte
ExtractedValueConfirmation = ValueConfirmationItem
