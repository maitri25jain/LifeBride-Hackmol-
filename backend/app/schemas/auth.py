# app/schemas/auth.py

from pydantic import BaseModel
from typing import Optional


# ── HOSPITAL STAFF (unchanged) ───────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserMeResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    hospital_id: str
    hospital_name: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


# ── CITIZEN REGISTRATION ─────────────────────────────────────
class CitizenRegisterStart(BaseModel):
    full_name:     str
    phone:         str
    blood_type:    str
    date_of_birth: str
    aadhaar:       str
    email:         Optional[str] = None


class CitizenRegisterVerify(BaseModel):
    phone: str
    otp:   str


# ── CITIZEN LOGIN ────────────────────────────────────────────
class CitizenLoginSendOTP(BaseModel):
    phone: str


class CitizenLoginVerify(BaseModel):
    phone: str
    otp:   str


# ── CITIZEN RESPONSE ─────────────────────────────────────────
class CitizenAuthResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    citizen_id:   str
    full_name:    str
    phone:        str
    blood_type:   str
    has_pledge:   bool = False