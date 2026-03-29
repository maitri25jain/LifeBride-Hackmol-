from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, date

# --- ORGAN MODELS ---
class DonorOrgan(BaseModel):
    donor_id: str
    organ_type: str  # "HEART", "KIDNEYS", etc.
    blood_group: str
    hla_typing: Dict[str, List[str]] # e.g., {"A": ["02:01", "24:02"]}
    harvest_time: datetime
    hospital_lat: float
    hospital_lon: float
    donor_weight: float

class Recipient(BaseModel):
    id: str
    blood_group: str
    hla_typing: Dict[str, List[str]]
    organ_needed: str
    urgency: str # "CRITICAL", "URGENT", "STANDARD"
    hospital_id: str
    hospital_lat: float
    hospital_lon: float
    waitlist_days: int
    weight: float
    pra_level: float

class OrganMatchResult(BaseModel):
    recipient_id: str
    total_score: float
    distance_km: float
    transport_time_mins: float
    viability_remaining_mins: float
    is_feasible: bool

# --- BLOOD MODELS ---
class BloodEmergencyRequest(BaseModel):
    emergency_id: str
    hospital_lat: float
    hospital_lon: float
    blood_group: str
    radius_km: float

class BloodDonor(BaseModel):
    id: str
    blood_group: str
    lat: float
    lon: float
    last_donation_date: Optional[date] = None

class BloodMatchResult(BaseModel):
    donor_id: str
    distance_km: float
    is_eligible: bool