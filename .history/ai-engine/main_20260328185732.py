from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import DonorOrgan, Recipient, BloodEmergencyRequest, BloodDonor
from engine import rank_organ_recipients, rank_blood_donors

app = FastAPI(title="LifeBridge AI Engine")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/match/organ")
async def match_organ(donor: DonorOrgan, recipients: list[Recipient]):
    matches = rank_organ_recipients(donor, recipients)
    return {"matches": matches[:10]} # Return top 10

@app.post("/match/blood")
async def match_blood(emergency: BloodEmergencyRequest, donors: list[BloodDonor]):
    matches = rank_blood_donors(emergency, donors)
    return {"matches": matches}
