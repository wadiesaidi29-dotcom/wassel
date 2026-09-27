-- ============================================================
-- WASSEL — Supabase : chambre de négociation en temps réel
-- À coller dans Supabase → SQL Editor → Run
-- Puis : Database → Replication (Realtime) → activer "negotiations"
-- ============================================================

create table if not exists negotiations (
  id uuid default gen_random_uuid() primary key,
  candidat_id int,
  entreprise_id int,
  messages jsonb default '[]'::jsonb,
  status text default 'ouverte',          -- ouverte | accord | cloturee
  budget_entreprise int,                  -- confidentiel : côté entreprise seulement
  minimum_candidat int,                   -- confidentiel : côté candidat seulement
  median_propose int,
  created_at timestamptz default now()
);

-- Accès : les deux parties connectées peuvent lire/écrire les messages,
-- mais personne ne voit le chiffre confidentiel de l'autre côté côté SQL brut.
alter table negotiations enable row level security;

create policy "negotiations_select_auth" on negotiations
  for select to authenticated using (true);

create policy "negotiations_insert_auth" on negotiations
  for insert to authenticated with check (true);

create policy "negotiations_update_auth" on negotiations
  for update to authenticated using (true);

-- Index temps réel
alter publication supabase_realtime add table negotiations;
