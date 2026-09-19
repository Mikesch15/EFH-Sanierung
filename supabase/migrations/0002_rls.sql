-- Zugriffsschutz: nur Mitglieder eines Projekts sehen dessen Daten.

create or replace function public.ist_mitglied(p_projekt uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projekt_mitglieder m
    where m.projekt_id = p_projekt and m.benutzer_id = auth.uid()
  );
$$;

create or replace function public.kann_bearbeiten(p_projekt uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projekt_mitglieder m
    where m.projekt_id = p_projekt and m.benutzer_id = auth.uid()
      and m.rolle in ('eigentuemer','bearbeiter')
  );
$$;

create or replace function public.ist_eigentuemer(p_projekt uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projekt_mitglieder m
    where m.projekt_id = p_projekt and m.benutzer_id = auth.uid() and m.rolle = 'eigentuemer'
  );
$$;

alter table public.projekte            enable row level security;
alter table public.projekt_mitglieder  enable row level security;
alter table public.budgetpositionen    enable row level security;
alter table public.offerten            enable row level security;
alter table public.offert_positionen   enable row level security;
alter table public.belege              enable row level security;
alter table public.dokumente           enable row level security;

-- Projekte
create policy projekte_lesen on public.projekte
  for select to authenticated using (public.ist_mitglied(id));
create policy projekte_anlegen on public.projekte
  for insert to authenticated with check (erstellt_von = auth.uid());
create policy projekte_aendern on public.projekte
  for update to authenticated using (public.kann_bearbeiten(id)) with check (public.kann_bearbeiten(id));
create policy projekte_loeschen on public.projekte
  for delete to authenticated using (public.ist_eigentuemer(id));

-- Mitglieder
create policy mitglieder_lesen on public.projekt_mitglieder
  for select to authenticated using (public.ist_mitglied(projekt_id));
create policy mitglieder_verwalten on public.projekt_mitglieder
  for insert to authenticated with check (public.ist_eigentuemer(projekt_id));
create policy mitglieder_aendern on public.projekt_mitglieder
  for update to authenticated using (public.ist_eigentuemer(projekt_id)) with check (public.ist_eigentuemer(projekt_id));
create policy mitglieder_entfernen on public.projekt_mitglieder
  for delete to authenticated using (public.ist_eigentuemer(projekt_id) or benutzer_id = auth.uid());

-- Budget, Offerten, Belege, Dokumente: lesen für Mitglieder, schreiben für Bearbeiter
create policy budget_lesen on public.budgetpositionen
  for select to authenticated using (public.ist_mitglied(projekt_id));
create policy budget_schreiben on public.budgetpositionen
  for all to authenticated using (public.kann_bearbeiten(projekt_id)) with check (public.kann_bearbeiten(projekt_id));

create policy offerten_lesen on public.offerten
  for select to authenticated using (public.ist_mitglied(projekt_id));
create policy offerten_schreiben on public.offerten
  for all to authenticated using (public.kann_bearbeiten(projekt_id)) with check (public.kann_bearbeiten(projekt_id));

create policy positionen_lesen on public.offert_positionen
  for select to authenticated using (exists (
    select 1 from public.offerten o where o.id = offerte_id and public.ist_mitglied(o.projekt_id)));
create policy positionen_schreiben on public.offert_positionen
  for all to authenticated using (exists (
    select 1 from public.offerten o where o.id = offerte_id and public.kann_bearbeiten(o.projekt_id)))
  with check (exists (
    select 1 from public.offerten o where o.id = offerte_id and public.kann_bearbeiten(o.projekt_id)));

create policy belege_lesen on public.belege
  for select to authenticated using (public.ist_mitglied(projekt_id));
create policy belege_schreiben on public.belege
  for all to authenticated using (public.kann_bearbeiten(projekt_id)) with check (public.kann_bearbeiten(projekt_id));

create policy dokumente_lesen on public.dokumente
  for select to authenticated using (public.ist_mitglied(projekt_id));
create policy dokumente_schreiben on public.dokumente
  for all to authenticated using (public.kann_bearbeiten(projekt_id)) with check (public.kann_bearbeiten(projekt_id));
