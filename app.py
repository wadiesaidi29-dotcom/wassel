"""
WASSEL — Backend API (démo de déploiement)
==========================================
- /api/health          : vérification que l'API est vivante
- /api/match           : matching CV ↔ offres (TF-IDF maison, sans dépendance lourde)
- /api/l7akam          : le "médiateur IA" propulsé par Groq (Llama 3.3 70B)
- /api/negotiation     : zone d'accord + point médian (l'IA propose, l'humain décide)

Déploiement gratuit : Render (voir DEPLOY.md)
Variable d'environnement requise pour l'IA : GROQ_API_KEY=gsk_...
"""

import os
import math
import re
from collections import Counter

import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # le frontend Vercel doit pouvoir appeler l'API

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
# Modèle par défaut (vérifiable sur https://console.groq.com/docs/models)
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

# ------------------------------------------------------------------
# Corpus de démo (remplace plus tard par ta vraie base Supabase)
# ------------------------------------------------------------------
OFFERS = [
    {
        "id": 1,
        "entreprise": "InnovMaroc",
        "poste": "Data Analyst",
        "ville": "Casablanca",
        "mode": "Hybride",
        "salaire": "12–16k DH",
        "text": "data analyst python sql power bi dashboards casablanca hybride statistiques reporting",
    },
    {
        "id": 2,
        "entreprise": "DigitalMaroc",
        "poste": "Développeur Full-Stack",
        "ville": "Rabat",
        "mode": "Télétravail",
        "salaire": "14–18k DH",
        "text": "developpeur full stack javascript react node js api rest rabat remote web",
    },
    {
        "id": 3,
        "entreprise": "AtlasTech",
        "poste": "ML Engineer",
        "ville": "Casablanca",
        "mode": "Sur site",
        "salaire": "18–25k DH",
        "text": "machine learning engineer python ml deep learning nlp embeddings casablanca ia",
    },
    {
        "id": 4,
        "entreprise": "Saham Consulting",
        "poste": "BI Analyst",
        "ville": "Tanger",
        "mode": "Hybride",
        "salaire": "10–14k DH",
        "text": "bi analyst excel sql tableau reporting tangier business intelligence data",
    },
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


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------
@app.route("/")
def home():
    return jsonify({
        "service": "Wassel API (backend)",
        "message": "Ceci est l'API — le site est ailleurs. En local : http://127.0.0.1:8741/index.html",
        "endpoints": ["/api/health", "/api/match", "/api/l7akam", "/api/negotiation"],
        "groq": bool(GROQ_API_KEY),
    })


@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "wassel-api",
        "groq": bool(GROQ_API_KEY),
        "model": GROQ_MODEL if GROQ_API_KEY else None,
    })


@app.route("/api/match", methods=["POST"])
def match():
    """Body JSON : { "cv": "texte du CV", "questionnaire": "poste souhaité..." }
    Réponse : offres triées par score de compatibilité 0–100."""
    data = request.get_json(silent=True) or {}
    cv_text = (data.get("cv") or "") + " " + (data.get("questionnaire") or "")
    if not cv_text.strip():
        return jsonify({"error": "Envoie {\"cv\": \"...\"} en JSON."}), 400

    cv_vec = Counter(tokenize(cv_text))
    results = []
    for offer in OFFERS:
        score = round(cosine(cv_vec, Counter(tokenize(offer["text"]))) * 100)
        results.append({
            "id": offer["id"],
            "entreprise": offer["entreprise"],
            "poste": offer["poste"],
            "ville": offer["ville"],
            "mode": offer["mode"],
            "salaire": offer["salaire"],
            "score": min(score, 99),
        })
    results.sort(key=lambda r: r["score"], reverse=True)
    return jsonify({"matches": results, "ia_note": "Score indicatif — l'IA propose, les humains décident."})


@app.route("/api/l7akam", methods=["POST"])
def l7akam():
    """Le médiateur IA (L7AKAM). Body JSON : { "messages": [{"role":"user","content":"..."}, ...] }
    Retourne la réponse du médiateur Groq Llama 3.3 70B."""
    if not GROQ_API_KEY:
        return jsonify({
            "error": "GROQ_API_KEY manquante. Ajoute-la dans les Environment Variables de Render.",
            "reply": "(Mode démo) L7AKAM n'est pas encore branché — ajoute ta clé Groq sur Render.",
        }), 200

    data = request.get_json(silent=True) or {}
    messages = data.get("messages") or []
    if not messages:
        return jsonify({"error": "Envoie {\"messages\": [...]} en JSON."}), 400

    system_prompt = (
        "Tu es L7AKAM, le médiateur IA de la plateforme marocaine de recrutement Wassel. "
        "Ton rôle dans la chambre de négociation : aider candidat et entreprise à trouver un accord "
        "salaire équitable en dirhams (DH), en révélant la zone d'accord possible (ZOPA) sans jamais "
        "imposer un chiffre. Rappelle régulièrement que la décision finale appartient aux humains. "
        "Réponds en français clair et concis (3 phrases max), ton professionnel et chaleureux. "
        "Si on te demande de décider à la place des parties, refuse et propose un point médian indicatif."
    )
    payload = {
        "model": GROQ_MODEL,
        "messages": [{"role": "system", "content": system_prompt}] + messages[-12:],
        "temperature": 0.6,
        "max_tokens": 800,
        "reasoning_effort": "low",  # gpt-oss réfléchit en interne ; on limite pour garder des réponses rapides
    }
    try:
        r = requests.post(
            GROQ_URL,
            json=payload,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            timeout=30,
        )
        r.raise_for_status()
        msg = r.json()["choices"][0]["message"]
        reply = msg.get("content") or msg.get("reasoning") or ""
        reply = reply.strip() or "Je n'ai pas pu formuler de réponse — reformulez votre question."
        return jsonify({"reply": reply})
    except requests.RequestException as e:
        return jsonify({"error": f"Erreur Groq : {e}"}), 502


@app.route("/api/negotiation", methods=["POST"])
def negotiation():
    """Body JSON : { "budget_entreprise": 10000, "minimum_candidat": 7500 }
    Retourne la zone d'accord + le point médian (indicatif)."""
    data = request.get_json(silent=True) or {}
    try:
        b = int(data.get("budget_entreprise"))
        c = int(data.get("minimum_candidat"))
    except (TypeError, ValueError):
        return jsonify({"error": "Envoie {\"budget_entreprise\": 10000, \"minimum_candidat\": 7500}."}), 400

    if b >= c:
        return jsonify({
            "accord": True,
            "zone": {"min": c, "max": b},
            "median": round((b + c) / 2),
            "message": f"✓ Accord possible — point médian indicatif : {round((b + c) / 2)} DH. "
                       "L'IA ne fait que révéler la zone ; la décision reste la vôtre.",
        })
    return jsonify({
        "accord": False,
        "zone": None,
        "median": None,
        "message": "✕ Pas de compatibilité salariale — l'IA informe les deux parties et clôt la négociation.",
    })


if __name__ == "__main__":
    # Local : python app.py  →  http://127.0.0.1:5000
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
