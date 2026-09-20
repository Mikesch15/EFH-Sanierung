-- Besichtigung und Bestandsaufnahme: Checkliste und Raum-Messblatt.
--
-- Vorlage ist die Besichtigungs-Checkliste Tulpenweg 37 (12 Gruppen, 88 Punkte).
-- Sie steht bewusst NICHT in der Datenbank, sondern als Vorlage in der App: Jedes
-- Projekt legt daraus seine eigene Liste an und ändert sie frei – eigene Punkte
-- dazu, nicht passende weg.
--
-- Zu jedem Punkt gehört ein Feld "wert": Dort steht das Mass oder die Feststellung
-- ("4.20 × 3.60 m", "Balken quer, 18 cm"). Freitext mit Absicht – auf der Baustelle
-- notiert man "ca. 24 cm, Sondage" und nicht eine saubere Zahl.

create table public.checkliste (
  id           uuid primary key default gen_random_uuid(),
  projekt_id   uuid not null references public.projekte(id) on delete cascade,
  gruppe       text not null default '',
  titel        text not null default '',
  wert         text not null default '',
  erledigt     boolean not null default false,
  erledigt_am  date,
  eigen        boolean not null default false,   -- selbst ergänzt, nicht aus der Vorlage
  sortierung   integer not null default 0,
  erstellt_am  timestamptz not null default now(),
  geaendert_am timestamptz not null default now()
);
create index on public.checkliste (projekt_id);
create trigger trg_checkliste_geaendert before update on public.checkliste
  for each row execute function public.geaendert_am_setzen();

alter table public.checkliste enable row level security;
create policy checkliste_lesen on public.checkliste
  for select to authenticated using (public.ist_mitglied(projekt_id));
create policy checkliste_schreiben on public.checkliste
  for all to authenticated
  using (public.kann_bearbeiten(projekt_id))
  with check (public.kann_bearbeiten(projekt_id));

-- Raum-Messblatt: je Raum eine Zeile, wie auf dem Papierblatt.
-- Längen in Metern, Wandstärke in Zentimetern – so misst man es auch.
create table public.raeume (
  id           uuid primary key default gen_random_uuid(),
  projekt_id   uuid not null references public.projekte(id) on delete cascade,
  name         text not null default '',
  geschoss     text not null default '',
  laenge       numeric(8,2),
  breite       numeric(8,2),
  hoehe        numeric(8,2),
  wandstaerke  numeric(6,1),
  fenster      text not null default '',
  tueren       text not null default '',
  boden        text not null default '',
  bemerkung    text not null default '',
  sortierung   integer not null default 0,
  erstellt_am  timestamptz not null default now(),
  geaendert_am timestamptz not null default now()
);
create index on public.raeume (projekt_id);
create trigger trg_raeume_geaendert before update on public.raeume
  for each row execute function public.geaendert_am_setzen();

alter table public.raeume enable row level security;
create policy raeume_lesen on public.raeume
  for select to authenticated using (public.ist_mitglied(projekt_id));
create policy raeume_schreiben on public.raeume
  for all to authenticated
  using (public.kann_bearbeiten(projekt_id))
  with check (public.kann_bearbeiten(projekt_id));

do $$
declare t text;
begin
  foreach t in array array['checkliste','raeume'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
