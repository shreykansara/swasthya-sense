# Swasthya Sense

Cardiac follow-up and early-warning prototype for health workers, clinicians and patients. Built on synthetic data, this system enables report intake with OCR, transparent versioned rules for clinical flagging, clinician-gated care plans, consent-first messaging, and two-lane (clinical + administrative) worklist management. It is designed for low-bandwidth, mobile-first use in community health settings.

> ⚠️ **PROTOTYPE — SYNTHETIC DATA ONLY — NOT A MEDICAL DEVICE**
>
> This software is a technology demonstration. It does not diagnose conditions, provide medical advice, or replace clinical judgment. All data shown is synthetic. Do not use for real patient care.

---

## Synthetic Data & Report Generator

The synthetic generator produces deterministic patient cohorts, longitudinal lab visits with trajectories, and multi-variant clinical PDF/photo reports:

```bash
# Generate all synthetic patients, visits, and 9 report variants
python -m synthetic.generate --all

# Generate only patient records and visits
python -m synthetic.generate --patients

# Generate only lab report variants (Clean PDF, Scanned PDF, Photo JPG)
python -m synthetic.generate --reports
```

Generated outputs:
- `synthetic/value_catalog.yaml`: Master clinical value dictionary with synthetic reference ranges and plausible bounds.
- `synthetic/synthetic_patients.json`: 120 patients across Cohorts A, B, C with 1000+ longitudinal visits and ground-truth evaluation labels.
- `synthetic/seed_synthetic.sql`: Idempotent SQL seed script for PostgreSQL/Supabase.
- `synthetic/reports/`: 3 lab templates × (Clean PDF, Scanned PDF, Camera Photo JPG).
- `synthetic/reports/manifest.json`: Exact ground-truth values used as the benchmark answer key for OCR accuracy evaluation.
