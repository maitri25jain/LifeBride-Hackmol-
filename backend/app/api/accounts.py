# app/api/accounts.py
#
# Hospital Admin manages coordinator accounts.
#
# ENDPOINTS:
#   POST /accounts/coordinators           → Create new coordinator account
#   GET  /accounts/coordinators           → List all coordinators in this hospital
#   PUT  /accounts/coordinators/{id}      → Activate / deactivate a coordinator
#
# WHO CAN ACCESS:
#   Only role = "hospital_admin"
#   Coordinators get 403 Forbidden on all these endpoints
#
# WHY SEPARATE FROM auth.py?
#   auth.py = login/logout (used by everyone)
#   accounts.py = account management (admin only)
#   Keeping them separate makes permissions clear

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import hash_password
from app.core.dependencies import require_role

router = APIRouter(prefix="/accounts", tags=["Account Management"])


# ── Schemas (defined here since they're small and only used here) ─────────────

class CreateCoordinatorRequest(BaseModel):
    """
    Data admin sends to create a new coordinator account.

    Example:
    {
        "email": "drkapoor@aiims.edu",
        "password": "Coord@456",
        "full_name": "Dr. Kapoor"
    }

    hospital_id is NOT sent by admin —
    we pull it from the admin's own JWT token.
    This prevents an admin from creating accounts in OTHER hospitals.
    """
    email:     str
    password:  str
    full_name: str


class CreateCoordinatorResponse(BaseModel):
    id:         str
    email:      str
    full_name:  str
    role:       str
    hospital_id: str
    message:    str = "Coordinator account created successfully."


class UpdateCoordinatorRequest(BaseModel):
    """
    Admin activates or deactivates a coordinator.

    Example:
    { "is_active": false }  → deactivate (they can no longer login)
    { "is_active": true }   → reactivate
    """
    is_active: bool


# ── CREATE COORDINATOR ────────────────────────────────────────────────────────

@router.post("/coordinators", response_model=CreateCoordinatorResponse, status_code=201)
def create_coordinator(
    payload: CreateCoordinatorRequest,
    # require_role("hospital_admin") = only hospital_admin can call this
    # if a coordinator tries → gets 403 Forbidden automatically
    current_user: dict = Depends(require_role("hospital_admin")),
    db: Database = Depends(get_db),
):
    """
    Admin creates a new coordinator account.

    Security:
      → Only hospital_admin role allowed
      → New coordinator is assigned to SAME hospital as admin
        (admin cannot create accounts in other hospitals)
      → Password is hashed before storing (never stored as plain text)

    Flow:
      1. Check email not already taken
      2. Hash the password
      3. Create coordinator document in hospital_users
      4. Return new account details (no password in response)
    """
    # ── Admin's hospital — coordinator goes to same hospital ─────
    # This is the key security rule:
    # Admin at AIIMS can only create coordinators for AIIMS
    hospital_id = current_user["hospital_id"]

    # ── Check email uniqueness ───────────────────────────────────
    existing = db["hospital_users"].find_one({"email": payload.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{payload.email}' already exists.",
        )

    # ── Create coordinator document ──────────────────────────────
    coordinator_id = str(uuid.uuid4())

    coordinator_doc = {
        "_id":           coordinator_id,
        "hospital_id":   hospital_id,
        "email":         payload.email,
        # hash_password uses bcrypt — never store plain text passwords
        "password_hash": hash_password(payload.password),
        "full_name":     payload.full_name,
        "role":          "coordinator",   # always coordinator, never admin
        "is_active":     True,
        "created_by":    current_user["_id"],   # audit trail — who created this
        "last_login_at": None,
        "created_at":    datetime.utcnow(),
    }

    db["hospital_users"].insert_one(coordinator_doc)

    return CreateCoordinatorResponse(
        id=coordinator_id,
        email=payload.email,
        full_name=payload.full_name,
        role="coordinator",
        hospital_id=hospital_id,
        message="Coordinator account created successfully.",
    )


# ── LIST COORDINATORS ─────────────────────────────────────────────────────────

@router.get("/coordinators")
def list_coordinators(
    current_user: dict = Depends(require_role("hospital_admin")),
    db: Database = Depends(get_db),
):
    """
    Admin sees all coordinators in their hospital.

    Only returns coordinators from the SAME hospital as the admin.
    Passwords are never returned.

    Example response:
    {
        "coordinators": [
            {
                "id": "uuid...",
                "full_name": "Dr. Kapoor",
                "email": "coordinator@aiims.edu",
                "is_active": true,
                "last_login_at": "2024-01-15T10:30:00",
                "created_at": "2024-01-01T09:00:00"
            }
        ],
        "total": 1
    }
    """
    hospital_id = current_user["hospital_id"]

    # Find all coordinators in this hospital
    # We exclude password_hash from the result using projection
    # {"password_hash": 0} means "don't return this field"
    coordinators_cursor = db["hospital_users"].find(
        {
            "hospital_id": hospital_id,
            "role":        "coordinator",
        },
        {"password_hash": 0}  # never return password data
    )

    result = []
    for coord in coordinators_cursor:
        result.append({
            "id":            coord["_id"],
            "full_name":     coord["full_name"],
            "email":         coord["email"],
            "role":          coord["role"],
            "is_active":     coord["is_active"],
            "last_login_at": str(coord.get("last_login_at", "")) or None,
            "created_at":    str(coord.get("created_at", "")),
            "created_by":    coord.get("created_by"),
        })

    return {"coordinators": result, "total": len(result)}


# ── ACTIVATE / DEACTIVATE COORDINATOR ────────────────────────────────────────

@router.put("/coordinators/{coordinator_id}")
def update_coordinator_status(
    coordinator_id: str,
    payload: UpdateCoordinatorRequest,
    current_user: dict = Depends(require_role("hospital_admin")),
    db: Database = Depends(get_db),
):
    """
    Admin activates or deactivates a coordinator account.

    Deactivated coordinator:
      → Cannot login (auth.py checks is_active)
      → Gets 403 Forbidden if they try
      → Account data is preserved (not deleted)

    Security check:
      → Admin can only modify coordinators in their OWN hospital
      → Cannot deactivate coordinators from other hospitals

    Example request:
      PUT /api/accounts/coordinators/{id}
      { "is_active": false }
    """
    hospital_id = current_user["hospital_id"]

    # ── Find coordinator ─────────────────────────────────────────
    coordinator = db["hospital_users"].find_one({
        "_id":        coordinator_id,
        "role":       "coordinator",
    })

    if not coordinator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coordinator not found.",
        )

    # ── Security: same hospital only ────────────────────────────
    # Admin at AIIMS cannot deactivate coordinators at other hospitals
    if coordinator["hospital_id"] != hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage coordinators within your own hospital.",
        )

    # ── Prevent admin from deactivating themselves ───────────────
    if coordinator_id == current_user["_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account.",
        )

    # ── Update is_active ─────────────────────────────────────────
    db["hospital_users"].update_one(
        {"_id": coordinator_id},
        {"$set": {
            "is_active":    payload.is_active,
            "updated_at":   datetime.utcnow(),
            "updated_by":   current_user["_id"],
        }}
    )

    action = "activated" if payload.is_active else "deactivated"

    return {
        "id":        coordinator_id,
        "is_active": payload.is_active,
        "message":   f"Coordinator has been {action} successfully.",
    }