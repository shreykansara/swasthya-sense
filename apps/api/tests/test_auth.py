"""
Authentication and Role-Based Access Control Tests
Swasthya Sense — Cardiac Follow-Up & Early-Warning Prototype
"""

import uuid
from fastapi.testclient import TestClient
import jwt

from apps.api.app.config import settings
from apps.api.app.main import app

client = TestClient(app)

SECRET = settings.SUPABASE_JWT_SECRET or "super-secret-jwt-token-with-at-least-32-characters-long"


def create_test_token(role: str, user_id: str | None = None) -> str:
    """Creates a signed JWT matching Supabase format."""
    payload = {
        "sub": user_id or str(uuid.uuid4()),
        "aud": "authenticated",
        "email": f"{role}@swasthya.test",
        "app_metadata": {
            "provider": "email",
            "role": role,
        },
        "user_metadata": {
            "role": role,
        },
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def test_unauthenticated_request_returns_401():
    """Unauthenticated requests to protected endpoints return 401."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "Missing authentication" in response.json()["detail"]


def test_invalid_token_returns_401():
    """Invalid token returns 401."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.jwt.token"},
    )
    assert response.status_code == 401


def test_authenticated_user_can_read_me():
    """Valid token allows user to access their own info."""
    user_id = str(uuid.uuid4())
    token = create_test_token(role="health_worker", user_id=user_id)
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user_id
    assert data["role"] == "health_worker"


def test_wrong_role_returns_403():
    """Patient or Health Worker accessing clinician-only route returns 403."""
    worker_token = create_test_token(role="health_worker")
    response = client.get(
        "/api/v1/clinician/queue",
        headers={"Authorization": f"Bearer {worker_token}"},
    )
    assert response.status_code == 403
    assert "Access forbidden" in response.json()["detail"]


def test_correct_role_returns_200():
    """Clinician accessing clinician-only route succeeds with 200."""
    clinician_token = create_test_token(role="clinician")
    response = client.get(
        "/api/v1/clinician/queue",
        headers={"Authorization": f"Bearer {clinician_token}"},
    )
    assert response.status_code == 200
    assert "Clinician queue access authorized" in response.json()["message"]


def test_admin_route_enforcement():
    """Clinician accessing admin route gets 403; Admin gets 200."""
    clinician_token = create_test_token(role="clinician")
    admin_token = create_test_token(role="admin")

    res_blocked = client.get(
        "/api/v1/admin/config",
        headers={"Authorization": f"Bearer {clinician_token}"},
    )
    assert res_blocked.status_code == 403

    res_allowed = client.get(
        "/api/v1/admin/config",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_allowed.status_code == 200
