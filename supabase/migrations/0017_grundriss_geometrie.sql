-- Grundriss mit echter Geometrie statt Bändern.
--
-- Der erste Versuch ordnete die Räume in waagrechten Bändern an und liess sie mit
-- den gemessenen Massen wachsen. Ergebnis: Man erkannte die Räume nicht wieder.
-- Ein Plan nützt nur, wenn er aussieht wie das Haus.
--
-- Darum jetzt feste Koordinaten je Raum (Meter, Nullpunkt oben links im Geschoss),
-- abgenommen von den Verkaufsplänen. Die Zeichnung bleibt stehen; gemessene Masse
-- erscheinen als Beschriftung im Raum und als Abweichung zur Planfläche.

alter table public.raeume
  add column if not exists plan_x numeric(8,2),
  add column if not exists plan_y numeric(8,2),
  add column if not exists plan_w numeric(8,2),
  add column if not exists plan_h numeric(8,2);

comment on column public.raeume.plan_x is
  'Lage im Geschossplan in Metern, Nullpunkt oben links. Leer = nicht im Plan gezeichnet.';
