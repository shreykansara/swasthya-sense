# Previous Project Inventory: Perfusion3D

Source: `C:\Users\Shrey\Projects\Multimodal AI Hackathon`

## 1. Directory Structure (Two levels deep + apps/)

```
C:\Users\Shrey\Projects\Multimodal AI Hackathon\
├── .cursorrules
├── .dockerignore
├── .gitattributes
├── .gitignore
├── agents.md
├── DEPLOYMENT.md
├── docker-compose.dev.yml
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.api
├── Dockerfile.web
├── METHODOLOGY.md
├── package-lock.json
├── package.json
├── pytest.ini
├── railway.json
├── README.md
├── render.yaml
├── requirements-dev.txt
├── requirements.txt
├── skills.md
├── .github/
│   └── workflows/
│       └── main.yml
├── apps/
│   ├── api/
│   │   ├── app/
│   │   │   ├── config.py
│   │   │   ├── main.py
│   │   │   ├── routes.py
│   │   │   ├── __init__.py
│   │   │   ├── extraction/
│   │   │   ├── schemas/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   │       └── logger.py
│   │   └── tests/
│   │       ├── test_api_routes.py
│   │       ├── test_extraction.py
│   │       ├── test_inference.py
│   │       ├── test_leakage.py
│   │       └── test_wizard_and_reports.py
│   └── web/
│       ├── index.html
│       ├── nginx.conf
│       ├── postcss.config.js
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── public/
│       │   └── models/
│       │       └── heart_coronary_optimized.glb
│       └── src/
│           ├── App.tsx
│           ├── index.css
│           ├── main.tsx
│           ├── api/
│           ├── components/
│           │   ├── 3d/
│           │   ├── canvas/
│           │   ├── extraction/
│           │   ├── forms/
│           │   ├── landing/
│           │   ├── layout/
│           │   ├── reports/
│           │   ├── results/
│           │   │   └── FactorsList.tsx (horizontal divergence / waterfall)
│           │   └── ui/
│           │       ├── Bar.tsx
│           │       ├── Panel.tsx
│           │       └── Skeleton.tsx
│           ├── config/
│           ├── content/
│           ├── design/
│           │   └── tokens.css
│           ├── hooks/
│           ├── pages/
│           ├── store/
│           │   ├── usePatientStore.ts
│           │   └── useWizardStore.ts
│           └── types/
├── assets/
│   └── 3d/
├── data/
│   ├── processed/
│   └── raw/
├── docs/
│   ├── dev-sample-reports/
│   ├── print-samples/
│   ├── sample-reports/
│   └── screenshots/
├── e2e/
├── models/
├── reports/
└── scripts/
```

## 2. Reuse Candidates Inventory (Section 1)

| Candidate Item | Status | Source Path | Reusability Assessment |
|---|---|---|---|
| **FastAPI app skeleton (lifespan hooks, CORS, SPA mounting)** | **Found** | `apps/api/app/main.py` | Highly reusable pattern; strip CAD/vessel/Perfusion3D naming and model service loading. |
| **Settings loading (Pydantic BaseSettings)** | **Found** | `apps/api/app/config.py` | 100% reusable pattern; update project name and disclaimer. |
| **Structured JSON / stdout logging** | **Found** | `apps/api/app/utils/logger.py` | 100% reusable; adjust logger name. |
| **Error handlers & routing patterns** | **Found** | `apps/api/app/routes.py` | Reusable API routing & error patterns; strip all LAD/LCX/RCA endpoints. |
| **Dockerfile (API backend)** | **Found** | `Dockerfile.api` | Highly reusable multi-stage Python 3.11/slim container, non-root user, healthcheck. |
| **docker-compose** | **Found** | `docker-compose.yml` | Reusable; rename services to Swasthya Sense. |
| **Vite config** | **Found** | `apps/web/vite.config.ts` | 100% reusable; alias `@` and API proxy. |
| **Tailwind config** | **Found** | `apps/web/tailwind.config.js` | 100% reusable; design token variables mappings. |
| **Zustand store patterns** | **Found** | `apps/web/src/store/usePatientStore.ts`, `apps/web/src/store/useWizardStore.ts` | Reusable store structure, persistence, debounce patterns; strip clinical CAD state. |
| **Dark glassmorphic design tokens** | **Found** | `apps/web/src/design/tokens.css` | 100% reusable design token system (Paper / Monitor themes, typography, HUD tokens). |
| **Reusable HUD / card components (Panel, Skeleton, etc.)** | **Found** | `apps/web/src/components/ui/Panel.tsx`, `Skeleton.tsx`, `Bar.tsx` | Highly reusable generic glass panel and progress bar components. |
| **Horizontal divergence waterfall chart** | **Found** | `apps/web/src/components/results/FactorsList.tsx` + `Bar.tsx` | Reusable for "why flagged" rule contribution waterfall view. |
| **Test patterns: adversarial leakage test** | **Found** | `apps/api/tests/test_leakage.py` | Adapt into "no forbidden field" / diagnostic claim detector. |
| **Render deployment config** | **Found** | `render.yaml` | Reusable single web service deployment specification. |
| **3D heart WebGL component (Optional)** | **Found** | `apps/web/src/components/3d/HeartCanvas.tsx`, `HeartModel.tsx`, `public/models/heart_coronary_optimized.glb` | Can be imported for clinician lane decorative visual behind default-off feature flag. |
