# Restore Log: Perfusion3D Assets in Swasthya Sense

## R0.1 Repository Health Check

### git status
```
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

### git branch -a
```
* main
  phase-01-inventory-import
  phase-02-supabase-auth
  phase-03-consent
  phase-04-synthetic-data
  phase-05-report-intake
  phase-06-plain-readout
  phase-07-rule-engine
  remotes/origin/main
  remotes/origin/phase-01-inventory-import
  remotes/origin/phase-02-supabase-auth
  remotes/origin/phase-03-consent
  remotes/origin/phase-04-synthetic-data
  remotes/origin/phase-05-report-intake
  remotes/origin/phase-06-plain-readout
  remotes/origin/phase-07-rule-engine
```

### git log --oneline -n 15
```
acf1f80 chore(merge): merge phase-07-rule-engine into main
1de372f feat(phase-7): versioned clinical rule engine, why-flagged waterfall component, and governance sign-off
4169393 chore(merge): merge phase-06-plain-readout into main
7519e9f feat(phase-6): plain-language readout with Groq, deterministic fallback, adversarial guards, and speech synthesis
b82fb26 chore(merge): merge phase-05-report-intake into main
18c90bb feat(phase-5): report intake with Tesseract OCR fallback, pdfplumber, and confirmation UI
56d9669 merge: Phase 4 Synthetic data generator complete
036535e feat(phase-4): synthetic clinical value catalog, patient trajectory generator, and multi-variant reports
9db4550 merge: Phase 3 Consent management complete
6e55cee feat(phase-3): consent management, append-only records, require_consent guard, and patient consent UI
886142b merge: Phase 2 Supabase schema and roles complete
3c257a5 feat(phase-2): supabase schema, RBAC migrations, RLS policies, React auth guard, and FastAPI JWT dependencies
f8024b4 merge: Phase 1 Inventory and import from Perfusion3D complete
1f27f13 feat(phase-1): inventory and import reusable components from Perfusion3D
5ce3540 docs(init): add PROGRESS.md, DECISIONS.md, TODO.md, IMPORTS.md
```

## R0.3 Remote Heads and Tags Verification
```
acf1f80e47e5d35eb2b96d66ccdf6c4214711ff2	refs/heads/main
1f27f13cd173276cf1304fbf06c5b6cd300ccdad	refs/heads/phase-01-inventory-import
3c257a5e117a6075abc22fae5fd0cf88a6388f8d	refs/heads/phase-02-supabase-auth
6e55ceea8909b627e109a7099daa6fd8f729e214	refs/heads/phase-03-consent
036535e02476680c3b09220350bba02d6923eb5f	refs/heads/phase-04-synthetic-data
18c90bbf5240b4e801c33818bfddd67e21123dba	refs/heads/phase-05-report-intake
7519e9f6af98c30c607bca287741d43d21ca2e2f	refs/heads/phase-06-plain-readout
1de372fe5bb4fe4063ae9b90e73050947baf0556	refs/heads/phase-07-rule-engine
f8024b4a5faa5b0ed7e820208adda78c76034729	refs/tags/phase-01-complete
886142bb2ae2b19ed656b3528d8e7e5f0b268931	refs/tags/phase-02-complete
9db4550fdb339f0052fc03541539de3fee0d94b7	refs/tags/phase-03-complete
56d966994c0eea2812f9bd545045c2e2886a9ca5	refs/tags/phase-04-complete
b82fb2621b030a64da79017fba851361e16e9935	refs/tags/phase-05-complete
4169393457248fcab9acd7414bc1d2bbc30a6c85	refs/tags/phase-06-complete
acf1f80e47e5d35eb2b96d66ccdf6c4214711ff2	refs/tags/phase-07-complete
```

## R0.4 Initial Test Pass Counts
* **Backend Pytest (`apps/api/tests`):** 55 passed (2 warnings) in 27.11s
* **Frontend Vitest (`apps/web`):** 16 passed across 4 test suites in 2.56s


## R2.2 Copy Heart GLB
* **Source:** `C:\Users\Shrey\Projects\Multimodal AI Hackathon\apps\web\public\models\heart_coronary_optimized.glb`
* **Destination:** `apps\web\public\models\heart_coronary_optimized.glb`
* **Source SHA256:** `22E5BAA75983BB7149CCD1E6AF0BD189E8C131D4CD63AD9091A8180BC0F7C58A`
* **Destination SHA256:** `22E5BAA75983BB7149CCD1E6AF0BD189E8C131D4CD63AD9091A8180BC0F7C58A`
* **Match:** Verified identical.
