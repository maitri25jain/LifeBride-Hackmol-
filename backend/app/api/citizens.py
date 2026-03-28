# app/api/citizens.py
#
# ENDPOINTS:
#   GET  /citizens/me                    → Own profile + pledge status
#   POST /citizens/pledge                → Submit pledge → mint NFT on blockchain
#   GET  /citizens/alerts                → See nearby blood alerts
#   POST /citizens/alerts/{id}/respond   → Respond to alert
#
# Register + Login handled by auth.py:
#   POST /auth/register/send-otp
#   POST /auth/register/verify
#   POST /auth/login/send-otp
#   POST /auth/login/verify

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.core.database import get_db
from app.core.dependencies import require_citizen
from app.core.blockchain import mint_pledge_nft
from app.schemas.citizens import (
    CitizenMeResponse,
    PledgeRequest,
    PledgeResponse,
    AlertRespondResponse,
)

router = APIRouter(prefix="/citizens", tags=["Citizens"])


# ── ME ────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=CitizenMeResponse)
def get_citizen_me(
    current_user: dict = Depends(require_citizen),
    db: Database = Depends(get_db),
):
    pledge = db["pledges"].find_one({"citizen_id": current_user["_id"]})

    pledge_data = None
    if pledge:
        pledge_data = {
            "pledge_id":    pledge["_id"],
            "organs":       pledge.get("organs", []),
            "donate_blood": pledge.get("donate_blood", False),
            "donate_plasma": pledge.get("donate_plasma", False),
            "tx_hash":      pledge.get("tx_hash"),
            "token_id":     pledge.get("token_id"),
            "network":      pledge.get("network"),
            "pledged_at":   str(pledge.get("pledged_at", "")),
        }

    return CitizenMeResponse(
        id=current_user["_id"],
        full_name=current_user["full_name"],
        email=current_user.get("email"),
        phone=current_user["phone"],
        blood_type=current_user["blood_type"],
        date_of_birth=current_user.get("date_of_birth"),
        role="citizen",
        pledge=pledge_data,
    )


# ── PLEDGE ────────────────────────────────────────────────────────────────────

@router.post("/pledge", response_model=PledgeResponse, status_code=201)
def submit_pledge(
    payload: PledgeRequest,
    current_user: dict = Depends(require_citizen),
    db: Database = Depends(get_db),
):
    """
    Citizen pledges organs/blood.

    Calls mint_pledge_nft(user_id, pledge_type):
      → If Hardhat running: real tx hash on blockchain
      → If Hardhat not running: simulated tx hash (demo fallback)
    """
    citizen_id = current_user["_id"]

    # Already pledged?
    if db["pledges"].find_one({"citizen_id": citizen_id}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted a pledge.",
        )

    # Validate organs
    valid_organs = ["kidney", "liver", "heart", "lungs", "cornea", "pancreas", "intestine"]
    for organ in payload.organs:
        if organ.lower() not in valid_organs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid organ '{organ}'. Valid: {valid_organs}",
            )

    # Must pledge at least one thing
    if not payload.organs and not payload.donate_blood and not payload.donate_plasma:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select at least one organ or blood/plasma donation.",
        )

    # Use aadhaar_hash as unique identity for NFT
    # Falls back to citizen_id if aadhaar_hash not set
    aadhaar_hash = current_user.get("aadhaar_hash", citizen_id)

    # Determine pledge type for blockchain
    pledge_type = "organ" if payload.organs else "blood"

    # ── Mint NFT on blockchain ───────────────────────────────────
    # mint_pledge_nft(user_id, pledge_type)
    # Returns: { "tx_hash": "0x...", "token_id": int, "network": str, "status": str }
    blockchain_result = mint_pledge_nft(
        user_id=aadhaar_hash,
        pledge_type=pledge_type,
    )

    if blockchain_result["status"] not in ("success",):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Blockchain error: {blockchain_result.get('message', 'Unknown error')}",
        )

    # ── Save pledge to MongoDB ───────────────────────────────────
    pledge_id = str(uuid.uuid4())

    db["pledges"].insert_one({
        "_id":          pledge_id,
        "citizen_id":   citizen_id,
        "aadhaar_hash": aadhaar_hash,
        "organs":       [o.lower() for o in payload.organs],
        "donate_blood": payload.donate_blood,
        "donate_plasma": payload.donate_plasma,
        "tx_hash":      blockchain_result["tx_hash"],
        "token_id":     blockchain_result.get("token_id", 0),
        "network":      blockchain_result["network"],
        "is_active":    True,
        "pledged_at":   datetime.utcnow(),
    })

    return PledgeResponse(
        pledge_id=pledge_id,
        organs=[o.lower() for o in payload.organs],
        donate_blood=payload.donate_blood,
        tx_hash=blockchain_result["tx_hash"],
        token_id=blockchain_result.get("token_id", 0),
        network=blockchain_result["network"],
        message="Your pledge has been recorded on the blockchain.",
    )


# ── ALERTS ────────────────────────────────────────────────────────────────────

@router.get("/alerts")
def get_nearby_alerts(
    current_user: dict = Depends(require_citizen),
    db: Database = Depends(get_db),
):
    citizen_location = current_user.get("location") or {}
    coordinates = citizen_location.get("coordinates", [])

    if not coordinates or len(coordinates) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your location is not set.",
        )

    pipeline = [
        {
            "$geoNear": {
                "near": {
                    "type":        "Point",
                    "coordinates": [coordinates[0], coordinates[1]]
                },
                "distanceField": "distance_meters",
                "maxDistance":   50000,
                "query":         {"is_active": True},
                "spherical":     True,
            }
        },
        {
            "$addFields": {
                "urgency_order": {
                    "$switch": {
                        "branches": [
                            {"case": {"$eq": ["$urgency", "critical"]}, "then": 1},
                            {"case": {"$eq": ["$urgency", "urgent"]},   "then": 2},
                        ],
                        "default": 3
                    }
                }
            }
        },
        {"$sort":  {"urgency_order": 1, "distance_meters": 1}},
        {"$limit": 20},
    ]

    result = []
    for alert in db["alerts"].aggregate(pipeline):
        result.append({
            "id":                alert["_id"],
            "hospital_name":     alert.get("hospital_name", "Unknown"),
            "blood_type":        alert["blood_type"],
            "urgency":           alert["urgency"],
            "units_needed":      alert["units_needed"],
            "distance_km":       round(alert["distance_meters"] / 1000, 1),
            "is_active":         alert["is_active"],
            "already_responded": current_user["_id"] in alert.get("responders", []),
            "created_at":        str(alert.get("created_at", "")),
        })

    return {"alerts": result, "total": len(result)}


# ── RESPOND TO ALERT ──────────────────────────────────────────────────────────

@router.post("/alerts/{alert_id}/respond", response_model=AlertRespondResponse)
def respond_to_alert(
    alert_id: str,
    current_user: dict = Depends(require_citizen),
    db: Database = Depends(get_db),
):
    citizen_id = current_user["_id"]

    alert = db["alerts"].find_one({"_id": alert_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    if not alert.get("is_active", False):
        raise HTTPException(status_code=400, detail="This alert is no longer active.")

    if citizen_id in alert.get("responders", []):
        raise HTTPException(status_code=400, detail="You already responded.")

    db["alerts"].update_one(
        {"_id": alert_id},
        {
            "$addToSet": {"responders": citizen_id},
            "$set":      {"last_response_at": datetime.utcnow()},
        }
    )

    return AlertRespondResponse(
        alert_id=alert_id,
        message="Thank you! The hospital coordinator has been notified.",
    )