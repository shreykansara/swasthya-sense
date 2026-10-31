"""
Synthetic Patient, Clinical Trajectory & Lab Report Generator
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype

All generated data is strictly synthetic and educational.
"""

import argparse
import json
import math
import os
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid5, NAMESPACE_DNS
import yaml

from PIL import Image, ImageFilter, ImageEnhance
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

ROOT_DIR = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT_DIR / "synthetic" / "value_catalog.yaml"
OUTPUT_DIR = ROOT_DIR / "synthetic"
REPORTS_DIR = OUTPUT_DIR / "reports"

RANDOM_SEED = 42

INDIAN_FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
    "Shaurya", "Atharv", "Advik", "Pranav", "Kabir", "Ananya", "Diya", "Isha", "Riya", "Aadhya",
    "Anika", "Pari", "Saanvi", "Myra", "Navya", "Meera", "Kavya", "Tanvi", "Pooja", "Sunita",
    "Rajesh", "Suresh", "Vikram", "Manoj", "Ramesh", "Deepak", "Amit", "Alok", "Praveen", "Sanjay",
]

INDIAN_LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Gupta", "Singh", "Kumar", "Rao", "Devi", "Reddy", "Nair",
    "Joshi", "Bose", "Das", "Mukherjee", "Banerjee", "Mehta", "Shah", "Iyer", "Choudhury", "Mishra",
]

LANGUAGES = ["hi", "en", "hi", "en", "hi", "bn", "as"]
COHORTS = ["hypertension_lipids", "post_event_discharge", "heart_failure"]

WORKER_IDS = [
    "00000000-0000-0000-0000-000000000002",
    "00000000-0000-0000-0000-000000000022",
    "00000000-0000-0000-0000-000000000023",
]

CLINICIAN_IDS = [
    "00000000-0000-0000-0000-000000000003",
    "00000000-0000-0000-0000-000000000032",
]


def load_catalog() -> list[dict]:
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data["catalogs"]


def generate_patients_and_visits(n_per_cohort: int = 40, seed: int = RANDOM_SEED):
    random.seed(seed)
    catalog = load_catalog()
    catalog_by_id = {c["id"]: c for c in catalog}

    patients = []
    visits = []
    synthetic_truth = []

    patient_num = 1
    base_date = datetime(2026, 1, 1, 9, 0, 0, tzinfo=timezone.utc)

    for cohort_id in COHORTS:
        # Relevant analytes for this cohort
        relevant_analytes = [c for c in catalog if cohort_id in c["cohorts"]]

        for i in range(n_per_cohort):
            p_uuid = str(uuid5(NAMESPACE_DNS, f"swasthya-patient-{cohort_id}-{i}"))
            profile_uuid = str(uuid5(NAMESPACE_DNS, f"swasthya-profile-{cohort_id}-{i}"))
            first = random.choice(INDIAN_FIRST_NAMES)
            last = random.choice(INDIAN_LAST_NAMES)
            name = f"{first} {last}"
            masked_id = f"PT-{patient_num:04d}"
            phone_masked = f"+91 {random.randint(91,99)}XXX-XX{random.randint(100,999)}"
            lang = random.choice(LANGUAGES)
            worker_id = random.choice(WORKER_IDS)
            clinician_id = random.choice(CLINICIAN_IDS)

            # Assign clinical trajectory profile
            profile_type = random.choices(
                ["stable", "drifting", "sudden_jump", "missed_visits"],
                weights=[0.40, 0.25, 0.15, 0.20],
                k=1,
            )[0]

            # Ground-truth expectations for Phase 16 evaluation
            if profile_type == "sudden_jump":
                expected_truth = "urgent_clinical_review"
            elif profile_type == "drifting":
                expected_truth = "soon_clinical_review"
            elif profile_type == "missed_visits":
                expected_truth = "administrative_overdue"
            else:
                expected_truth = "stable_routine"

            synthetic_truth.append({
                "patient_id": p_uuid,
                "cohort_id": cohort_id,
                "profile_type": profile_type,
                "ground_truth_label": expected_truth,
                "expected_tier": "urgent" if expected_truth == "urgent_clinical_review" else (
                    "soon" if expected_truth == "soon_clinical_review" else "routine"
                ),
            })

            patients.append({
                "id": p_uuid,
                "profile_id": profile_uuid,
                "display_name": name,
                "masked_id": masked_id,
                "cohort_id": cohort_id,
                "assigned_worker_id": worker_id,
                "assigned_clinician_id": clinician_id,
                "preferred_language": lang,
                "phone_masked": phone_masked,
                "status": "active",
            })

            # Generate 6 to 12 visits across 12 months
            n_visits = random.randint(6, 12)
            cur_date = base_date + timedelta(days=random.randint(0, 15))

            # Initial baseline values for each analyte
            current_values = {}
            for analyte in relevant_analytes:
                low = analyte["reference_range"]["low"]
                high = analyte["reference_range"]["high"]
                mid = (low + high) / 2.0 if low > 0 else high * 0.6
                current_values[analyte["id"]] = round(random.gauss(mid, (high - low) * 0.15), 1)

            for v_idx in range(n_visits):
                visit_id = str(uuid5(NAMESPACE_DNS, f"swasthya-visit-{p_uuid}-{v_idx}"))
                days_gap = random.randint(25, 45)
                if profile_type == "missed_visits" and v_idx == n_visits - 1:
                    days_gap = random.randint(65, 95)  # Creates overdue administrative lateness

                cur_date += timedelta(days=days_gap)

                visit_readings = {}
                for analyte in relevant_analytes:
                    a_id = analyte["id"]
                    ref_low = analyte["reference_range"]["low"]
                    ref_high = analyte["reference_range"]["high"]

                    if profile_type == "stable":
                        val = random.gauss((ref_low + ref_high) / 2.0, (ref_high - ref_low) * 0.1)
                    elif profile_type == "drifting":
                        # Drifts steadily upward
                        drift = (v_idx / float(n_visits)) * (ref_high - ref_low) * 0.7
                        val = current_values[a_id] + drift + random.uniform(-2, 2)
                    elif profile_type == "sudden_jump" and v_idx >= n_visits - 2:
                        # Acute spike on final visits
                        val = ref_high * random.uniform(1.35, 1.8)
                    else:
                        val = current_values[a_id] + random.uniform(-3, 3)

                    # Clamp to plausible bounds
                    val = max(analyte["plausible_range"]["min"], min(analyte["plausible_range"]["max"], val))
                    val = round(val, 1)
                    visit_readings[a_id] = val

                visits.append({
                    "id": visit_id,
                    "patient_id": p_uuid,
                    "visit_index": v_idx + 1,
                    "visit_date": cur_date.strftime("%Y-%m-%d"),
                    "readings": visit_readings,
                })

            patient_num += 1

    return patients, visits, synthetic_truth


def save_synthetic_dataset(patients, visits, synthetic_truth):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    dataset = {
        "metadata": {
            "generator": "Swasthya Sense Synthetic Clinical Engine",
            "seed": RANDOM_SEED,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "patient_count": len(patients),
            "visit_count": len(visits),
            "prototype_disclaimer": "SYNTHETIC DATA ONLY - NOT A MEDICAL DEVICE",
        },
        "patients": patients,
        "visits": visits,
        "synthetic_truth": synthetic_truth,
    }

    with open(OUTPUT_DIR / "synthetic_patients.json", "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)

    # SQL Seed file for Supabase
    sql_path = OUTPUT_DIR / "seed_synthetic.sql"
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("-- Synthetic Seed Data for Swasthya Sense Prototype\n")
        f.write("-- Pure synthetic benchmark; does not contain real human data.\n\n")

        for p in patients:
            f.write(
                f"INSERT INTO public.profiles (id, role, display_name, preferred_language, masked_id) "
                f"VALUES ('{p['profile_id']}', 'patient', '{p['display_name']}', '{p['preferred_language']}', '{p['masked_id']}') "
                f"ON CONFLICT (id) DO NOTHING;\n"
            )
            f.write(
                f"INSERT INTO public.patients (id, profile_id, cohort_id, assigned_worker_id, assigned_clinician_id, preferred_language, phone_masked, status) "
                f"VALUES ('{p['id']}', '{p['profile_id']}', '{p['cohort_id']}', '{p['assigned_worker_id']}', '{p['assigned_clinician_id']}', '{p['preferred_language']}', '{p['phone_masked']}', '{p['status']}') "
                f"ON CONFLICT (id) DO NOTHING;\n"
            )

    print(f"Generated {len(patients)} patients across 3 cohorts with {len(visits)} visits.")
    print(f"Saved dataset to {OUTPUT_DIR / 'synthetic_patients.json'}")
    print(f"Saved SQL seed to {sql_path}")


# ==============================================================================
# PDF & Photographic Report Generation (Clean, Scanned, Camera Photo)
# ==============================================================================

REPORT_TEMPLATES = [
    {
        "id": "template_A",
        "title": "METRO DIAGNOSTIC LABS & CARDIAC CARE",
        "subtitle": "Comprehensive Metabolic & Clinical Pathology Profile",
        "patient": "Aarav Sharma",
        "age_gender": "48 Y / Male",
        "sample_id": "MDL-2026-9812",
        "date": "28-Oct-2026",
        "analytes": [
            ("Systolic Blood Pressure", "148.0", "mmHg", "90.0 - 120.0", "HIGH"),
            ("Diastolic Blood Pressure", "94.0", "mmHg", "60.0 - 80.0", "HIGH"),
            ("Fasting Blood Sugar", "118.0", "mg/dL", "70.0 - 100.0", "HIGH"),
            ("Serum Creatinine", "1.1", "mg/dL", "0.7 - 1.3", "NORMAL"),
            ("Potassium (K+)", "4.3", "mEq/L", "3.5 - 5.1", "NORMAL"),
            ("Total Cholesterol", "225.0", "mg/dL", "125.0 - 200.0", "HIGH"),
            ("LDL Cholesterol", "138.0", "mg/dL", "0.0 - 100.0", "HIGH"),
        ],
    },
    {
        "id": "template_B",
        "title": "APEX CLINICAL RESEARCH LABORATORIES",
        "subtitle": "Department of Biochemical Investigations",
        "patient": "Pooja Devi",
        "age_gender": "52 Y / Female",
        "sample_id": "APX-88210-C",
        "date": "29-Oct-2026",
        "analytes": [
            ("NT-proBNP", "460.0", "pg/mL", "0.0 - 125.0", "HIGH"),
            ("Body Weight", "68.5", "kg", "50.0 - 75.0", "NORMAL"),
            ("Systolic Blood Pressure", "132.0", "mmHg", "90.0 - 120.0", "HIGH"),
            ("Diastolic Blood Pressure", "84.0", "mmHg", "60.0 - 80.0", "HIGH"),
            ("Potassium (K+)", "4.8", "mEq/L", "3.5 - 5.1", "NORMAL"),
            ("Sodium (Na+)", "139.0", "mEq/L", "135.0 - 145.0", "NORMAL"),
            ("Serum Creatinine", "1.4", "mg/dL", "0.7 - 1.3", "HIGH"),
        ],
    },
    {
        "id": "template_C",
        "title": "SANJEEVANI COMMUNITY HEALTH CENTER",
        "subtitle": "Standardized Outpatient Cardiac Follow-Up Panel",
        "patient": "Vikram Patel",
        "age_gender": "60 Y / Male",
        "sample_id": "SCHC-44019",
        "date": "30-Oct-2026",
        "analytes": [
            ("Systolic Blood Pressure", "116.0", "mmHg", "90.0 - 120.0", "NORMAL"),
            ("Diastolic Blood Pressure", "76.0", "mmHg", "60.0 - 80.0", "NORMAL"),
            ("Total Cholesterol", "180.0", "mg/dL", "125.0 - 200.0", "NORMAL"),
            ("Triglycerides", "135.0", "mg/dL", "0.0 - 150.0", "NORMAL"),
            ("Fasting Blood Sugar", "92.0", "mg/dL", "70.0 - 100.0", "NORMAL"),
            ("Serum Creatinine", "0.9", "mg/dL", "0.7 - 1.3", "NORMAL"),
            ("Potassium (K+)", "4.1", "mEq/L", "3.5 - 5.1", "NORMAL"),
        ],
    },
]


def generate_clean_pdf(tmpl: dict, output_pdf_path: Path):
    doc = SimpleDocTemplate(str(output_pdf_path), pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()

    elements = []

    # Prototype Notice header
    proto_style = ParagraphStyle(
        "ProtoHeader",
        parent=styles["Normal"],
        fontSize=8,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#B45309"),
        alignment=1,
    )
    elements.append(Paragraph("PROTOTYPE — SYNTHETIC DATA ONLY — NOT A MEDICAL DEVICE", proto_style))
    elements.append(Spacer(1, 10))

    # Lab Header
    title_style = ParagraphStyle("LabTitle", parent=styles["Heading1"], fontSize=14, leading=16, alignment=1)
    sub_style = ParagraphStyle("LabSub", parent=styles["Normal"], fontSize=9, leading=11, alignment=1, textColor=colors.gray)
    elements.append(Paragraph(tmpl["title"], title_style))
    elements.append(Paragraph(tmpl["subtitle"], sub_style))
    elements.append(Spacer(1, 15))

    # Patient info box
    info_data = [
        [f"Patient Name: {tmpl['patient']}", f"Sample ID: {tmpl['sample_id']}"],
        [f"Age / Gender: {tmpl['age_gender']}", f"Report Date: {tmpl['date']}"],
    ]
    info_table = Table(info_data, colWidths=[270, 270])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 15))

    # Analytes Table
    headers = ["Test / Investigation", "Observed Value", "Units", "Reference Interval", "Flag"]
    table_rows = [headers]

    for item in tmpl["analytes"]:
        table_rows.append([item[0], item[1], item[2], item[3], item[4]])

    report_table = Table(table_rows, colWidths=[180, 90, 80, 120, 70])
    report_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("ALIGN", (2, 0), (2, -1), "CENTER"),
        ("ALIGN", (3, 0), (3, -1), "CENTER"),
        ("ALIGN", (4, 0), (4, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(report_table)

    elements.append(Spacer(1, 25))
    footer_style = ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=colors.gray, alignment=1)
    elements.append(Paragraph("Verification Signature: Human Verified &bull; End of Laboratory Investigation Report", footer_style))

    doc.build(elements)


def create_degraded_variants(clean_pdf_path: Path, scanned_pdf_path: Path, photo_jpg_path: Path):
    """
    Renders clean PDF to image, applies scanning degradation (skew/rotation/noise),
    and creates both an image-only scanned PDF and a mobile camera photo JPG.
    """
    import fitz  # PyMuPDF

    doc = fitz.open(clean_pdf_path)
    page = doc[0]
    pix = page.get_pixmap(dpi=200)
    img_path = clean_pdf_path.with_suffix(".png")
    pix.save(str(img_path))
    doc.close()

    # Open with PIL for image degradation
    base_img = Image.open(img_path).convert("RGB")

    # 1. Scanned variant: slight rotation (0.8 deg), slight contrast/brightness drift
    scanned_img = base_img.rotate(0.8, resample=Image.BICUBIC, expand=False, fillcolor=(255, 255, 255))
    enhancer = ImageEnhance.Contrast(scanned_img)
    scanned_img = enhancer.enhance(1.1)

    # Save image-only scanned PDF
    scanned_img.save(str(scanned_pdf_path), "PDF", resolution=150.0)

    # 2. Photo variant: perspective warp simulation, slight Gaussian blur, warmer lighting
    photo_img = base_img.rotate(-1.2, resample=Image.BICUBIC, expand=False, fillcolor=(245, 240, 235))
    photo_img = photo_img.filter(ImageFilter.GaussianBlur(radius=0.4))

    # Apply mobile camera warm vignette tint
    color_enhancer = ImageEnhance.Color(photo_img)
    photo_img = color_enhancer.enhance(0.9)
    brightness = ImageEnhance.Brightness(photo_img)
    photo_img = brightness.enhance(0.96)

    photo_img.save(str(photo_jpg_path), "JPEG", quality=85)

    # Remove temporary PNG
    if img_path.exists():
        img_path.unlink()


def generate_all_reports_and_manifest():
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {}

    for tmpl in REPORT_TEMPLATES:
        t_id = tmpl["id"]
        clean_pdf = REPORTS_DIR / f"{t_id}_clean.pdf"
        scanned_pdf = REPORTS_DIR / f"{t_id}_scanned.pdf"
        photo_jpg = REPORTS_DIR / f"{t_id}_photo.jpg"

        print(f"Generating clean PDF for {t_id}...")
        generate_clean_pdf(tmpl, clean_pdf)

        print(f"Creating degraded scanned PDF and photo JPG for {t_id}...")
        create_degraded_variants(clean_pdf, scanned_pdf, photo_jpg)

        # Ground truth mappings for OCR accuracy evaluation (Answer Key)
        expected_analytes = {}
        for item in tmpl["analytes"]:
            expected_analytes[item[0]] = {
                "analyte_name": item[0],
                "value": float(item[1]),
                "unit": item[2],
                "reference_range": item[3],
                "flag": item[4],
            }

        file_entry = {
            "template_id": t_id,
            "patient_name": tmpl["patient"],
            "sample_id": tmpl["sample_id"],
            "date": tmpl["date"],
            "expected_values": expected_analytes,
        }

        manifest[clean_pdf.name] = file_entry
        manifest[scanned_pdf.name] = file_entry
        manifest[photo_jpg.name] = file_entry

    manifest_path = REPORTS_DIR / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Generated 9 test report variants (3 templates × 3 styles) into {REPORTS_DIR}")
    print(f"Saved OCR ground-truth answer key to {manifest_path}")


def main():
    parser = argparse.ArgumentParser(description="Swasthya Sense Synthetic Clinical Generator")
    parser.add_argument("--all", action="store_true", help="Generate patients, visits, and all report files")
    parser.add_argument("--patients", action="store_true", help="Generate patient registry and visits only")
    parser.add_argument("--reports", action="store_true", help="Generate report documents only")
    args = parser.parse_args()

    if args.all or args.patients or (not args.reports and not args.patients):
        print("Generating synthetic patients and visit histories...")
        patients, visits, truth = generate_patients_and_visits(n_per_cohort=40)
        save_synthetic_dataset(patients, visits, truth)

    if args.all or args.reports:
        print("Generating synthetic lab reports and OCR evaluation manifest...")
        generate_all_reports_and_manifest()


if __name__ == "__main__":
    main()
