-- Die Baustelle selbst: Was läuft wann, und was ist noch offen.
--
-- Zwei Dinge, eine Tabelle: Der Zeitplan der Arbeiten ("Elektro, 12.–16. Oktober,
-- Meier AG") und die Pendenzen- und Mängelliste ("Steckdose Küche fehlt, bis
-- 30. Oktober"). Sie teilen fast alle Felder – Gewerk, Firma, Termin, Status,
-- Bemerkung –, und in einer Tabelle bleibt die Auswertung einfach: was ist diese
-- Woche dran, was ist überfällig.
--
-- Unterschied ist nur die Art: Eine Arbeit hat einen Zeitraum (von/bis), eine
-- Pendenz eine Frist (bis) und meist ein Foto.

create table public.arbeiten (
  id                uuid primary key default gen_random_uuid(),
  projekt_id        uuid not null references public.projekte(id) on delete cascade,
  budgetposition_id uuid references public.budgetpositionen(id) on delete set null,
  art               text not null default 'arbeit' check (art in ('arbeit','pendenz')),
  titel             text not null default '',
  beschreibung      text not null default '',
  firma             text not null default '',
  ort               text not null default '',          -- Raum oder Bauteil
  status            text not null default 'Offen'
                    check (status in ('Offen','In Arbeit','Erledigt')),
  von               date,
  bis               date,
  erledigt_am       date,
  datei_pfad        text,
  datei_name        text,
  sortierung        integer not null default 0,
  erstellt_am       timestamptz not null default now(),
  geaendert_am      timestamptz not null default now()
);
create index on public.arbeiten (projekt_id);
create index on public.arbeiten (budgetposition_id);
create trigger trg_arbeiten_geaendert before update on public.arbeiten
  for each row execute function public.geaendert_am_setzen();

alter table public.arbeiten enable row level security;
create policy arbeiten_lesen on public.arbeiten
  for select to authenticated using (public.ist_mitglied(projekt_id));
create policy arbeiten_schreiben on public.arbeiten
  for all to authenticated
  using (public.kann_bearbeiten(projekt_id))
  with check (public.kann_bearbeiten(projekt_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'arbeiten'
  ) then
    alter publication supabase_realtime add table public.arbeiten;
  end if;
end $$;
