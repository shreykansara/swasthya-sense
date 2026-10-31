# Decisions Log

## D-001: Python version
- **Date:** 2026-10-31
- **Context:** Spec requires Python 3.11 but only 3.14.7 is available on this machine.
- **Decision:** Use Python 3.14.7. All code will be compatible with 3.11+ (no 3.12+ only features used unless backportable). `pyproject.toml` will specify `requires-python = ">=3.11"`.
- **Rationale:** Installing an older Python version is unnecessary friction; 3.14 is a superset of 3.11 capabilities.

## D-002: Project root location
- **Date:** 2026-10-31
- **Context:** The workspace `c:\Users\Shrey\Projects\Swashtya Sense` already has a `.git` repo initialized with a GitHub remote.
- **Decision:** Use the workspace root as the project root, placing `apps/`, `supabase/`, `docs/`, `scripts/`, `synthetic/` directly here rather than nesting inside a `swasthya-sense/` subfolder.
- **Rationale:** Avoids double nesting and uses the existing git repo.

## D-003: Tesseract install path
- **Date:** 2026-10-31
- **Context:** Tesseract installed to `C:\Users\Shrey\AppData\Local\Programs\Tesseract-OCR\` (user-local install via winget).
- **Decision:** Set `TESSERACT_CMD` in `.env.example` to the common `C:\Program Files\Tesseract-OCR\tesseract.exe` path as a default, document the actual path in README.
- **Rationale:** Different machines may install to different locations.

