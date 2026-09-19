-- Auswertungen (erben die Zugriffsrechte des Aufrufers)

create view public.v_offerte_summen with (security_invoker = true) as
select o.id as offerte_id,
       o.projekt_id,
       coalesce(sum(p.zeilentotal), 0)                                        as netto,
       round(coalesce(sum(p.zeilentotal), 0) * o.mwst_satz / 100, 2)          as mwst,
       round(coalesce(sum(p.zeilentotal), 0) * (1 + o.mwst_satz / 100), 2)    as total
from public.offerten o
left join public.offert_positionen p on p.offerte_id = o.id
group by o.id, o.projekt_id, o.mwst_satz;

create view public.v_kostenvergleich with (security_invoker = true) as
with off as (
  select o.projekt_id, o.budgetposition_id, sum(s.total) as offerte
  from public.offerten o
  join public.v_offerte_summen s on s.offerte_id = o.id
  where o.status <> 'Abgelehnt'
  group by o.projekt_id, o.budgetposition_id
),
bel as (
  select b.projekt_id, b.budgetposition_id,
         sum(b.brutto)                                        as rechnung,
         sum(b.brutto) filter (where b.bezahlt)               as bezahlt
  from public.belege b
  group by b.projekt_id, b.budgetposition_id
)
select bp.projekt_id,
       bp.id                              as budgetposition_id,
       bp.kategorie,
       bp.betrag                          as budget,
       coalesce(off.offerte, 0)           as offerte,
       coalesce(bel.rechnung, 0)          as rechnung,
       coalesce(bel.bezahlt, 0)           as bezahlt,
       case when coalesce(bel.rechnung, 0) > 0
            then coalesce(bel.rechnung, 0) else coalesce(off.offerte, 0) end as ist,
       bp.betrag - case when coalesce(bel.rechnung, 0) > 0
            then coalesce(bel.rechnung, 0) else coalesce(off.offerte, 0) end as differenz
from public.budgetpositionen bp
left join off on off.budgetposition_id = bp.id
left join bel on bel.budgetposition_id = bp.id;

-- Dateiablage: ein privater Bucket, Pfad = <projekt_id>/<bereich>/<datei>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('projektdateien', 'projektdateien', false, 26214400,
        array['application/pdf','image/jpeg','image/png','image/heic','image/webp'])
on conflict (id) do nothing;

create policy dateien_lesen on storage.objects
  for select to authenticated
  using (bucket_id = 'projektdateien'
         and public.ist_mitglied(((storage.foldername(name))[1])::uuid));

create policy dateien_hochladen on storage.objects
  for insert to authenticated
  with check (bucket_id = 'projektdateien'
              and public.kann_bearbeiten(((storage.foldername(name))[1])::uuid));

create policy dateien_aendern on storage.objects
  for update to authenticated
  using (bucket_id = 'projektdateien'
         and public.kann_bearbeiten(((storage.foldername(name))[1])::uuid));

create policy dateien_loeschen on storage.objects
  for delete to authenticated
  using (bucket_id = 'projektdateien'
         and public.kann_bearbeiten(((storage.foldername(name))[1])::uuid));
