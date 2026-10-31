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
| 2026-10-31 | 2.1 | Supabase initialized, documented hosted setup in docs/SUPABASE_SETUP.md | — |
| 2026-10-31 | 2.2 | Created profiles table and app_role enum migration with RLS deny-by-default | — |
| 2026-10-31 | 2.3 | Created cohorts and patients schema with neutral labels (Cohort A, B, C) | — |
| 2026-10-31 | 2.4 | Implemented current_role(), is_assigned_worker(), is_assigned_clinician() SQL functions | — |
| 2026-10-31 | 2.5 | Configured strict RLS policies per role; verified with automated RLS tests | — |
| 2026-10-31 | 2.6 | Auth seed script for all 5 roles: patient, worker, clinician, supervisor, admin | — |
| 2026-10-31 | 2.7 | Built React auth, LoginPage with 1-click role switcher, ProtectedRoute, role home pages; 10 Vitest tests passing | — |
| 2026-10-31 | 2.8 | Implemented FastAPI JWT verification and require_role dependencies; 24 pytest tests passing | — |
