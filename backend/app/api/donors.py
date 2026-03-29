# app/api/donors.py
#
# ENDPOINTS:
#   POST /donors/              → register donor
#   GET  /donors/              → list donors
#   POST /donors/match/organ   → run organ matching (calls /match/organ)
#   POST /donors/match/blood   → run blood matching (calls /match/blood)
#   GET  /donors/match/history → past match results

import uuid
import hashlib
import httpx
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.core.audit import write_audit_log
from app.core.config import settings
from app.schemas.donors import DonorCreate, DonorResponse

router = APIRouter(prefix="/donors", tags=["Donors"])


def hash_sha256(value: str) -> str:
    return hashlib.sha256(value.strip().encode()).hexdigest()


# ─────────────────────────────────────────────────────
# POST /api/donors  — Register a new donor
# ─────────────────────────────────────────────────────
@router.post("/", response_model=DonorResponse)
def create_donor(
    payload: DonorCreate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(require_role("coordinator"))
):
    aadhaar_hash = hash_sha256(payload.aadhaar_number)

    existing = db["donors"].find_one({"aadhaar_hash": aadhaar_hash})
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A donor with this Aadhaar number is already registered."
        )

    consent_hash = hash_sha256(payload.consent_text)
    donor_id = str(uuid.uuid4())

    donor = {
        "_id":                   donor_id,
        "hospital_id":           current_user["hospital_id"],
        "full_name":             payload.full_name,
        "age":                   payload.age,
        "gender":                payload.gender,
        "blood_type":            payload.blood_type,
        "aadhaar_hash":          aadhaar_hash,
        "consent_hash":          consent_hash,
        "organs_available":      payload.organs_available,
        "donor_type":            payload.donor_type,
        "status":                "available",
        "registered_at":         datetime.utcnow(),
        "notes":                 payload.notes,
        # Medical fields for matching engine
        "hla_typing":            payload.hla_typing,
        "harvest_time":          payload.harvest_time,
        "donor_weight":          payload.donor_weight,
        "donor_cause_of_death":  payload.donor_cause_of_death,
    }

    db["donors"].insert_one(donor)

    write_audit_log(
        db=db, user=current_user,
        action="CREATE_DONOR", resource_type="donor", resource_id=donor_id,
        details={"full_name": payload.full_name, "blood_type": payload.blood_type,
                 "organs": payload.organs_available}
    )

    donor["id"] = donor["_id"]
    return donor


# ─────────────────────────────────────────────────────
# GET /api/donors  — List donors
# ─────────────────────────────────────────────────────
@router.get("/", response_model=list[DonorResponse])
def list_donors(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    donors = list(db["donors"].find({"hospital_id": current_user["hospital_id"]}))
    for d in donors:
        d["id"] = d["_id"]
    return donors


# ─────────────────────────────────────────────────────
# POST /api/donors/match/organ — Organ matching
# ─────────────────────────────────────────────────────
@router.post("/match/organ")
def run_organ_match(
    db: Database = Depends(get_db),
    current_user: dict = Depends(require_role("coordinator")),
):
    """
    Runs organ matching across ALL hospitals — not just ours.

    Why all hospitals?
      A kidney donor at AIIMS should match with a recipient
      at Fortis if they are the best match. This is how NOTTO works.

    Flow:
      1. Fetch ALL available donors from ALL hospitals
      2. Fetch ALL active recipients from ALL hospitals
      3. For each donor organ → call /match/organ on matching engine
      4. Store and return results

    Matching engine expects:
      POST /match/organ
      {
        "donor_organ": { DonorOrgan fields },
        "recipients":  [ list of Recipient ],
        "top_n": 10
      }
    """
    # ── Step 1: Get ALL available donors (all hospitals) ─────────
    donors = list(db["donors"].find({"status": "available"}))
    if not donors:
        raise HTTPException(status_code=400, detail="No available donors found.")

    # ── Step 2: Get ALL active recipients (all hospitals) ────────
    recipients = list(db["recipients"].find({"is_active": True}))
    if not recipients:
        raise HTTPException(status_code=400, detail="No active recipients found.")

    # ── Step 3: Get hospital locations for lat/lon ───────────────
    # We need hospital coordinates for transport time calculation
    hospital_ids = set(
        [d["hospital_id"] for d in donors] +
        [r["hospital_id"] for r in recipients]
    )
    hospitals = {
        h["_id"]: h
        for h in db["hospitals"].find({"_id": {"$in": list(hospital_ids)}})
    }

    # ── Step 4: Build recipients list for matching engine ────────
    recipients_payload = []
    for r in recipients:
        hosp = hospitals.get(r["hospital_id"], {})
        recipients_payload.append({
            # Only fields the AI engine Recipient model accepts:
            "id":           r["_id"],
            "blood_group":  r["blood_type"],
            "hla_typing":   r.get("hla_typing", {}),
            "organ_needed": r["organ_needed"].upper(),
            "urgency":      r["urgency_level"].upper(),
            "hospital_id":  r["hospital_id"],
            "hospital_lat": hosp.get("location_lat", 28.6139),
            "hospital_lon": hosp.get("location_lng", 77.2090),
            "waitlist_days": r.get("waitlist_days", 0),
            "weight":        r.get("weight", 60.0),
            "pra_level":     r.get("pra_level", 0.0),
        })

    # ── Step 5: For each donor organ → call matching engine ──────
    all_results = []
    match_record_id = str(uuid.uuid4())

    for donor in donors:
        hosp = hospitals.get(donor["hospital_id"], {})

        # Build DonorOrgan payload for matching engine
        # Each organ is sent separately
        for organ in donor.get("organs_available", []):
            donor_organ_payload = {
                "donor_id":     donor["_id"],
                "organ_type":   organ.upper(),
                "blood_group":  donor["blood_type"],
                "hla_typing":   donor.get("hla_typing", {}),
                # harvest_time must be ISO format with timezone
                "harvest_time": (
                    donor["harvest_time"].isoformat()
                    if donor.get("harvest_time")
                    else datetime.now(timezone.utc).isoformat()
                ),
                # AI engine DonorOrgan model uses hospital_lat / hospital_lon (not donor_hospital_*)
                "hospital_lat": hosp.get("location_lat", 28.6139),
                "hospital_lon": hosp.get("location_lng", 77.2090),
                "donor_weight": donor.get("donor_weight") or 70.0,
            }

            # Filter recipients who need this organ
            organ_recipients = [
                r for r in recipients_payload
                if r["organ_needed"] == organ.upper()
            ]

            if not organ_recipients:
                continue  # no recipients need this organ, skip

            match_request = {
                "donor_organ": donor_organ_payload,
                "recipients":  organ_recipients,
                "top_n":       10,
            }

            try:
                response = httpx.post(
                    f"{settings.MATCHING_ENGINE_URL}/match/organ",
                    json=match_request,
                    timeout=30,
                )
                response.raise_for_status()
                result = response.json()
                all_results.append({
                    "donor_id":    donor["_id"],
                    "donor_name":  donor["full_name"],
                    "organ":       organ,
                    "matches":     result,
                })

            except httpx.ConnectError:
                raise HTTPException(
                    status_code=503,
                    detail=(
                        f"Matching engine unreachable at "
                        f"{settings.MATCHING_ENGINE_URL}. "
                        "Make sure teammates' server is running."
                    ),
                )
            except httpx.TimeoutException:
                raise HTTPException(status_code=504, detail="Matching engine timeout.")
            except httpx.HTTPStatusError as e:
                raise HTTPException(status_code=502, detail=f"Matching engine error: {e}")

    if not all_results:
        return {
            "message": "No organ-recipient combinations found to match.",
            "results": [],
        }

    # ── Step 6: Store results ────────────────────────────────────
    db["match_results"].insert_one({
        "_id":             match_record_id,
        "type":            "organ",
        "hospital_id":     current_user["hospital_id"],
        "run_by":          current_user["_id"],
        "run_at":          datetime.utcnow(),
        "donor_count":     len(donors),
        "recipient_count": len(recipients),
        "results":         all_results,
    })

    write_audit_log(
        db=db, user=current_user,
        action="RUN_ORGAN_MATCH", resource_type="match", resource_id=match_record_id,
        details={"donors": len(donors), "recipients": len(recipients)}
    )

    return {
        "match_id":    match_record_id,
        "total_donors": len(donors),
        "total_recipients": len(recipients),
        "results":     all_results,
        "message":     "Organ matching complete.",
    }


# ─────────────────────────────────────────────────────
# POST /api/donors/match/blood — Blood matching
# ─────────────────────────────────────────────────────
@router.post("/match/blood")
def run_blood_match(
    db: Database = Depends(get_db),
    current_user: dict = Depends(require_role("coordinator")),
):
    """
    Finds eligible blood donors for active blood alerts.

    Flow:
      1. Get all active blood alerts for this hospital
      2. Get ALL citizens who have pledged blood donation
         (from ALL hospitals — blood donors are citizens, not hospital-specific)
      3. For each alert → call /match/blood on matching engine
      4. Return matched donors

    Matching engine expects:
      POST /match/blood
      {
        "emergency": { BloodEmergencyRequest fields },
        "donors":    [ list of BloodDonor ]
      }

    Why citizens as blood donors?
      Citizens pledge blood in POST /citizens/pledge
      They are the blood donor pool — not hospital donors
      Hospital donors are organ/tissue donors (deceased)
    """
    hospital_id = current_user["hospital_id"]
    hospital = db["hospitals"].find_one({"_id": hospital_id})

    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found.")

    # ── Get active blood alerts for this hospital ────────────────
    active_alerts = list(db["alerts"].find({
        "hospital_id": hospital_id,
        "is_active":   True,
    }))

    if not active_alerts:
        raise HTTPException(
            status_code=400,
            detail="No active blood alerts. Create a blood alert first.",
        )

    # ── Get ALL citizens who pledged blood ───────────────────────
    # Find pledge IDs where donate_blood = True
    blood_pledges = list(db["pledges"].find({"donate_blood": True, "is_active": True}))
    citizen_ids = [p["citizen_id"] for p in blood_pledges]

    if not citizen_ids:
        raise HTTPException(
            status_code=400,
            detail="No registered blood donors (citizens who pledged blood) found.",
        )

    # Get citizen details for those who pledged blood
    citizens = list(db["citizens"].find({"_id": {"$in": citizen_ids}}))

    # ── Build BloodDonor list for matching engine ─────────────────
    blood_donors_payload = []
    for citizen in citizens:
        raw_loc = citizen.get("location")  # stored as None if not set
        # Guard: location may be None (not just missing) for citizens without GPS
        coords = (
            raw_loc.get("coordinates", [77.2090, 28.6139])
            if isinstance(raw_loc, dict)
            else [77.2090, 28.6139]
        )
        # BloodDonor model only accepts: id, blood_group, lat, lon, last_donation_date
        blood_donors_payload.append({
            "id":                 citizen["_id"],
            "blood_group":        citizen["blood_type"],
            "lat":                coords[1],   # GeoJSON is [lon, lat] so index 1 is lat
            "lon":                coords[0],   # index 0 is lon
            "last_donation_date": None,
        })

    # ── For each alert → call matching engine ────────────────────
    all_results = []

    for alert in active_alerts:
        # BloodEmergencyRequest only accepts: emergency_id, hospital_lat, hospital_lon,
        # blood_group, radius_km — no extra fields allowed by Pydantic
        emergency_payload = {
            "emergency_id": alert["_id"],
            "hospital_lat": hospital["location_lat"],
            "hospital_lon": hospital["location_lng"],
            "blood_group":  alert["blood_type"],
            "radius_km":    alert.get("radius_km", 10),
        }

        match_request = {
            "emergency": emergency_payload,
            "donors":    blood_donors_payload,
        }

        try:
            response = httpx.post(
                f"{settings.MATCHING_ENGINE_URL}/match/blood",
                json=match_request,
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()
            all_results.append({
                "alert_id":   alert["_id"],
                "blood_type": alert["blood_type"],
                "matches":    result,
            })

        except httpx.ConnectError:
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Matching engine unreachable at {settings.MATCHING_ENGINE_URL}. "
                    "Make sure teammates' server is running."
                ),
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Matching engine timeout.")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"Matching engine error: {e}")

    return {
        "alerts_processed": len(active_alerts),
        "blood_donors_checked": len(blood_donors_payload),
        "results": all_results,
        "message": "Blood matching complete.",
    }


# ─────────────────────────────────────────────────────
# GET /api/donors/match/history
# ─────────────────────────────────────────────────────
@router.get("/match/history")
def get_match_history(
    db: Database = Depends(get_db),
    current_user: dict = Depends(require_role("coordinator")),
):
    history = list(
        db["match_results"]
        .find({"hospital_id": current_user["hospital_id"]})
        .sort("run_at", -1)
        .limit(10)
    )
    for h in history:
        h["id"] = h["_id"]
        h["run_at"] = str(h["run_at"])
    return {"history": history, "total": len(history)}