-- Anschaffungen ausserhalb des Sanierungsbudgets
--
-- Umzug, Möbel, Haushaltgeräte, Maschinen und Werkzeug gehören nicht in den
-- Sanierungsrahmen: Sie sind nicht Teil der Bauarbeiten und meist über einen
-- eigenen Kredit finanziert. Sie stehen deshalb in einer eigenen Liste und
-- fliessen in keine Budgetzahl ein – sonst stimmt der verfügbare Betrag nicht
-- mehr.
--
-- Der Kreditrahmen steht beim Projekt: Damit lässt sich zeigen, wie viel vom
-- Kredit schon gebunden ist.

alter table public.projekte
  add column if not exists kredit_rahmen numeric(12,2) not null default 0;

comment on column public.projekte.kredit_rahmen is
  'Aufgenommener Kredit für Anschaffungen ausserhalb des Sanierungsbudgets. 0 = keiner erfasst.';

create table public.anschaffungen (
  id            uuid primary key default gen_random_uuid(),
  projekt_id    uuid not null references public.projekte(id) on delete cascade,
  bezeichnung   text not null default '',
  kategorie     text not null default '',
  betrag        numeric(12,2) not null default 0,
  datum         date,
  bezahlt       boolean not null default false,
  finanzierung  text not null default 'Kredit'
                check (finanzierung in ('Kredit','Eigenmittel')),
  bemerkung     text not null default '',
  sortierung    integer not null default 0,
  erstellt_am   timestamptz not null default now(),
  geaendert_am  timestamptz not null default now()
);
create index on public.anschaffungen (projekt_id);
create trigger trg_anschaffungen_geaendert before update on public.anschaffungen
  for each row execute function public.geaendert_am_setzen();

alter table public.anschaffungen enable row level security;
create policy anschaffungen_lesen on public.anschaffungen
  for select to authenticated using (public.ist_mitglied(projekt_id));
create policy anschaffungen_schreiben on public.anschaffungen
  for all to authenticated
  using (public.kann_bearbeiten(projekt_id))
  with check (public.kann_bearbeiten(projekt_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'anschaffungen'
  ) then
    alter publication supabase_realtime add table public.anschaffungen;
  end if;
end $$;
