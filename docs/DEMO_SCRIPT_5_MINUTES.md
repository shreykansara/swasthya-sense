# Swasthya Sense: 5-Minute End-to-End Evaluation & Demo Script
**Platform:** Privacy-Conscious Early Warning & Follow-Up for High-Risk Patients  
**Problem Statement:** Problem 2 (Multimodal AI Hackathon 2026)  
**Workflow Reference:** Page 5 of Product Workflow Specification (14 steps, 3 decisions, 1 loop)  

---

## Overview of the 5-Minute Walkthrough

```
[00:00 - 01:00]  Phase 1: Consent Capture & Multimodal Report Intake (No Diagnosis)
[01:00 - 02:00]  Phase 2: Transparent Rule Engine & Two-Lane Worklist Triage
[02:00 - 03:00]  Phase 3: Clinician Assessment Gate & 3D Coronary Digital Twin
[03:00 - 04:00]  Phase 4: Closed-Loop Referral & Consent-Gated Reminder Dispatch
[04:00 - 05:00]  Phase 5: Check-in Response, Escalation Ladder & Immutable Audit Trail
```

---

## Minute 1 [00:00 - 01:00]: Consent Capture & Multimodal Report Intake

### Objective:
Demonstrate the entry of a patient into the system, emphasizing privacy consent and zero-hallucination report parsing.

1. **Patient Consent Gate (Step 1)**:
   - Navigate to the **Consent & Intake** tab.
   - Point out the explicit, revocable consent modal:
     > *"Before any records are created or reminders dispatched, the patient must grant consent. If consent is withheld, the platform stops immediately: zero data is retained."*
   - Toggle consent to **Active**.
2. **Report Upload & OCR Extraction (Step 2 & 3)**:
   - Select a synthetic test report (e.g. `high_risk_lad/blood_lab_report.pdf` or ECG report).
   - Click **Extract Report**.
   - Show how the parser extracts structured values (Troponin-I: `0.082 ng/mL`, SBP: `188 mmHg`, Creatinine: `1.4 mg/dL`).
   - Highlight the **Source-Grounded Verification**: Each value links directly to its source location in the report.
   - Highlight the **Regulatory Safety Guardrail**:
     > *"Notice that the readout is strictly limited to the tested numbers and reference ranges. The platform never names a disease or synthesizes a diagnosis."*
   - Click **Confirm Extracted Values**.

---

## Minute 2 [01:00 - 02:00]: Transparent Rule Engine & Two-Lane Frontline Worklist

### Objective:
Showcase how incoming patient data triggers the deterministic rule engine and automatically partitions into the strict **Two-Lane Frontline Worklist**.

1. **Two-Lane Worklist Separation (Gap 4)**:
   - Switch to the **Frontline Worker Dashboard** (Role: `Health Worker`).
   - Point out the two isolated lanes:
     - **Lane 1: Clinical Priority Lane (Top Priority)**:
       - Displays patients with acute physiological warnings (e.g., SBP $\ge 180$, Troponin-I $> 0.04$).
       - Shows patient `PAT-***005` flagged with **Tier 1 Acute Alert** (SLA: $< 4\text{ hours}$).
     - **Lane 2: Administrative Priority Lane (Operational Follow-Ups)**:
       - Displays patients with scheduled lateness (e.g., appointment overdue by 7 days).
       - Shows patient `PAT-***007` flagged with **Administrative Overdue** (Grace period of 3 days exceeded).
   - Emphasize the core invariant:
     > *"Operational lateness is never mixed with acute clinical decompensation. Frontline workers immediately know which patients require emergency clinical review versus routine reminder calls."*
2. **Transparent "Why-Flagged" Explainability**:
   - Click on the alert for `PAT-***005`.
   - Open the **Why-Flagged Panel**:
     - Rule ID: `RULE-BP-01-v1.0` (Signed off by Medical Officer).
     - Exact Input: SBP `188 mmHg` vs Clinical Threshold $\ge 180\text{ mmHg}$.
     - Rationale: *"Severely elevated systolic blood pressure requiring urgent clinician review."*
     - Clear disclaimer: `[PROTOTYPE: Clinical Decision Support Only]`.

---

## Minute 3 [02:00 - 03:00]: Clinician Assessment Gate & 3D Coronary Digital Twin

### Objective:
Demonstrate clinical decision support, the 3D anatomical viewer, and the strict human sign-off gate.

1. **Role Switch to Clinician (Gap 1)**:
   - Using the header role switcher, select **Role: Clinician**.
   - Open the case review for `PAT-***005`.
2. **3D Coronary Twin & TreeSHAP Attribution (Gap 2 & 3)**:
   - Show how the **3D Coronary Digital Twin** opens, prefilled with the patient's verified measurements:
     - The Left Anterior Descending (LAD) artery glows crimson (`#EF4444`) with an active hemodynamic pulse shader.
     - LCX and RCA arteries are shaded based on their territory perfusion indices.
   - Point out the **TreeSHAP Waterfall Chart**:
     - Displays top contributing risk factors (Age, Systolic BP, ST-segment depression).
   - Emphasize safety:
     > *"The 3D anatomical twin is accessible only to qualified clinicians. Non-clinical frontline workers receive high-contrast, low-density summary cards without diagnostic complexity."*
3. **The Clinician Gate (Step 6)**:
   - Attempt to finalize a care plan without sign-off:
     > *"Foundational Rule: No care plan exists until a clinician has assessed the case."*
   - Enter Clinician Registration ID (`MCI-48201`), select Assessment Finding: *"Sub-acute hypertensive crisis with anterior territory ischemic risk"*, and click **Sign Off Assessment**.

---

## Minute 4 [03:00 - 04:00]: Closed-Loop Referral & Consent-Gated Reminders

### Objective:
Showcase referral management and the simulated WhatsApp/SMS reminder engine.

1. **Closed-Loop Referral Tracker (Step 7)**:
   - In the clinician workspace, click **Log Tertiary Hospital Referral**.
   - Show the referral state progression:
     $$\text{Initiated} \longrightarrow \text{Appointment Scheduled} \longrightarrow \text{Attended by Specialist} \longrightarrow \text{Outcome Documented}$$
   - Point out the referral SLA timer (7 days for cardiac outpatient follow-up).
2. **Simulated WhatsApp/SMS Communication Drawer**:
   - Open the **Communication Simulator**.
   - Show the message dispatch options:
     - Multi-language templates: English, Hindi, and Assamese (`[Machine-translated · Clinical Review Pending]`).
     - Quiet hours enforcement (e.g. suppression between 20:00 and 08:00).
   - Click **Send WhatsApp Reminder**.
   - Show realistic message state delivery:
     $$\text{QUEUED} \longrightarrow \text{SENT} \longrightarrow \text{DELIVERED} \longrightarrow \text{READ}$$

---

## Minute 5 [04:00 - 05:00]: Check-In Feedback, 4-Stage Escalation Ladder & Audit Trail

### Objective:
Demonstrate the full lifecycle loop: handling patient replies, escalating unreached patients, and verifying compliance.

1. **Simulated Patient Reply & Structured Check-in**:
   - In the simulator, click **Simulate Patient Reply** (e.g. *"Checked BP today: 132/84, taking medicines regularly"*).
   - Show the frontline check-in form prefilled, closing the loop on the scheduled visit.
2. **Unanswered Check-in & 4-Stage Escalation Ladder**:
   - Show an unreached patient who did not reply:
     - **Step 1 (Day 0 Overdue)**: Automated conversational reminder dispatched.
     - **Step 2 (+2 Days Overdue)**: Frontline worker telephone follow-up prompt.
     - **Step 3 (+5 Days Overdue)**: Home field visit scheduled on ASHA's daily route.
     - **Step 4 (+8 Days Overdue)**: Supervisory red alert dispatched to Medical Officer / PHC In-Charge.
3. **Emergency Red-Flag Fast-Path (Gap 7)**:
   - Show a crisis vital entry (SBP $\ge 200\text{ mmHg}$).
   - Notice the direct red-flag banner with **1-click Emergency Call (108)** routing.
4. **Immutable Audit Trail & Patient Access Log**:
   - Open the **Audit Log**:
     - Shows cryptographic append-only entries: Who viewed the record, who signed the care plan, when reminders were sent, and consent status.
   - Switch to **Role: Patient** and view the **Patient Access Log**:
     > *"The patient can see transparently: 'Dr. Sen reviewed your heart assessment today at 11:30 AM'."*
5. **Conclusion & Success Metric Summary**:
   - Direct attention to `reports/evaluation_benchmark.md`:
     - **100% Recall & 100% Precision** on overdue detection.
     - **100% Triage Lane Isolation Accuracy**.
     - **100% Rule Trace Explainability**.

---
*Swasthya Sense · Track A: Multimodal AI Hackathon 2026*
