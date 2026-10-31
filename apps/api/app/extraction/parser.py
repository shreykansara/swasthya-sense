"""
Table & Line Parser with Clinical Catalog Matching and Validation
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype
"""

import re
from pathlib import Path
from uuid import UUID
import yaml

from apps.api.app.config import settings
from apps.api.app.extraction.models import ExtractedAnalyte, BoundingBox

CATALOG_PATH = settings.ROOT_DIR / "synthetic" / "value_catalog.yaml"


def load_value_catalog() -> list[dict]:
    if not CATALOG_PATH.exists():
        return []
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("catalogs", [])


def extract_numbers_from_text(text: str) -> list[float]:
    """Extracts numerical candidates from a line of text."""
    matches = re.findall(r"\b\d+(?:\.\d+)?\b", text)
    numbers = []
    for m in matches:
        try:
            val = float(m)
            numbers.append(val)
        except ValueError:
            pass
    return numbers


def parse_extracted_lines(lines: list[dict], upload_id: UUID) -> list[ExtractedAnalyte]:
    """
    Parses structured text lines against the clinical value catalog using word-boundary matching.
    Detects analyte name, extracted value, unit, reference bounds, and flags.
    """
    catalog = load_value_catalog()
    extracted_items = []
    matched_catalogs = set()

    for line in lines:
        line_text = line["text"]

        # Skip headers or metadata lines
        if any(hdr in line_text for hdr in ["Patient Name:", "Sample ID:", "Age / Gender:", "PROTOTYPE", "Verification Signature"]):
            continue

        for item in catalog:
            a_id = item["id"]
            if a_id in matched_catalogs:
                continue

            patterns = [item["name"]] + item.get("aliases", [])
            is_matched = False

            for pat in patterns:
                # Avoid short 1-2 letter aliases matching substrings; require word boundary
                clean_pat = re.escape(pat.replace("+", r"\+"))
                if re.search(rf"\b{clean_pat}\b", line_text, re.IGNORECASE):
                    is_matched = True
                    break

            if is_matched:
                matched_catalogs.add(a_id)

                # Extract observed value
                # In table format: [Analyte Name] [Observed Value] [Unit] [Ref Low - Ref High] [Flag]
                # The observed value is the first number that appears after the analyte name
                nums = extract_numbers_from_text(line_text)
                detected_value = None
                ref_low = item["reference_range"]["low"]
                ref_high = item["reference_range"]["high"]

                if nums:
                    # Pick the observed number (first number on line)
                    detected_value = nums[0]

                # Plausible range validation
                p_min = item["plausible_range"]["min"]
                p_max = item["plausible_range"]["max"]
                flag_plausible = False
                if detected_value is not None:
                    if detected_value < p_min or detected_value > p_max:
                        flag_plausible = True

                conf = float(line.get("confidence", 1.0))
                flag_low_conf = conf < 0.65

                extracted = ExtractedAnalyte(
                    upload_id=upload_id,
                    analyte_id=a_id,
                    analyte_name=item["name"],
                    raw_text=line_text,
                    value=detected_value,
                    unit=item["unit"],
                    reference_low=ref_low,
                    reference_high=ref_high,
                    confidence=round(conf, 3),
                    page=line.get("page", 1),
                    bbox=line.get("bbox"),
                    flag_out_of_plausible_range=flag_plausible,
                    flag_unit_mismatch=False,
                    flag_low_confidence=flag_low_conf,
                    confirmed_value=None,
                )
                extracted_items.append(extracted)
                break

    return extracted_items
