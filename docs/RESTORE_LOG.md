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


## R2.3 Copy Trained Model Artifacts
* `cad_model.joblib`: SHA256 = `ECC5E06945F5F14B96FAF19FC389738F53043927071646A8E91210DBE660F30B` (Match)
* `lad_model.joblib`: SHA256 = `533D20AEFF820E1D1C48D352B523E6BEB2C35AC194A649C2F9B563347FB0000A` (Match)
* `lcx_model.joblib`: SHA256 = `25B50656659E4B42EC53764D6480EDAD8EA9ABE75DEF74712FA21176B7E3DA94` (Match)
* `rca_model.joblib`: SHA256 = `A36827A669183C252ECFB192B6F03DE4DC66F26CC24D7A9E306EED85E9E4406C` (Match)
* `preprocessor.joblib`: SHA256 = `9CCE74B4FEDEBBE9B749F8369526051FAD4227A15CF0604DA2E732F5742B9173` (Match)
* `shap_explainers.joblib`: SHA256 = `34043854300160940A72D5CAF1033F5C8EFE49D20DE81C4151A01038D5BAA8D0` (Match)
* `evaluation_metrics.json`: SHA256 = `0CDFA790E41BD862F823A3A91E589B4DAE21EB8024B5C7446A10B782E2B6AA58` (Match)
* `model_metadata.json`: SHA256 = `1882C64F3DCA3CBB338B029846E824CC64052987857F9202147CE617CB209E18` (Match)


## R2.4 Copy Dataset Files
* `z_alizadeh_sani.csv`: SHA256 = `B6EE3F8EE4C56A673005675EF72CE0282B3CF4138B1A05B26D6A486A71104151` (Match)
* `X_features.parquet`: SHA256 = `1C439B82D797986CCB42113F8FBD2D239D6E65A3E4998D024DE5F3A7E52DFBDB` (Match)
* `y_targets.parquet`: SHA256 = `E646FBFA32C2B2B6368AF7401725D411F2356AF02AD12D51C95B01843F67B369` (Match)
* `feature_metadata.json`: SHA256 = `D3BCC5D9C4EB061CF6F376D9026F2736F445F917108A525760FD06F40834C45A` (Match)


## R2.5 Copy Training & Filtering Scripts
* `train.py`: SHA256 = `22937E0B5F40F9E28587272D566C54595F547E04126C5CC39295C15C6F84657A` (Match)
* `preprocess.py`: SHA256 = `E7934F983B28C9A8328B45411CE61DA29D16053F2F643CF358EDA9CFFC46223B` (Match - StrictFeatureFilter)
* `benchmark_models.py`: SHA256 = `A681A266524D370ADC081CF66F77396A5827E96A832FA74C44F69C50ACE67A94` (Match)
* `compute_evaluation_metrics.py`: SHA256 = `D306EE5BDF63688FA2353326CDE973A1E1346A49616128631C61F0C7A6DB60D3` (Match)
* `leakage_guard.py`: SHA256 = `229BD3D70AEC886F999C181D82F555F94D686F684A969432D56CFF9E73967B8B` (Match)
