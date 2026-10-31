"""Health check endpoint verification."""

from fastapi.testclient import TestClient
from apps.api.app.main import app

client = TestClient(app)


def test_root_health():
    """Verify /health returns 200 with service details and prototype disclaimer."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Swasthya Sense" in data["service"]
    assert "PROTOTYPE" in data["disclaimer"]


def test_api_v1_health():
    """Verify /api/v1/health returns 200 with matching contract."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Swasthya Sense" in data["service"]


def test_disclaimer_headers():
    """Verify mandatory prototype headers are present on all responses."""
    response = client.get("/health")
    assert response.headers.get("X-Application-Name") == "Swasthya Sense"
    assert "Prototype" in response.headers.get("X-Prototype-Notice", "")
