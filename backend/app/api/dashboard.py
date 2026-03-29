# app/api/dashboard.py
#
# GET /api/dashboard/stats
#
# Returns counts scoped to the logged-in user's hospital.
# Every number is filtered by hospital_id from JWT.

from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Returns key counts for the logged-in user's hospital.
    hospital_id comes from JWT — cannot be faked.
    """

    hospital_id = current_user["hospital_id"]
    #              ↑ this one value filters EVERYTHING below

    # ── Recipients ──────────────────────────────────────
    # count_documents = count how many docs match the filter
    total_recipients = db["recipients"].count_documents({
        "hospital_id": hospital_id
    })

    critical_recipients = db["recipients"].count_documents({
        "hospital_id": hospital_id,
        "urgency_level": "critical",
        "is_active": True
    })

    active_recipients = db["recipients"].count_documents({
        "hospital_id": hospital_id,
        "is_active": True
    })

    # ── Donors ──────────────────────────────────────────
    # We haven't built donors yet so this will return 0
    # That's fine — we'll build it next step
    total_donors = db["donors"].count_documents({
        "hospital_id": hospital_id
    })

    # ── Blood Inventory ──────────────────────────────────
    # Sum all units_available for this hospital
    # This uses MongoDB aggregation — explained below
    blood_pipeline = [
        {"$match": {"hospital_id": hospital_id}},
        {"$group": {"_id": None, "total": {"$sum": "$units_available"}}}
    ]
    blood_result = list(db["blood_inventory"].aggregate(blood_pipeline))
    total_blood_units = blood_result[0]["total"] if blood_result else 0

    # ── Return everything ────────────────────────────────
    return {
        "hospital":   current_user.get("hospital_id"),
        "recipients": {
            "total":    total_recipients,
            "active":   active_recipients,
            "critical": critical_recipients,
        },
        "donors": {
            "total": total_donors,
        },
        "blood_inventory": {
            "total_units": total_blood_units,
        }
    }