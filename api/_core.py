"""Logique partagée de l'API Wassel (importée par les fichiers de routes)."""

import os
import math
import re
from collections import Counter

import requests

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

L7AKAM_SYSTEM = (
    "Tu es L7AKAM, le médiateur IA de la plateforme marocaine de recrutement Wassel. "
    "Ton rôle dans la chambre de négociation : aider candidat et entreprise à trouver un accord "
    "salaire équitable en dirhams (DH), en révélant la zone d'accord possible (ZOPA) sans jamais "
    "imposer un chiffre. Rappelle régulièrement que la décision finale appartient aux humains. "
    "Réponds en français clair et concis (3 phrases max), ton professionnel et chaleureux. "
    "Si on te demande de décider à la place des parties, refuse et propose un point médian indicatif."
)


def tokenize(text):
    text = text.lower()
    text = re.sub(r"[^a-zàâäéèêëîïôöùûüç0-9\s+]", " ", text)
    return [w for w in text.split() if len(w) > 2 and w not in STOPWORDS]


def cosine(a, b):
    dot = sum(a.get(w, 0) * b.get(w, 0) for w in set(a) | set(b))
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def compute_matches(cv_text):
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
    return results


def groq_l7akam(messages):
    """Appelle Groq et renvoie (reply, error)."""
    if not GROQ_API_KEY:
        return None, "GROQ_API_KEY manquante — ajoute-la dans Vercel → Settings → Environment Variables."
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
        return (reply or "Je n'ai pas pu formuler de réponse — reformulez votre question."), None
    except requests.RequestException as e:
        return None, f"Erreur Groq : {e}"
