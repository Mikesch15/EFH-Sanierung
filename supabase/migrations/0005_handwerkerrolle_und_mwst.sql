-- Phase 2 (Web-App): Handwerker-Rolle mit eingeschränkter Sicht,
-- MWST-Satz optional, Hilfsfunktion für "Mitglied per E-Mail hinzufügen".
-- Bestehende Migrationen 0001-0004 bleiben unverändert.

-- ---------------------------------------------------------------- Rollen
-- Handwerker sind KEINE normalen Mitglieder: sie sehen nur die ihnen
-- zugewiesene Offerte, nicht das Projekt, das Budget oder die Belege.
alter table public.projekt_mitglieder drop constraint projekt_mitglieder_rolle_check;
alter table public.projekt_mitglieder add constraint projekt_mitglieder_rolle_check
  check (rolle in ('eigentuemer','bearbeiter','leser','handwerker'));

-- ist_mitglied wird für die bestehenden Regeln (Projekt, Budget, Belege,
-- Dokumente, Auswertungen) verwendet und darf Handwerker NICHT einschliessen.
create or replace function public.ist_mitglied(p_projekt uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projekt_mitglieder m
    where m.projekt_id = p_projekt and m.benutzer_id = auth.uid()
      and m.rolle in ('eigentuemer','bearbeiter','leser')
  );
$$;
-- kann_bearbeiten und ist_eigentuemer prüfen ihre Rollen bereits direkt
-- und schliessen 'handwerker' damit automatisch aus.

-- ---------------------------------------------------------- Offerten: Zuweisung
alter table public.offerten add column handwerker_id uuid references auth.users(id) on delete set null;
create index on public.offerten (handwerker_id) where handwerker_id is not null;

create or replace function public.ist_handwerker_fuer_offerte(p_offerte uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.offerten o where o.id = p_offerte and o.handwerker_id = auth.uid()
  );
$$;

-- Handwerker dürfen die ihnen zugewiesene Offerte lesen und bearbeiten,
-- aber weder die Zuweisung, die Budgetkategorie noch das Projekt ändern.
create policy offerten_lesen_handwerker on public.offerten
  for select to authenticated using (handwerker_id = auth.uid());
create policy offerten_aendern_handwerker on public.offerten
  for update to authenticated using (handwerker_id = auth.uid()) with check (handwerker_id = auth.uid());

create or replace function public.offerten_handwerker_schutz()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.kann_bearbeiten(old.projekt_id) then
    new.projekt_id := old.projekt_id;
    new.budgetposition_id := old.budgetposition_id;
    new.handwerker_id := old.handwerker_id;
  end if;
  return new;
end;
$$;
create trigger trg_offerten_handwerker_schutz
  before update on public.offerten
  for each row execute function public.offerten_handwerker_schutz();

-- Positionen der zugewiesenen Offerte: volle Verwaltung durch den Handwerker
create policy positionen_handwerker on public.offert_positionen
  for all to authenticated
  using (public.ist_handwerker_fuer_offerte(offerte_id))
  with check (public.ist_handwerker_fuer_offerte(offerte_id));

-- ---------------------------------------------------------- Dateien: Handwerker
-- Eigener Pfad ausserhalb von <projekt_id>/offerten/…, damit der Handwerker
-- nur die Dateien seiner eigenen Offerte sehen kann:
-- <projekt_id>/handwerker/<offerte_id>/<datei>
create or replace function public.ist_handwerker_offerte_datei(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.offerten o
    where o.projekt_id::text = (storage.foldername(p_name))[1]
      and o.id::text = (storage.foldername(p_name))[3]
      and o.handwerker_id = auth.uid()
  );
$$;

create policy dateien_lesen_handwerker on storage.objects
  for select to authenticated
  using (bucket_id = 'projektdateien' and public.ist_handwerker_offerte_datei(name));
create policy dateien_hochladen_handwerker on storage.objects
  for insert to authenticated
  with check (bucket_id = 'projektdateien' and public.ist_handwerker_offerte_datei(name));

revoke all on function public.ist_handwerker_fuer_offerte(uuid)   from public, anon;
revoke all on function public.ist_handwerker_offerte_datei(text)  from public, anon;
grant execute on function public.ist_handwerker_fuer_offerte(uuid)  to authenticated;
grant execute on function public.ist_handwerker_offerte_datei(text) to authenticated;

-- ---------------------------------------------------------------- MWST optional
-- Manche Belege (z.B. private Käufe ohne MWST-Ausweis) haben keinen MWST-Betrag,
-- nicht einfach einen Betrag von null Franken. null bedeutet jetzt "keine Angabe".
alter table public.offerten alter column mwst_satz drop not null;
alter table public.belege    alter column mwst      drop not null;
alter table public.belege    alter column mwst      drop default;

-- ------------------------------------------------------- Offertpositionen ersetzen
-- Ersetzt alle Positionen einer Offerte in einem Vorgang (kein Zwischenzustand,
-- keine verwaisten Zeilen). security invoker: es gelten die normalen RLS-Regeln
-- der aufrufenden Person (Bearbeiter/Eigentümer oder der zugewiesene Handwerker).
create or replace function public.offerte_positionen_ersetzen(p_offerte_id uuid, p_positionen jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  delete from public.offert_positionen where offerte_id = p_offerte_id;
  insert into public.offert_positionen
    (offerte_id, nr, beschreibung, menge, einheit, einzelpreis, abschnitt, sortierung)
  select p_offerte_id,
         coalesce(x->>'nr', ''), coalesce(x->>'beschreibung', ''),
         coalesce((x->>'menge')::numeric, 1), coalesce(x->>'einheit', 'pauschal'),
         coalesce((x->>'einzelpreis')::numeric, 0), coalesce(x->>'abschnitt', ''),
         coalesce((x->>'sortierung')::int, (row_number() over ())::int)
  from jsonb_array_elements(coalesce(p_positionen, '[]'::jsonb)) as x;
end;
$$;
revoke all on function public.offerte_positionen_ersetzen(uuid, jsonb) from public, anon;
grant execute on function public.offerte_positionen_ersetzen(uuid, jsonb) to authenticated;

-- ------------------------------------------------------- Anzeige der Mitglieder
-- projekt_mitglieder enthält nur benutzer_id (uuid). Damit die Mitgliederliste
-- in der App ohne zusätzlichen Zugriff auf auth.users eine E-Mail-Adresse
-- anzeigen kann, wird sie beim Hinzufügen redundant abgelegt (nur Anzeige,
-- nicht für Zugriffsentscheidungen verwendet).
alter table public.projekt_mitglieder add column email text not null default '';

create or replace function public.projekt_eigentuemer_setzen()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.projekt_mitglieder (projekt_id, benutzer_id, rolle, email)
  values (new.id, coalesce(new.erstellt_von, auth.uid()), 'eigentuemer',
          coalesce((select email from auth.users where id = coalesce(new.erstellt_von, auth.uid())), ''))
  on conflict do nothing;
  return new;
end;
$$;

-- ------------------------------------------------------- Mitglied per E-Mail
-- Sucht die Benutzer-ID zu einer exakten E-Mail-Adresse. Gibt sonst keine
-- Benutzerdaten preis. Nur für angemeldete Benutzer, damit ein Eigentümer
-- eine zweite Person (die sich zuvor selbst registriert hat) anhand ihrer
-- E-Mail-Adresse zu projekt_mitglieder hinzufügen kann.
create or replace function public.benutzer_id_zu_email(p_email text)
returns uuid
language sql security definer stable set search_path = public as $$
  select id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
$$;
revoke all on function public.benutzer_id_zu_email(text) from public, anon;
grant execute on function public.benutzer_id_zu_email(text) to authenticated;
