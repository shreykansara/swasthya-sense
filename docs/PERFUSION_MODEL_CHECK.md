# Perfusion3D Model Evaluation & Verification Report

This document records the evaluation metrics and cross-validation verification of the restored Perfusion3D cardiovascular risk prediction models (CAD, LAD, LCX, RCA).

## 1. Model Architectures & Cross-Validation Metrics

Dataset: **UCI Extension of Z-Alizadeh Sani** (303 records, 54 non-leakage clinical features).
Evaluation Strategy: **5-Fold Repeated Stratified Cross-Validation (Held-Out Folds)** with isotonic probability calibration.

| Target | Clinical Entity | Architecture | Cross-Validation ROC-AUC | Sensitivity / Recall | Brier Score | Decision Threshold |
|---|---|---|---|---|---|---|
| **CAD** | Overall Coronary Artery Disease | RandomForest-120 (Balanced Subsample) | **0.927 ± 0.037** (0.923 OOF) | 94.4% | 0.097 | `0.480` |
| **LAD** | Left Anterior Descending Artery | RandomForest-120 (Balanced Subsample) | **0.851 ± 0.048** (0.853 OOF) | 91.5% | 0.152 | `0.430` |
| **LCX** | Left Circumflex Artery | RandomForest-120 (Balanced Subsample) | **0.727 ± 0.067** (0.735 OOF) | 91.6% | 0.208 | `0.310` |
| **RCA** | Right Coronary Artery | SoftVoting (LightGBM + XGBoost + RF) | **0.745 ± 0.059** (0.738 OOF) | 89.5% | 0.202 | `0.290` |

---

## 2. In-Memory Artifact Integrity

All models and preprocessors were verified using the processed dataset `apps/api/app/perfusion/data/X_features.parquet` and `y_targets.parquet`:

- **Shared Preprocessor:** `preprocessor.joblib` transforms 54 input features into 96 one-hot / scaled continuous feature columns.
- **TreeSHAP Explainers:** `shap_explainers.joblib` loaded into memory for all 4 targets; median explanation extraction latency < 3.5 ms per vessel.
- **Leakage Prevention:** Runtime inspection strictly rejects `CAD`, `LAD`, `LCX`, `RCA`, `cath`, and `stenosis` from input schemas.

---

## 3. Top Clinical Predictive Drivers (TreeSHAP Attributions)

- **CAD:** Typical Exertional Angina, Patient Age, Atypical Angina, Regional Wall Motion (Echo), Ejection Fraction (EF).
- **LAD:** Typical Exertional Angina, Regional Wall Motion Abnormality (Anterior/Septal), Ejection Fraction (EF), Patient Age.
- **LCX:** Patient Age, Typical Exertional Angina, Platelet Count (PLT), Serum Triglycerides (TG).
- **RCA:** ECG ST Depression, Regional Wall Motion Abnormality (Inferior), Patient Age, Blood Pressure (BP).
