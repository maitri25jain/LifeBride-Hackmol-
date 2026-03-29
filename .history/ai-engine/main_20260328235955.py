from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from models import DonorOrgan, Recipient, BloodEmergencyRequest, BloodDonor
from engine import rank_organ_recipients, rank_blood_donors

app = FastAPI(title="LifeBridge AI Engine")
@app.get("/")
async def root():
    return {"message": "LifeBridge AI Engine is online and ready for matching.", "status": 200}



@app.post("/match/organ")
async def match_organ(donor: DonorOrgan, recipients: list[Recipient]):
    matches = rank_organ_recipients(donor, recipients)
    return {"matches": matches[:10]} # Return top 10

@app.post("/match/blood")
async def match_blood(emergency: BloodEmergencyRequest, donors: list[BloodDonor]):
    matches = rank_blood_donors(emergency, donors)
    return {"matches": matches}
