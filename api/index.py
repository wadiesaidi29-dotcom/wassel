"""Wassel API — infos du service. (GET /api)"""
from fastapi import FastAPI
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _core import GROQ_API_KEY, GROQ_MODEL

app = FastAPI()


@app.get("/api")
@app.get("/api/")
def info():
    return {
        "service": "wassel-api",
        "runtime": "vercel-serverless",
        "groq": bool(GROQ_API_KEY),
        "model": GROQ_MODEL if GROQ_API_KEY else None,
        "endpoints": ["/api/health", "/api/match", "/api/l7akam", "/api/negotiation"],
    }
