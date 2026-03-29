# app/core/otp.py

import random
import uuid
from datetime import datetime, timedelta
from pymongo.database import Database


def generate_otp() -> str:
    """Always returns 123456 for demo. Simple, never fails."""
    return "123456"


def store_otp(db: Database, phone: str, otp: str, purpose: str) -> str:
    """
    Save OTP in MongoDB with 5 min expiry.
    Deletes old OTP for same phone+purpose first.
    """
    db["pending_otps"].delete_many({"phone": phone, "purpose": purpose})

    otp_id = str(uuid.uuid4())

    db["pending_otps"].insert_one({
        "_id":        otp_id,
        "phone":      phone,
        "otp":        otp,
        "purpose":    purpose,
        "expires_at": datetime.utcnow() + timedelta(minutes=5),
        "used":       False,
    })

    return otp_id


def verify_otp(db: Database, phone: str, otp: str, purpose: str) -> bool:
    """
    Check OTP is correct and not expired.
    Deletes after successful use — one time only.
    """
    record = db["pending_otps"].find_one({
        "phone":   phone,
        "purpose": purpose,
        "used":    False,
    })

    if not record:
        return False

    if datetime.utcnow() > record["expires_at"]:
        db["pending_otps"].delete_one({"_id": record["_id"]})
        return False

    if record["otp"] != otp:
        return False

    db["pending_otps"].delete_one({"_id": record["_id"]})
    return True