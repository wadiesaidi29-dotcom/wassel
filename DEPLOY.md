# 🚀 WASSEL — Déploiement 100 % gratuit

Frontend (Vercel) + Backend Python (Render) + IA (Groq) + Chat live (Supabase).
Tout est déjà préparé dans ce dossier. Suis les 4 étapes dans l'ordre.

---

## Étape 1 — GROQ (le cerveau L7AKAM, gratuit)

1. Va sur **https://console.groq.com** → Sign up avec Google
2. **API Keys** → **Create API Key** → copie la clé `gsk_...`
3. Garde-la pour l'étape 3 (Render). **Ne la mets jamais dans le code.**

---

## Étape 2 — SUPABASE (base de données + chat live, gratuit)

1. Va sur **https://supabase.com** → New project (choisis une région proche : Frankfurt)
2. **SQL Editor** → colle tout le contenu de `supabase.sql` → **Run**
3. **Database → Replication** → vérifie que `negotiations` est activée en Realtime
4. **Project Settings → API** : copie l'**URL** et la clé **anon public**
5. Colle-les dans `assets/api.js` → `SUPABASE_URL` et `SUPABASE_ANON_KEY`

---

## Étape 3 — GITHUB + RENDER (backend Python, gratuit)

1. Crée un repo sur **https://github.com/new** (ex : `wassel`), vide, sans README
2. Depuis ce dossier, lance :

```bash
git init
git add .
git commit -m "Wassel — site + API"
git branch -M main
git remote add origin https://github.com/wadiesaidi/wassel.git
git push -u origin main
```

3. Va sur **https://render.com** → Sign in avec GitHub
4. **New → Web Service** → connecte le repo `wassel`
   - Render lit `render.yaml` tout seul. Sinon manuellement :
     - Runtime : **Python 3**
     - Build : `pip install -r requirements.txt`
     - Start : `gunicorn app:app --bind 0.0.0.0:$PORT`
5. **Environment Variables** → ajoute :
   - `GROQ_API_KEY` = ta clé `gsk_...` (étape 1)
6. **Deploy** → tu obtiens : `https://wassel-api.onrender.com`

---

## Étape 4 — VERCEL (le site, gratuit)

1. Va sur **https://vercel.com** → Sign in avec GitHub
2. **Add New → Project** → importe le repo `wassel`
3. **Root Directory** : mets `.` (tout le site est à la racine) → **Deploy**
4. Tu obtiens : `https://wassel.vercel.app`

---

## Étape 5 — LA CONNEXION FINALE (30 secondes)

Dans `assets/api.js`, remplis :

```js
API_BASE: "https://wassel-api.onrender.com",   // ton URL Render
SUPABASE_URL: "https://xxxx.supabase.co",       // ton URL Supabase
SUPABASE_ANON_KEY: "eyJhbGciOi...",             // ta clé anon
```

Puis :

```bash
git add . && git commit -m "Connexion API" && git push
```

Vercel et Render redéploient **automatiquement**. C'est fini. 🎉

---

## Tester l'API

```bash
curl https://wassel-api.onrender.com/api/health

curl -X POST https://wassel-api.onrender.com/api/match \
  -H "Content-Type: application/json" \
  -d '{"cv": "Data analyst python sql power bi casablanca"}'

curl -X POST https://wassel-api.onrender.com/api/l7akam \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Le candidat veut 9000 DH, l entreprise propose 8000 DH, que faire ?"}]}'

curl -X POST https://wassel-api.onrender.com/api/negotiation \
  -H "Content-Type: application/json" \
  -d '{"budget_entreprise": 10000, "minimum_candidat": 7500}'
```

## Notes importantes

- **Render free tier** : l'API s'endort après 15 min d'inactivité → la 1ʳᵉ requête prend ~30 s. Normal.
- **Clé Groq** : uniquement dans les variables d'environnement Render (jamais commitée).
- **Mode démo** : tant que `API_BASE` est vide, le site marche exactement comme aujourd'hui, sans erreur.
- Le dossier `wassel/` complet est ce qu'on pousse sur GitHub. Ne push jamais `.env`.
