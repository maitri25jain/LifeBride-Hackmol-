# app/core/security.py
#
# This file handles two things:
#   1. Password hashing  — turn "Admin@123" into a safe scrambled string
#   2. JWT tokens        — create and read login tokens
#
# HOW PASSWORDS WORK:
# When a user is created, we run their password through bcrypt.
# bcrypt turns "Admin@123" into something like:
#   "$2b$12$eImiTXuWVxfM37uY4JANjQ..."
# This is ONE-WAY — you cannot reverse it back to "Admin@123".
# When they log in, we run the typed password through bcrypt again
# and compare the two scrambles. If they match, the password is correct.
#
# HOW JWT TOKENS WORK:
# When login succeeds, we create a token that looks like:
#   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# Inside this token (decoded) is: user_id, email, role, hospital_id, expiry
# The server signs it with SECRET_KEY so nobody can fake or edit it.

from datetime import datetime, timedelta
from typing import Optional

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings


# CryptContext sets up bcrypt as our hashing algorithm
# bcrypt automatically adds "salt" (random data) so two identical
# passwords produce DIFFERENT hashes every time
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """
    Turn a plain text password into a safe bcrypt hash.

    Example:
        hash_password("Admin@123")
        → "$2b$12$eImiTXuWVxfM37uY4JANjQ..."

    Call this when creating or updating a user's password.
    Never store the plain password anywhere.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Check if a plain text password matches a stored hash.

    Example:
        verify_password("Admin@123", "$2b$12$eImi...")  → True
        verify_password("wrongpass", "$2b$12$eImi...")  → False

    Call this during login to check if the password is correct.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT token containing user identity data.

    'data' is a dict with the user info you want to store inside the token.
    Example:
        {
            "sub": "user-uuid-here",
            "email": "admin@aiims.edu",
            "role": "hospital_admin",
            "hospital_id": "hospital-uuid-here"
        }

    The token expires after ACCESS_TOKEN_EXPIRE_HOURS (default: 24 hours).
    After expiry, the user must log in again to get a new token.
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            hours=settings.ACCESS_TOKEN_EXPIRE_HOURS
        )

    # Add expiry time to the token data
    to_encode.update({"exp": expire})

    # Sign and encode — this produces the long scrambled string
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT token.

    If the token is valid and not expired, returns the dict inside it.
    If invalid or expired, returns None.

    Example return value:
    {
        "sub": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "email": "admin@aiims.edu",
        "role": "hospital_admin",
        "hospital_id": "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
        "exp": 1711234567
    }
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        # Token is invalid, tampered with, or expired
        return None