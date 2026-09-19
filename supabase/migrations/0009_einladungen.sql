-- Einladungen per Link.
--
-- Bisher musste eine Person bereits registriert sein, bevor der Eigentümer sie
-- hinzufügen konnte. Jetzt erzeugt der Eigentümer einen Link mit einem geheimen
-- Token. Wer den Link öffnet, registriert sich (oder meldet sich an) und wird
-- damit automatisch Mitglied – in der Rolle, die in der Einladung steht.
--
-- Der Token ist das Geheimnis (256 Bit). Er steht nur im Link, nicht in der App
-- und nicht in einer Liste, die andere lesen könnten.

create table public.einladungen (
  id             uuid primary key default gen_random_uuid(),
  projekt_id     uuid not null references public.projekte(id) on delete cascade,
  email          text not null default '',          -- nur Merkhilfe für den Eigentümer
  rolle          text not null default 'bearbeiter'
                 check (rolle in ('bearbeiter','leser','handwerker')),
  token          text not null unique
                 default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  erstellt_von   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  erstellt_am    timestamptz not null default now(),
  gueltig_bis    timestamptz not null default now() + interval '30 days',
  eingeloest_am  timestamptz,
  eingeloest_von uuid references auth.users(id) on delete set null
);
create index on public.einladungen (projekt_id);

alter table public.einladungen enable row level security;

-- Nur der Eigentümer sieht und verwaltet die Einladungen seines Projekts.
-- Die eingeladene Person braucht keinen Lesezugriff: Sie nutzt die Funktionen unten.
create policy einladungen_lesen on public.einladungen
  for select to authenticated using (public.ist_eigentuemer(projekt_id));
create policy einladungen_anlegen on public.einladungen
  for insert to authenticated
  with check (public.ist_eigentuemer(projekt_id) and erstellt_von = auth.uid());
create policy einladungen_loeschen on public.einladungen
  for delete to authenticated using (public.ist_eigentuemer(projekt_id));

-- Zeigt vor der Anmeldung, wozu eingeladen wurde. Gibt nur Projektname, Rolle und
-- Gültigkeit preis – und nur, wer den Token kennt.
create or replace function public.einladung_info(p_token text)
returns table (projekt_name text, rolle text, gueltig boolean)
language sql security definer stable set search_path = public as $$
  select p.name,
         e.rolle,
         (e.eingeloest_am is null and e.gueltig_bis > now())
  from public.einladungen e
  join public.projekte p on p.id = e.projekt_id
  where e.token = p_token;
$$;

-- Löst die Einladung für die angemeldete Person ein und macht sie zum Mitglied.
create or replace function public.einladung_einloesen(p_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  e public.einladungen%rowtype;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;

  select * into e from public.einladungen where token = p_token for update;
  if not found then
    raise exception 'Diese Einladung gibt es nicht (Link unvollständig?)';
  end if;

  -- Bereits eingelöst: vom selben Konto ist das kein Fehler.
  if e.eingeloest_am is not null and e.eingeloest_von is distinct from auth.uid() then
    raise exception 'Diese Einladung wurde bereits verwendet';
  end if;
  if e.gueltig_bis < now() then
    raise exception 'Diese Einladung ist abgelaufen';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  insert into public.projekt_mitglieder (projekt_id, benutzer_id, rolle, email)
  values (e.projekt_id, auth.uid(), e.rolle, coalesce(v_email, e.email))
  on conflict (projekt_id, benutzer_id) do update set rolle = excluded.rolle;

  update public.einladungen
     set eingeloest_am = coalesce(eingeloest_am, now()), eingeloest_von = auth.uid()
   where id = e.id;

  return e.projekt_id;
end;
$$;

revoke all on function public.einladung_info(text)      from public;
revoke all on function public.einladung_einloesen(text)  from public, anon;
grant execute on function public.einladung_info(text)     to anon, authenticated;
grant execute on function public.einladung_einloesen(text) to authenticated;
