// Die drei Geschosse aus den Verkaufsunterlagen (Tulpenweg 37), massstäblich
// nachgezeichnet.
//
// Jeder Raum hat feste Koordinaten in Metern: x/y = linke obere Ecke, b/t =
// Breite und Tiefe. Nullpunkt ist die obere linke Ecke des Geschosses, die
// Blickrichtung entspricht den Plänen der Verkaufsdokumentation.
//
// Die Rechtecke sind so gewählt, dass die Fläche mit der ausgewiesenen
// übereinstimmt (Abweichung unter 0.02 m²) UND die Lage zueinander stimmt: Was im
// Plan links oben liegt, liegt hier links oben. Zwischenräume sind Wände, der
// Treppenlauf und Schächte – sie gehören bewusst keinem Raum.
//
// Die Zeichnung verändert sich NICHT, wenn gemessen wird. Ein Grundriss, der sich
// bei jeder Messung verzieht, ist nicht wiederzuerkennen; gemessene Masse stehen
// stattdessen im Raum und als Abweichung zur Planfläche.

export const GESCHOSSE = [
  {
    name: "OG",
    titel: "Obergeschoss",
    breite: 8.00,
    tiefe: 7.00,
    raeume: [
      { name: "Ankleidezimmer",   flaeche: 4.85,  x: 0.00, y: 0.00, b: 2.05, t: 2.37 },
      { name: "Badezimmer OG",    flaeche: 2.80,  x: 2.25, y: 0.00, b: 1.18, t: 2.37 },
      { name: "Zimmer Nord (OG)", flaeche: 11.38, x: 4.25, y: 0.00, b: 3.75, t: 3.03 },
      { name: "Treppe OG",        flaeche: 1.41,  x: 0.00, y: 2.57, b: 0.95, t: 1.48 },
      { name: "Büro",             flaeche: 12.55, x: 1.15, y: 2.57, b: 2.90, t: 4.33 },
      { name: "Zimmer Süd (OG)",  flaeche: 12.25, x: 4.25, y: 3.23, b: 3.75, t: 3.27 },
    ],
  },
  {
    name: "EG",
    titel: "Erdgeschoss",
    breite: 8.00,
    tiefe: 7.65,
    raeume: [
      { name: "Küche",            flaeche: 6.16,  x: 0.00, y: 0.00, b: 2.55, t: 2.42 },
      { name: "Badezimmer EG",    flaeche: 3.69,  x: 2.75, y: 0.00, b: 1.50, t: 2.46 },
      { name: "Zimmer Nord (EG)", flaeche: 13.98, x: 4.25, y: 0.00, b: 3.75, t: 3.73 },
      { name: "Treppe EG",        flaeche: 1.35,  x: 0.00, y: 2.62, b: 0.95, t: 1.42 },
      { name: "Gang EG",          flaeche: 1.48,  x: 2.75, y: 2.66, b: 1.29, t: 1.15 },
      { name: "Esszimmer",        flaeche: 10.26, x: 1.15, y: 4.01, b: 2.85, t: 3.60 },
      { name: "Wohnzimmer",       flaeche: 13.76, x: 4.25, y: 3.93, b: 3.75, t: 3.67 },
      { name: "Eingang",          flaeche: 1.31,  x: 0.00, y: 6.30, b: 1.00, t: 1.31 },
    ],
  },
  {
    name: "UG",
    titel: "Untergeschoss",
    breite: 8.00,
    tiefe: 8.80,
    raeume: [
      { name: "Waschküche",              flaeche: 13.50, x: 0.00, y: 0.00, b: 3.60, t: 3.75 },
      { name: "Raum (UG)",               flaeche: 24.15, x: 3.80, y: 0.00, b: 4.20, t: 5.75 },
      { name: "Treppe UG",               flaeche: 0.87,  x: 0.00, y: 3.95, b: 0.90, t: 0.97 },
      { name: "Gang UG",                 flaeche: 7.92,  x: 1.10, y: 3.95, b: 2.70, t: 2.93 },
      { name: "Abstellraum",             flaeche: 4.02,  x: 1.10, y: 6.88, b: 2.10, t: 1.91 },
      { name: "Abstellraum Kellerhals",  flaeche: 3.33,  x: 3.95, y: 5.95, b: 1.40, t: 2.38 },
    ],
  },
];

/** Alle Räume der drei Geschosse als flache Liste, bereit zum Anlegen. */
export function grundrissRaeume() {
  const alle = [];
  GESCHOSSE.forEach((geschoss) => {
    geschoss.raeume.forEach((raum) => {
      alle.push({
        name: raum.name,
        geschoss: geschoss.name,
        flaeche_plan: raum.flaeche,
        soll_breite: raum.b,
        soll_tiefe: raum.t,
        plan_x: raum.x,
        plan_y: raum.y,
        plan_w: raum.b,
        plan_h: raum.t,
        sortierung: alle.length,
      });
    });
  });
  return alle;
}

export const PLAN_HINWEIS =
  "Massstäblich nach den Verkaufsunterlagen gezeichnet; dort sind die Flächen " +
  "ausdrücklich nur als Richtwert bezeichnet. Die Zeichnung bleibt beim Messen stehen – " +
  "Ihre Masse erscheinen im Raum, und je Geschoss steht die Abweichung zur Planfläche. " +
  "Freiflächen zwischen den Räumen sind Wände, Treppenlauf und Schächte.";
