"""
Forbidden Terms & Output Verification Guards
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype

Enforces:
1. Zero diagnostic words, condition names, or disease labels (English & Hindi).
2. Number preservation: model output cannot hallucinate new clinical measurement numbers.
"""

from pathlib import Path
import re
from typing import Set
import yaml

from apps.api.app.config import ROOT_DIR
from apps.api.app.utils.logger import logger

GUARD_YAML_PATH = ROOT_DIR / "guards" / "forbidden_terms.yaml"


class ForbiddenTermsGuard:
    def __init__(self, yaml_path: Path = GUARD_YAML_PATH):
        self.yaml_path = yaml_path
        self.english_terms: list[str] = []
        self.hindi_terms: list[str] = []
        self._compiled_en_patterns: list[tuple[str, re.Pattern]] = []
        self.load_terms()

    def load_terms(self):
        if not self.yaml_path.exists():
            logger.warning(f"Forbidden terms file not found at {self.yaml_path}")
            return

        with open(self.yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        self.english_terms = [t.strip().lower() for t in data.get("english", []) if t.strip()]
        self.hindi_terms = [t.strip() for t in data.get("hindi", []) if t.strip()]

        # Precompile word-boundary regexes for English terms
        self._compiled_en_patterns = []
        for term in self.english_terms:
            pattern = re.compile(rf"\b{re.escape(term)}\b", re.IGNORECASE)
            self._compiled_en_patterns.append((term, pattern))

    def check_text(self, text: str) -> tuple[bool, list[str]]:
        """
        Scans text for any forbidden diagnostic/condition terms.
        Returns:
            (is_clean: bool, matched_terms: list[str])
        """
        if not text:
            return True, []

        matches: list[str] = []

        # 1. Check English terms with word boundaries
        for term, pattern in self._compiled_en_patterns:
            if pattern.search(text):
                matches.append(term)

        # 2. Check Hindi terms (substring matching for Unicode Devanagari)
        for term in self.hindi_terms:
            if term in text:
                matches.append(term)

        is_clean = len(matches) == 0
        if not is_clean:
            logger.warning(f"Forbidden terms guard triggered! Matched: {matches}")
        return is_clean, matches


def extract_numbers_from_text(text: str) -> set[float]:
    """Finds all integer and floating point numbers in text."""
    matches = re.findall(r"(?<![a-zA-Z0-9_\-\.])\d+(?:\.\d+)?(?![a-zA-Z0-9_\-\.])", text)
    numbers = set()
    for m in matches:
        try:
            numbers.add(float(m))
        except ValueError:
            pass
    return numbers


def verify_number_preservation(
    output_text: str,
    allowed_numbers: set[float],
    tolerated_metadata_numbers: set[float] | None = None,
) -> tuple[bool, list[float]]:
    """
    Verifies that all measurement numbers mentioned in output_text exist in allowed_numbers
    (or are harmless metadata numbers like 6 in 'Class 6', or standard 0, 1, 24, 100 for percentage).
    """
    if tolerated_metadata_numbers is None:
        tolerated_metadata_numbers = {0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 24.0, 48.0, 72.0, 100.0}

    found_numbers = extract_numbers_from_text(output_text)
    hallucinated: list[float] = []

    for num in found_numbers:
        # Check if number matches an allowed input number within small float tolerance (0.01)
        matched_input = any(abs(num - allowed) < 0.01 for allowed in allowed_numbers)
        matched_tolerated = any(abs(num - tol) < 0.01 for tol in tolerated_metadata_numbers)

        if not (matched_input or matched_tolerated):
            hallucinated.append(num)

    is_valid = len(hallucinated) == 0
    if not is_valid:
        logger.warning(f"Number verification failed! Hallucinated numbers found: {hallucinated}")
    return is_valid, hallucinated


guard = ForbiddenTermsGuard()
