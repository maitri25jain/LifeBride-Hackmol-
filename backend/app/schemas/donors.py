# app/schemas/donors.py

from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class DonorType(str, Enum):
    DECEASED = "deceased"
    LIVING   = "living"


class DonorStatus(str, Enum):
    AVAILABLE  = "available"
    MATCHED    = "matched"
    COMPLETED  = "completed"


class BloodType(str, Enum):
    A_POS  = "A+"
    A_NEG  = "A-"
    B_POS  = "B+"
    B_NEG  = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS  = "O+"
    O_NEG  = "O-"


class OrganType(str, Enum):
    KIDNEY     = "KIDNEY"
    LIVER      = "LIVER"
    HEART      = "HEART"
    CORNEA     = "CORNEA"
    LUNGS      = "LUNGS"
    PANCREAS   = "PANCREAS"
    INTESTINES = "INTESTINES"


class DonorCreate(BaseModel):
    """
    What coordinator sends when registering a donor.

    NEW FIELDS (needed by matching engine):
      hla_typing         → tissue matching antigens
                           Example: {"A": ["02:01","24:02"], "B": ["07:02"], "DR": ["15:01"]}
      harvest_time       → when organ was harvested (ISO datetime string)
                           Example: "2026-03-26T10:30:00"
      donor_weight       → weight in kg (matching engine needs this)
      donor_cause_of_death → optional, for medical records

    These fields are sent directly to the matching engine at /match/organ
    """
    full_name:             str
    age:                   int
    gender:                str
    blood_type:            BloodType
    aadhaar_number:        str
    organs_available:      List[OrganType]
    donor_type:            DonorType
    consent_text:          str
    notes:                 Optional[str] = None

    # ── Medical fields for matching engine ──────────────────────
    # HLA typing — tissue compatibility antigens
    # If not known yet, send empty dict {}
    hla_typing:            Dict[str, List[str]] = {}

    # When was the organ harvested?
    # Matching engine uses this to calculate viability time remaining
    harvest_time:          Optional[datetime] = None

    # Weight in kg — used for size compatibility matching
    donor_weight:          Optional[float] = None

    # Optional cause of death — medical record only
    donor_cause_of_death:  Optional[str] = None


class DonorResponse(BaseModel):
    """
    What we return after registering a donor.
    aadhaar_hash and consent_hash are NEVER returned.
    """
    id:               str
    hospital_id:      str
    full_name:        str
    age:              int
    gender:           str
    blood_type:       str
    organs_available: List[str]
    donor_type:       str
    status:           str
    registered_at:    datetime
    notes:            Optional[str]
    hla_typing:       Dict[str, List[str]] = {}
    donor_weight:     Optional[float] = None