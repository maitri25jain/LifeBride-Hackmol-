# app/core/audit.py
#
# Audit log = permanent record of every action in the system.
# Think of it as CCTV for your database.
#
# Every time anyone does anything important, call:
#   write_audit_log(db, user, action, resource_type, resource_id, details)
#
# This creates one document in the audit_logs collection:
# {
#     "user_id":       "who did it",
#     "user_email":    "their email",
#     "user_role":     "their role",
#     "hospital_id":   "their hospital",
#     "action":        "CREATE_DONOR",
#     "resource_type": "donor",
#     "resource_id":   "the donor's id",
#     "details":       {"full_name": "Ramesh", "blood_type": "B+"},
#     "timestamp":     "2024-01-15T10:30:00"
# }

import uuid
from datetime import datetime
from pymongo.database import Database


def write_audit_log(
    db:            Database,
    user:          dict,       # current_user from JWT
    action:        str,        # e.g. "CREATE_DONOR", "CREATE_RECIPIENT"
    resource_type: str,        # e.g. "donor", "recipient"
    resource_id:   str,        # the id of the thing that was created/changed
    details:       dict = {}   # any extra info worth logging
):
    """
    Writes one audit log entry.
    Call this after every create, update, or delete operation.

    Example:
        write_audit_log(
            db            = db,
            user          = current_user,
            action        = "CREATE_DONOR",
            resource_type = "donor",
            resource_id   = donor_id,
            details       = {"full_name": "Ramesh", "blood_type": "B+"}
        )
    """

    log = {
        "_id":           str(uuid.uuid4()),
        "user_id":       user["_id"],
        "user_email":    user["email"],
        "user_role":     user["role"],
        "hospital_id":   user["hospital_id"],
        "action":        action,        # what happened
        "resource_type": resource_type, # what type of thing
        "resource_id":   resource_id,   # which specific thing
        "details":       details,       # extra context
        "timestamp":     datetime.utcnow(),
    }

    db["audit_logs"].insert_one(log)
    # no return value needed — fire and forget