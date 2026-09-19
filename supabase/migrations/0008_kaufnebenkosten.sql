-- Kaufnebenkosten (Notariat, Handänderungssteuer, Grundbuch, Schätzung …)
-- gehören zum Erwerb, nicht zur Sanierung. Sie stehen deshalb neben dem
-- Kaufpreis und verkleinern wie dieser den Sanierungsrahmen:
--   Sanierungsrahmen = Gesamtbudget − Kaufpreis − Kaufnebenkosten
alter table public.projekte
  add column kaufnebenkosten numeric(12,2) not null default 0;

comment on column public.projekte.kaufnebenkosten is
  'Einmalige Nebenkosten des Kaufs, z.B. Notariat, Handänderungssteuer, Grundbuch.';
