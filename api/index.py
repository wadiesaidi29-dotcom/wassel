"""
WASSEL — API serverless pour Vercel (100 % gratuit, sans carte)
===============================================================
Vercel exécute ce fichier comme fonction Python : les requêtes
vers /api/* arrivent ici, le site reste servi comme fichiers statiques.

Routes :
- GET  /api/health
- POST /api/match        { "cv": "...", "questionnaire": "..." }
- POST /api/l7akam       { "messages": [...] }   ← le médiateur IA (Groq)
- POST /api/negotiation  { "budget_entreprise": ..., "minimum_candidat": ... }

Variable d'environnement à ajouter dans Vercel : GROQ_API_KEY=gsk_...
"""

import os
import math
import re
from collections import Counter

import requests
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

# ------------------------------------------------------------------
# Corpus de démo (remplace plus tard par ta vraie base Supabase)
# ------------------------------------------------------------------
OFFERS = [
    {"id": 1, "entreprise": "InnovMaroc", "poste": "Data Analyst", "ville": "Casablanca",
     "mode": "Hybride", "salaire": "12–16k DH",
     "text": "data analyst python sql power bi dashboards casablanca hybride statistiques reporting"},
    {"id": 2, "entreprise": "DigitalMaroc", "poste": "Développeur Full-Stack", "ville": "Rabat",
     "mode": "Télétravail", "salaire": "14–18k DH",
     "text": "developpeur full stack javascript react node js api rest rabat remote web"},
    {"id": 3, "entreprise": "AtlasTech", "poste": "ML Engineer", "ville": "Casablanca",
     "mode": "Sur site", "salaire": "18–25k DH",
     "text": "machine learning engineer python ml deep learning nlp embeddings casablanca ia"},
    {"id": 4, "entreprise": "Saham Consulting", "poste": "BI Analyst", "ville": "Tanger",
     "mode": "Hybride", "salaire": "10–14k DH",
     "text": "bi analyst excel sql tableau reporting tangier business intelligence data"},
]

STOPWORDS = {
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "en", "à", "au",
    "aux", "pour", "avec", "sur", "dans", "je", "mon", "ma", "mes", "the", "of",
}


def tokenize(text):
    text = text.lower()
    text = re.sub(r"[^a-zàâäéèêëîïôöùûüç0-9\s+]", " ", text)
    return [w for w in text.split() if len(w) > 2 and w not in STOPWORDS]


def cosine(a, b):
    dot = sum(a.get(w, 0) * b.get(w, 0) for w in set(a) | set(b))
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


L7AKAM_SYSTEM = (
    "Tu es L7AKAM, le médiateur IA de la plateforme marocaine de recrutement Wassel. "
    "Ton rôle dans la chambre de négociation : aider candidat et entreprise à trouver un accord "
    "salaire équitable en dirhams (DH), en révélant la zone d'accord possible (ZOPA) sans jamais "
    "imposer un chiffre. Rappelle régulièrement que la décision finale appartient aux humains. "
    "Réponds en français clair et concis (3 phrases max), ton professionnel et chaleureux. "
    "Si on te demande de décider à la place des parties, refuse et propose un point médian indicatif."
)


@app.get("/api")
@app.get("/api/health")
def health():
    return {
        "service": "wassel-api",
        "runtime": "vercel-serverless",
        "groq": bool(GROQ_API_KEY),
        "model": GROQ_MODEL if GROQ_API_KEY else None,
    }


@app.post("/api/match")
async def match(request: Request):
    data = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    cv_text = (data.get("cv") or "") + " " + (data.get("questionnaire") or "")
    if not cv_text.strip():
        return JSONResponse({"error": 'Envoie {"cv": "..."} en JSON.'}, status_code=400)

    cv_vec = Counter(tokenize(cv_text))
    results = []
    for offer in OFFERS:
        score = round(cosine(cv_vec, Counter(tokenize(offer["text"]))) * 100)
        results.append({
            "id": offer["id"], "entreprise": offer["entreprise"], "poste": offer["poste"],
            "ville": offer["ville"], "mode": offer["mode"], "salaire": offer["salaire"],
            "score": min(score, 99),
        })
    results.sort(key=lambda r: r["score"], reverse=True)
    return {"matches": results, "ia_note": "Score indicatif — l'IA propose, les humains décident."}


@app.post("/api/l7akam")
async def l7akam(request: Request):
    if not GROQ_API_KEY:
        return {
            "error": "GROQ_API_KEY manquante — ajoute-la dans Vercel → Settings → Environment Variables.",
            "reply": "(Mode démo) L7AKAM n'est pas encore branché.",
        }
    data = await request.json()
    messages = data.get("messages") or []
    if not messages:
        return JSONResponse({"error": 'Envoie {"messages": [...]} en JSON.'}, status_code=400)

    try:
        r = requests.post(
            GROQ_URL,
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "system", "content": L7AKAM_SYSTEM}] + messages[-12:],
                "temperature": 0.6,
                "max_tokens": 800,
                "reasoning_effort": "low",
            },
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            timeout=25,
        )
        r.raise_for_status()
        msg = r.json()["choices"][0]["message"]
        reply = (msg.get("content") or msg.get("reasoning") or "").strip()
        return {"reply": reply or "Je n'ai pas pu formuler de réponse — reformulez votre question."}
    except requests.RequestException as e:
        return JSONResponse({"error": f"Erreur Groq : {e}"}, status_code=502)


@app.post("/api/negotiation")
async def negotiation(request: Request):
    data = await request.json()
    try:
        b = int(data.get("budget_entreprise"))
        c = int(data.get("minimum_candidat"))
    except (TypeError, ValueError):
        return JSONResponse(
            {"error": 'Envoie {"budget_entreprise": 10000, "minimum_candidat": 7500}.'},
            status_code=400,
        )

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
