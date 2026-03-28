# app/core/database.py
#
# This file creates ONE connection to MongoDB Atlas and keeps it open
# for the lifetime of your app. This is the correct pattern — you
# never open a new connection per request (that would be very slow).
#
# HOW MONGODB WORKS (vs SQLite):
#   SQLite:  tables with rows and columns
#   MongoDB: collections with documents (documents are just Python dicts)
#
# Example MongoDB document in the "hospital_users" collection:
# {
#     "_id": "uuid-string-here",
#     "email": "admin@aiims.edu",
#     "password_hash": "$2b$12$...",
#     "role": "hospital_admin",
#     "hospital_id": "another-uuid",
#     "is_active": True
# }
#
# To query: db["hospital_users"].find_one({"email": "admin@aiims.edu"})
# That's it. No ORM, no sessions, no migrations.

from pymongo import MongoClient
from pymongo.database import Database
from app.core.config import settings

# Create the client once when the module loads
# MongoClient handles connection pooling automatically
_client: MongoClient = None


def get_client() -> MongoClient:
    """Returns the shared MongoClient (creates it on first call)."""
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGO_URL)
    return _client


def get_database() -> Database:
    """
    Returns the lifebridge database object.
    
    Use this in your endpoints:
        from app.core.database import get_database
        db = get_database()
        db["hospital_users"].find_one({"email": "..."})
    """
    return get_client()[settings.MONGO_DB_NAME]


def get_db() -> Database:
    """
    FastAPI dependency — use with Depends(get_db).
    
    Example:
        from fastapi import Depends
        from app.core.database import get_db
        
        @router.get("/something")
        def my_endpoint(db = Depends(get_db)):
            result = db["hospitals"].find_one({"_id": "some-id"})
    
    Note: Unlike SQLAlchemy, there is no session to close.
    PyMongo manages connections internally.
    """
    return get_database()


def ping_database() -> bool:
    """Check if MongoDB is reachable. Used in health check."""
    try:
        get_client().admin.command("ping")
        return True
    except Exception:
        return False
