# Imports from Perfusion3D

Files reused or adapted from the previous project at `C:\Users\Shrey\Projects\Multimodal AI Hackathon`.
Per project rules, every file was copied/adapted without modifying the source repository.
All references to CAD, LAD, LCX, RCA, stenosis, and diagnostic claims have been stripped.

| Source Path | Destination Path | What Changed | Why |
|-------------|-----------------|--------------|-----|
| `apps/api/app/main.py` | `apps/api/app/main.py` | Stripped Perfusion3D titles, ML model loading, and disease references; replaced with Swasthya Sense lifespan, prototype disclaimers, and clean router mount. | Reuses production FastAPI startup lifecycle, CORS, static SPA serving, and disclaimer middleware. |
| `apps/api/app/config.py` | `apps/api/app/config.py` | Changed project name to Swasthya Sense API, updated disclaimer to non-diagnostic prototype notice, added Supabase/Groq/Tesseract configuration keys. | Reuses Pydantic v2 `BaseSettings` pattern with typed environment handling. |
| `apps/api/app/utils/logger.py` | `apps/api/app/utils/logger.py` | Renamed logger channel from `cardio_api` to `swasthya_api`. | Reuses structured JSON/stream logger setup. |
| `apps/api/app/routes.py` | `apps/api/app/routes.py` | Stripped all `/predict`, `/explain`, `/analyze` coronary disease endpoints; created clean health probe and V1 router structure. | Reuses FastAPI APIRouter structure and route organization. |
| `Dockerfile.api` | `apps/api/Dockerfile` | Removed LightGBM/OpenMP dependencies; added Tesseract OCR and Hindi language data packages (`tesseract-ocr`, `tesseract-ocr-hin`); preserved non-root user and healthcheck. | Provides secure, minimal Python container setup ready for OCR report extraction. |
| `docker-compose.yml` | `docker-compose.yml` | Renamed services and container names to `swasthya_sense_api` and `swasthya_sense_web`. | Reuses multi-container orchestration with dependency health gating. |
| `render.yaml` | `render.yaml` | Renamed web service to `swasthya-sense-app` and updated Dockerfile path. | Reuses Render cloud deployment specification. |
| `apps/web/vite.config.ts` | `apps/web/vite.config.ts` | Configured path aliases (`@` to `src`) and `/api` proxy target to FastAPI backend. | Reuses Vite configuration. |
| `apps/web/tailwind.config.js` | `apps/web/tailwind.config.js` | Reused CSS custom-property design tokens mapping (`--page`, `--panel`, `--ink`, `--acc`, `--low`, `--mod`, `--high`). | Integrates design system with Tailwind utility classes. |
| `apps/web/src/design/tokens.css` | `apps/web/src/design/tokens.css` | Removed `.landing-heart-stage` and vessel typography class; adjusted palette to accessible clinical HUD tokens (light "Paper" & dark "Monitor"). | Reuses dark glassmorphic design token system with high contrast and mobile touch sizing. |
| `apps/web/src/components/ui/Panel.tsx` | `apps/web/src/components/ui/Panel.tsx` | Reused glass card component with border radius and subtle border styling. | Reusable UI container. |
| `apps/web/src/components/ui/Skeleton.tsx` | `apps/web/src/components/ui/Skeleton.tsx` | Reused skeleton loading pulse primitive. | Consistent loading states across mobile screens. |
| `apps/web/src/components/ui/Bar.tsx` | `apps/web/src/components/ui/Bar.tsx` | Cleaned up vessel-specific threshold logic into a generic normalized ratio bar with standard and thin variants. | Reusable visual gauge for measurements and urgency scores. |
| `apps/web/src/components/results/FactorsList.tsx` | `apps/web/src/components/ui/WaterfallChart.tsx` | Replaced 55 hardcoded CAD dataset fields with generic `ContributionFactor` interface; rendered horizontal divergence bars for "elevates" vs "lowers" urgency. | Reused for the "why flagged" rule-contribution view in Phase 7. |
| `apps/web/src/store/usePatientStore.ts` & `useWizardStore.ts` | `apps/web/src/store/useAppStore.ts` | Removed all vessel simulations, CAD profiles, and invasive data; created clean session, role, theme, and offline store. | Reuses Zustand state management patterns, theme toggling, and clean state separation. |
| `apps/api/tests/test_leakage.py` | `apps/api/tests/test_forbidden_leakage.py` | Adapted adversarial test pattern to scan health endpoints and data dictionaries for forbidden diagnosis/disease terms (CAD, LAD, LCX, RCA, stenosis, infarction, ischemia, etc.). | Hardens non-diagnostic guarantee and adversarial leakage prevention. |
