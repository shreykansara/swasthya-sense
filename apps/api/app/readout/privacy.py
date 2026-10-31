"""
Privacy Filter for LLM Boundary
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype

Non-negotiable principle: Data Minimization & Privacy.
Strips all patient identifiers, names, IDs, dates of birth, phones, and metadata
before any payload is transmitted to the Groq API.
Only confirmed analyte names, numbers, units, and reference ranges cross the boundary.
"""

import re
from typing import Any
from apps.api.app.readout.models import AnalyteReadoutItem

# Common PII detection patterns
UUID_REGEX = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.IGNORECASE)
PHONE_REGEX = re.compile(r"(\+91[\-\s]?)?[6-9]\d{9}")
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")


def build_privacy_filtered_payload(items: list[AnalyteReadoutItem]) -> list[dict[str, Any]]:
    """
    Constructs a strictly sanitized clinical payload containing exclusively:
    - Analyte name
    - Numerical value
    - Unit
    - Reference range bounds (low, high)
    """
    sanitized: list[dict[str, Any]] = []
    for item in items:
        entry = {
            "test_name": item.display_name,
            "result_value": item.value,
            "unit": item.unit,
            "reference_low": item.reference_low,
            "reference_high": item.reference_high,
        }
        sanitized.append(entry)
    return sanitized


def scan_for_pii(data: Any) -> list[str]:
    """
    Recursively scans a data structure for any leaked PII (UUIDs, phones, emails, prohibited keys).
    Returns a list of violations found.
    """
    prohibited_keys = {
        "patient_id", "user_id", "patient_name", "name", "phone", "mobile",
        "email", "dob", "birth_date", "address", "aadhaar", "mrn", "id"
    }
    violations: list[str] = []

    def _traverse(node: Any, current_path: str = ""):
        if isinstance(node, dict):
            for k, v in node.items():
                if k.lower() in prohibited_keys:
                    violations.append(f"Prohibited key '{k}' found at path '{current_path}.{k}'")
                _traverse(v, f"{current_path}.{k}")
        elif isinstance(node, list):
            for idx, el in enumerate(node):
                _traverse(el, f"{current_path}[{idx}]")
        elif isinstance(node, str):
            if UUID_REGEX.search(node):
                violations.append(f"UUID pattern detected in string: '{node}'")
            if PHONE_REGEX.search(node):
                violations.append(f"Phone pattern detected in string: '{node}'")
            if EMAIL_REGEX.search(node):
                violations.append(f"Email pattern detected in string: '{node}'")

    _traverse(data)
    return violations
