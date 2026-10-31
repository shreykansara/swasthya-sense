"""
TreeSHAP Latency Verification Tests
Verifies local feature attribution latency meets real-time SLA (< 3.5 ms per vessel).
"""

import time
import numpy as np
import pytest

from apps.api.app.perfusion.schemas import PatientInputSchema
from apps.api.app.perfusion.service import explain_patient, model_service


@pytest.fixture(scope="module", autouse=True)
def ensure_models_loaded():
    if not model_service.is_ready:
        model_service.load_artifacts()


@pytest.mark.parametrize("target", ["LAD", "LCX", "RCA", "CAD"])
def test_treeshap_latency_per_vessel(target: str):
    """Executes 200 iterations of TreeSHAP attribution and asserts median latency < 3.5 ms."""
    patient = PatientInputSchema()
    df = patient.to_feature_dataframe()
    x_trans = model_service.preprocessor.transform(df)

    # Warmup
    for _ in range(10):
        explain_patient(patient, target, pretransformed_x=x_trans, precomputed_prob=0.5)

    latencies_ms: list[float] = []
    for _ in range(200):
        t0 = time.perf_counter()
        res = explain_patient(patient, target, pretransformed_x=x_trans, precomputed_prob=0.5)
        latencies_ms.append((time.perf_counter() - t0) * 1000.0)

    median_ms = float(np.median(latencies_ms))
    p95_ms = float(np.percentile(latencies_ms, 95))

    assert res is not None
    assert len(res.top_features) > 0
    assert (
        median_ms < 3.5
    ), f"Target {target} TreeSHAP median latency {median_ms:.2f} ms exceeded 3.5 ms threshold (P95: {p95_ms:.2f} ms)"
