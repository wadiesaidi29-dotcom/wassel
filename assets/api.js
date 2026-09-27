/* ============================================================
   WASSEL — Couche API (Groq + Supabase + Render)
   ============================================================
   Tout est 100% GRATUIT. Le site marche en "mode démo" tant que
   les URLs ne sont pas remplies. Dès que tu déploies, remplis
   les 3 constantes ci-dessous et tout devient réel — sans
   toucher au reste du code.
   ============================================================ */

window.WASSEL_CONFIG = {
  // 1) Backend Python sur Render — ex: "https://wassel-api.onrender.com"
  //    En local : "http://127.0.0.1:5000" (lance `python app.py` d'abord).
  //    Vide = mode démo local (aucun appel réseau).
  API_BASE: "http://127.0.0.1:5000",

  // 2) Supabase — Project Settings → API
  SUPABASE_URL: "",          // ex: "https://abcdefgh.supabase.co"
  SUPABASE_ANON_KEY: "",     // la clé "anon public"
};

window.WasselAPI = (() => {
  "use strict";
  const cfg = window.WASSEL_CONFIG;
  const configured = () => !!cfg.API_BASE;

  /* ---------- REST : backend Flask sur Render ---------- */

  async function post(path, body) {
    const res = await fetch(cfg.API_BASE.replace(/\/$/, "") + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("API " + path + " → HTTP " + res.status);
    return res.json();
  }

  // Matching CV ↔ offres (remplace la démo frontend quand branché)
  const match = (cv, questionnaire) =>
    post("/api/match", { cv, questionnaire });

  // L7AKAM — le médiateur IA (Groq Llama 3.3 70B)
  const l7akam = (messages) => post("/api/l7akam", { messages });

  // Zone d'accord + point médian
  const negotiation = (budgetEntreprise, minimumCandidat) =>
    post("/api/negotiation", {
      budget_entreprise: budgetEntreprise,
      minimum_candidat: minimumCandidat,
    });

  /* ---------- Supabase Realtime : la chambre de négociation ---------- */

  let sbLoaded = false;
  async function loadSupabase() {
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    if (sbLoaded) return window.supabase;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    window.supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    sbLoaded = true;
    return window.supabase;
  }

  // Charge l'historique des messages d'une négociation
  async function loadMessages(negoId) {
    const sb = await loadSupabase();
    if (!sb) return [];
    const { data, error } = await sb
      .from("negotiations")
      .select("messages")
      .eq("id", negoId)
      .single();
    if (error) return [];
    return data?.messages || [];
  }

  // Envoie un message dans la chambre (persisté + poussé en temps réel)
  async function sendMessage(negoId, author, text) {
    const sb = await loadSupabase();
    if (!sb) return;
    const { data } = await sb.from("negotiations").select("messages").eq("id", negoId).single();
    const messages = [...(data?.messages || []), { author, text, at: new Date().toISOString() }];
    await sb.from("negotiations").update({ messages }).eq("id", negoId);
  }

  // Écoute la chambre en direct (l'autre partie voit vos messages instantanément)
  async function watchMessages(negoId, onMessage) {
    const sb = await loadSupabase();
    if (!sb) return;
    sb.channel("nego-" + negoId)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "negotiations", filter: "id=eq." + negoId },
        (payload) => onMessage(payload.new?.messages || [])
      )
      .subscribe();
  }

  return {
    cfg,
    configured,
    match,
    l7akam,
    negotiation,
    loadMessages,
    sendMessage,
    watchMessages,
  };
})();
