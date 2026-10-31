"""
Pure-Python Clinical Rule Evaluator
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype

Non-negotiable principles:
1. Pure Python: no DB access required to evaluate rules.
2. Clinical gate & Urgency tiers: produces urgent, soon, or routine priority.
3. Why-flagged contributions: calculates delta & divergence score for waterfall visualization.
4. Governance: rules cannot execute unless signed_off_by is populated.
"""

from pathlib import Path
from typing import Any
import yaml

from apps.api.app.config import ROOT_DIR
from apps.api.app.rules.models import (
    AnalyteMeasurement,
    ClinicalRule,
    EvaluationResult,
    PatientEvaluationContext,
    RuleCondition,
    RuleContribution,
    RuleMatchResult,
    UrgencyTier,
)
from apps.api.app.utils.logger import logger

RULES_DIR = ROOT_DIR / "rules" / "v1"

URGENCY_RANK: dict[UrgencyTier, int] = {
    "urgent": 3,
    "soon": 2,
    "routine": 1,
}


class RuleEngine:
    def __init__(self, rules_path: Path = RULES_DIR):
        self.rules_path = rules_path
        self.rules: list[ClinicalRule] = []
        self.load_rules()

    def load_rules(self) -> int:
        """Loads and validates all YAML rule files from rules_path."""
        self.rules = []
        if not self.rules_path.exists():
            logger.warning(f"Rules directory not found at {self.rules_path}")
            return 0

        for file in sorted(self.rules_path.glob("*.yaml")):
            try:
                with open(file, "r", encoding="utf-8") as f:
                    raw = yaml.safe_load(f)
                rule = ClinicalRule.model_validate(raw)
                self.rules.append(rule)
            except Exception as e:
                logger.error(f"Failed to load rule from {file}: {e}")

        logger.info(f"Loaded {len(self.rules)} clinical rules from {self.rules_path}")
        return len(self.rules)

    def evaluate_condition(
        self,
        cond: RuleCondition,
        current_map: dict[str, AnalyteMeasurement],
        historical_map: dict[str, list[AnalyteMeasurement]],
    ) -> tuple[bool, RuleContribution | None]:
        """Evaluates a single rule condition and computes its contribution."""
        meas = current_map.get(cond.analyte)
        if not meas:
            return False, None

        curr_val = meas.value
        thresh = cond.threshold
        matched = False
        baseline_val: float | None = None
        delta: float | None = None

        if cond.operator == ">":
            matched = curr_val > thresh
            divergence = curr_val - thresh
            summary = f"{cond.analyte} ({curr_val} {cond.unit}) > threshold ({thresh} {cond.unit})"

        elif cond.operator == ">=":
            matched = curr_val >= thresh
            divergence = curr_val - thresh
            summary = f"{cond.analyte} ({curr_val} {cond.unit}) >= threshold ({thresh} {cond.unit})"

        elif cond.operator == "<":
            matched = curr_val < thresh
            divergence = thresh - curr_val
            summary = f"{cond.analyte} ({curr_val} {cond.unit}) < threshold ({thresh} {cond.unit})"

        elif cond.operator == "<=":
            matched = curr_val <= thresh
            divergence = thresh - curr_val
            summary = f"{cond.analyte} ({curr_val} {cond.unit}) <= threshold ({thresh} {cond.unit})"

        elif cond.operator == "==":
            matched = abs(curr_val - thresh) < 1e-6
            divergence = abs(curr_val - thresh)
            summary = f"{cond.analyte} ({curr_val} {cond.unit}) == threshold ({thresh} {cond.unit})"

        elif cond.operator in ("delta_gte", "delta_lte"):
            # Check historical baseline
            history = historical_map.get(cond.analyte, [])
            if not history:
                # If no historical baseline, cannot evaluate delta condition
                return False, None
            # Earliest baseline in window
            baseline_meas = history[0]
            baseline_val = baseline_meas.value
            delta = curr_val - baseline_val

            if cond.operator == "delta_gte":
                matched = delta >= thresh
                divergence = delta - thresh
                summary = (
                    f"{cond.analyte} increased by {delta:+.1f} {cond.unit} "
                    f"(baseline: {baseline_val}, current: {curr_val}) >= threshold ({thresh} {cond.unit})"
                )
            else:
                matched = delta <= thresh
                divergence = thresh - delta
                summary = (
                    f"{cond.analyte} changed by {delta:+.1f} {cond.unit} "
                    f"(baseline: {baseline_val}, current: {curr_val}) <= threshold ({thresh} {cond.unit})"
                )
        else:
            return False, None

        if not matched:
            return False, None

        contrib = RuleContribution(
            analyte=cond.analyte,
            current_value=curr_val,
            baseline_value=baseline_val,
            threshold=thresh,
            unit=cond.unit,
            delta=delta,
            divergence_score=round(divergence, 3),
            summary=summary,
        )
        return True, contrib

    def evaluate(self, ctx: PatientEvaluationContext) -> EvaluationResult:
        """
        Pure evaluation of a patient context against all signed-off candidate rules.
        Returns matched rules with contribution details and the overall urgency tier.
        """
        current_map = {m.analyte_key: m for m in ctx.current_values}
        historical_map: dict[str, list[AnalyteMeasurement]] = {}
        for h in ctx.historical_values:
            historical_map.setdefault(h.analyte_key, []).append(h)

        matched_rules: list[RuleMatchResult] = []

        for rule in self.rules:
            # 1. Sign-off governance: skip unapproved rules
            if not rule.is_signed_off:
                logger.debug(f"Skipping unsigned rule: {rule.rule_id}")
                continue

            # 2. Cohort filter: match if "any" or exact cohort
            if rule.cohort != "any" and rule.cohort != ctx.cohort:
                continue

            # 3. Evaluate all conditions in rule (AND logic across conditions)
            rule_matched = True
            contributions: list[RuleContribution] = []

            for cond in rule.conditions:
                cond_matched, contrib = self.evaluate_condition(cond, current_map, historical_map)
                if not cond_matched:
                    rule_matched = False
                    break
                if contrib:
                    contributions.append(contrib)

            if rule_matched and contributions:
                matched_rules.append(
                    RuleMatchResult(
                        rule_id=rule.rule_id,
                        rule_version=rule.version,
                        title=rule.title,
                        urgency=rule.urgency,
                        reason_code=rule.reason_code,
                        patient_explanation=rule.patient_explanation,
                        clinician_summary=rule.clinician_summary,
                        contributions=contributions,
                    )
                )

        # Calculate overall highest urgency tier
        highest_tier: UrgencyTier = "routine"
        max_rank = 1
        for mr in matched_rules:
            rank = URGENCY_RANK.get(mr.urgency, 1)
            if rank > max_rank:
                max_rank = rank
                highest_tier = mr.urgency

        return EvaluationResult(
            patient_id=ctx.patient_id,
            highest_urgency=highest_tier,
            matched_rules=matched_rules,
        )


rule_engine = RuleEngine()
