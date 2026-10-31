"""
Comprehensive Permutations Dataset Generator for Swasthya Sense.
Generates all permutations and combinations of:
1. Risk Category (HIGH_RISK, MODERATE_RISK, LOW_RISK)
2. Doctor Consultation Status (CONSULTED, NOT_CONSULTED / PENDING_REVIEW)
3. Follow-up Timeline Status (OVERDUE, ON_SCHEDULE, URGENT_WALK_IN)
4. Chronic Clinical Cohorts (Hypertension+Lipids, Post-MI Discharge, Heart Failure)

Includes complete patient demographics, physiological biomarker vectors, TreeSHAP drivers,
exact 'when to visit the doctor again' schedules, and comprehensive 'practices to be followed'.
"""

import json
import random
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

RISK_TIERS = ["HIGH_RISK", "MODERATE_RISK", "LOW_RISK"]
CONSULTATION_STATUSES = ["CONSULTED", "PENDING_REVIEW"]
SCHEDULE_STATUSES = ["OVERDUE", "ON_SCHEDULE", "URGENT_WALK_IN"]
COHORTS = [
    "Cohort A: Hypertension with Lipids",
    "Cohort B: Post-Event Discharge (Post-MI)",
    "Cohort C: Heart Failure with Reduced EF",
]

FIRST_NAMES_M = ["Ramesh", "Sunil", "Rajesh", "Amit", "Abdul", "Vikram", "Suresh", "Manoj", "Anil", "Pradeep", "Aarav", "Karan"]
FIRST_NAMES_F = ["Sunita", "Pooja", "Lakshmi", "Meena", "Fatima", "Geeta", "Anjali", "Kavita", "Rekha", "Shanti", "Priyanka", "Deepa"]
LAST_NAMES = ["Patel", "Sharma", "Verma", "Kumar", "Singh", "Das", "Ali", "Narayanan", "Banerjee", "Gupta", "Joshi", "Choudhury"]


def build_practices_for_patient(risk: str, cohort: str, doctor_consulted: bool) -> Dict[str, Any]:
    """Builds comprehensive evidence-based patient practices based on clinical risk profile."""
    if risk == "HIGH_RISK":
        return {
            "urgency_badge": "CRITICAL ATTENTION REQUIRED",
            "visit_advisory": "Walk in to the Cardiology OPD or Emergency Department immediately. Do not delay.",
            "emergency_contacts": [
                {"label": "Cardiology Emergency / Cath Lab", "phone": "+91-1800-425-0011"},
                {"label": "National Ambulance Helpline", "phone": "108"},
                {"label": "Assigned ASHA Field Coordinator", "phone": "+91-98440-12345"},
            ],
            "dietary_guidelines": [
                "Strict Sodium Restriction: Under 1.5 grams of salt (less than 1/2 teaspoon) per day.",
                "Zero trans-fats, processed namkeen, and deep-fried foods.",
                "Heart-healthy fats only: Mustard oil or olive oil limited to 2-3 teaspoons daily.",
                "High soluble fiber: Oats, methi, raw vegetables, and whole pulses.",
            ],
            "exercise_boundaries": [
                "Strictly avoid strenuous exertion, heavy lifting, or running until doctor consultation.",
                "Permitted activity: Slow-paced gentle indoor walking on flat ground for 10-15 minutes max.",
                "STOP IMMEDIATELY if you feel chest heaviness, shortness of breath, or sweating.",
            ],
            "medication_checklist": [
                {"name": "Aspirin 75 mg", "timing": "Once daily after breakfast", "purpose": "Blood thinner to prevent clots"},
                {"name": "Ticagrelor 90 mg (or Clopidogrel 75mg)", "timing": "Twice daily with water", "purpose": "Antiplatelet coverage"},
                {"name": "Atorvastatin 40 mg", "timing": "Once daily at bedtime", "purpose": "Plaque stabilization & LDL reduction"},
                {"name": "Metoprolol Succinate 25 mg", "timing": "Once daily in morning", "purpose": "Heart rate and blood pressure control"},
                {"name": "Sublingual Sorbitrate (SOS)", "timing": "Under tongue ONLY if acute chest pain occurs", "purpose": "Emergency vasodilator"},
            ],
            "warning_signs_to_watch": [
                "Tightness, crushing pain, or burning in center of chest radiating to left arm, neck, or jaw.",
                "Sudden shortness of breath even while resting or sitting.",
                "Profuse cold sweating accompanied by nausea or lightheadedness.",
                "Rapid irregular heartbeat or sudden palpitations.",
            ],
            "daily_monitoring": [
                "Record Blood Pressure twice daily (morning 8 AM & evening 7 PM).",
                "Log pulse rate before taking morning beta-blocker.",
                "Weigh yourself every morning after bathroom; report any gain > 1.5 kg in 24 hours.",
            ],
        }
    elif risk == "MODERATE_RISK":
        return {
            "urgency_badge": "BORDERLINE / CLINICAL REVIEW DUE",
            "visit_advisory": "Schedule an in-person follow-up at Cardiology OPD within the next 5 to 7 days.",
            "emergency_contacts": [
                {"label": "Cardiology OPD Appointment Desk", "phone": "+91-1800-425-0022"},
                {"label": "Frontline Community Health Sub-centre", "phone": "+91-98440-12346"},
            ],
            "dietary_guidelines": [
                "DASH Diet Protocol: Sodium intake capped at 2.0 grams per day.",
                "Increase potassium-rich vegetables (lauki, tori, palak, steamed greens).",
                "Cut out refined white sugars, sweets, and bakery goods to reduce triglycerides.",
                "Consume 25-30 grams of dietary fiber daily.",
            ],
            "exercise_boundaries": [
                "Moderate aerobic exercise: 30 minutes of brisk walking 5 days a week.",
                "Always warm up for 5 minutes and cool down for 5 minutes.",
                "Maintain conversational pace; do not exercise in extreme cold or hot weather.",
            ],
            "medication_checklist": [
                {"name": "Amlodipine 5 mg", "timing": "Once daily in morning", "purpose": "Blood pressure management"},
                {"name": "Rosuvastatin 20 mg", "timing": "Once daily at bedtime", "purpose": "Lipid control"},
                {"name": "Metformin 500 mg", "timing": "Twice daily with meals", "purpose": "Glycemic regulation"},
            ],
            "warning_signs_to_watch": [
                "Chest discomfort occurring on walking uphill or climbing stairs that eases with rest.",
                "Unusual fatigue or breathlessness doing routine household tasks.",
                "Swelling around ankles or feet at the end of the day.",
            ],
            "daily_monitoring": [
                "Check BP at home 3 times a week.",
                "Maintain blood sugar log (Fasting & 2 hours post-meal).",
            ],
        }
    else:  # LOW_RISK
        return {
            "urgency_badge": "HEALTHY NORMAL / ROUTINE MAINTENANCE",
            "visit_advisory": "Your cardiac markers are in the healthy zone. Routine follow-up scheduled in 60-90 days.",
            "emergency_contacts": [
                {"label": "Frontline Health Sub-centre Desk", "phone": "+91-1800-425-0033"},
            ],
            "dietary_guidelines": [
                "Balanced nutritional plate: 50% seasonal vegetables, 25% whole grains, 25% plant/lean proteins.",
                "Maintain hydration: 2.5 to 3 liters of clean water daily.",
                "Keep refined oils under 3 teaspoons daily; avoid packaged junk food.",
            ],
            "exercise_boundaries": [
                "Regular aerobic fitness: 150 minutes of moderate activity or brisk walking weekly.",
                "Yoga, pranayama, and flexibility stretching encouraged 20 minutes daily.",
            ],
            "medication_checklist": [
                {"name": "Multivitamin / Calcium (if prescribed)", "timing": "Once daily with food", "purpose": "Nutritional support"},
                {"name": "Routine low-dose maintenance (if prescribed)", "timing": "As directed", "purpose": "Cardiovascular prevention"},
            ],
            "warning_signs_to_watch": [
                "Persistent headache or dizziness.",
                "Sudden unexplained shortness of breath.",
            ],
            "daily_monitoring": [
                "Monthly blood pressure check at local wellness kiosk or pharmacy.",
                "Annual comprehensive lipid and glycemic panel.",
            ],
        }


def generate_permutations_dataset() -> List[Dict[str, Any]]:
    patients: List[Dict[str, Any]] = []
    base_time = datetime(2026, 11, 1, 12, 0, 0, tzinfo=timezone.utc)
    patient_counter = 1

    # Permutations: 3 Risk Tiers x 2 Consultation Statuses x 3 Schedule Statuses x 3 Cohorts = 54 Combinations
    for risk in RISK_TIERS:
        for consult in CONSULTATION_STATUSES:
            for sched in SCHEDULE_STATUSES:
                for cohort in COHORTS:
                    pid = f"PAT-{patient_counter:04d}"
                    rng = random.Random(2026 + patient_counter)

                    is_female = rng.random() < 0.45
                    first = rng.choice(FIRST_NAMES_F if is_female else FIRST_NAMES_M)
                    last = rng.choice(LAST_NAMES)
                    full_name = f"{first} {last}"
                    phone = f"+91-{rng.randint(98000, 99999)}-{rng.randint(10000, 99999)}"
                    masked_phone = f"+91-XXXXX-{phone[-4:]}"

                    # Demographics & Clinical markers dependent on Risk Tier
                    if risk == "HIGH_RISK":
                        age = rng.randint(58, 76)
                        bp = rng.randint(162, 188)
                        dbp = rng.randint(96, 112)
                        pr = rng.randint(86, 104)
                        fbs = rng.randint(160, 220)
                        ldl = rng.randint(145, 195)
                        tg = rng.randint(210, 310)
                        ef = rng.randint(35, 46)
                        st_elev = "1"
                        st_dep = "0"
                        rwma = "1"  # Anterior Wall (LAD)
                        chest_pain = "1"
                        dyspnea = "Y"
                        cad_prob = round(rng.uniform(0.78, 0.94), 3)
                        lad_prob = round(rng.uniform(0.76, 0.92), 3)
                        lcx_prob = round(rng.uniform(0.42, 0.65), 3)
                        rca_prob = round(rng.uniform(0.35, 0.58), 3)
                        triage_lane = "clinical"
                        triage_tier = "tier_1_acute"
                        is_high_priority = True

                    elif risk == "MODERATE_RISK":
                        age = rng.randint(50, 68)
                        bp = rng.randint(138, 156)
                        dbp = rng.randint(86, 96)
                        pr = rng.randint(74, 88)
                        fbs = rng.randint(118, 155)
                        ldl = rng.randint(110, 142)
                        tg = rng.randint(170, 240)
                        ef = rng.randint(50, 58)
                        st_elev = "0"
                        st_dep = "1"
                        rwma = "2"  # Inferior Wall (RCA)
                        chest_pain = "0"
                        dyspnea = "Y"
                        cad_prob = round(rng.uniform(0.48, 0.66), 3)
                        lad_prob = round(rng.uniform(0.32, 0.55), 3)
                        lcx_prob = round(rng.uniform(0.38, 0.60), 3)
                        rca_prob = round(rng.uniform(0.55, 0.72), 3)
                        triage_lane = "clinical"
                        triage_tier = "tier_2_concerning"
                        is_high_priority = False

                    else:  # LOW_RISK
                        age = rng.randint(36, 52)
                        bp = rng.randint(112, 126)
                        dbp = rng.randint(70, 80)
                        pr = rng.randint(62, 74)
                        fbs = rng.randint(78, 98)
                        ldl = rng.randint(70, 95)
                        tg = rng.randint(70, 125)
                        ef = rng.randint(60, 68)
                        st_elev = "0"
                        st_dep = "0"
                        rwma = "0"
                        chest_pain = "0"
                        dyspnea = "N"
                        cad_prob = round(rng.uniform(0.08, 0.28), 3)
                        lad_prob = round(rng.uniform(0.06, 0.22), 3)
                        lcx_prob = round(rng.uniform(0.08, 0.25), 3)
                        rca_prob = round(rng.uniform(0.05, 0.20), 3)
                        triage_lane = "administrative"
                        triage_tier = "routine"
                        is_high_priority = False

                    # Scheduling Logic
                    if sched == "OVERDUE":
                        overdue_days = rng.randint(6, 24)
                        next_visit_date = (base_time - timedelta(days=overdue_days)).isoformat()
                        schedule_status_label = f"Overdue ({overdue_days} days late)"
                    elif sched == "URGENT_WALK_IN":
                        overdue_days = 0
                        next_visit_date = (base_time + timedelta(hours=rng.randint(4, 24))).isoformat()
                        schedule_status_label = "Immediate Walk-In OPD Required"
                    else:  # ON_SCHEDULE
                        overdue_days = 0
                        next_visit_date = (base_time + timedelta(days=rng.randint(7, 30))).isoformat()
                        schedule_status_label = "On Schedule"

                    # Consultation Logic
                    is_consulted = (consult == "CONSULTED")
                    if is_consulted:
                        consult_date = (base_time - timedelta(days=rng.randint(1, 10))).isoformat()
                        doc_name = "Dr. Aditi Sharma, MD (Cardiology)"
                        doc_id = "DOC-CARDIO-01"
                        if risk == "HIGH_RISK":
                            notes = "Patient reviewed in Cardiology CCU. Signs of severe anterior ischemia. Emergent angiography advised. Admitted for monitored dual antiplatelet and heparin therapy."
                            rec = "Emergent Cath Lab Referral"
                            decision = "urgent_cath_lab"
                        elif risk == "MODERATE_RISK":
                            notes = "Patient exhibits exertional dyspnea and inferior wall hypokinesia. Initiated titration of beta-blocker and high-intensity statin. Schedule stress echocardiography in 14 days."
                            rec = "Urgent OPD Review & Medication Titration"
                            decision = "opd_urgent"
                        else:
                            notes = "Routine clinical review normal. Patient normotensive with stable biomarkers. Advised maintenance of healthy diet and regular walking."
                            rec = "Routine Community Follow-up (90 Days)"
                            decision = "opd_routine"
                    else:
                        consult_date = None
                        doc_name = None
                        doc_id = None
                        notes = None
                        rec = None
                        decision = None

                    # Comprehensive Patient Practices
                    practices = build_practices_for_patient(risk=risk, cohort=cohort, doctor_consulted=is_consulted)

                    record = {
                        "patient_id": pid,
                        "patient_masked_id": f"PAT-***{pid[-3:]}",
                        "full_name": full_name,
                        "phone": phone,
                        "masked_phone": masked_phone,
                        "email": f"patient.{pid.lower()}@swasthya.internal",
                        "cohort": cohort,
                        "assigned_worker_id": "ASHA-01",
                        "created_at": (base_time - timedelta(days=rng.randint(15, 60))).isoformat(),
                        "updated_at": (base_time - timedelta(days=rng.randint(0, 5))).isoformat(),
                        "risk_category": risk,
                        "status": "CONSULTED" if is_consulted else "PENDING_DOCTOR_CONSULTATION",
                        "is_high_priority": is_high_priority,
                        "triage_lane": triage_lane,
                        "triage_tier": triage_tier,
                        "schedule_status": sched,
                        "schedule_status_label": schedule_status_label,
                        "overdue_days": overdue_days,
                        "next_visit_date": next_visit_date,
                        # Demographics & Clinical values
                        "Age": age,
                        "Sex": "Female" if is_female else "Male",
                        "Length": 168.0,
                        "Weight": 72.0,
                        "BMI": round(72.0 / (1.68 ** 2), 2),
                        "BP": float(bp),
                        "Diastolic_BP": float(dbp),
                        "PR": float(pr),
                        "FBS": float(fbs),
                        "LDL": float(ldl),
                        "TG": float(tg),
                        "HDL": 42.0,
                        "CR": 1.0,
                        "BUN": 16.0,
                        "ESR": 14.0,
                        "HB": 13.8,
                        "EF_TTE": float(ef),
                        "St_Elevation": st_elev,
                        "St_Depression": st_dep,
                        "Tinversion": "1" if risk != "LOW_RISK" else "0",
                        "Q_Wave": "1" if risk == "HIGH_RISK" else "0",
                        "Region_RWMA": rwma,
                        "Typical_Chest_Pain": chest_pain,
                        "Dyspnea": dyspnea,
                        "DM": "1" if fbs >= 126 else "0",
                        "HTN": "1" if bp >= 140 else "0",
                        "Current_Smoker": "1" if (risk == "HIGH_RISK" and not is_female) else "0",
                        # Diagnostic Report Upload Info
                        "report_data": {
                            "lab_name": "Apex Central Diagnostic Center",
                            "technician_name": "Rajesh Kumar (Sr. Lab Tech)",
                            "upload_timestamp": (base_time - timedelta(days=rng.randint(1, 10))).isoformat(),
                            "vitals": {"BP": bp, "Diastolic_BP": dbp, "PR": pr, "BMI": 25.5},
                            "chemistry": {"FBS": fbs, "CR": 1.0, "BUN": 16.0, "ESR": 14.0, "HB": 13.8},
                            "lipids": {"TG": tg, "LDL": ldl, "HDL": 42.0},
                            "cardiac_ecg": {
                                "EF_TTE": ef,
                                "St_Elevation": st_elev,
                                "St_Depression": st_dep,
                                "Tinversion": "1" if risk != "LOW_RISK" else "0",
                                "Q_Wave": "1" if risk == "HIGH_RISK" else "0",
                                "Region_RWMA": rwma,
                                "Typical_Chest_Pain": chest_pain,
                                "Dyspnea": dyspnea,
                            },
                        },
                        # Model Predictions
                        "predictions": {
                            "overall_cad": {
                                "probability": cad_prob,
                                "risk_tier": "CRITICAL" if risk == "HIGH_RISK" else ("HIGH" if risk == "MODERATE_RISK" else "LOW"),
                                "stenosis_suspected": risk != "LOW_RISK",
                                "color_hex": "#EF4444" if risk == "HIGH_RISK" else ("#F59E0B" if risk == "MODERATE_RISK" else "#10B981"),
                            },
                            "vessels": {
                                "lad": {
                                    "probability": lad_prob,
                                    "risk_tier": "CRITICAL" if lad_prob >= 0.70 else ("HIGH" if lad_prob >= 0.45 else "LOW"),
                                    "stenosis_suspected": lad_prob >= 0.50,
                                    "color_hex": "#EF4444" if lad_prob >= 0.70 else ("#F59E0B" if lad_prob >= 0.45 else "#10B981"),
                                    "emissive_pulse": lad_prob >= 0.75,
                                },
                                "lcx": {
                                    "probability": lcx_prob,
                                    "risk_tier": "CRITICAL" if lcx_prob >= 0.70 else ("HIGH" if lcx_prob >= 0.45 else "LOW"),
                                    "stenosis_suspected": lcx_prob >= 0.50,
                                    "color_hex": "#EF4444" if lcx_prob >= 0.70 else ("#F59E0B" if lcx_prob >= 0.45 else "#10B981"),
                                    "emissive_pulse": lcx_prob >= 0.75,
                                },
                                "rca": {
                                    "probability": rca_prob,
                                    "risk_tier": "CRITICAL" if rca_prob >= 0.70 else ("HIGH" if rca_prob >= 0.45 else "LOW"),
                                    "stenosis_suspected": rca_prob >= 0.50,
                                    "color_hex": "#EF4444" if rca_prob >= 0.70 else ("#F59E0B" if rca_prob >= 0.45 else "#10B981"),
                                    "emissive_pulse": rca_prob >= 0.75,
                                },
                            },
                            "high_risk_vessels": ["lad"] if lad_prob >= 0.70 else (["rca"] if rca_prob >= 0.70 else []),
                            "clinical_summary": f"Calibrated {risk.replace('_', ' ')} cardiovascular profile with {int(cad_prob*100)}% overall stenosis risk.",
                        },
                        # 3D Uniforms
                        "uniforms": {
                            "lad": [0.93, 0.27, 0.27] if lad_prob >= 0.70 else ([0.96, 0.62, 0.04] if lad_prob >= 0.45 else [0.06, 0.72, 0.51]),
                            "lcx": [0.93, 0.27, 0.27] if lcx_prob >= 0.70 else ([0.96, 0.62, 0.04] if lcx_prob >= 0.45 else [0.06, 0.72, 0.51]),
                            "rca": [0.93, 0.27, 0.27] if rca_prob >= 0.70 else ([0.96, 0.62, 0.04] if rca_prob >= 0.45 else [0.06, 0.72, 0.51]),
                        },
                        # Doctor Consultation Section
                        "doctor_consultation": {
                            "consulted": is_consulted,
                            "doctor_name": doc_name,
                            "doctor_id": doc_id,
                            "consultation_date": consult_date,
                            "clinical_notes": notes,
                            "recommendation": rec,
                            "triage_decision": decision,
                        },
                        # Prescribed Patient Practices & Guidelines
                        "prescribed_practices": practices,
                    }
                    patients.append(record)
                    patient_counter += 1

    return patients


def main():
    dataset = generate_permutations_dataset()
    output_path = "synthetic/permutations_registry.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)

    print(f"Generated {len(dataset)} exhaustive clinical permutation patients in {output_path}")

    # Summary breakdown
    high_count = sum(1 for p in dataset if p["risk_category"] == "HIGH_RISK")
    mod_count = sum(1 for p in dataset if p["risk_category"] == "MODERATE_RISK")
    low_count = sum(1 for p in dataset if p["risk_category"] == "LOW_RISK")
    consulted_count = sum(1 for p in dataset if p["doctor_consultation"]["consulted"])
    pending_count = len(dataset) - consulted_count
    overdue_count = sum(1 for p in dataset if p["schedule_status"] == "OVERDUE")

    print(f"Risk Breakdown: {high_count} High, {mod_count} Moderate, {low_count} Low")
    print(f"Consultation Breakdown: {consulted_count} Consulted, {pending_count} Pending Review")
    print(f"Overdue Patients: {overdue_count}")


if __name__ == "__main__":
    main()

