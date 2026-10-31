"""
Adversarial Data Leakage Prevention Tests
Adapted from Perfusion3D for Swasthya Sense
"""

from pathlib import Path
import pandas as pd
import pytest

from apps.api.app.perfusion.training.preprocess import DataLeakageException, StrictFeatureFilter

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "app" / "perfusion" / "data"


def test_leakage_guard_clean_data():
    """Verify that a legitimate feature set passes without error."""
    clean_df = pd.DataFrame({
        "Age": [55, 62],
        "BP": [120, 140],
        "Cholesterol": [200, 240],
        "Sex": ["Male", "Female"],
        "EF-TTE": [50, 45],
        "Region RWMA": [0, 2],
    })
    guard = StrictFeatureFilter()
    # Should not raise
    guard.fit(clean_df)
    transformed = guard.transform(clean_df)
    assert transformed.shape == clean_df.shape


@pytest.mark.parametrize(
    "forbidden_col",
    [
        "Cath",
        "cath",
        "CAD",
        "cad",
        "LAD",
        "lad",
        "LCX",
        "lcx",
        "RCA",
        "rca",
        "stenosis",
        "stenosis_status",
    ],
)
def test_leakage_guard_rejects_forbidden_columns(forbidden_col: str):
    """Verify that any injection of Cath or ground-truth stenosis raises DataLeakageException."""
    contaminated_df = pd.DataFrame({
        "Age": [55, 62],
        "BP": [120, 140],
        forbidden_col: [1, 0],
    })
    guard = StrictFeatureFilter()
    with pytest.raises(DataLeakageException):
        guard.fit(contaminated_df)


def test_processed_parquet_zero_leakage():
    """Verify that the exported X_features.parquet strictly contains no target features."""
    parquet_path = DATA_DIR / "X_features.parquet"
    assert parquet_path.exists(), f"Missing X_features.parquet at {parquet_path}"
    x_df = pd.read_parquet(parquet_path)
    guard = StrictFeatureFilter()
    guard.fit(x_df)
    for col in x_df.columns:
        lower = col.lower()
        assert "cath" not in lower
        assert lower != "cad"
        assert lower != "lad"
        assert lower != "lcx"
        assert lower != "rca"
