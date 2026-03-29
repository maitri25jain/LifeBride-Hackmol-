import math
from datetime import datetime, timezone

# --- UTILITIES ---
def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two coordinates."""
    R = 6371.0
    lat1_r, lon1_r, lat2_r, lon2_r = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2_r - lat1_r, lon2_r - lon1_r
    a = math.sin(dlat / 2)**2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2)**2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

def is_abo_compatible(donor_bg: str, recipient_bg: str) -> bool:
    """Simplified ABO compatibility."""
    if donor_bg == "O-": return True # Universal donor
    if recipient_bg == "AB+": return True # Universal recipient
    return donor_bg == recipient_bg

def hla_score(donor_hla: dict, recipient_hla: dict) -> float:
    """Calculates HLA match ratio."""
    if not donor_hla or not recipient_hla: return 0.5
    matches, total = 0, 0
    for locus in ["A", "B", "DR"]:
        d_alleles = set(donor_hla.get(locus, []))
        r_alleles = set(recipient_hla.get(locus, []))
        for allele in d_alleles:
            total += 1
            if allele in r_alleles: matches += 1
    return (matches / total) if total > 0 else 0.5

# --- MATCHING LOGIC ---
def rank_organ_recipients(donor, recipients):
    VIABILITY_HOURS = {"HEART": 4, "LUNGS": 4, "LIVER": 12, "KIDNEYS": 24}
    results = []

    for rec in recipients:
        if rec.organ_needed != donor.organ_type or not is_abo_compatible(donor.blood_group, rec.blood_group):
            continue

        # Distance & Transport (Assume 60km/h average speed)
        dist_km = haversine_km(donor.hospital_lat, donor.hospital_lon, rec.hospital_lat, rec.hospital_lon)
        transport_mins = (dist_km / 60) * 60 

        # Viability Check
        max_hours = VIABILITY_HOURS.get(donor.organ_type, 12)
        elapsed_mins = (datetime.now(timezone.utc) - donor.harvest_time).total_seconds() / 60
        remaining_mins = (max_hours * 60) - elapsed_mins
        is_feasible = transport_mins < remaining_mins

        # Scoring
        score = 0.0
        score += hla_score(donor.hla_typing, rec.hla_typing) * 0.4
        score += (1.0 if rec.urgency == "CRITICAL" else 0.5 if rec.urgency == "URGENT" else 0.2) * 0.3
        score += min(1.0, rec.waitlist_days / 1825) * 0.2 # Waitlist factor
        
        # Penalize if not physically feasible to transport
        if not is_feasible: score *= 0.1 

        results.append({
            "recipient_id": rec.id,
            "total_score": round(score, 4),
            "distance_km": round(dist_km, 1),
            "transport_time_mins": round(transport_mins, 1),
            "viability_remaining_mins": round(remaining_mins, 1),
            "is_feasible": is_feasible
        })

    # Sort by feasibility first, then highest score
    return sorted(results, key=lambda x: (x["is_feasible"], x["total_score"]), reverse=True)


def rank_blood_donors(emergency, donors):
    results = []
    for donor in donors:
        if not is_abo_compatible(donor.blood_group, emergency.blood_group):
            continue
            
        dist_km = haversine_km(emergency.hospital_lat, emergency.hospital_lon, donor.lat, donor.lon)
        if dist_km > emergency.radius_km:
            continue

        # Eligibility Check (56 days)
        is_eligible = True
        if donor.last_donation_date:
            days_since = (datetime.now().date() - donor.last_donation_date).days
            if days_since < 56: is_eligible = False

        results.append({
            "donor_id": donor.id,
            "distance_km": round(dist_km, 1),
            "is_eligible": is_eligible
        })

    # Sort by eligibility, then closest distance
    return sorted(results, key=lambda x: (not x["is_eligible"], x["distance_km"]))