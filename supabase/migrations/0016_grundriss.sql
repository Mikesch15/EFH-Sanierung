-- Schema-Grundriss: Räume bekommen ihren Platz im Plan.
--
-- Grundlage sind die Verkaufsunterlagen (drei Geschosse mit Flächenangaben).
-- Daraus entsteht kein Architektenplan, sondern eine massstäbliche Skizze: Jedes
-- Geschoss besteht aus waagrechten Bändern, in denen die Räume nebeneinander
-- liegen. Das bleibt immer sauber zeichenbar – auch wenn die gemessenen Masse
-- von den Planangaben abweichen, und genau das ist der Zweck.
--
-- soll_breite/soll_tiefe sind die aus dem Verkaufsplan abgeleiteten Masse. Sobald
-- breite/laenge gemessen sind, zeichnet der Plan mit den gemessenen Werten – so
-- "wächst" der Grundriss beim Vermessen in die richtige Form.

alter table public.raeume
  add column if not exists plan_band    integer,
  add column if not exists plan_sort    integer not null default 0,
  add column if not exists soll_breite  numeric(8,2),
  add column if not exists soll_tiefe   numeric(8,2),
  add column if not exists flaeche_plan numeric(8,2);

comment on column public.raeume.plan_band is
  'Waagrechtes Band im Schema-Grundriss (1 = oben). Leer = nicht im Plan gezeichnet.';
comment on column public.raeume.flaeche_plan is
  'Fläche gemäss Verkaufsunterlagen, zum Vergleich mit dem gemessenen Wert.';
