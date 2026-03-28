# app/core/dependencies.py
#
# Security guards that run before protected endpoints.
#
# WHAT CHANGED FROM BEFORE:
#   get_current_user now checks TWO collections:
#     → role == "citizen"  → look in "citizens" collection
#     → any other role     → look in "hospital_users" collection
#
#   Why? Citizens are stored separately from hospital staff.
#   The JWT token carries the "role" field so we know which
#   collection to query without an extra DB call.

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo.database import Database

from app.core.database import get_db
from app.core.security import decode_access_token

bearer_scheme = HTTPBearer()

# Role hierarchy: higher number = more permissions
# citizen = 1 (lowest — can only see their own data)
ROLE_HIERARCHY = {
    "citizen":        1,
    "viewer":         2,
    "coordinator":    3,
    "hospital_admin": 4,
    "super_admin":    5,
}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Database = Depends(get_db),
) -> dict:
    """
    Reads the JWT token and returns the current user as a plain dict.

    Flow:
      1. Extract token from Authorization: Bearer <token>
      2. Decode JWT → get user_id and role
      3. If role is "citizen" → query "citizens" collection
         Otherwise            → query "hospital_users" collection
      4. Return the user dict

    Raises 401 if token is missing, invalid, or expired.
    Raises 403 if account is deactivated.
    """
    token = credentials.credentials

    # Decode JWT — returns None if invalid or expired
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    role: str = payload.get("role", "")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is missing user information.",
        )

    # ── Route to correct collection based on role ────────────────
    # Citizen accounts live in "citizens" collection
    # Hospital staff accounts live in "hospital_users" collection
    if role == "citizen":
        user = db["citizens"].find_one({"_id": user_id})
    else:
        user = db["hospital_users"].find_one({"_id": user_id})
    # ─────────────────────────────────────────────────────────────

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated.",
        )

    return user


def require_role(minimum_role: str):
    """
    Returns a dependency that checks the user has at least minimum_role.

    Usage:
        @router.post("/pledge")
        def pledge(current_user = Depends(require_role("citizen"))):
            ...

        @router.post("/donor-cases")
        def create_case(current_user = Depends(require_role("coordinator"))):
            ...
    """
    def role_checker(
        current_user: dict = Depends(get_current_user),
    ) -> dict:
        user_level     = ROLE_HIERARCHY.get(current_user.get("role", ""), 0)
        required_level = ROLE_HIERARCHY.get(minimum_role, 99)

        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. This action requires '{minimum_role}' role. "
                    f"Your role is '{current_user.get('role')}'."
                ),
            )
        return current_user

    return role_checker


def require_citizen(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Shortcut dependency — only allows citizens through.
    Use on all /citizens/ endpoints that need login.

    Usage:
        @router.get("/me")
        def get_me(current_user = Depends(require_citizen)):
            ...
    """
    if current_user.get("role") != "citizen":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for citizens only.",
        )
    return current_user