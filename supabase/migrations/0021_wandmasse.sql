-- Wandmasse direkt auf dem Plan.
--
-- Der entscheidende Punkt beim Vermessen ist nicht die Fläche, sondern: Welche
-- Wand hat welches Mass? Eine Liste «Wand 1 … Wand 6» beantwortet das nicht,
-- solange man am Plan nicht sieht, welche Wand gemeint ist.
--
-- Darum steht das Mass ab hier dort, wo es hingehört: an der Wand im Plan. Man
-- tippt die Wand an, gibt das Lasermass ein, und die App zeichnet eine
-- Masslinie mit der Zahl daneben – wie auf einem Bauplan. Jede Wand, die man
-- misst, ist danach im Plan beschriftet.
--
-- Die Lage ist auf die Bildgrösse bezogen (0 bis 1), damit sie auf jedem
-- Bildschirm und bei jeder Zoomstufe sitzt.

create table public.wandmasse (
  id           uuid primary key default gen_random_uuid(),
  projekt_id   uuid not null references public.projekte(id) on delete cascade,
  plan_id      uuid not null references public.plaene(id) on delete cascade,
  raum_id      uuid references public.raeume(id) on delete set null,
  bezeichnung  text not null default '',
  laenge       numeric(8,3),
  hoehe        numeric(8,3),
  art          text not null default 'Wand',
  bemerkung    text not null default '',
  x1           numeric(6,5) not null,
  y1           numeric(6,5) not null,
  x2           numeric(6,5) not null,
  y2           numeric(6,5) not null,
  erstellt_am  timestamptz not null default now(),
  geaendert_am timestamptz not null default now()
);
create index on public.wandmasse (projekt_id);
create index on public.wandmasse (plan_id);
create trigger trg_wandmasse_geaendert before update on public.wandmasse
  for each row execute function public.geaendert_am_setzen();

alter table public.wandmasse enable row level security;
create policy wandmasse_lesen on public.wandmasse
  for select to authenticated using (public.ist_mitglied(projekt_id));
create policy wandmasse_schreiben on public.wandmasse
  for all to authenticated
  using (public.kann_bearbeiten(projekt_id))
  with check (public.kann_bearbeiten(projekt_id));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wandmasse'
  ) then
    alter publication supabase_realtime add table public.wandmasse;
  end if;
end $$;
