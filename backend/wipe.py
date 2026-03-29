from app.core.database import get_database

db = get_database()
for coll in db.list_collection_names():
    db[coll].drop()
    
print("✅ Database completely wiped clean!")