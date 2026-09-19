-- Kaufnebenkosten einzeln aufschlüsseln statt als eine Summe.
--
-- Bisher stand in projekte.kaufnebenkosten ein Gesamtbetrag. Jetzt gibt es eine
-- Position je Kostenart (Notariat, Handänderungssteuer, Grundbuch …). Die Summe
-- der Positionen ersetzt den alten Einzelwert – eine einzige Quelle der Wahrheit.

create table public.kaufnebenkosten (
  id           uuid primary key default gen_random_uuid(),
  projekt_id   uuid not null references public.projekte(id) on delete cascade,
  bezeichnung  text not null default '',
  betrag       numeric(12,2) not null default 0,
  datum        date,
  bezahlt      boolean not null default false,
  bemerkung    text not null default '',
  sortierung   integer not null default 0,
  erstellt_am  timestamptz not null default now(),
  geaendert_am timestamptz not null default now()
);
create index on public.kaufnebenkosten (projekt_id);
create trigger trg_kaufnebenkosten_geaendert before update on public.kaufnebenkosten
  for each row execute function public.geaendert_am_setzen();

alter table public.kaufnebenkosten enable row level security;
create policy kaufnebenkosten_lesen on public.kaufnebenkosten
  for select to authenticated using (public.ist_mitglied(projekt_id));
create policy kaufnebenkosten_schreiben on public.kaufnebenkosten
  for all to authenticated
  using (public.kann_bearbeiten(projekt_id))
  with check (public.kann_bearbeiten(projekt_id));

-- Bereits erfasste Beträge als erste Position übernehmen, damit nichts verloren geht.
insert into public.kaufnebenkosten (projekt_id, bezeichnung, betrag, sortierung)
select id, 'Kaufnebenkosten (übernommen)', kaufnebenkosten, 0
from public.projekte
where kaufnebenkosten <> 0;

alter table public.projekte drop column kaufnebenkosten;
