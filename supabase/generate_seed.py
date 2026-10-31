"""
Generates supabase/seed.sql using the 54 permutations dataset.
"""

import json
from pathlib import Path

REGISTRY_PATH = Path("synthetic/permutations_registry.json")
OUTPUT_PATH = Path("supabase/seed.sql")

def escape_sql(val):
    if val is None:
        return "null"
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, (dict, list)):
        dumped = json.dumps(val).replace("'", "''")
        return f"'{dumped}'::jsonb"
    val_str = str(val).replace("'", "''")
    return f"'{val_str}'"

def main():
    if not REGISTRY_PATH.exists():
        print(f"Error: {REGISTRY_PATH} not found.")
        return

    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        patients = json.load(f)

    lines = [
        "-- Swasthya Sense Seed Data: 54 Permutations of Clinical Patients & Practices\n",
        "delete from public.patients;\n",
    ]

    for p in patients:
        pid = escape_sql(p["patient_id"])
        full_name = escape_sql(p["full_name"])
        age = p["Age"]
        sex = escape_sql(p["Sex"])
        phone = escape_sql(p.get("phone", "+91-98000-00000"))
        masked_phone = escape_sql(p.get("masked_phone", "+91-XXXXX-0000"))
        email = escape_sql(p.get("email", f"patient.{p['patient_id'].lower()}@swasthya.internal"))
        cohort = escape_sql(p["cohort"])
        risk_category = escape_sql(p["risk_category"])
        status = escape_sql(p["status"])
        is_high_priority = escape_sql(p["is_high_priority"])
        triage_lane = escape_sql(p["triage_lane"])
        triage_tier = escape_sql(p["triage_tier"])
        schedule_status = escape_sql(p.get("schedule_status", "ON_SCHEDULE"))
        overdue_days = p.get("overdue_days", 0)
        next_visit_date = escape_sql(p.get("next_visit_date"))

        report_data = escape_sql(p.get("report_data", {}))
        predictions = escape_sql(p.get("predictions", {}))
        uniforms = escape_sql(p.get("uniforms", {}))
        doctor_consultation = escape_sql(p.get("doctor_consultation", {}))
        prescribed_practices = escape_sql(p.get("prescribed_practices", {}))

        insert_stmt = f"""
insert into public.patients (
  id, full_name, age, sex, phone, masked_phone, email, cohort,
  risk_category, status, is_high_priority, triage_lane, triage_tier,
  schedule_status, overdue_days, next_visit_date, report_data,
  predictions, uniforms, doctor_consultation, prescribed_practices
) values (
  {pid}, {full_name}, {age}, {sex}, {phone}, {masked_phone}, {email}, {cohort},
  {risk_category}, {status}, {is_high_priority}, {triage_lane}, {triage_tier},
  {schedule_status}, {overdue_days}, {next_visit_date}, {report_data},
  {predictions}, {uniforms}, {doctor_consultation}, {prescribed_practices}
) on conflict (id) do update set
  full_name = excluded.full_name,
  risk_category = excluded.risk_category,
  status = excluded.status,
  report_data = excluded.report_data,
  predictions = excluded.predictions,
  doctor_consultation = excluded.doctor_consultation,
  prescribed_practices = excluded.prescribed_practices,
  updated_at = now();
"""
        lines.append(insert_stmt)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.writelines(lines)

    print(f"Generated {len(patients)} patient seed statements in {OUTPUT_PATH}")

if __name__ == "__main__":
    main()

