"""Matching CV ↔ offres. (POST /api/match)"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _core import compute_matches

app = FastAPI()


@app.post("/api/match")
async def match(request: Request):
    data = await request.json()
    cv_text = (data.get("cv") or "") + " " + (data.get("questionnaire") or "")
    if not cv_text.strip():
        return JSONResponse({"error": 'Envoie {"cv": "..."} en JSON.'}, status_code=400)
    return {
        "matches": compute_matches(cv_text),
        "ia_note": "Score indicatif — l'IA propose, les humains décident.",
    }
