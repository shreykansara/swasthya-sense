"""
Cohort Schedule Templates and Dynamic Escalation Ladder Service.
Allows administrators to configure follow-up windows, grace periods, and escalation steps (Gaps 5-6).
"""

from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta


class EscalationStep(BaseModel):
    step_number: int
    days_overdue: int
    channel: str  # 'whatsapp', 'sms', 'phone_call', 'field_visit', 'supervisor_alert'
    action_label: str
    recipient_role: str  # 'patient', 'worker', 'supervisor', 'clinician'
    template_message: str


class CohortScheduleTemplate(BaseModel):
    cohort_id: str
    cohort_name: str
    base_followup_days: int
    window_days: int = 2
    grace_period_days: int = 3
    escalation_steps: List[EscalationStep] = Field(default_factory=list)
    version: str = "1.0.0"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Default Template Store (In-Memory with Admin Mutability)
DEFAULT_SCHEDULES: Dict[str, CohortScheduleTemplate] = {
    "cohort_a": CohortScheduleTemplate(
        cohort_id="cohort_a",
        cohort_name="Cohort A: Hypertension with Lipids",
        base_followup_days=30,
        window_days=2,
        grace_period_days=3,
        escalation_steps=[
            EscalationStep(
                step_number=1,
                days_overdue=0,
                channel="whatsapp",
                action_label="Automated WhatsApp Reminder",
                recipient_role="patient",
                template_message="Namaste {name}, your monthly blood pressure check is due. Please visit your local health center or reply here to book a home visit.",
            ),
            EscalationStep(
                step_number=2,
                days_overdue=2,
                channel="phone_call",
                action_label="Frontline Worker Phone Follow-up",
                recipient_role="worker",
                template_message="Patient {masked_id} has not scheduled their monthly BP check-in. Please call to confirm health status.",
            ),
            EscalationStep(
                step_number=3,
                days_overdue=5,
                channel="field_visit",
                action_label="Assign ASHA Field Visit",
                recipient_role="worker",
                template_message="Follow-up overdue by 5 days. Home visit scheduled for blood pressure measurement.",
            ),
            EscalationStep(
                step_number=4,
                days_overdue=8,
                channel="supervisor_alert",
                action_label="Supervisor Escalation",
                recipient_role="supervisor",
                template_message="Unresolved missed follow-up for patient {masked_id} (> 8 days overdue). PHC review required.",
            ),
        ],
    ),
    "cohort_b": CohortScheduleTemplate(
        cohort_id="cohort_b",
        cohort_name="Cohort B: Post-Event Discharge",
        base_followup_days=14,
        window_days=1,
        grace_period_days=2,
        escalation_steps=[
            EscalationStep(
                step_number=1,
                days_overdue=0,
                channel="sms",
                action_label="Post-Discharge Check-in Prompt",
                recipient_role="patient",
                template_message="Hello {name}, your post-discharge check-in is due today. Please record your blood pressure and report any chest discomfort.",
            ),
            EscalationStep(
                step_number=2,
                days_overdue=1,
                channel="phone_call",
                action_label="Urgent Worker Outreach",
                recipient_role="worker",
                template_message="High-risk post-discharge patient {masked_id} missed day 14 check-in. Outreach required.",
            ),
            EscalationStep(
                step_number=3,
                days_overdue=3,
                channel="field_visit",
                action_label="Emergency Home Visit",
                recipient_role="worker",
                template_message="Immediate home visit to verify medication compliance (DAPT) and vitals.",
            ),
            EscalationStep(
                step_number=4,
                days_overdue=5,
                channel="supervisor_alert",
                action_label="Cardiologist / MO Alert",
                recipient_role="clinician",
                template_message="Post-event discharge patient {masked_id} unreachable for 5 days. Hospital outreach triggered.",
            ),
        ],
    ),
    "cohort_c": CohortScheduleTemplate(
        cohort_id="cohort_c",
        cohort_name="Cohort C: Heart Failure",
        base_followup_days=14,
        window_days=1,
        grace_period_days=2,
        escalation_steps=[
            EscalationStep(
                step_number=1,
                days_overdue=0,
                channel="whatsapp",
                action_label="Bi-Weekly Weight & Symptom Check",
                recipient_role="patient",
                template_message="Hello {name}, please report your morning dry weight and let us know if you feel any ankle swelling or breathlessness.",
            ),
            EscalationStep(
                step_number=2,
                days_overdue=2,
                channel="phone_call",
                action_label="ASHA Nurse Check-in Call",
                recipient_role="worker",
                template_message="Heart failure patient {masked_id} missed bi-weekly weigh-in. Please call immediately.",
            ),
            EscalationStep(
                step_number=3,
                days_overdue=4,
                channel="field_visit",
                action_label="Home Examination Visit",
                recipient_role="worker",
                template_message="Home visit to check for lung rales, pedal edema, and measure fluid status.",
            ),
            EscalationStep(
                step_number=4,
                days_overdue=6,
                channel="supervisor_alert",
                action_label="Medical Officer Escalation",
                recipient_role="supervisor",
                template_message="Critical heart failure patient {masked_id} missed routine follow-up window.",
            ),
        ],
    ),
}

# Runtime schedule storage
_SCHEDULE_REGISTRY: Dict[str, CohortScheduleTemplate] = {k: v.model_copy(deep=True) for k, v in DEFAULT_SCHEDULES.items()}


def get_all_templates() -> List[CohortScheduleTemplate]:
    return list(_SCHEDULE_REGISTRY.values())


def get_template(cohort_id: str) -> Optional[CohortScheduleTemplate]:
    return _SCHEDULE_REGISTRY.get(cohort_id)


def update_template(cohort_id: str, grace_period_days: Optional[int] = None, base_followup_days: Optional[int] = None) -> Optional[CohortScheduleTemplate]:
    """Admin function: Updates template parameters dynamically at runtime."""
    template = _SCHEDULE_REGISTRY.get(cohort_id)
    if not template:
        return None
    if grace_period_days is not None:
        template.grace_period_days = grace_period_days
    if base_followup_days is not None:
        template.base_followup_days = base_followup_days
    template.updated_at = datetime.now(timezone.utc)
    return template


def determine_escalation_step(cohort_id: str, days_overdue: int) -> Optional[EscalationStep]:
    """Returns the active escalation ladder step corresponding to how many days overdue a case is."""
    template = _SCHEDULE_REGISTRY.get(cohort_id)
    if not template or not template.escalation_steps:
        return None
    
    active_step: Optional[EscalationStep] = None
    for step in sorted(template.escalation_steps, key=lambda s: s.days_overdue):
        if days_overdue >= step.days_overdue:
            active_step = step
    return active_step
