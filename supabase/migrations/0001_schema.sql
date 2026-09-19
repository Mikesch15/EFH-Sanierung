-- Tulpenweg-Sanierung: Grundschema
-- Mehrbenutzerfähig über Projekte + Mitglieder, Beträge in CHF.

create or replace function public.geaendert_am_setzen()
returns trigger language plpgsql set search_path = public as $$
begin
  new.geaendert_am := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- Projekte
create table public.projekte (
  id            uuid primary key default gen_random_uuid(),
  name          text not null default '',
  adresse       text not null default '',
  kaufpreis     numeric(12,2) not null default 0,
  gesamtbudget  numeric(12,2) not null default 0,
  waehrung      text not null default 'CHF',
  erstellt_von  uuid not null default auth.uid() references auth.users(id) on delete restrict,
  erstellt_am   timestamptz not null default now(),
  geaendert_am  timestamptz not null default now()
);

create table public.projekt_mitglieder (
  projekt_id   uuid not null references public.projekte(id) on delete cascade,
  benutzer_id  uuid not null references auth.users(id) on delete cascade,
  rolle        text not null default 'bearbeiter'
               check (rolle in ('eigentuemer','bearbeiter','leser')),
  erstellt_am  timestamptz not null default now(),
  primary key (projekt_id, benutzer_id)
);
create index on public.projekt_mitglieder (benutzer_id);

-- Ersteller wird automatisch Eigentümer
create or replace function public.projekt_eigentuemer_setzen()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.projekt_mitglieder (projekt_id, benutzer_id, rolle)
  values (new.id, coalesce(new.erstellt_von, auth.uid()), 'eigentuemer')
  on conflict do nothing;
  return new;
end;
$$;
create trigger trg_projekt_eigentuemer
  after insert on public.projekte
  for each row execute function public.projekt_eigentuemer_setzen();

create trigger trg_projekte_geaendert
  before update on public.projekte
  for each row execute function public.geaendert_am_setzen();

-- ---------------------------------------------------------- Budgetpositionen
create table public.budgetpositionen (
  id           uuid primary key default gen_random_uuid(),
  projekt_id   uuid not null references public.projekte(id) on delete cascade,
  kategorie    text not null,
  betrag       numeric(12,2) not null default 0,
  bemerkung    text not null default '',
  sortierung   integer not null default 0,
  erstellt_am  timestamptz not null default now(),
  geaendert_am timestamptz not null default now()
);
create index on public.budgetpositionen (projekt_id);
create trigger trg_budget_geaendert before update on public.budgetpositionen
  for each row execute function public.geaendert_am_setzen();

-- ------------------------------------------------------------------ Offerten
create table public.offerten (
  id                 uuid primary key default gen_random_uuid(),
  projekt_id         uuid not null references public.projekte(id) on delete cascade,
  budgetposition_id  uuid references public.budgetpositionen(id) on delete set null,
  lieferant          text not null default '',
  nummer             text not null default '',
  datum              date,
  status             text not null default 'Entwurf'
                     check (status in ('Entwurf','Erfasst','Verglichen','Beauftragt','Abgelehnt')),
  mwst_satz          numeric(5,2) not null default 8.1,
  bemerkung          text not null default '',
  datei_pfad         text,
  datei_name         text,
  ki_erkannt         boolean not null default false,
  ki_geprueft        boolean not null default false,
  erstellt_am        timestamptz not null default now(),
  geaendert_am       timestamptz not null default now()
);
create index on public.offerten (projekt_id);
create index on public.offerten (budgetposition_id);
create trigger trg_offerten_geaendert before update on public.offerten
  for each row execute function public.geaendert_am_setzen();

create table public.offert_positionen (
  id           uuid primary key default gen_random_uuid(),
  offerte_id   uuid not null references public.offerten(id) on delete cascade,
  nr           text not null default '',
  beschreibung text not null default '',
  menge        numeric(12,3) not null default 1,
  einheit      text not null default 'pauschal',
  einzelpreis  numeric(12,2) not null default 0,
  abschnitt    text not null default '',
  sortierung   integer not null default 0,
  zeilentotal  numeric(14,2) generated always as (round(menge * einzelpreis, 2)) stored
);
create index on public.offert_positionen (offerte_id);

-- ------------------------------------------------------------------- Belege
create table public.belege (
  id                uuid primary key default gen_random_uuid(),
  projekt_id        uuid not null references public.projekte(id) on delete cascade,
  budgetposition_id uuid references public.budgetpositionen(id) on delete set null,
  offerte_id        uuid references public.offerten(id) on delete set null,
  lieferant         text not null default '',
  nummer            text not null default '',
  datum             date,
  netto             numeric(12,2) not null default 0,
  mwst              numeric(12,2) not null default 0,
  brutto            numeric(12,2) not null default 0,
  bezahlt           boolean not null default false,
  zahlungsdatum     date,
  bemerkung         text not null default '',
  datei_pfad        text,
  datei_name        text,
  ki_erkannt        boolean not null default false,
  ki_geprueft       boolean not null default false,
  erstellt_am       timestamptz not null default now(),
  geaendert_am      timestamptz not null default now()
);
create index on public.belege (projekt_id);
create index on public.belege (offerte_id);
create trigger trg_belege_geaendert before update on public.belege
  for each row execute function public.geaendert_am_setzen();

-- ---------------------------------------------------------------- Dokumente
create table public.dokumente (
  id                uuid primary key default gen_random_uuid(),
  projekt_id        uuid not null references public.projekte(id) on delete cascade,
  budgetposition_id uuid references public.budgetpositionen(id) on delete set null,
  dateiname         text not null default '',
  typ               text not null default 'Sonstiges',
  datum             date,
  bemerkung         text not null default '',
  datei_pfad        text,
  mime_typ          text,
  groesse           bigint,
  erstellt_am       timestamptz not null default now(),
  geaendert_am      timestamptz not null default now()
);
create index on public.dokumente (projekt_id);
create trigger trg_dokumente_geaendert before update on public.dokumente
  for each row execute function public.geaendert_am_setzen();
