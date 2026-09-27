"""L7AKAM — le médiateur IA (Groq). (POST /api/l7akam)"""
from fastapi import FastAPI, Request
from _core import groq_l7akam

app = FastAPI()


@app.post("/api/l7akam")
async def l7akam(request: Request):
    data = await request.json()
    messages = data.get("messages") or []
    if not messages:
        return {"error": 'Envoie {"messages": [...]} en JSON.',
                "reply": "(Mode démo) Aucun message reçu."}
    reply, error = groq_l7akam(messages)
    if error:
        return {"error": error, "reply": "(Mode démo) L7AKAM est momentanément indisponible."}
    return {"reply": reply}
