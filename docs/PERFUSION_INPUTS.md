# Perfusion3D Clinical Telemetry Inputs

This document defines the 54 clinical parameters consumed by the Perfusion3D multi-target prediction and TreeSHAP explainability engine. All values are validated against physiological bounds and match the UCI Extension of Z-Alizadeh Sani dataset specifications.

> [!NOTE]
> All target columns (`CAD`, `LAD`, `LCX`, `RCA`) and invasive catheterization markers (`Cath`, `stenosis`) are strictly excluded to prevent data leakage.

## Input Parameters Table

| Field Name | Clinical Label | Type | Unit | Min | Max | Default | Required? |
|---|---|---|---|---|---|---|---|
| `Age` | Patient Age | Continuous (float) | years | 18.0 | 110.0 | `58.0` | No (has default) |
| `Weight` | Body Weight | Continuous (float) | kg | 30.0 | 250.0 | `74.0` | No (has default) |
| `Length` | Patient Height | Continuous (float) | cm | 100.0 | 240.0 | `165.0` | No (has default) |
| `Sex` | Biological Sex | Categorical `['Male', 'Female']` | — | — | — | `Male` | No (has default) |
| `BMI` | Body Mass Index | Continuous (float) | kg/m² | 12.0 | 65.0 | `26.8` | No (auto-calculated) |
| `DM` | Diabetes Mellitus | Categorical `['0', '1']` | — | — | — | `0` | No (has default) |
| `HTN` | Hypertension | Categorical `['0', '1']` | — | — | — | `1` | No (has default) |
| `Current Smoker` | Current Tobacco Smoker | Categorical `['0', '1']` | — | — | — | `0` | No (has default) |
| `EX-Smoker` | Ex-Smoker | Categorical `['0', '1']` | — | — | — | `0` | No (has default) |
| `FH` | Family History of CAD | Categorical `['0', '1']` | — | — | — | `0` | No (has default) |
| `Obesity` | Clinical Obesity | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `CRF` | Chronic Renal Failure | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `CVA` | Cerebrovascular Accident (Stroke) | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `Airway disease` | Airway Disease / COPD | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `Thyroid Disease` | Thyroid Dysfunction | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `CHF` | Congestive Heart Failure | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `DLP` | Dyslipidemia | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `BP` | Systolic Blood Pressure | Continuous (float) | mmHg | 50.0 | 260.0 | `130.0` | No (has default) |
| `PR` | Resting Pulse Rate | Continuous (float) | bpm | 35.0 | 220.0 | `70.0` | No (has default) |
| `Edema` | Peripheral Edema | Categorical `['0', '1']` | — | — | — | `0` | No (has default) |
| `Weak Peripheral Pulse` | Weak Peripheral Pulse | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `Lung rales` | Auscultated Lung Rales | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `Systolic Murmur` | Cardiac Systolic Murmur | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `Diastolic Murmur` | Cardiac Diastolic Murmur | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `Typical Chest Pain` | Typical Exertional Angina | Categorical `['0', '1']` | — | — | — | `0` | No (has default) |
| `Dyspnea` | Exertional Dyspnea | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `Function Class` | NYHA Functional Class | Categorical `['0', '1', '2', '3']` | — | — | — | `0` | No (has default) |
| `Atypical` | Atypical Angina | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `Nonanginal` | Non-Anginal Chest Pain | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `Exertional CP` | Exertional Chest Pain | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `LowTH Ang` | Low-Threshold Angina | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `Q Wave` | ECG Pathologic Q-Wave | Categorical `['0', '1']` | — | — | — | `0` | No (has default) |
| `St Elevation` | ECG ST Elevation | Categorical `['0', '1']` | — | — | — | `0` | No (has default) |
| `St Depression` | ECG ST Depression | Categorical `['0', '1']` | — | — | — | `0` | No (has default) |
| `Tinversion` | ECG T-Wave Inversion | Categorical `['0', '1']` | — | — | — | `0` | No (has default) |
| `LVH` | Left Ventricular Hypertrophy | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `Poor R Progression` | Poor R-Wave Progression | Categorical `['Y', 'N']` | — | — | — | `N` | No (has default) |
| `BBB` | Bundle Branch Block | Categorical `['N', 'LBBB', 'RBBB']` | — | — | — | `N` | No (has default) |
| `FBS` | Fasting Blood Sugar | Continuous (float) | mg/dL | 40.0 | 600.0 | `98.0` | No (has default) |
| `CR` | Serum Creatinine | Continuous (float) | mg/dL | 0.1 | 15.0 | `1.0` | No (has default) |
| `TG` | Serum Triglycerides | Continuous (float) | mg/dL | 20.0 | 2000.0 | `122.0` | No (has default) |
| `LDL` | Low-Density Lipoprotein (LDL) | Continuous (float) | mg/dL | 10.0 | 500.0 | `100.0` | No (has default) |
| `HDL` | High-Density Lipoprotein (HDL) | Continuous (float) | mg/dL | 5.0 | 180.0 | `39.0` | No (has default) |
| `BUN` | Blood Urea Nitrogen | Continuous (float) | mg/dL | 2.0 | 150.0 | `16.0` | No (has default) |
| `ESR` | Erythrocyte Sedimentation Rate | Continuous (float) | mm/hr | 1.0 | 150.0 | `15.0` | No (has default) |
| `HB` | Hemoglobin | Continuous (float) | g/dL | 5.0 | 25.0 | `13.2` | No (has default) |
| `K` | Serum Potassium | Continuous (float) | mEq/L | 1.5 | 9.0 | `4.2` | No (has default) |
| `Na` | Serum Sodium | Continuous (float) | mEq/L | 100.0 | 180.0 | `141.0` | No (has default) |
| `WBC` | White Blood Cell Count | Continuous (float) | /mcL | 1000.0 | 50000.0 | `7100.0` | No (has default) |
| `Lymph` | Lymphocyte Percentage | Continuous (float) | % | 1.0 | 90.0 | `32.0` | No (has default) |
| `Neut` | Neutrophil Percentage | Continuous (float) | % | 5.0 | 95.0 | `60.0` | No (has default) |
| `PLT` | Platelet Count | Continuous (float) | ×10³/mcL | 10.0 | 1500.0 | `210.0` | No (has default) |
| `EF-TTE` | Ejection Fraction (EF) | Continuous (float) | % | 10.0 | 85.0 | `50.0` | No (has default) |
| `Region RWMA` | Regional Wall Motion Abnormality | Categorical `['0', '1', '2', '3', '4']` | — | — | — | `0` | No (has default) |
| `VHD` | Valvular Heart Disease | Categorical `['N', 'mild', 'Moderate', 'Severe']` | — | — | — | `N` | No (has default) |
