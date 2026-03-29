# app/api/alerts.py
#
# Coordinator broadcasts blood alerts.
# Citizens see these alerts in GET /api/citizens/alerts
#
# ENDPOINTS:
#   POST /alerts              → coordinator creates blood alert
#   GET  /alerts              → coordinator sees alerts they created
#   PUT  /alerts/{id}/close   → coordinator closes an alert

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.core.database import get_db
from app.core.dependencies import require_role, get_current_user
from app.schemas.citizens import CreateAlertRequest

router = APIRouter(prefix="/alerts", tags=["Blood Alerts"])


# ─────────────────────────────────────────────────────
# POST /api/alerts — Coordinator broadcasts blood alert
# ─────────────────────────────────────────────────────
@router.post("/", status_code=201)
def create_blood_alert(
    payload: CreateAlertRequest,
    current_user: dict = Depends(require_role("coordinator")),
    db: Database = Depends(get_db),
):
    """
    Coordinator broadcasts a blood emergency.
    Alert stored in MongoDB.
    Citizens within radius_km see it on their dashboard.
    """
    hospital_id = current_user["hospital_id"]

    # Get hospital location
    hospital = db["hospitals"].find_one({"_id": hospital_id})
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found.",
        )

    # Validate urgency
    valid_urgency = ["critical", "urgent", "normal"]
    if payload.urgency not in valid_urgency:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid urgency. Must be one of: {valid_urgency}",
        )

    # Validate blood type
    valid_blood_types = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    if payload.blood_type not in valid_blood_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid blood type. Must be one of: {valid_blood_types}",
        )

    # Create alert
    alert_id = str(uuid.uuid4())

    alert_doc = {
        "_id":           alert_id,
        "hospital_id":   hospital_id,
        "hospital_name": hospital["name"],
        "created_by":    current_user["_id"],
        "blood_type":    payload.blood_type,
        "urgency":       payload.urgency,
        "units_needed":  payload.units_needed,
        "location": {
            "type":        "Point",
            "coordinates": [
                hospital["location_lng"],
                hospital["location_lat"],
            ]
        },
        "radius_km":  payload.radius_km,
        "is_active":  True,
        "responders": [],
        "created_at": datetime.utcnow(),
    }

    db["alerts"].insert_one(alert_doc)

    return {
        "alert_id":   alert_id,
        "hospital":   hospital["name"],
        "blood_type": payload.blood_type,
        "urgency":    payload.urgency,
        "radius_km":  payload.radius_km,
        "message":    f"Alert broadcast to citizens within {payload.radius_km}km.",
    }


# ─────────────────────────────────────────────────────
# GET /api/alerts — Coordinator sees their alerts
# ─────────────────────────────────────────────────────
@router.get("/")
def list_hospital_alerts(
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Returns all blood alerts for this hospital."""
    alerts_cursor = db["alerts"].find(
        {"hospital_id": current_user["hospital_id"]},
        {"location": 0}
    ).sort("created_at", -1)

    result = []
    for alert in alerts_cursor:
        result.append({
            "id":              alert["_id"],
            "blood_type":      alert["blood_type"],
            "urgency":         alert["urgency"],
            "units_needed":    alert["units_needed"],
            "is_active":       alert["is_active"],
            "responder_count": len(alert.get("responders", [])),
            "responders":      alert.get("responders", []),
            "created_at":      str(alert.get("created_at", "")),
        })

    return {"alerts": result, "total": len(result)}


# ─────────────────────────────────────────────────────
# PUT /api/alerts/{id}/close — Close an alert
# ─────────────────────────────────────────────────────
@router.put("/{alert_id}/close")
def close_alert(
    alert_id: str,
    current_user: dict = Depends(require_role("coordinator")),
    db: Database = Depends(get_db),
):
    """Coordinator closes alert when need is fulfilled."""
    hospital_id = current_user["hospital_id"]

    alert = db["alerts"].find_one({"_id": alert_id})
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found.",
        )

    if alert["hospital_id"] != hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only close alerts from your own hospital.",
        )

    db["alerts"].update_one(
        {"_id": alert_id},
        {"$set": {
            "is_active": False,
            "closed_at": datetime.utcnow(),
            "closed_by": current_user["_id"],
        }}
    )

    return {
        "alert_id": alert_id,
        "message":  "Alert closed successfully.",
    }