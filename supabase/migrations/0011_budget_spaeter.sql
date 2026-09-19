-- Budgetpositionen: "zählt schon" oder "erst später"
--
-- Manche Positionen stehen zwar fest, sollen aber noch nicht in die Rechnung
-- einfliessen (zweite Etappe, Wunschliste, noch nicht entschieden). Die Spalte
-- entscheidet, ob der Budgetbetrag in den Summen mitgezählt wird. Bestehende
-- Positionen zählen wie bisher mit.

alter table public.budgetpositionen
  add column if not exists beruecksichtigt boolean not null default true;

comment on column public.budgetpositionen.beruecksichtigt is
  'true = Budgetbetrag zählt in die Summen. false = erst später einplanen, der Betrag bleibt aussen vor.';

-- Die Auswertung gibt die Kennzeichnung mit heraus, damit die App nicht raten muss.
-- Neue Spalte am Ende: die bestehenden Spalten bleiben in Name und Reihenfolge gleich.
create or replace view public.v_kostenvergleich with (security_invoker = true) as
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
            then coalesce(bel.rechnung, 0) else coalesce(off.offerte, 0) end as differenz,
       bp.beruecksichtigt                 as beruecksichtigt
from public.budgetpositionen bp
left join off on off.budgetposition_id = bp.id
left join bel on bel.budgetposition_id = bp.id;
