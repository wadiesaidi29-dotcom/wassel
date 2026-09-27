"""Zone d'accord + point médian. (POST /api/negotiation)"""
from fastapi import FastAPI, Request
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _core import groq_l7akam

app = FastAPI()


@app.post("/api/negotiation")
async def negotiation(request: Request):
    data = await request.json()
    try:
        b = int(data.get("budget_entreprise"))
        c = int(data.get("minimum_candidat"))
    except (TypeError, ValueError):
        return {"error": 'Envoie {"budget_entreprise": 10000, "minimum_candidat": 7500}.'}

    if b >= c:
        median = round((b + c) / 2)
        return {
            "accord": True,
            "zone": {"min": c, "max": b},
            "median": median,
            "message": f"✓ Accord possible — point médian indicatif : {median} DH. "
                       "L'IA ne fait que révéler la zone ; la décision reste la vôtre.",
        }
    return {
        "accord": False, "zone": None, "median": None,
        "message": "✕ Pas de compatibilité salariale — l'IA informe les deux parties et clôt la négociation.",
    }
