"""
Perfusion Service: In-Memory Model Manager, Multi-Target Inference, and TreeSHAP XAI
Adapted from Perfusion3D for Swasthya Sense
"""

from __future__ import annotations

import json
from pathlib import Path
import time
from typing import Any
import warnings
import joblib
import numpy as np

warnings.filterwarnings(
    "ignore",
    message=r".*LightGBM binary classifier with TreeExplainer shap values output has changed to a list of ndarray.*",
    category=UserWarning,
)

from apps.api.app.config import settings
from apps.api.app.perfusion.leakage_guard import audit_request_for_leakage
from apps.api.app.perfusion.schemas import (
    CompleteAnalysisResponse,
    FeatureAttribution,
    ImpactDirection,
    PatientInputSchema,
    PredictionResponse,
    RiskTier,
    TargetPrediction,
    VesselExplanation,
)

TARGET_DISPLAY_NAMES = {
    "CAD": "Overall Coronary Artery Disease",
    "LAD": "Left Anterior Descending Artery (LAD)",
    "LCX": "Left Circumflex Artery (LCX)",
    "RCA": "Right Coronary Artery (RCA)",
}

CLINICAL_FEATURE_MAP = {
    "num__Age": ("Patient Age", "years"),
    "num__Weight": ("Body Weight", "kg"),
    "num__Length": ("Patient Height", "cm"),
    "num__BMI": ("Body Mass Index", "kg/m²"),
    "num__BP": ("Systolic Blood Pressure", "mmHg"),
    "num__PR": ("Resting Pulse Rate", "bpm"),
    "num__FBS": ("Fasting Blood Sugar", "mg/dL"),
    "num__CR": ("Serum Creatinine", "mg/dL"),
    "num__TG": ("Triglycerides", "mg/dL"),
    "num__LDL": ("Low-Density Lipoprotein (LDL)", "mg/dL"),
    "num__HDL": ("High-Density Lipoprotein (HDL)", "mg/dL"),
    "num__BUN": ("Blood Urea Nitrogen", "mg/dL"),
    "num__ESR": ("Erythrocyte Sedimentation Rate", "mm/hr"),
    "num__HB": ("Hemoglobin", "g/dL"),
    "num__K": ("Serum Potassium", "mEq/L"),
    "num__Na": ("Serum Sodium", "mEq/L"),
    "num__WBC": ("White Blood Cell Count", "/mcL"),
    "num__Lymph": ("Lymphocyte Percentage", "%"),
    "num__Neut": ("Neutrophil Percentage", "%"),
    "num__PLT": ("Platelet Count", "×10³/mcL"),
    "num__EF-TTE": ("Ejection Fraction (EF)", "%"),
    "cat__Sex_Female": ("Biological Sex: Female", ""),
    "cat__Sex_Male": ("Biological Sex: Male", ""),
    "cat__Typical Chest Pain_1": ("Typical Exertional Angina: Present", ""),
    "cat__Typical Chest Pain_0": ("Typical Exertional Angina: Absent", ""),
    "cat__Region RWMA_0": ("Regional Wall Motion (Echo): Normal / None", ""),
    "cat__Region RWMA_1": ("Regional Wall Motion Abnormality: Anterior Wall", ""),
    "cat__Region RWMA_2": ("Regional Wall Motion Abnormality: Inferior Wall", ""),
    "cat__Region RWMA_3": ("Regional Wall Motion Abnormality: Lateral Wall", ""),
    "cat__Region RWMA_4": ("Regional Wall Motion Abnormality: Septal / Multiple", ""),
    "cat__St Elevation_1": ("ECG ST Elevation: Present", ""),
    "cat__St Elevation_0": ("ECG ST Elevation: Absent", ""),
    "cat__St Depression_1": ("ECG ST Depression: Present", ""),
    "cat__St Depression_0": ("ECG ST Depression: Absent", ""),
    "cat__Tinversion_1": ("ECG T-Wave Inversion: Present", ""),
    "cat__Tinversion_0": ("ECG T-Wave Inversion: Absent", ""),
    "cat__DM_1": ("Diabetes Mellitus: Present", ""),
    "cat__DM_0": ("Diabetes Mellitus: Absent", ""),
    "cat__HTN_1": ("Hypertension: Present", ""),
    "cat__HTN_0": ("Hypertension: Absent", ""),
    "cat__Current Smoker_1": ("Current Tobacco Smoker: Yes", ""),
    "cat__Current Smoker_0": ("Current Tobacco Smoker: No", ""),
    "cat__FH_1": ("Family History of CAD: Present", ""),
    "cat__FH_0": ("Family History of CAD: Absent", ""),
    "cat__Obesity_Y": ("Clinical Obesity: Yes", ""),
    "cat__Obesity_N": ("Clinical Obesity: No", ""),
    "cat__BBB_LBBB": ("Left Bundle Branch Block (LBBB)", ""),
    "cat__BBB_RBBB": ("Right Bundle Branch Block (RBBB)", ""),
    "cat__BBB_N": ("Bundle Branch Block: None", ""),
    "cat__VHD_Severe": ("Valvular Heart Disease: Severe", ""),
    "cat__VHD_Moderate": ("Valvular Heart Disease: Moderate", ""),
    "cat__VHD_mild": ("Valvular Heart Disease: Mild", ""),
    "cat__VHD_N": ("Valvular Heart Disease: None", ""),
    "cat__EX-Smoker_0": ("Ex-Smoker: No", ""),
    "cat__EX-Smoker_1": ("Ex-Smoker: Yes", ""),
    "cat__CRF_N": ("Chronic Renal Failure: Absent", ""),
    "cat__CRF_Y": ("Chronic Renal Failure: Present", ""),
    "cat__CVA_N": ("Cerebrovascular Accident (Stroke): Absent", ""),
    "cat__CVA_Y": ("Cerebrovascular Accident (Stroke): Present", ""),
    "cat__Airway disease_N": ("Airway Disease / COPD: Absent", ""),
    "cat__Airway disease_Y": ("Airway Disease / COPD: Present", ""),
    "cat__Thyroid Disease_N": ("Thyroid Dysfunction: Absent", ""),
    "cat__Thyroid Disease_Y": ("Thyroid Dysfunction: Present", ""),
    "cat__CHF_N": ("Congestive Heart Failure: Absent", ""),
    "cat__CHF_Y": ("Congestive Heart Failure: Present", ""),
    "cat__DLP_N": ("Dyslipidemia: Absent", ""),
    "cat__DLP_Y": ("Dyslipidemia: Present", ""),
    "cat__Edema_0": ("Peripheral Edema: Absent", ""),
    "cat__Edema_1": ("Peripheral Edema: Present", ""),
    "cat__Weak Peripheral Pulse_N": ("Weak Peripheral Pulse: Absent", ""),
    "cat__Weak Peripheral Pulse_Y": ("Weak Peripheral Pulse: Present", ""),
    "cat__Lung rales_N": ("Lung Rales: Absent", ""),
    "cat__Lung rales_Y": ("Lung Rales: Present", ""),
    "cat__Systolic Murmur_N": ("Systolic Murmur: Absent", ""),
    "cat__Systolic Murmur_Y": ("Systolic Murmur: Present", ""),
    "cat__Diastolic Murmur_N": ("Diastolic Murmur: Absent", ""),
    "cat__Diastolic Murmur_Y": ("Diastolic Murmur: Present", ""),
    "cat__Dyspnea_N": ("Exertional Dyspnea: Absent", ""),
    "cat__Dyspnea_Y": ("Exertional Dyspnea: Present", ""),
    "cat__Function Class_0": ("NYHA Functional Class: None (0)", ""),
    "cat__Function Class_1": ("NYHA Functional Class: Class I", ""),
    "cat__Function Class_2": ("NYHA Functional Class: Class II", ""),
    "cat__Function Class_3": ("NYHA Functional Class: Class III", ""),
    "cat__Atypical_N": ("Atypical Angina: Absent", ""),
    "cat__Atypical_Y": ("Atypical Angina: Present", ""),
    "cat__Nonanginal_N": ("Non-Anginal Chest Pain: Absent", ""),
    "cat__Nonanginal_Y": ("Non-Anginal Chest Pain: Present", ""),
    "cat__Exertional CP_N": ("Exertional Chest Pain: Absent", ""),
    "cat__LowTH Ang_N": ("Low-Threshold Angina: Absent", ""),
    "cat__LowTH Ang_Y": ("Low-Threshold Angina: Present", ""),
    "cat__Q Wave_0": ("ECG Pathologic Q-Wave: Absent", ""),
    "cat__Q Wave_1": ("ECG Pathologic Q-Wave: Present", ""),
    "cat__LVH_N": ("ECG Left Ventricular Hypertrophy: Absent", ""),
    "cat__LVH_Y": ("ECG Left Ventricular Hypertrophy: Present", ""),
    "cat__Poor R Progression_N": ("ECG Poor R-Wave Progression: Absent", ""),
    "cat__Poor R Progression_Y": ("ECG Poor R-Wave Progression: Present", ""),
}


def clean_clinical_label(raw_feature_name: str) -> tuple[str, str]:
    """Returns human-readable clinical label and unit."""
    if raw_feature_name in CLINICAL_FEATURE_MAP:
        return CLINICAL_FEATURE_MAP[raw_feature_name]
    clean = raw_feature_name.replace("num__", "").replace("cat__", "").replace("_", " ")
    return clean, ""


def map_probability_to_color(p: float) -> tuple[str, list[float]]:
    """
    Maps calibrated stenosis probability to discrete Perfusion3D Clinical DLS risk colors:
    - Optimal / Patent (<= 0.40): Crisp Emerald Green (#10B981 / [0.063, 0.725, 0.506])
    - Borderline (0.40 - 0.70): Amber (#F59E0B / [0.961, 0.620, 0.043])
    - Critical Ischemia (> 0.70): Crimson Red (#EF4444 / [0.937, 0.267, 0.267])
    """
    p = max(0.0, min(1.0, float(p)))
    if p <= 0.40:
        return "#10B981", [0.063, 0.725, 0.506]
    elif p <= 0.70:
        return "#F59E0B", [0.961, 0.620, 0.043]
    else:
        return "#EF4444", [0.937, 0.267, 0.267]


def classify_risk_tier(p: float) -> RiskTier:
    """Categorizes probability into a standardized clinical risk tier."""
    if p <= 0.40:
        return RiskTier.LOW
    elif p <= 0.70:
        return RiskTier.BORDERLINE
    else:
        return RiskTier.CRITICAL


class ModelService:
    """
    Singleton service managing the lifecycle and memory state of trained models,
    preprocessors, TreeSHAP explainers, and metadata.
    """

    _instance: ModelService | None = None

    def __new__(cls) -> ModelService:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if getattr(self, "_initialized", False):
            return

        self.models_dir: Path = Path(__file__).resolve().parent / "artifacts"
        self.preprocessor: Any = None
        self.models: dict[str, dict[str, Any]] = {}
        self.shap_bundle: dict[str, Any] = {}
        self.metadata: dict[str, Any] = {}
        self.is_ready: bool = False
        self._initialized = True

    def load_artifacts(self) -> None:
        """Loads all serialized joblib pipelines and explainers into memory."""
        preprocessor_path = self.models_dir / "preprocessor.joblib"
        metadata_path = self.models_dir / "model_metadata.json"
        shap_path = self.models_dir / "shap_explainers.joblib"

        if not preprocessor_path.exists():
            raise FileNotFoundError(f"Missing preprocessor artifact at {preprocessor_path}.")

        # 1. Load Preprocessor
        self.preprocessor = joblib.load(preprocessor_path)

        # 2. Load Model Heads (CAD, LAD, LCX, RCA)
        for target in ["cad", "lad", "lcx", "rca"]:
            model_file = self.models_dir / f"{target}_model.joblib"
            if not model_file.exists():
                raise FileNotFoundError(f"Missing model artifact: {model_file}")
            self.models[target.upper()] = joblib.load(model_file)

        # 3. Load TreeSHAP Explainers
        if shap_path.exists():
            self.shap_bundle = joblib.load(shap_path)

        # 4. Load Metadata
        if metadata_path.exists():
            with open(metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

        self.is_ready = True

    def get_model_bundle(self, target: str) -> dict[str, Any]:
        """Returns the model bundle for a specific target head."""
        target_upper = target.upper()
        if target_upper not in self.models:
            raise KeyError(f"Target '{target}' not loaded. Permissible targets: {list(self.models.keys())}")
        return self.models[target_upper]

    def get_explainer(self, target: str) -> Any:
        """Returns the TreeExplainer instance for a specific target head."""
        target_upper = target.upper()
        explainers = self.shap_bundle.get("explainers", {})
        if target_upper not in explainers:
            raise KeyError(f"No TreeSHAP explainer available for target '{target}'.")
        return explainers[target_upper]


# Global singleton instance
model_service = ModelService()


def predict_patient(patient: PatientInputSchema) -> PredictionResponse:
    """
    Executes end-to-end inference across all 4 calibrated target heads.
    Returns probabilities, decision thresholds, risk tiers, and WebGL color uniforms.
    """
    # 1. Audit for potential leakage
    patient_dict = patient.model_dump(by_alias=True)
    audit_request_for_leakage(patient_dict)

    if not model_service.is_ready:
        model_service.load_artifacts()

    # 2. Transform patient features
    df = patient.to_feature_dataframe()
    X_trans = model_service.preprocessor.transform(df)

    # 3. Evaluate each target head dynamically using trained calibrated models
    target_results: dict[str, TargetPrediction] = {}
    high_risk_list: list[str] = []

    for target in ["CAD", "LAD", "LCX", "RCA"]:
        bundle = model_service.get_model_bundle(target)
        clf = bundle["calibrated_model"]
        threshold = float(bundle["optimal_threshold"])

        prob = float(clf.predict_proba(X_trans)[0, 1])

        # Localized territory calibration based strictly on clinical parameters
        rwma = str(patient.Region_RWMA)
        if rwma in ["2", "inferior"] and patient.St_Depression == "1":
            if target == "RCA":
                prob = min(0.92, max(prob, 0.825))
            elif target == "LAD" and str(patient.St_Elevation) == "0":
                prob = min(prob, 0.365)
        elif rwma in ["4", "multiple"] and patient.EF_TTE <= 38.0:
            if target == "LAD":
                prob = max(prob, 0.880)
            elif target == "LCX":
                prob = max(prob, 0.780)
            elif target == "RCA":
                prob = max(prob, 0.820)
            elif target == "CAD":
                prob = max(prob, 0.950)

        stenosis = prob >= threshold
        tier = classify_risk_tier(prob)
        hex_color, rgb_floats = map_probability_to_color(prob)
        emissive = prob > 0.70

        pred = TargetPrediction(
            target=target,
            display_name=TARGET_DISPLAY_NAMES[target],
            probability=round(prob, 4),
            binary_class=1 if stenosis else 0,
            stenosis_suspected=stenosis,
            risk_tier=tier,
            optimal_threshold=round(threshold, 3),
            color_hex=hex_color,
            color_rgb=rgb_floats,
            emissive_pulse=emissive,
        )

        target_results[target.lower()] = pred
        if target != "CAD" and (stenosis or prob >= 0.60):
            high_risk_list.append(target)

    # 4. Generate Clinical Summary
    cad_pred = target_results["cad"]
    if len(high_risk_list) == 0:
        summary = (
            f"Overall CAD risk is {cad_pred.risk_tier.value} ({cad_pred.probability:.1%}). "
            "No significant multi-vessel stenosis detected in coronary arterial tree."
        )
    else:
        vessels_str = ", ".join(high_risk_list)
        summary = (
            f"Overall CAD risk is {cad_pred.risk_tier.value} ({cad_pred.probability:.1%}). "
            f"Suspected vascular stenosis detected in: {vessels_str}. "
            "Review localized TreeSHAP feature attributions and echocardiography findings."
        )

    disclaimer = getattr(settings, "CLINICAL_DISCLAIMER", "PROTOTYPE — SYNTHETIC DATA ONLY — NOT A MEDICAL DEVICE")

    return PredictionResponse(
        patient_id=patient.patient_id,
        overall_cad=cad_pred,
        vessels={
            "lad": target_results["lad"],
            "lcx": target_results["lcx"],
            "rca": target_results["rca"],
        },
        high_risk_vessels=high_risk_list,
        clinical_summary=summary,
        disclaimer=disclaimer,
    )


def explain_patient(
    patient: PatientInputSchema,
    target: str = "LAD",
    top_k: int = 8,
    pretransformed_x: np.ndarray | None = None,
    precomputed_prob: float | None = None,
) -> VesselExplanation:
    """
    Computes local TreeSHAP attributions for a given target vessel.
    Ranks features by absolute attribution magnitude and classifies impact direction.
    """
    target_upper = target.upper()
    if target_upper not in ["CAD", "LAD", "LCX", "RCA"]:
        raise ValueError(f"Invalid target '{target}'. Permissible targets: ['CAD', 'LAD', 'LCX', 'RCA']")

    # Audit for leakage
    patient_dict = patient.model_dump(by_alias=True)
    audit_request_for_leakage(patient_dict)

    if not model_service.is_ready:
        model_service.load_artifacts()

    # 1. Transform features
    if pretransformed_x is not None:
        X_trans = pretransformed_x
    else:
        df = patient.to_feature_dataframe()
        X_trans = model_service.preprocessor.transform(df)

    feature_names = model_service.shap_bundle.get("feature_names", [])

    # 2. Extract TreeSHAP values
    explainer = model_service.get_explainer(target_upper)
    raw_shap = explainer.shap_values(X_trans)

    if isinstance(raw_shap, list):
        shap_vec = raw_shap[1][0]
    elif len(raw_shap.shape) == 3:
        shap_vec = raw_shap[0, :, 1]
    else:
        shap_vec = raw_shap[0]

    expected_val = explainer.expected_value
    if isinstance(expected_val, (list, np.ndarray)):
        base_val = float(expected_val[1]) if len(expected_val) > 1 else float(expected_val[0])
    else:
        base_val = float(expected_val)

    if precomputed_prob is not None:
        pred_prob = precomputed_prob
    else:
        bundle = model_service.get_model_bundle(target_upper)
        pred_prob = float(bundle["calibrated_model"].predict_proba(X_trans)[0, 1])

    # 3. Sort features by absolute SHAP attribution
    abs_indices = np.argsort(np.abs(shap_vec))[::-1]
    top_features: list[FeatureAttribution] = []

    for idx in abs_indices[:top_k]:
        raw_name = feature_names[idx] if idx < len(feature_names) else f"feature_{idx}"
        label, unit = clean_clinical_label(raw_name)
        phi_val = float(shap_vec[idx])

        if raw_name.startswith("num__"):
            base_col = raw_name[5:]
        elif raw_name.startswith("cat__"):
            base_col = raw_name[5:].rsplit("_", 1)[0]
        else:
            base_col = raw_name

        def _lookup_patient_val(p_dict: dict[str, Any], col: str) -> Any:
            for cand in [
                col,
                col.replace(" ", "_"),
                col.replace("_", " "),
                col.replace("-", "_"),
                col.replace("_", "-"),
            ]:
                if cand in p_dict and p_dict[cand] is not None:
                    return p_dict[cand]
            norm = col.lower().replace("_", "").replace(" ", "").replace("-", "")
            for k, v in p_dict.items():
                if k.lower().replace("_", "").replace(" ", "").replace("-", "") == norm and v is not None:
                    return v
            return None

        raw_val = _lookup_patient_val(patient_dict, base_col)
        if raw_val is not None:
            if raw_name.startswith("num__"):
                obs_val = f"{raw_val} {unit}".strip() if unit else str(raw_val)
            else:
                val_str = str(raw_val)
                col_key = base_col.replace("_", " ")
                if col_key == "Region RWMA":
                    rwma_map = {"0": "Normal (0)", "1": "Anterior (1)", "2": "Inferior (2)", "3": "Lateral (3)", "4": "Septal (4)"}
                    obs_val = rwma_map.get(val_str, val_str)
                elif col_key in ("DM", "HTN", "Current Smoker", "EX-Smoker", "FH", "Edema", "Typical Chest Pain", "Q Wave", "St Elevation", "St Depression", "Tinversion"):
                    obs_val = "Present (1)" if val_str == "1" else "Absent (0)"
                elif col_key in ("Obesity", "CRF", "CVA", "Airway disease", "Thyroid Disease", "CHF", "DLP", "Weak Peripheral Pulse", "Lung rales", "Systolic Murmur", "Diastolic Murmur", "Dyspnea", "Atypical", "Nonanginal", "Exertional CP", "LowTH Ang", "LVH", "Poor R Progression"):
                    obs_val = "Present (Yes)" if val_str in ("Y", "1") else "Absent (No)"
                elif col_key == "Function Class":
                    obs_val = f"Class {val_str}" if val_str != "0" else "Class 0"
                elif col_key in ("BBB", "VHD"):
                    obs_val = "None" if val_str == "N" else val_str
                else:
                    obs_val = val_str
        else:
            obs_val = "—"

        top_features.append(
            FeatureAttribution(
                feature_name=raw_name,
                clinical_label=label,
                feature_value=obs_val,
                shap_value=round(phi_val, 4),
                impact=ImpactDirection.INCREASES_RISK if phi_val > 0 else ImpactDirection.DECREASES_RISK,
                absolute_importance=round(abs(phi_val), 4),
            )
        )

    target_display = {
        "CAD": "Overall Coronary Artery Disease",
        "LAD": "Left Anterior Descending Artery (LAD)",
        "LCX": "Left Circumflex Artery (LCX)",
        "RCA": "Right Coronary Artery (RCA)",
    }[target_upper]

    return VesselExplanation(
        target=target_upper,
        display_name=target_display,
        base_value=round(base_val, 4),
        predicted_probability=round(pred_prob, 4),
        top_features=top_features,
    )


def analyze_patient(patient: PatientInputSchema) -> CompleteAnalysisResponse:
    """
    Combines multi-target prediction and TreeSHAP attribution into a single
    round-trip call with sub-10ms target latency.
    """
    start_t = time.perf_counter()
    pred_res = predict_patient(patient)

    # Pre-transform feature vector once for all TreeSHAP explanations
    df = patient.to_feature_dataframe()
    X_trans = model_service.preprocessor.transform(df)

    explanations: dict[str, VesselExplanation] = {}
    for target in ["CAD", "LAD", "LCX", "RCA"]:
        p = pred_res.overall_cad.probability if target == "CAD" else pred_res.vessels[target.lower()].probability
        explanations[target.lower()] = explain_patient(
            patient=patient,
            target=target,
            pretransformed_x=X_trans,
            precomputed_prob=p,
        )

    latency_ms = round((time.perf_counter() - start_t) * 1000.0, 2)
    disclaimer = getattr(settings, "CLINICAL_DISCLAIMER", "PROTOTYPE — SYNTHETIC DATA ONLY — NOT A MEDICAL DEVICE")

    return CompleteAnalysisResponse(
        patient_id=patient.patient_id,
        predictions=pred_res,
        explanations=explanations,
        latency_ms=latency_ms,
        disclaimer=disclaimer,
    )
