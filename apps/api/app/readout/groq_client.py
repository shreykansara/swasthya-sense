"""
Groq LLM Client with Guarded Output Verification & Deterministic Fallback
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype

Non-negotiable principles:
1. Never diagnose or name conditions.
2. Strip PII before sending.
3. Output guard: verify zero forbidden words and zero hallucinated numbers.
4. Resilient fallback: seamlessly falls back to deterministic template if key is missing,
   network fails, or guard checks detect any violation.
"""

import json
from typing import Any
import httpx
from groq import Groq

from apps.api.app.config import settings
from apps.api.app.readout.guard import guard, verify_number_preservation
from apps.api.app.readout.models import AnalyteReadoutItem, ReadoutResponse, SupportedLanguage
from apps.api.app.readout.privacy import build_privacy_filtered_payload, scan_for_pii
from apps.api.app.readout.template import generate_deterministic_readout
from apps.api.app.utils.logger import logger


SYSTEM_PROMPT = """You are a health report plain-language communicator for a clinical follow-up prototype.
Your task is to explain laboratory test numbers in simple, clear language at a Class 6 reading level for patients.

CRITICAL NON-NEGOTIABLE RULES:
1. NEVER DIAGNOSE. You must NEVER name any medical condition, disease, illness, or diagnosis (do NOT mention heart failure, heart attack, CAD, myocardial infarction, angina, ischemia, hypertension, diabetes, or any other disease).
2. LIMIT STATEMENTS STRICTLY to what was tested, the exact result value, and whether it is within, above, or below the lab reference range.
3. PRESERVE NUMBERS EXACTLY. Mention only the exact numbers given in the input. Do not invent, round, or hallucinate new numbers.
4. NEXT STEPS: Always mention that a licensed clinician will review these values with the patient.
5. DISCLAIMER: Always state that this is a prototype explanation and not a medical diagnosis.
6. LANGUAGE: Respond strictly in the requested language ({lang_name}).
"""


def get_groq_client() -> Groq | None:
    """Returns an authenticated Groq client if API key is configured."""
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY.strip() == "":
        return None
    try:
        return Groq(api_key=settings.GROQ_API_KEY)
    except Exception as e:
        logger.warning(f"Failed to initialize Groq client: {e}")
        return None


def generate_readout(
    items: list[AnalyteReadoutItem],
    language: SupportedLanguage = "en",
    mock_llm_response: str | None = None,
) -> tuple[str, str]:
    """
    Generates a plain-language readout.
    Attempts Groq LLM generation first (with guards).
    Falls back to deterministic template on:
      - Missing or invalid GROQ_API_KEY
      - Network / API errors
      - Forbidden terms in LLM output
      - Number hallucination in LLM output

    Returns:
        (readout_text, source: "groq" | "deterministic_template")
    """
    # Allowed measurement numbers for verification
    allowed_numbers = set()
    for it in items:
        allowed_numbers.add(float(it.value))
        if it.reference_low is not None:
            allowed_numbers.add(float(it.reference_low))
        if it.reference_high is not None:
            allowed_numbers.add(float(it.reference_high))

    # 1. Prepare sanitized PII-free payload
    privacy_payload = build_privacy_filtered_payload(items)
    pii_violations = scan_for_pii(privacy_payload)
    if pii_violations:
        logger.error(f"PII leak detected in privacy filter! Falling back to deterministic template. Violations: {pii_violations}")
        return generate_deterministic_readout(items, language), "deterministic_template"

    llm_output: str | None = None

    # Handle mock response (for deterministic unit/adversarial testing)
    if mock_llm_response is not None:
        llm_output = mock_llm_response
    else:
        client = get_groq_client()
        if client is not None:
            lang_name = "Hindi (हिंदी)" if language == "hi" else "English"
            sys_content = SYSTEM_PROMPT.format(lang_name=lang_name)
            user_content = (
                f"Language: {lang_name}\n"
                f"Confirmed Laboratory Values:\n"
                f"{json.dumps(privacy_payload, indent=2)}\n\n"
                f"Please provide the plain-language readout adhering to all safety rules."
            )

            try:
                chat_completion = client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": sys_content},
                        {"role": "user", "content": user_content},
                    ],
                    model=settings.GROQ_MODEL,
                    temperature=0.2,
                    max_tokens=800,
                )
                llm_output = chat_completion.choices[0].message.content
                logger.info("Successfully received LLM response from Groq")
            except Exception as e:
                logger.warning(f"Groq API call failed: {e}. Falling back to deterministic template.")
                llm_output = None

    # If LLM generated text, rigorously test it against both guards
    if llm_output:
        # Check Guard 1: Forbidden Terms
        is_clean, matched_terms = guard.check_text(llm_output)
        if not is_clean:
            logger.warning(
                f"Groq output rejected by ForbiddenTermsGuard! Violations: {matched_terms}. "
                "Falling back to deterministic template."
            )
            return generate_deterministic_readout(items, language), "deterministic_template"

        # Check Guard 2: Number Preservation (No hallucinated numbers)
        numbers_valid, hallucinated = verify_number_preservation(llm_output, allowed_numbers)
        if not numbers_valid:
            logger.warning(
                f"Groq output rejected by NumberPreservationGuard! Hallucinations: {hallucinated}. "
                "Falling back to deterministic template."
            )
            return generate_deterministic_readout(items, language), "deterministic_template"

        return llm_output, "groq"

    # Default Fallback: Deterministic Template
    logger.info("Using deterministic template generator for plain readout.")
    return generate_deterministic_readout(items, language), "deterministic_template"
