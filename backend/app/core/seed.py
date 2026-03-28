# app/core/seed.py
#
# Run once: python -m app.core.seed
#
# Collections created:
#   hospitals        — 3 documents (AIIMS, Fortis, Medanta)
#   hospital_users   — 6 documents (admin + coordinator per hospital)
#   blood_inventory  — 24 documents (8 blood types per hospital)
#   citizens         — 3 documents (test citizen accounts)
#   pledges          — 2 documents (sample pledges with fake tx hash)
#   alerts           — 2 documents (sample blood alerts)

import uuid
import hashlib
import time
import os
from datetime import datetime
from app.core.database import get_database
from app.core.security import hash_password


def generate_fake_tx_hash(seed_value: str) -> str:
    raw = f"{seed_value}{time.time()}{os.urandom(8).hex()}"
    return "0x" + hashlib.sha256(raw.encode()).hexdigest()


def create_blood_inventory(db, hospital_id: str):
    """Insert 8 blood type records for a hospital."""
    blood_types = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    stock       = [12,   5,    8,    3,    5,    2,    16,   3  ]

    for bt, units in zip(blood_types, stock):
        db["blood_inventory"].insert_one({
            "_id":             str(uuid.uuid4()),
            "hospital_id":     hospital_id,
            "blood_type":      bt,
            "units_available": units,
            "last_updated_at": datetime.utcnow(),
        })


def seed():
    db = get_database()

    # ── Check if already seeded ──────────────────────────────────
    existing = db["hospitals"].find_one({"name": "AIIMS New Delhi"})
    if existing:
        print("Already seeded. Skipping.")
        print("To reseed: drop the lifebridge database in Atlas and run again.")
        return

    # ════════════════════════════════════════════════════════════
    # HOSPITAL 1 — AIIMS New Delhi (government)
    # ════════════════════════════════════════════════════════════
    aiims_id = str(uuid.uuid4())

    db["hospitals"].insert_one({
        "_id":           aiims_id,
        "name":          "AIIMS New Delhi",
        "notto_code":    "NOTTO-DL-001",
        "tier":          "government",
        "city":          "New Delhi",
        "state":         "Delhi",
        "zone":          "North",
        "location_lat":  28.5672,
        "location_lng":  77.2100,
        "contact_email": "transplant@aiims.edu",
        "contact_phone": "+911126588500",
        "is_active":     True,
        "created_at":    datetime.utcnow(),
    })
    print("✅ Hospital 1 created: AIIMS New Delhi")

    db["hospital_users"].insert_one({
        "_id":           str(uuid.uuid4()),
        "hospital_id":   aiims_id,
        "email":         "admin@aiims.edu",
        "password_hash": hash_password("Admin@123"),
        "full_name":     "Dr. Mehra",
        "role":          "hospital_admin",
        "is_active":     True,
        "last_login_at": None,
        "created_at":    datetime.utcnow(),
    })

    db["hospital_users"].insert_one({
        "_id":           str(uuid.uuid4()),
        "hospital_id":   aiims_id,
        "email":         "coordinator@aiims.edu",
        "password_hash": hash_password("Coord@123"),
        "full_name":     "Dr. Kapoor",
        "role":          "coordinator",
        "is_active":     True,
        "last_login_at": None,
        "created_at":    datetime.utcnow(),
    })

    create_blood_inventory(db, aiims_id)
    print("✅ AIIMS staff + blood inventory created")
    print("   Admin:       admin@aiims.edu       / Admin@123")
    print("   Coordinator: coordinator@aiims.edu / Coord@123")

    # ════════════════════════════════════════════════════════════
    # HOSPITAL 2 — Fortis Memorial Gurgaon (private)
    # ════════════════════════════════════════════════════════════
    fortis_id = str(uuid.uuid4())

    db["hospitals"].insert_one({
        "_id":           fortis_id,
        "name":          "Fortis Memorial Research Institute",
        "notto_code":    "NOTTO-HR-001",
        "tier":          "private",
        "city":          "Gurgaon",
        "state":         "Haryana",
        "zone":          "North",
        "location_lat":  28.4595,
        "location_lng":  77.0266,
        "contact_email": "transplant@fortis.com",
        "contact_phone": "+911244962200",
        "is_active":     True,
        "created_at":    datetime.utcnow(),
    })
    print("\n✅ Hospital 2 created: Fortis Memorial Gurgaon")

    db["hospital_users"].insert_one({
        "_id":           str(uuid.uuid4()),
        "hospital_id":   fortis_id,
        "email":         "admin@fortis.com",
        "password_hash": hash_password("Admin@123"),
        "full_name":     "Dr. Sharma",
        "role":          "hospital_admin",
        "is_active":     True,
        "last_login_at": None,
        "created_at":    datetime.utcnow(),
    })

    db["hospital_users"].insert_one({
        "_id":           str(uuid.uuid4()),
        "hospital_id":   fortis_id,
        "email":         "coordinator@fortis.com",
        "password_hash": hash_password("Coord@123"),
        "full_name":     "Dr. Verma",
        "role":          "coordinator",
        "is_active":     True,
        "last_login_at": None,
        "created_at":    datetime.utcnow(),
    })

    create_blood_inventory(db, fortis_id)
    print("✅ Fortis staff + blood inventory created")
    print("   Admin:       admin@fortis.com       / Admin@123")
    print("   Coordinator: coordinator@fortis.com / Coord@123")

    # ════════════════════════════════════════════════════════════
    # HOSPITAL 3 — Medanta The Medicity Gurgaon (private)
    # ════════════════════════════════════════════════════════════
    medanta_id = str(uuid.uuid4())

    db["hospitals"].insert_one({
        "_id":           medanta_id,
        "name":          "Medanta The Medicity",
        "notto_code":    "NOTTO-HR-002",
        "tier":          "private",
        "city":          "Gurgaon",
        "state":         "Haryana",
        "zone":          "North",
        "location_lat":  28.4112,
        "location_lng":  77.0418,
        "contact_email": "transplant@medanta.org",
        "contact_phone": "+911244141414",
        "is_active":     True,
        "created_at":    datetime.utcnow(),
    })
    print("\n✅ Hospital 3 created: Medanta The Medicity")

    db["hospital_users"].insert_one({
        "_id":           str(uuid.uuid4()),
        "hospital_id":   medanta_id,
        "email":         "admin@medanta.org",
        "password_hash": hash_password("Admin@123"),
        "full_name":     "Dr. Gupta",
        "role":          "hospital_admin",
        "is_active":     True,
        "last_login_at": None,
        "created_at":    datetime.utcnow(),
    })

    db["hospital_users"].insert_one({
        "_id":           str(uuid.uuid4()),
        "hospital_id":   medanta_id,
        "email":         "coordinator@medanta.org",
        "password_hash": hash_password("Coord@123"),
        "full_name":     "Dr. Singh",
        "role":          "coordinator",
        "is_active":     True,
        "last_login_at": None,
        "created_at":    datetime.utcnow(),
    })

    create_blood_inventory(db, medanta_id)
    print("✅ Medanta staff + blood inventory created")
    print("   Admin:       admin@medanta.org       / Admin@123")
    print("   Coordinator: coordinator@medanta.org / Coord@123")

    # ════════════════════════════════════════════════════════════
    # CITIZENS — 3 test accounts in Delhi
    # ════════════════════════════════════════════════════════════
    citizen_1_id = str(uuid.uuid4())
    citizen_2_id = str(uuid.uuid4())
    citizen_3_id = str(uuid.uuid4())

    citizens = [
        {
            "_id":           citizen_1_id,
            "full_name":     "Ravi Kumar",
            "email":         "ravi@demo.com",
            "phone":         "9876543210",
            "blood_type":    "B+",
            "date_of_birth": "1990-05-15",
            "aadhaar_hash":  hashlib.sha256("987654321098".encode()).hexdigest(),
            "role":          "citizen",
            "location": {
                "type":        "Point",
                "coordinates": [77.2090, 28.6139]  # Central Delhi
            },
            "is_active":  True,
            "created_at": datetime.utcnow(),
        },
        {
            "_id":           citizen_2_id,
            "full_name":     "Priya Sharma",
            "email":         "priya@demo.com",
            "phone":         "9876543211",
            "blood_type":    "O-",
            "date_of_birth": "1995-08-22",
            "aadhaar_hash":  hashlib.sha256("876543210987".encode()).hexdigest(),
            "role":          "citizen",
            "location": {
                "type":        "Point",
                "coordinates": [77.2300, 28.5800]  # South Delhi
            },
            "is_active":  True,
            "created_at": datetime.utcnow(),
        },
        {
            "_id":           citizen_3_id,
            "full_name":     "Amit Singh",
            "email":         "amit@demo.com",
            "phone":         "9876543212",
            "blood_type":    "A+",
            "date_of_birth": "1988-12-03",
            "aadhaar_hash":  hashlib.sha256("765432109876".encode()).hexdigest(),
            "role":          "citizen",
            "location": {
                "type":        "Point",
                "coordinates": [77.1800, 28.6400]  # West Delhi
            },
            "is_active":  True,
            "created_at": datetime.utcnow(),
        },
    ]

    db["citizens"].insert_many(citizens)
    print("\n✅ Citizens created")
    print("   Ravi:  9876543210 / OTP: 123456 (B+)")
    print("   Priya: 9876543211 / OTP: 123456 (O-)")
    print("   Amit:  9876543212 / OTP: 123456 (A+)")

    # ════════════════════════════════════════════════════════════
    # PLEDGES — 2 sample pledges with fake blockchain tx hash
    # ════════════════════════════════════════════════════════════
    pledges = [
        {
            "_id":           str(uuid.uuid4()),
            "citizen_id":    citizen_1_id,
            "aadhaar_hash":  hashlib.sha256("987654321098".encode()).hexdigest(),
            "organs":        ["kidney", "liver"],
            "donate_blood":  True,
            "donate_plasma": False,
            "tx_hash":       generate_fake_tx_hash("ravi-pledge"),
            "token_id":      1001,
            "network":       "polygon-amoy",
            "is_active":     True,
            "pledged_at":    datetime.utcnow(),
        },
        {
            "_id":           str(uuid.uuid4()),
            "citizen_id":    citizen_2_id,
            "aadhaar_hash":  hashlib.sha256("876543210987".encode()).hexdigest(),
            "organs":        ["cornea", "kidney"],
            "donate_blood":  True,
            "donate_plasma": True,
            "tx_hash":       generate_fake_tx_hash("priya-pledge"),
            "token_id":      1002,
            "network":       "polygon-amoy",
            "is_active":     True,
            "pledged_at":    datetime.utcnow(),
        },
    ]

    db["pledges"].insert_many(pledges)
    print("\n✅ Pledges created with blockchain tx hashes")

    # ════════════════════════════════════════════════════════════
    # ALERTS — 2 sample blood alerts
    # ════════════════════════════════════════════════════════════
    db["alerts"].insert_many([
        {
            "_id":           str(uuid.uuid4()),
            "hospital_id":   aiims_id,
            "hospital_name": "AIIMS New Delhi",
            "blood_type":    "O-",
            "urgency":       "critical",
            "units_needed":  3,
            "location": {
                "type":        "Point",
                "coordinates": [77.2100, 28.5672]
            },
            "radius_km":  10,
            "is_active":  True,
            "responders": [],
            "created_at": datetime.utcnow(),
        },
        {
            "_id":           str(uuid.uuid4()),
            "hospital_id":   fortis_id,
            "hospital_name": "Fortis Memorial Research Institute",
            "blood_type":    "B+",
            "urgency":       "urgent",
            "units_needed":  2,
            "location": {
                "type":        "Point",
                "coordinates": [77.0266, 28.4595]
            },
            "radius_km":  15,
            "is_active":  True,
            "responders": [],
            "created_at": datetime.utcnow(),
        },
    ])
    print("✅ Sample blood alerts created (AIIMS + Fortis)")

    # ════════════════════════════════════════════════════════════
    # INDEXES
    # ════════════════════════════════════════════════════════════
    db["hospital_users"].create_index("email", unique=True)
    db["hospitals"].create_index("notto_code", unique=True, sparse=True)
    db["donors"].create_index("aadhaar_hash", unique=True, sparse=True)
    db["donor_cases"].create_index("case_number", unique=True, sparse=True)
    db["citizens"].create_index("email", unique=True, sparse=True)
    db["citizens"].create_index("phone", unique=True)
    db["citizens"].create_index([("location", "2dsphere")])
    db["alerts"].create_index([("location", "2dsphere")])
    print("✅ MongoDB indexes created")

    print("\n" + "=" * 55)
    print("  SEED COMPLETE")
    print("=" * 55)
    print("  HOSPITAL 1 — AIIMS New Delhi")
    print("  Admin:       admin@aiims.edu       / Admin@123")
    print("  Coordinator: coordinator@aiims.edu / Coord@123")
    print("─" * 55)
    print("  HOSPITAL 2 — Fortis Gurgaon")
    print("  Admin:       admin@fortis.com       / Admin@123")
    print("  Coordinator: coordinator@fortis.com / Coord@123")
    print("─" * 55)
    print("  HOSPITAL 3 — Medanta Gurgaon")
    print("  Admin:       admin@medanta.org       / Admin@123")
    print("  Coordinator: coordinator@medanta.org / Coord@123")
    print("─" * 55)
    print("  CITIZENS (login with phone + OTP 123456):")
    print("  Ravi:  9876543210 (B+)")
    print("  Priya: 9876543211 (O-)")
    print("  Amit:  9876543212 (A+)")
    print("=" * 55)


if __name__ == "__main__":
    seed()