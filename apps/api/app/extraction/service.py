"""
Report Intake, Storage, OCR Orchestration & Value Confirmation Service
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype
"""

import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4

from apps.api.app.config import settings
from apps.api.app.extraction.models import (
    ExtractedAnalyte,
    ReportUploadRecord,
    ValueConfirmationItem,
)
from apps.api.app.extraction.ocr_extractor import extract_text_via_ocr
from apps.api.app.extraction.parser import parse_extracted_lines
from apps.api.app.extraction.pdf_extractor import (
    extract_text_and_words_from_pdf,
    has_sufficient_text_layer,
)
from apps.api.app.utils.logger import logger

# Directory for simulated file storage (mirroring Supabase Storage 'reports' bucket)
STORAGE_DIR = settings.ROOT_DIR / "uploads" / "reports"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# In-memory database records (mirrors Supabase report_uploads & extracted_values)
_UPLOADS_DB: dict[UUID, ReportUploadRecord] = {}
_AUDIT_TRAIL: list[dict] = []


class ExtractionService:
    def __init__(self):
        self.storage_dir = STORAGE_DIR

    def reset(self):
        """Test helper to reset in-memory state."""
        _UPLOADS_DB.clear()
        _AUDIT_TRAIL.clear()

    def create_upload_record(
        self,
        patient_id: UUID,
        file_name: str,
        mime_type: str,
        file_bytes: bytes,
        actor_id: UUID,
    ) -> ReportUploadRecord:
        """
        Stores file safely on disk with non-predictable UUID name and creates database record.
        """
        upload_id = uuid4()
        extension = Path(file_name).suffix.lower()
        safe_stored_name = f"{upload_id}{extension}"
        storage_path = self.storage_dir / safe_stored_name

        with open(storage_path, "wb") as f:
            f.write(file_bytes)

        record = ReportUploadRecord(
            id=upload_id,
            patient_id=patient_id,
            storage_path=str(storage_path),
            file_name=file_name,
            mime_type=mime_type,
            file_size_bytes=len(file_bytes),
            status="uploaded",
        )
        _UPLOADS_DB[upload_id] = record

        # Log audit entry
        self._log_audit(
            actor_id=actor_id,
            action="REPORT_UPLOADED",
            object_type="report_upload",
            object_id=upload_id,
            patient_id=patient_id,
            details={"file_name": file_name, "size": len(file_bytes)},
        )

        return record

    async def process_report_intake(self, upload_id: UUID):
        """
        Background extraction task:
        1. Checks for digital PDF text layer via pdfplumber.
        2. If absent or degraded/photo, runs Tesseract OCR fallback with OpenCV preprocessing.
        3. Parses candidates against clinical catalog.
        4. Updates status to 'needs_confirmation'.
        """
        record = _UPLOADS_DB.get(upload_id)
        if not record:
            return

        record.status = "extracting"
        record.updated_at = datetime.now(timezone.utc)
        file_path = Path(record.storage_path)

        try:
            is_pdf = file_path.suffix.lower() == ".pdf"
            extracted_lines = []
            method: Literal["pdf_text_layer", "tesseract_ocr"] = "pdf_text_layer"

            if is_pdf and has_sufficient_text_layer(file_path):
                logger.info(f"Using digital text-layer extractor for {record.file_name}")
                extracted_lines = extract_text_and_words_from_pdf(file_path)
            else:
                logger.info(f"Using Tesseract OCR fallback extractor for {record.file_name}")
                method = "tesseract_ocr"
                # Run OCR in executor to avoid blocking event loop
                loop = asyncio.get_event_loop()
                extracted_lines = await loop.run_in_executor(None, extract_text_via_ocr, file_path)

            # Match against catalog
            extracted_analytes = parse_extracted_lines(extracted_lines, upload_id=upload_id)
            record.extracted_values = extracted_analytes
            record.status = "needs_confirmation"
            record.updated_at = datetime.now(timezone.utc)

            logger.info(
                f"Extraction complete for upload {upload_id}: "
                f"{len(extracted_analytes)} analytes found via {method}."
            )

        except Exception as e:
            logger.error(f"Extraction error for upload {upload_id}: {e}", exc_info=True)
            record.status = "failed"
            record.error_message = str(e)
            record.updated_at = datetime.now(timezone.utc)

    def get_upload_record(self, upload_id: UUID) -> ReportUploadRecord | None:
        return _UPLOADS_DB.get(upload_id)

    def list_patient_uploads(self, patient_id: UUID) -> list[ReportUploadRecord]:
        return [r for r in _UPLOADS_DB.values() if r.patient_id == patient_id]

    def confirm_extracted_values(
        self,
        upload_id: UUID,
        confirmations: list[ValueConfirmationItem],
        confirmed_by: UUID,
    ) -> ReportUploadRecord:
        """
        Stores human-confirmed values with audit logging.
        Hard gate: downstream rule engine and readout cannot execute on unconfirmed values.
        """
        record = _UPLOADS_DB.get(upload_id)
        if not record:
            raise ValueError(f"Report upload {upload_id} not found")

        now = datetime.now(timezone.utc)
        confirmation_map = {c.analyte_id: c.confirmed_value for c in confirmations}

        audit_edits = []

        for analyte in record.extracted_values:
            if analyte.analyte_id in confirmation_map:
                old_val = analyte.value
                new_val = confirmation_map[analyte.analyte_id]

                analyte.confirmed_value = new_val
                analyte.confirmed_by = confirmed_by
                analyte.confirmed_at = now

                audit_edits.append({
                    "analyte_id": analyte.analyte_id,
                    "extracted_value": old_val,
                    "confirmed_value": new_val,
                    "was_edited": old_val != new_val,
                })

        record.status = "confirmed"
        record.updated_at = now

        self._log_audit(
            actor_id=confirmed_by,
            action="REPORT_VALUES_CONFIRMED",
            object_type="report_upload",
            object_id=upload_id,
            patient_id=record.patient_id,
            details={"confirmations": audit_edits},
        )

        return record

    def get_confirmed_values_for_patient(self, patient_id: UUID) -> list[dict]:
        """
        Strict retrieval: returns ONLY values that have been explicitly confirmed by a human.
        """
        results = []
        for upload in _UPLOADS_DB.values():
            if upload.patient_id == patient_id and upload.status == "confirmed":
                for val in upload.extracted_values:
                    if val.confirmed_value is not None:
                        results.append({
                            "analyte_id": val.analyte_id,
                            "analyte_name": val.analyte_name,
                            "confirmed_value": val.confirmed_value,
                            "unit": val.unit,
                            "reference_low": val.reference_low,
                            "reference_high": val.reference_high,
                            "confirmed_at": val.confirmed_at.isoformat() if val.confirmed_at else None,
                        })
        return results

    def _log_audit(
        self,
        actor_id: UUID,
        action: str,
        object_type: str,
        object_id: UUID,
        patient_id: UUID,
        details: dict,
    ):
        entry = {
            "id": uuid4(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "actor_id": str(actor_id),
            "action": action,
            "object_type": object_type,
            "object_id": str(object_id),
            "patient_id": str(patient_id),
            "details": details,
        }
        _AUDIT_TRAIL.append(entry)
        logger.info(f"Audit record written: {action} on {object_type}:{object_id}")


extraction_service = ExtractionService()
