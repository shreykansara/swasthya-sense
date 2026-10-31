# Progress Log

| Date | Step | Description | Commit |
|------|------|-------------|--------|
| 2026-10-31 | 0.1 | Verified all tools: Node v24.20.0, Python 3.14.7, Git 2.55.0, Docker 29.7.2, Supabase CLI 2.122.0, gh 2.103.3, Tesseract 5.4.0 | — |
| 2026-10-31 | 0.2 | Created project folder structure: apps/web, apps/api, supabase, docs, scripts, synthetic | — |
| 2026-10-31 | 0.3 | Added .gitignore, README.md with prototype disclaimer, .env.example | 359ad1c |
| 2026-10-31 | 0.4 | Verified GitHub remote, pushed main | 359ad1c |
| 2026-10-31 | 0.5 | Created PROGRESS.md, DECISIONS.md, TODO.md, IMPORTS.md | 5ce3540 |
| 2026-10-31 | 1.1 | Inventoried Perfusion3D codebase tree in PREVIOUS_PROJECT_INVENTORY.md | 1f27f13 |
| 2026-10-31 | 1.2 | Marked found/not-found and reusability for all reuse candidates | 1f27f13 |
| 2026-10-31 | 1.3 | Imported and sanitized FastAPI skeleton; verified /health and zero forbidden terms | 1f27f13 |
| 2026-10-31 | 1.4 | Imported and sanitized web frontend scaffold, design tokens, UI components, waterfall chart; verified build | 1f27f13 |
| 2026-10-31 | 1.5 | Imported test setup and adversarial leakage tests; verified 14 tests passing | 1f27f13 |
| 2026-10-31 | 1.6 | Documented all reused files in IMPORTS.md; merged to main and tagged phase-01-complete | f8024b4 |
| 2026-10-31 | 2.1 | Supabase initialized, documented hosted setup in docs/SUPABASE_SETUP.md | 3c257a5 |
| 2026-10-31 | 2.2 | Created profiles table and app_role enum migration with RLS deny-by-default | 3c257a5 |
| 2026-10-31 | 2.3 | Created cohorts and patients schema with neutral labels (Cohort A, B, C) | 3c257a5 |
| 2026-10-31 | 2.4 | Implemented current_role(), is_assigned_worker(), is_assigned_clinician() SQL functions | 3c257a5 |
| 2026-10-31 | 2.5 | Configured strict RLS policies per role; verified with automated RLS tests | 3c257a5 |
| 2026-10-31 | 2.6 | Auth seed script for all 5 roles: patient, worker, clinician, supervisor, admin | 3c257a5 |
| 2026-10-31 | 2.7 | Built React auth, LoginPage with 1-click role switcher, ProtectedRoute, role home pages; 10 Vitest tests passing | 3c257a5 |
| 2026-10-31 | 2.8 | Implemented FastAPI JWT verification and require_role dependencies; 24 pytest tests passing | 3c257a5 |
| 2026-10-31 | 3.1 | Created consent_records migration with consent_scope & messaging_channel enums, RLS policies | 6e55cee |
| 2026-10-31 | 3.2 | Documented plain-language consent text in English & Hindi in docs/consent_text_v1.md | 6e55cee |
| 2026-10-31 | 3.3 | Built POST /consent, POST /consent/{id}/revoke, GET /consent/status API endpoints | 6e55cee |
| 2026-10-31 | 3.4 | Implemented require_consent() central dependency; unconsented feature access returns 403 | 6e55cee |
| 2026-10-31 | 3.5 | Built Patient Consent UI with per-scope toggles, instant revocation, and append-only audit history | 6e55cee |
| 2026-10-31 | 3.6 | Verified instant revocation behavior blocking downstream endpoints in test_consent.py | 6e55cee |
| 2026-10-31 | 3.7 | Verified 'No consent: stop, nothing stored' path with zero data created | 6e55cee |
| 2026-10-31 | 4.1 | Defined clinical value dictionary in synthetic/value_catalog.yaml with ranges and cohort bindings | 56d9669 |
| 2026-10-31 | 4.2 | Built synthetic/generate.py producing 120 patients across Cohorts A, B, C with masked phone numbers | 56d9669 |
| 2026-10-31 | 4.3 | Generated 1067 longitudinal visits with trajectory drift, sudden jump, and missed visits; stored ground truth | 56d9669 |
| 2026-10-31 | 4.4 | Created idempotent SQL seed loader in synthetic/seed_synthetic.sql; count tests verified | 56d9669 |
| 2026-10-31 | 4.5 | Generated 3 clean clinical lab-style PDF reports using ReportLab | 56d9669 |
| 2026-10-31 | 4.6 | Generated degraded variants: scanned PDFs and camera photo JPGs (3 templates x 3 styles = 9 files) | 56d9669 |
| 2026-10-31 | 4.7 | Output synthetic/reports/manifest.json mapping each file to its exact true values (OCR benchmark key) | 56d9669 |
| 2026-10-31 | 4.8 | Tested python -m synthetic.generate --all and updated README; 34 pytest tests passing | 56d9669 |
| 2026-10-31 | 5.1 | Created report_uploads and extracted_values migration with consent foreign key and status enums | — |
| 2026-10-31 | 5.2 | Built digital PDF extractor via pdfplumber with word-boundary catalog matching | — |
| 2026-10-31 | 5.3 | Built OCR extractor via PyMuPDF rendering + OpenCV preprocessing (grayscale, deskew, denoise, Otsu) + Tesseract | — |
| 2026-10-31 | 5.4 | Built clinical parser validating extracted numbers against plausible ranges with confidence scoring | — |
| 2026-10-31 | 5.5 | Built POST /reports/upload, GET /reports/{id}, POST /reports/{id}/confirm, GET /patients/{id}/confirmed-values | — |
| 2026-10-31 | 5.6 | Ran scripts/eval_ocr.py against all 9 synthetic documents; documented results in docs/OCR_EVAL.md (Clean 100%, Scanned 100%) | — |
| 2026-10-31 | 5.7 | Built mobile-first ReportIntakePage with document preview, cell highlighting, editable values checklist | — |
| 2026-10-31 | 5.8 | Verified downstream endpoints only consume confirmed values; 36 backend tests and 10 frontend tests passing | — |
