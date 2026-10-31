"""
Tests for Evaluation Harness Metrics (Phase 6).
Asserts precision, recall, lane isolation accuracy, and rule-trace coverage.
"""

from scripts.run_evaluation_harness import generate_benchmark_reports


def test_evaluation_benchmark_metrics():
    """Verify that all target success measures are quantitatively achieved."""
    report = generate_benchmark_reports()
    m = report["metrics"]

    # 1. Overdue Detection Precision and Recall (Success Measure 1)
    overdue = m["overdue_identification"]
    assert overdue["recall"] >= 0.95, f"Overdue recall {overdue['recall']} below target 0.95"
    assert overdue["precision"] >= 0.95, f"Overdue precision {overdue['precision']} below target 0.95"
    assert overdue["f1_score"] >= 0.95, f"Overdue F1 {overdue['f1_score']} below target 0.95"

    # 2. Useful Prioritization & Lane Isolation (Success Measure 2)
    prioritization = m["useful_prioritization_and_lane_isolation"]
    assert prioritization["lane_isolation_accuracy"] == 1.0, "Deteriorations must never route to administrative lane"
    assert prioritization["deteriorations_misrouted_to_admin"] == 0

    # 3. Transparent Rule Trace Coverage (Success Measure 3)
    trace = m["transparent_rule_explainability"]
    assert trace["trace_coverage"] == 1.0, "All alerts must provide complete rule trace"

