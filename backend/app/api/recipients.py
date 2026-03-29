# app/api/recipients.py

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.schemas.recipients import RecipientCreate, RecipientResponse

router = APIRouter(prefix="/recipients", tags=["Recipients"])


# ─────────────────────────────────────────────
# POST /api/recipients  — Register a new recipient
# ─────────────────────────────────────────────
@router.post("/", response_model=RecipientResponse)
def create_recipient(
    payload: RecipientCreate,               # the form data coming in
    db: Database = Depends(get_db),         # mongodb connection
    current_user: dict = Depends(require_role("coordinator"))  # must be coordinator or above
):
    """
    Registers a new patient who needs an organ.
    hospital_id is taken from JWT automatically — doctor cannot fake it.
    """

    recipient = {
        "_id":                 str(uuid.uuid4()),
        "hospital_id":         current_user["hospital_id"],  # ← from JWT, not from request
        "full_name":           payload.full_name,
        "age":                 payload.age,
        "gender":              payload.gender,
        "blood_type":          payload.blood_type,
        "organ_needed":        payload.organ_needed,
        "urgency_level":       payload.urgency_level,
        "contact_phone":       payload.contact_phone,
        "notes":               payload.notes,
        "registered_at":       datetime.utcnow(),
        "is_active":           True,
        # Medical fields required by the matching engine
        "hla_typing":          payload.hla_typing,
        "waitlist_days":       payload.waitlist_days,
        "weight":              payload.weight,
        "pra_level":           payload.pra_level,
        "previous_transplants": payload.previous_transplants,
    }

    db["recipients"].insert_one(recipient)

    # MongoDB uses "_id" but our response schema uses "id"
    # so we rename it before returning
    recipient["id"] = recipient["_id"]

    return recipient


# ─────────────────────────────────────────────
# GET /api/recipients  — List all recipients for this hospital
# ─────────────────────────────────────────────
@router.get("/", response_model=list[RecipientResponse])
def list_recipients(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user)  # any logged in user can view
):
    """
    Returns all recipients belonging to the logged-in user's hospital.
    A doctor from AIIMS will NEVER see Fortis patients.
    """

    recipients = list(
        db["recipients"].find({"hospital_id": current_user["hospital_id"]})
        #                      ↑ this is the key line — filter by hospital
    )

    # rename "_id" to "id" for every document
    for r in recipients:
        r["id"] = r["_id"]

    return recipients