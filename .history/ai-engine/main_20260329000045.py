from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from models import DonorOrgan, Recipient, BloodEmergencyRequest, BloodDonor
from engine import rank_organ_recipients, rank_blood_donors

app = FastAPI(title="LifeBridge AI Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "LifeBridge AI Engine is online and ready for matching.", "status": 200}


# ── Wrapper models matching what backend sends ───────────────
 
class OrganMatchRequest(BaseModel):
    donor_organ: DonorOrgan
    recipients: List[Recipient]
    top_n: int = 10
 
 
class BloodMatchRequest(BaseModel):
    emergency: BloodEmergencyRequest
    donors: List[BloodDonor]
 
 
# ── Endpoints ────────────────────────────────────────────────
 
@app.post("/match/organ")
async def match_organ(payload: OrganMatchRequest):
    matches = rank_organ_recipients(payload.donor_organ, payload.recipients)
    return {"matches": matches[:payload.top_n]}
 
 
@app.post("/match/blood")
async def match_blood(payload: BloodMatchRequest):
    matches = rank_blood_donors(payload.emergency, payload.donors)
    return {"matches": matches}
 