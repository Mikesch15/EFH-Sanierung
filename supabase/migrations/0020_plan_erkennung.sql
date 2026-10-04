-- Räume aus dem Planbild ausmessen statt Wandlängen eintippen.
--
-- Die App erkennt im hochgeladenen Plan die Wände (dunkle Linien) und füllt
-- beim Antippen den Raum bis an seine Wände aus. Daraus kommen Umriss, Fläche
-- und Wandlängen – für jede Form. Gemessen wird mit dem Laser nur noch eine
-- Wand je Plan: Daraus ergibt sich der Massstab (Pixel pro Meter), und alle
-- übrigen Räume sind gerechnet. Jede weitere Lasermessung ist Kontrolle.

-- Massstab und Erkennungseinstellungen gehören zum Plan, nicht zum Raum.
alter table plaene
  add column if not exists px_pro_meter numeric(10, 4),
  add column if not exists schwelle smallint not null default 150,
  add column if not exists luecken smallint not null default 18,
  add column if not exists bild_breite integer,
  add column if not exists bild_hoehe integer;

comment on column plaene.px_pro_meter is
  'Massstab: Bildpunkte je Meter, aus einer gemessenen Wand bestimmt';
comment on column plaene.schwelle is 'Helligkeit, ab der ein Bildpunkt als Wand gilt (0-255)';
comment on column plaene.luecken is 'Radius in Bildpunkten, mit dem Türöffnungen überbrückt werden';
comment on column plaene.bild_breite is 'Grösse des Rechenrasters, auf das sich der Massstab bezieht';

-- Umriss des erkannten Raums, relativ zum Bild (0 bis 1), damit er auf jedem
-- Gerät passt: [[x, y], …]. wand_masse hält je Umrisskante das mit dem Laser
-- gemessene Mass, falls eines erfasst wurde: [{"kante": 0, "laenge": 4.21}, …]
alter table raeume
  add column if not exists umriss jsonb not null default '[]'::jsonb,
  add column if not exists wand_masse jsonb not null default '[]'::jsonb;

comment on column raeume.umriss is 'erkannter Raumumriss, Punkte relativ zum Planbild (0-1)';
comment on column raeume.wand_masse is 'mit dem Laser gemessene Wandlängen je Umrisskante';

-- waende (eingetippte Wandlängen) bleibt als Herkunft bestehen, wird aber von
-- der App nicht mehr geschrieben.
