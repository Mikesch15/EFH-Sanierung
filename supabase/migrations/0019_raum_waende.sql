-- Räume als Umriss statt als Rechteck.
--
-- Länge × Breite reicht nur für rechtwinklige Räume. Gemessen wird deshalb
-- Wand für Wand rundum: je Wand die Länge und der Winkel zur nächsten Wand
-- (90° = rechtwinklig, 270° = einspringende Ecke, 135°/225° = Schräge).
-- Daraus rechnet die App Fläche und Umfang und zeigt, ob der Umriss aufgeht.
--
-- Die Wände stehen als JSON in einer Spalte, nicht in einer eigenen Tabelle:
-- Sie werden immer zusammen mit dem Raum geladen, gespeichert und gelöscht,
-- nie einzeln abgefragt. Form: [{"laenge": 4.2, "winkel": 90, "bezeichnung": "Nord"}, …]
alter table raeume
  add column if not exists waende jsonb not null default '[]'::jsonb,
  add column if not exists flaeche numeric(8, 2),
  add column if not exists umfang numeric(8, 2);

comment on column raeume.waende is
  'Umriss: je Wand laenge (m), winkel (Innenwinkel zur nächsten Wand in Grad), bezeichnung';
comment on column raeume.flaeche is 'aus dem Umriss gerechnet (m²)';
comment on column raeume.umfang is 'Summe der Wandlängen (m)';

-- Bestehende Räume: aus Länge und Breite wird ein rechtwinkliger Umriss mit
-- vier Wänden. Masse und Fläche bleiben damit erhalten, und es gibt nur noch
-- einen Weg, einen Raum zu beschreiben.
update raeume
set waende = jsonb_build_array(
      jsonb_build_object('laenge', breite, 'winkel', 90, 'bezeichnung', ''),
      jsonb_build_object('laenge', laenge, 'winkel', 90, 'bezeichnung', ''),
      jsonb_build_object('laenge', breite, 'winkel', 90, 'bezeichnung', ''),
      jsonb_build_object('laenge', laenge, 'winkel', 90, 'bezeichnung', '')
    ),
    flaeche = round(laenge * breite, 2),
    umfang = round(2 * (laenge + breite), 2)
where laenge is not null and breite is not null and waende = '[]'::jsonb;

-- Die Spalten laenge und breite bleiben als Herkunft stehen; die App rechnet
-- ab hier ausschliesslich mit waende.
