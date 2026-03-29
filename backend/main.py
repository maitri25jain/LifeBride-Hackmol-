# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.auth import router as auth_router
from app.api.recipients import router as recipients_router 
from app.core.database import ping_database
from app.api.dashboard import router as dashboard_router
from app.api.donors import router as donors_router
from app.api import citizens
from app.api import accounts
from app.api import alerts


app = FastAPI(
    title="LifeBridge API",
    description="Hospital coordination system for organ, blood, and plasma",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(recipients_router, prefix="/api") 
app.include_router(dashboard_router, prefix="/api") 
app.include_router(donors_router, prefix="/api")
app.include_router(citizens.router, prefix="/api")  
app.include_router(accounts.router, prefix="/api")    
app.include_router(alerts.router, prefix="/api")


@app.get("/api/health")
def health_check():
    db_ok = ping_database()
    return {
        "status":   "ok" if db_ok else "degraded",
        "project":  "LifeBridge",
        "version":  "1.0.0",
        "database": "mongodb connected" if db_ok else "mongodb unreachable",
    }
