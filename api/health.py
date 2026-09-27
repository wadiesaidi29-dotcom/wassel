"""Santé du service. (GET /api/health)"""
from fastapi import FastAPI
from _core import GROQ_API_KEY, GROQ_MODEL

app = FastAPI()


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "wassel-api",
        "groq": bool(GROQ_API_KEY),
        "model": GROQ_MODEL if GROQ_API_KEY else None,
    }
