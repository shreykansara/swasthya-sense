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
| 2026-10-31 | 5.1 | Created report_uploads and extracted_values migration with consent foreign key and status enums | 18c90bb |
| 2026-10-31 | 5.2 | Built digital PDF extractor via pdfplumber with word-boundary catalog matching | 18c90bb |
| 2026-10-31 | 5.3 | Built OCR extractor via PyMuPDF rendering + OpenCV preprocessing (grayscale, deskew, denoise, Otsu) + Tesseract | 18c90bb |
| 2026-10-31 | 5.4 | Built clinical parser validating extracted numbers against plausible ranges with confidence scoring | 18c90bb |
| 2026-10-31 | 5.5 | Built POST /reports/upload, GET /reports/{id}, POST /reports/{id}/confirm, GET /patients/{id}/confirmed-values | 18c90bb |
| 2026-10-31 | 5.6 | Ran scripts/eval_ocr.py against all 9 synthetic documents; documented results in docs/OCR_EVAL.md (Clean 100%, Scanned 100%) | 18c90bb |
| 2026-10-31 | 5.7 | Built mobile-first ReportIntakePage with document preview, cell highlighting, editable values checklist | 18c90bb |
| 2026-10-31 | 5.8 | Verified downstream endpoints only consume confirmed values; 36 backend tests and 10 frontend tests passing | 18c90bb |
| 2026-10-31 | 6.1 | Implemented Groq client with settings integration and graceful fallback when unconfigured or offline | 7519e9f |
| 2026-10-31 | 6.2 | Created guards/forbidden_terms.yaml with English and Hindi diagnostic/condition terms denylist | 7519e9f |
| 2026-10-31 | 6.3 | Built Class-6 deterministic template generator stating only tested values and reference range status | 7519e9f |
| 2026-10-31 | 6.4 | Implemented LLM privacy filter ensuring zero PII crosses the boundary | 7519e9f |
| 2026-10-31 | 6.5 | Built prompt-constrained Groq LLM caller enforcing never-diagnose rule and bilingual output | 7519e9f |
| 2026-10-31 | 6.6 | Implemented adversarial output verification guards: forbidden terms scanner & number preservation | 7519e9f |
| 2026-10-31 | 6.7 | Built PlainReadoutCard with English/Hindi switcher and Web SpeechSynthesis Read Aloud button | 7519e9f |
| 2026-10-31 | 6.8 | Added 9 backend unit & adversarial tests and 3 frontend tests; 45 backend and 13 frontend tests passing | 7519e9f |
| 2026-10-31 | 7.1 | Defined YAML clinical rule format (urgent, soon, routine; reason codes; zero condition names) | 1de372f |
| 2026-10-31 | 7.2 | Authored 14 versioned rules in rules/v1/*.yaml covering acute biomarkers, electrolytes, BP, and delta jumps | 1de372f |
| 2026-10-31 | 7.3 | Implemented pure-Python rule evaluator with waterfall contribution scores and sign-off gating | 1de372f |
| 2026-10-31 | 7.4 | Implemented case_flags table migration and automated flag persistence on report confirmation | 1de372f |
| 2026-10-31 | 7.5 | Adapted imported waterfall chart into WhyFlaggedCard displaying rule contribution bars and thresholds | 1de372f |
| 2026-10-31 | 7.6 | Built adversarial rule scanner in test_forbidden_leakage.py proving zero condition words across all rules | 1de372f |
| 2026-10-31 | 7.7 | Built AdminRulesPage for governance inspection and sign-off, plus clinician override with mandatory audit reason | 1de372f |
| 2026-10-31 | 7.8 | Verified with 8 new engine tests (55 backend total) and 3 frontend tests (16 frontend total) | 1de372f |
| 2026-10-31 | R0 | Initialized branch phase-r-restore-perfusion, recorded repo health and test counts in RESTORE_LOG.md | cf28b31 |
