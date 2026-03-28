# debug.py
import sys
sys.path.insert(0, ".")

from app.models.base import Base
from app.models import hospital, donor, recipient, donor_case, match, audit_log, blood_inventory, transfer_request

print(f"\n✅ Tables Alembic can see: {len(Base.metadata.tables)}\n")
for table_name in Base.metadata.tables:
    print(f"   → {table_name}")