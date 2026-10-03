-- Grundrisse als Bild statt nachgezeichnet.
--
-- Zwei Versuche, den Plan nachzubauen, waren unbrauchbar: erst mitwachsende
-- Bänder, dann feste Rechtecke. Beides scheitert am selben Punkt – echte Räume
-- sind nicht rechtwinklig. Schräge Wände, Versätze und Erker lassen sich mit
-- Rechtecken nicht abbilden, und ein Plan, in dem man die Räume nicht
-- wiedererkennt, ist wertlos.
--
-- Darum jetzt der umgekehrte Weg: Der Originalplan wird als Bild hochgeladen und
-- unverändert angezeigt. Darauf setzt man Messpunkte – ein Tipp auf den Raum im
-- Plan, Masse eintragen, fertig. Der Plan sieht aus wie der Plan, weil er der
-- Plan ist.

create table public.plaene (
  id           uuid primary key default gen_random_uuid(),
  projekt_id   uuid not null references public.projekte(id) on delete cascade,
  titel        text not null default '',
  datei_pfad   text not null,
  datei_name   text not null default '',
  sortierung   integer not null default 0,
  erstellt_am  timestamptz not null default now(),
  geaendert_am timestamptz not null default now()
);
create index on public.plaene (projekt_id);
create trigger trg_plaene_geaendert before update on public.plaene
  for each row execute function public.geaendert_am_setzen();

alter table public.plaene enable row level security;
create policy plaene_lesen on public.plaene
  for select to authenticated using (public.ist_mitglied(projekt_id));
create policy plaene_schreiben on public.plaene
  for all to authenticated
  using (public.kann_bearbeiten(projekt_id))
  with check (public.kann_bearbeiten(projekt_id));

-- Messpunkt eines Raums auf einem Plan. Die Lage ist auf die Bildgrösse bezogen
-- (0 bis 1), damit sie auf jedem Bildschirm und bei jeder Zoomstufe stimmt.
alter table public.raeume
  add column if not exists plan_id uuid references public.plaene(id) on delete set null,
  add column if not exists marke_x numeric(6,5),
  add column if not exists marke_y numeric(6,5);
create index if not exists raeume_plan_id_idx on public.raeume (plan_id);

-- Die Spalten der nachgezeichneten Geometrie (plan_x/y/w/h, plan_band, plan_sort,
-- soll_breite, soll_tiefe) bleiben bestehen, werden aber nicht mehr beschrieben
-- oder gelesen. Sie zu löschen wäre ein unnötiger Eingriff in bestehende Daten;
-- leer stehende Spalten kosten nichts.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'plaene'
  ) then
    alter publication supabase_realtime add table public.plaene;
  end if;
end $$;
