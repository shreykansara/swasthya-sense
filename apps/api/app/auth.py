"""
Authentication and Role-Based Access Control (RBAC)
Swasthya Sense — Supabase JWT Verification & Role Guards
"""

from typing import Annotated, Callable
from uuid import UUID
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt.exceptions import PyJWTError
from pydantic import BaseModel

from apps.api.app.config import settings
from apps.api.app.utils.logger import logger

security = HTTPBearer(auto_error=False)


class CurrentUser(BaseModel):
    id: UUID
    role: str
    email: str | None = None


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(security)],
) -> CurrentUser:
    """
    Validates Supabase Bearer JWT and extracts user ID and role.
    Raises 401 UNAUTHORIZED if token is missing or invalid.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Development fallback secret if not configured in .env
    secret = settings.SUPABASE_JWT_SECRET or "super-secret-jwt-token-with-at-least-32-characters-long"

    try:
        if settings.DEBUG and not settings.SUPABASE_JWT_SECRET:
            payload = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_signature": False})
        else:
            payload = jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")

        user_id_raw = payload.get("sub")
        if not user_id_raw:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: missing subject (sub)",
                headers={"WWW-Authenticate": "Bearer"},
            )

        app_metadata = payload.get("app_metadata", {})
        user_metadata = payload.get("user_metadata", {})
        user_role = (
            app_metadata.get("role")
            or user_metadata.get("role")
            or payload.get("role", "patient")
        )

        email = payload.get("email")

        return CurrentUser(
            id=UUID(user_id_raw),
            role=user_role,
            email=email,
        )

    except (PyJWTError, ValueError) as exc:
        logger.warning(f"JWT verification failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_role(*allowed_roles: str) -> Callable[[CurrentUser], CurrentUser]:
    """
    FastAPI dependency factory enforcing role check.
    Returns 403 FORBIDDEN if user role is not in allowed roles.
    """
    async def role_checker(
        current_user: Annotated[CurrentUser, Depends(get_current_user)],
    ) -> CurrentUser:
        if current_user.role not in allowed_roles:
            logger.warning(
                f"Role violation: user {current_user.id} with role '{current_user.role}' "
                f"attempted to access endpoint requiring {allowed_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role '{current_user.role}' does not have required permissions",
            )
        return current_user

    return role_checker
