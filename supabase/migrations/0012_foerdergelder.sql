-- Register für Fördergelder (Gebäudeprogramm, Kanton, Gemeinde, Werke …)
--
-- Ein Fördergeld durchläuft immer dieselben Stationen: geplant, eingereicht,
-- zugesichert, ausbezahlt – oder abgelehnt. Nur zugesicherte und ausbezahlte
-- Beiträge sind sicheres Geld; erwartete Beiträge werden getrennt ausgewiesen,
-- damit der verfügbare Betrag nicht zu gut aussieht.
--
-- Ein Betragsfeld, dessen Bedeutung am Status hängt: bis zur Zusicherung ist es
-- der erwartete Beitrag, danach der verfügte. Das hält die Erfassung kurz.

create table public.foerdergelder (
  id                uuid primary key default gen_random_uuid(),
  projekt_id        uuid not null references public.projekte(id) on delete cascade,
  budgetposition_id uuid references public.budgetpositionen(id) on delete set null,
  bezeichnung       text not null default '',
  stelle            text not null default '',
  gesuchsnummer     text not null default '',
  betrag            numeric(12,2) not null default 0,
  status            text not null default 'Geplant'
                    check (status in ('Geplant','Beantragt','Zugesichert','Ausbezahlt','Abgelehnt')),
  frist             date,
  eingereicht_am    date,
  entscheid_am      date,
  auszahlung_am     date,
  bemerkung         text not null default '',
  datei_pfad        text,
  datei_name        text,
  sortierung        integer not null default 0,
  erstellt_am       timestamptz not null default now(),
  geaendert_am      timestamptz not null default now()
);
create index on public.foerdergelder (projekt_id);
create index on public.foerdergelder (budgetposition_id);
create trigger trg_foerdergelder_geaendert before update on public.foerdergelder
  for each row execute function public.geaendert_am_setzen();

alter table public.foerdergelder enable row level security;
create policy foerdergelder_lesen on public.foerdergelder
  for select to authenticated using (public.ist_mitglied(projekt_id));
create policy foerdergelder_schreiben on public.foerdergelder
  for all to authenticated
  using (public.kann_bearbeiten(projekt_id))
  with check (public.kann_bearbeiten(projekt_id));

-- Live-Abgleich zwischen zwei Geräten: Ohne Eintrag in dieser Veröffentlichung
-- schickt Supabase keine Änderungsmeldungen. Das betraf bisher alle Tabellen –
-- die App hat deshalb nur beim Wechsel in den Tab neu geladen, nicht sofort.
do $$
declare t text;
begin
  foreach t in array array['projekte','projekt_mitglieder','budgetpositionen','offerten',
                           'offert_positionen','belege','dokumente','kaufnebenkosten','foerdergelder']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
