"""
Synthetic Cohort Registry Generator for Swasthya Sense.
Generates >= 60 longitudinal patients across 3 cohorts with injected ground-truth events:
- EVENT_MISSED_VISIT
- EVENT_LATE_VISIT
- EVENT_TRUE_DETERIORATION
"""

import os
import json
import random
import argparse
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

COHORTS = [
    "Cohort A: Hypertension with Lipids",
    "Cohort B: Post-Event Discharge",
    "Cohort C: Heart Failure",
]

FIRST_NAMES_MALE = ["Aarav", "Ramesh", "Sunil", "Rajesh", "Amit", "Abdul", "Vikram", "Suresh", "Manoj", "Anil", "Pradeep", "Karan"]
FIRST_NAMES_FEMALE = ["Sunita", "Pooja", "Lakshmi", "Meena", "Fatima", "Geeta", "Anjali", "Kavita", "Rekha", "Shanti", "Priyanka", "Deepa"]
LAST_NAMES = ["Sharma", "Verma", "Patel", "Kumar", "Singh", "Das", "Ali", "Narayanan", "Banerjee", "Gupta", "Joshi", "Choudhury"]


def mask_phone(phone_digits: str) -> str:
    """Masks phone number for privacy: +91-XXXXX-1234."""
    last_four = phone_digits[-4:]
    return f"+91-XXXXX-{last_four}"


def generate_baseline_patient(patient_id: str, cohort: str, seed: int) -> Dict[str, Any]:
    rng = random.Random(seed)
    is_female = rng.random() < 0.45
    sex = "Female" if is_female else "Male"
    first_name = rng.choice(FIRST_NAMES_FEMALE if is_female else FIRST_NAMES_MALE)
    last_name = rng.choice(LAST_NAMES)
    full_name = f"{first_name} {last_name}"
    phone_digits = f"{rng.randint(7000000000, 9999999999)}"

    age = rng.randint(42, 78)
    height_cm = rng.randint(150, 180)
    weight_kg = rng.randint(55, 95)
    bmi = round(weight_kg / ((height_cm / 100) ** 2), 2)

    # Base vitals dependent on cohort
    if cohort == "Cohort A: Hypertension with Lipids":
        base_sbp = rng.randint(138, 168)
        base_dbp = rng.randint(88, 104)
        base_hr = rng.randint(65, 85)
        base_ef = rng.randint(50, 65)
        base_ldl = rng.randint(130, 210)
        base_tg = rng.randint(150, 280)
        base_fbs = rng.randint(90, 150)
        dm = "1" if rng.random() < 0.4 else "0"
        htn = "1"
        chf = "N"
    elif cohort == "Cohort B: Post-Event Discharge":
        base_sbp = rng.randint(120, 150)
        base_dbp = rng.randint(75, 92)
        base_hr = rng.randint(60, 80)
        base_ef = rng.randint(38, 52)
        base_ldl = rng.randint(90, 160)
        base_tg = rng.randint(120, 200)
        base_fbs = rng.randint(85, 130)
        dm = "1" if rng.random() < 0.3 else "0"
        htn = "1" if rng.random() < 0.7 else "0"
        chf = "N"
    else:  # Cohort C: Heart Failure
        base_sbp = rng.randint(110, 142)
        base_dbp = rng.randint(70, 88)
        base_hr = rng.randint(75, 98)
        base_ef = rng.randint(28, 42)
        base_ldl = rng.randint(80, 140)
        base_tg = rng.randint(100, 180)
        base_fbs = rng.randint(85, 140)
        dm = "1" if rng.random() < 0.5 else "0"
        htn = "1" if rng.random() < 0.6 else "0"
        chf = "Y"

    return {
        "patient_id": patient_id,
        "patient_masked_id": f"PAT-***{patient_id[-3:]}",
        "full_name": full_name,
        "masked_phone": mask_phone(phone_digits),
        "cohort": cohort,
        "assigned_worker_id": f"ASHA-{(rng.randint(1, 5)):02d}",
        "Age": age,
        "Sex": sex,
        "Length": height_cm,
        "Weight": weight_kg,
        "BMI": bmi,
        "DM": dm,
        "HTN": htn,
        "Current Smoker": "1" if rng.random() < 0.25 else "0",
        "EX-Smoker": "1" if rng.random() < 0.2 else "0",
        "FH": "1" if rng.random() < 0.35 else "0",
        "Obesity": "Y" if bmi >= 30.0 else "N",
        "CRF": "Y" if rng.random() < 0.1 else "N",
        "CVA": "Y" if rng.random() < 0.08 else "N",
        "Airway disease": "Y" if rng.random() < 0.12 else "N",
        "Thyroid Disease": "Y" if rng.random() < 0.1 else "N",
        "CHF": chf,
        "DLP": "Y" if base_ldl > 130 else "N",
        "BP": base_sbp,
        "Diastolic_BP": base_dbp,
        "PR": base_hr,
        "Edema": "1" if cohort == "Cohort C: Heart Failure" and rng.random() < 0.5 else "0",
        "Weak Peripheral Pulse": "Y" if rng.random() < 0.15 else "N",
        "Lung rales": "Y" if cohort == "Cohort C: Heart Failure" and rng.random() < 0.4 else "N",
        "Systolic Murmur": "Y" if rng.random() < 0.2 else "N",
        "Diastolic Murmur": "N",
        "Typical Chest Pain": "1" if cohort == "Cohort B: Post-Event Discharge" and rng.random() < 0.3 else "0",
        "Dyspnea": "Y" if cohort == "Cohort C: Heart Failure" else ("Y" if rng.random() < 0.2 else "N"),
        "Function Class": "2" if cohort == "Cohort C: Heart Failure" else "0",
        "Atypical": "N",
        "Nonanginal": "N",
        "Exertional CP": "Y" if rng.random() < 0.2 else "N",
        "LowTH Ang": "N",
        "Q Wave": "1" if cohort == "Cohort B: Post-Event Discharge" and rng.random() < 0.6 else "0",
        "St Elevation": "0",
        "St Depression": "1" if rng.random() < 0.25 else "0",
        "Tinversion": "1" if rng.random() < 0.3 else "0",
        "LVH": "Y" if base_sbp > 150 else "N",
        "Poor R Progression": "Y" if rng.random() < 0.2 else "N",
        "BBB": "N",
        "FBS": base_fbs,
        "CR": round(rng.uniform(0.7, 1.6), 2),
        "TG": base_tg,
        "LDL": base_ldl,
        "HDL": rng.randint(35, 60),
        "BUN": rng.randint(10, 26),
        "ESR": rng.randint(5, 25),
        "HB": round(rng.uniform(11.5, 16.0), 1),
        "K": round(rng.uniform(3.8, 5.1), 1),
        "Na": rng.randint(136, 144),
        "WBC": rng.randint(4500, 10500),
        "Lymph": rng.randint(20, 40),
        "Neut": rng.randint(50, 72),
        "PLT": rng.randint(160, 340),
        "EF-TTE": base_ef,
        "Region RWMA": "2" if cohort == "Cohort B: Post-Event Discharge" else ("1" if cohort == "Cohort C: Heart Failure" else "0"),
        "VHD": "Mild" if rng.random() < 0.2 else "N",
    }


def inject_ground_truth_events(patients: List[Dict[str, Any]], base_date: datetime, seed: int = 42):
    """
    Injects verifiable ground truth events across the patient cohort:
    - Missed visits (EVENT_MISSED_VISIT): 20% of patients
    - Late visits within grace (EVENT_LATE_VISIT): 15% of patients
    - True deteriorations (EVENT_TRUE_DETERIORATION): 15% of patients (acute vitals or biomarkers)
    - Normal on-schedule: remaining ~50%
    """
    rng = random.Random(seed)

    for i, p in enumerate(patients):
        p["injected_ground_truth"] = []
        p["grace_period_days"] = 3
        p["last_visit_date"] = (base_date - timedelta(days=rng.randint(25, 45))).isoformat()

        # Categorize patient into a scenario:
        scenario = i % 6  # 0, 1, 2, 3, 4, 5

        if scenario == 0:
            # Overdue missed visit (> 3 days past scheduled date)
            days_overdue = rng.randint(5, 18)
            scheduled = base_date - timedelta(days=days_overdue)
            p["next_scheduled_date"] = scheduled.isoformat()
            p["injected_ground_truth"].append({
                "type": "EVENT_MISSED_VISIT",
                "days_overdue": days_overdue,
                "expected_lane": "administrative",
                "expected_tier": "tier_3_routine",
            })

        elif scenario == 1:
            # Late visit within grace period (1-2 days past scheduled date)
            days_in_grace = rng.randint(1, 2)
            scheduled = base_date - timedelta(days=days_in_grace)
            p["next_scheduled_date"] = scheduled.isoformat()
            p["injected_ground_truth"].append({
                "type": "EVENT_LATE_VISIT",
                "days_overdue": 0,
                "expected_lane": "administrative",
                "expected_tier": "tier_3_routine",
            })

        elif scenario == 2:
            # Acute Hypertensive Deterioration
            p["next_scheduled_date"] = (base_date + timedelta(days=rng.randint(2, 10))).isoformat()
            p["BP"] = rng.randint(182, 215)
            p["Diastolic_BP"] = rng.randint(112, 126)
            p["injected_ground_truth"].append({
                "type": "EVENT_TRUE_DETERIORATION",
                "trigger": "CRITICAL_SYSTOLIC_BP",
                "expected_lane": "clinical",
                "expected_tier": "tier_1_acute",
            })

        elif scenario == 3:
            # Heart Failure rapid weight gain (>= 2.5 kg) or Acute Biomarker Troponin spike
            p["next_scheduled_date"] = (base_date + timedelta(days=rng.randint(3, 14))).isoformat()
            if p["cohort"] == "Cohort C: Heart Failure":
                p["weight_delta_48h_kg"] = round(rng.uniform(2.3, 4.2), 1)
                p["injected_ground_truth"].append({
                    "type": "EVENT_TRUE_DETERIORATION",
                    "trigger": "RAPID_WEIGHT_GAIN",
                    "expected_lane": "clinical",
                    "expected_tier": "tier_2_subacute",
                })
            else:
                p["troponin_i_ng_ml"] = round(rng.uniform(0.06, 0.22), 3)
                p["has_resting_chest_pain"] = True
                p["injected_ground_truth"].append({
                    "type": "EVENT_TRUE_DETERIORATION",
                    "trigger": "ELEVATED_CARDIAC_BIOMARKER",
                    "expected_lane": "clinical",
                    "expected_tier": "tier_1_acute",
                })

        elif scenario == 4:
            # Compound case: BOTH overdue AND acute deterioration (Must route to Clinical Lane)
            days_overdue = rng.randint(6, 12)
            p["next_scheduled_date"] = (base_date - timedelta(days=days_overdue)).isoformat()
            p["BP"] = rng.randint(184, 205)
            p["Diastolic_BP"] = rng.randint(110, 120)
            p["injected_ground_truth"].append({
                "type": "EVENT_MISSED_VISIT",
                "days_overdue": days_overdue,
            })
            p["injected_ground_truth"].append({
                "type": "EVENT_TRUE_DETERIORATION",
                "trigger": "CRITICAL_SYSTOLIC_BP",
                "expected_lane": "clinical",
                "expected_tier": "tier_1_acute",
            })

        else:
            # Scenario 5: Normal on-schedule patient
            p["next_scheduled_date"] = (base_date + timedelta(days=rng.randint(7, 21))).isoformat()


def generate_cohort_registry(count: int = 60, seed: int = 2026) -> List[Dict[str, Any]]:
    """Generates count synthetic patients evenly distributed across the 3 cohorts."""
    patients: List[Dict[str, Any]] = []
    base_date = datetime(2026, 11, 1, 12, 0, 0, tzinfo=timezone.utc)

    for i in range(count):
        cohort = COHORTS[i % len(COHORTS)]
        patient_id = f"PAT-{(i + 1):04d}"
        p = generate_baseline_patient(patient_id=patient_id, cohort=cohort, seed=seed + i)
        patients.append(p)

    inject_ground_truth_events(patients, base_date=base_date, seed=seed)
    return patients


def main():
    parser = argparse.ArgumentParser(description="Generate Swasthya Sense synthetic patient registry.")
    parser.add_argument("--count", type=int, default=60, help="Number of patients to generate (min 60)")
    parser.add_argument("--output", type=str, default="synthetic/cohort_registry.json", help="Output JSON path")
    args = parser.parse_args()

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    registry = generate_cohort_registry(count=args.count)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)

    print(f"Successfully generated {len(registry)} synthetic patients across 3 cohorts in {args.output}")


if __name__ == "__main__":
    main()
