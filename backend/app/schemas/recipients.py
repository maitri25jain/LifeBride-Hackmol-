# app/schemas/recipients.py

from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime
from enum import Enum


class BloodType(str, Enum):
    A_POS  = "A+"
    A_NEG  = "A-"
    B_POS  = "B+"
    B_NEG  = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS  = "O+"
    O_NEG  = "O-"


class OrganNeeded(str, Enum):
    KIDNEY     = "KIDNEY"
    LIVER      = "LIVER"
    HEART      = "HEART"
    CORNEA     = "CORNEA"
    LUNGS      = "LUNGS"
    PANCREAS   = "PANCREAS"
    INTESTINES = "INTESTINES"


class UrgencyLevel(str, Enum):
    # Matching engine expects UPPERCASE
    CRITICAL = "CRITICAL"
    URGENT   = "URGENT"
    STANDARD = "STANDARD"


class Gender(str, Enum):
    MALE   = "male"
    FEMALE = "female"
    OTHER  = "other"


class RecipientCreate(BaseModel):
    """
    What coordinator sends when registering a recipient.

    NEW FIELDS (needed by matching engine):
      hla_typing          → tissue matching antigens (same format as donor)
      waitlist_days       → how many days patient has been waiting
                            matching engine uses this to prioritize longer waits
      weight              → patient weight in kg
      pra_level           → Panel Reactive Antibody % (0-100)
                            higher = harder to match, gets priority
      previous_transplants → number of prior transplants

    These fields map directly to their Recipient model.
    """
    full_name:            str
    age:                  int
    gender:               Gender
    blood_type:           BloodType
    organ_needed:         OrganNeeded
    urgency_level:        UrgencyLevel
    contact_phone:        str
    notes:                Optional[str] = None

    # ── Medical fields for matching engine ──────────────────────
    # HLA tissue typing — must match with donor HLA for best outcome
    hla_typing:           Dict[str, List[str]] = {}

    # Days on waitlist — longer wait = higher priority in matching
    waitlist_days:        int = 0

    # Patient weight in kg — for size compatibility
    weight:               float = 60.0

    # Panel Reactive Antibody — how sensitized the patient is
    # 0 = easy to match, 100 = very hard to match (gets priority)
    pra_level:            float = 0.0

    # Number of previous transplants
    previous_transplants: int = 0


class RecipientResponse(BaseModel):
    """
    What we return after registering a recipient.
    """
    id:                   str
    hospital_id:          str
    full_name:            str
    age:                  int
    gender:               str
    blood_type:           str
    organ_needed:         str
    urgency_level:        str
    contact_phone:        str
    notes:                Optional[str]
    registered_at:        datetime
    is_active:            bool
    hla_typing:           Dict[str, List[str]] = {}
    waitlist_days:        int = 0
    weight:               float = 60.0
    pra_level:            float = 0.0
    previous_transplants: int = 0