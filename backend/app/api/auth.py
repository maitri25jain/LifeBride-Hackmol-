# app/api/auth.py

import uuid
import hashlib
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Response
from pymongo.database import Database

from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.core.otp import generate_otp, store_otp, verify_otp
from app.schemas.auth import (
    LoginRequest, TokenResponse, UserMeResponse,
    CitizenRegisterStart, CitizenRegisterVerify,
    CitizenLoginSendOTP, CitizenLoginVerify,
    CitizenAuthResponse,
)


router = APIRouter(prefix="/auth", tags=["Authentication"])


def hash_sha256(value: str) -> str:
    return hashlib.sha256(value.strip().encode()).hexdigest()


# ════════════════════════════════════════════════
# HOSPITAL STAFF — email + password (unchanged)
# ════════════════════════════════════════════════

@router.post("/login", response_model=TokenResponse)
def hospital_login(
    payload: LoginRequest,
    response: Response,
    db: Database = Depends(get_db)
):
    """Hospital staff login — email + password."""
    user = db["hospital_users"].find_one({"email": payload.email})

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated.",
        )

    db["hospital_users"].update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login_at": datetime.utcnow()}}
    )

    access_token = create_access_token(data={
        "sub":         user["_id"],
        "email":       user["email"],
        "role":        user["role"],
        "hospital_id": user["hospital_id"],
        "full_name":   user["full_name"],
    })

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=86400,
    )

    return TokenResponse(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserMeResponse)
def get_me(
    current_user: dict = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Hospital staff profile."""
    hospital = db["hospitals"].find_one({"_id": current_user["hospital_id"]})

    return UserMeResponse(
        id=current_user["_id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        role=current_user["role"],
        hospital_id=current_user["hospital_id"],
        hospital_name=hospital["name"] if hospital else None,
        is_active=current_user["is_active"],
    )


# ════════════════════════════════════════════════
# CITIZEN REGISTRATION — 2 steps
# ════════════════════════════════════════════════

@router.post("/register/send-otp")
def register_send_otp(
    payload: CitizenRegisterStart,
    db: Database = Depends(get_db)
):
    """
    STEP 1 — Citizen fills form.
    OTP is always 123456 for demo.
    """
    # Check phone not already registered
    if db["citizens"].find_one({"phone": payload.phone}):
        raise HTTPException(
            status_code=400,
            detail="Phone already registered. Please login."
        )

    # Hash aadhaar — never store raw
    aadhaar_hash = hash_sha256(payload.aadhaar)

    if db["citizens"].find_one({"aadhaar_hash": aadhaar_hash}):
        raise HTTPException(
            status_code=400,
            detail="This Aadhaar is already registered."
        )

    # Store details temporarily until OTP verified
    db["pending_registrations"].delete_many({"phone": payload.phone})
    db["pending_registrations"].insert_one({
        "_id":           str(uuid.uuid4()),
        "phone":         payload.phone,
        "full_name":     payload.full_name,
        "email":         payload.email,
        "blood_type":    payload.blood_type,
        "date_of_birth": payload.date_of_birth,
        "aadhaar_hash":  aadhaar_hash,
        "created_at":    datetime.utcnow(),
    })

    # Generate OTP (always 123456)
    otp = generate_otp()
    store_otp(db, payload.phone, otp, purpose="registration")

    return {
        "message": "OTP sent. Use 123456 to verify.",
        "phone":   payload.phone,
        "otp":     otp,  # shown for demo
    }


@router.post("/register/verify", response_model=CitizenAuthResponse)
def register_verify(
    payload: CitizenRegisterVerify,
    response: Response,
    db: Database = Depends(get_db)
):
    """
    STEP 2 — Verify OTP.
    Account created → auto login → JWT returned.
    """
    if not verify_otp(db, payload.phone, payload.otp, purpose="registration"):
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP."
        )

    pending = db["pending_registrations"].find_one({"phone": payload.phone})
    if not pending:
        raise HTTPException(
            status_code=400,
            detail="Session expired. Please register again."
        )

    # Create citizen account
    citizen_id = str(uuid.uuid4())

    db["citizens"].insert_one({
        "_id":           citizen_id,
        "full_name":     pending["full_name"],
        "phone":         pending["phone"],
        "email":         pending.get("email"),
        "blood_type":    pending["blood_type"],
        "date_of_birth": pending["date_of_birth"],
        "aadhaar_hash":  pending["aadhaar_hash"],
        "role":          "citizen",
        "location":      None,
        "is_active":     True,
        "created_at":    datetime.utcnow(),
        "last_login_at": datetime.utcnow(),
    })

    # Clean up temp data
    db["pending_registrations"].delete_many({"phone": payload.phone})

    # Auto login
    access_token = create_access_token(data={
        "sub":       citizen_id,
        "phone":     pending["phone"],
        "role":      "citizen",
        "full_name": pending["full_name"],
    })

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=86400,
    )

    pledge = db["pledges"].find_one({
        "citizen_id": citizen_id,
        "is_active":  True
    })

    return CitizenAuthResponse(
        access_token=access_token,
        citizen_id=citizen_id,
        full_name=pending["full_name"],
        phone=pending["phone"],
        blood_type=pending["blood_type"],
        has_pledge=pledge is not None,
    )


# ════════════════════════════════════════════════
# CITIZEN LOGIN — phone + OTP
# ════════════════════════════════════════════════

@router.post("/login/send-otp")
def citizen_login_send_otp(
    payload: CitizenLoginSendOTP,
    db: Database = Depends(get_db)
):
    """
    LOGIN STEP 1 — Enter phone.
    OTP is always 123456 for demo.
    """
    citizen = db["citizens"].find_one({"phone": payload.phone})
    if not citizen:
        raise HTTPException(
            status_code=404,
            detail="No account found. Please register first."
        )

    if not citizen.get("is_active", False):
        raise HTTPException(
            status_code=403,
            detail="Your account is deactivated."
        )

    otp = generate_otp()
    store_otp(db, payload.phone, otp, purpose="login")

    return {
        "message": "OTP sent. Use 123456 to verify.",
        "phone":   payload.phone,
        "otp":     otp,  # shown for demo
    }


@router.post("/login/verify", response_model=CitizenAuthResponse)
def citizen_login_verify(
    payload: CitizenLoginVerify,
    response: Response,
    db: Database = Depends(get_db)
):
    """
    LOGIN STEP 2 — Verify OTP → JWT returned.
    """
    if not verify_otp(db, payload.phone, payload.otp, purpose="login"):
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OTP."
        )

    citizen = db["citizens"].find_one({"phone": payload.phone})
    if not citizen:
        raise HTTPException(status_code=404, detail="Citizen not found.")

    db["citizens"].update_one(
        {"_id": citizen["_id"]},
        {"$set": {"last_login_at": datetime.utcnow()}}
    )

    access_token = create_access_token(data={
        "sub":       citizen["_id"],
        "phone":     citizen["phone"],
        "role":      "citizen",
        "full_name": citizen["full_name"],
    })

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        max_age=86400,
    )

    pledge = db["pledges"].find_one({
        "citizen_id": citizen["_id"],
        "is_active":  True
    })

    return CitizenAuthResponse(
        access_token=access_token,
        citizen_id=citizen["_id"],
        full_name=citizen["full_name"],
        phone=citizen["phone"],
        blood_type=citizen["blood_type"],
        has_pledge=pledge is not None,
    )
