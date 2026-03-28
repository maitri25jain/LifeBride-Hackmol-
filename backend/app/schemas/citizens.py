# app/schemas/citizens.py
#
# Data shapes for citizen-related endpoints.
#
# WHY SEPARATE FROM schemas/auth.py?
#   auth.py handles login/token shapes (used by ALL users)
#   citizens.py handles citizen-specific data (registration, pledge, alerts)
#   Keeping them separate makes the code easier to find and edit.

from pydantic import BaseModel, EmailStr
from typing import Optional, List


# ── Registration ─────────────────────────────────────────────────────────────

class CitizenRegisterRequest(BaseModel):
    """
    Data citizen sends when creating an account.

    Example request body:
    {
        "full_name": "Ravi Kumar",
        "email": "ravi@demo.com",
        "password": "Ravi@123",
        "phone": "9876543210",
        "blood_type": "B+",
        "date_of_birth": "1990-05-15",
        "latitude": 28.6139,
        "longitude": 77.2090
    }

    Why latitude/longitude?
      → Used to find nearby blood alerts
      → Stored as GeoJSON Point in MongoDB
      → Enables "find all citizens within 10km" queries
    """
    full_name:     str
    email:         str
    password:      str
    phone:         str
    blood_type:    str  # "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
    date_of_birth: str  # "YYYY-MM-DD"
    latitude:      float
    longitude:     float


class CitizenRegisterResponse(BaseModel):
    """
    What we send back after successful registration.
    Does NOT include password. Ever.
    """
    id:         str
    full_name:  str
    email:      str
    blood_type: str
    message:    str = "Registration successful. You can now log in."


# ── Login ─────────────────────────────────────────────────────────────────────

class CitizenLoginRequest(BaseModel):
    """
    Citizen logs in with email + password.

    Example:
    {
        "email": "ravi@demo.com",
        "password": "Ravi@123"
    }
    """
    email:    str
    password: str


# ── Profile ───────────────────────────────────────────────────────────────────

class CitizenMeResponse(BaseModel):
    """
    Citizen's own profile — returned by GET /citizens/me

    Includes their pledge status so frontend can show:
      "You have pledged: kidney, liver  |  TX: 0x7f3a..."
    """
    id:            str
    full_name:     str
    email:         str
    phone:         str
    blood_type:    str
    date_of_birth: str
    role:          str = "citizen"
    # Pledge info — None if citizen hasn't pledged yet
    pledge:        Optional[dict] = None


# ── Pledge ────────────────────────────────────────────────────────────────────

class PledgeRequest(BaseModel):
    """
    Citizen submits their organ/blood donation pledge.

    Example:
    {
        "organs": ["kidney", "liver"],
        "donate_blood": true,
        "donate_plasma": false
    }

    Valid organ values:
      kidney, liver, heart, lungs, cornea, pancreas, intestine

    What happens after this request:
      1. Backend calls blockchain.mint_pledge_nft()
      2. Gets back tx_hash + token_id
      3. Saves pledge to MongoDB
      4. Returns tx_hash to citizen
    """
    organs:         List[str]  # list of organ names
    donate_blood:   bool = False
    donate_plasma:  bool = False


class PledgeResponse(BaseModel):
    """
    What citizen sees after pledging.
    The tx_hash is the "proof" on blockchain.

    Example:
    {
        "pledge_id": "uuid...",
        "organs": ["kidney", "liver"],
        "tx_hash": "0x7f3a9b2c...",
        "token_id": 42314,
        "network": "polygon-amoy",
        "message": "Your pledge has been recorded on the blockchain."
    }
    """
    pledge_id:    str
    organs:       List[str]
    donate_blood: bool
    tx_hash:      str
    token_id:     int
    network:      str
    message:      str = "Your pledge has been recorded on the blockchain."


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    """
    A blood alert that citizens see on their dashboard.

    Citizen sees:
      "AIIMS New Delhi needs O- blood (CRITICAL) — 2.3 km away"

    distance_km comes from MongoDB $geoNear query —
    it calculates how far the alert is from the citizen.
    """
    id:            str
    hospital_name: str
    blood_type:    str
    urgency:       str   # "critical", "urgent", "normal"
    units_needed:  int
    distance_km:   float
    is_active:     bool
    already_responded: bool = False  # True if THIS citizen already responded


class AlertRespondResponse(BaseModel):
    """
    Returned after citizen clicks "I can donate".
    """
    alert_id:     str
    message:      str = "Thank you! The hospital coordinator has been notified."


# ── Blood Alert Creation (Coordinator) ───────────────────────────────────────

class CreateAlertRequest(BaseModel):
    """
    Hospital coordinator broadcasts a blood emergency.

    Example:
    {
        "blood_type": "O-",
        "urgency": "critical",
        "units_needed": 3,
        "radius_km": 10
    }

    The hospital's location is pulled from their account —
    coordinator doesn't need to send coordinates manually.
    """
    blood_type:   str
    urgency:      str = "urgent"   # "critical", "urgent", "normal"
    units_needed: int
    radius_km:    float = 10.0     # how wide to broadcast the alert