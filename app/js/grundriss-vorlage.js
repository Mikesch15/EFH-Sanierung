// Die drei Geschosse aus den Verkaufsunterlagen (Tulpenweg 37).
//
// Übernommen sind Raumnamen und Flächen; die Masse breite/tiefe sind daraus und
// aus den Proportionen des Plans abgeleitet – Startwerte, bis gemessen ist.
// In den Unterlagen steht ausdrücklich: "Die Fläche dient nur als Richtwert; sie
// stellt keine zugesicherte Eigenschaft des Objekts dar." Genau deshalb der Plan
// hier: beim nächsten Besuch nachmessen und die eigenen Werte eintragen.
//
// Aufbau: Jedes Geschoss besteht aus waagrechten Bändern (von oben nach unten),
// in denen die Räume nebeneinander liegen. Das ist keine Architektenzeichnung,
// sondern eine Skizze, die immer sauber aufgeht – auch wenn die gemessenen Masse
// vom Plan abweichen.

export const GESCHOSSE = [
  {
    name: "OG",
    titel: "Obergeschoss",
    baender: [
      [
        { name: "Ankleidezimmer", flaeche: 4.85, breite: 2.05, tiefe: 2.37 },
        { name: "Badezimmer OG", flaeche: 2.80, breite: 1.18, tiefe: 2.37 },
        { name: "Zimmer Nord (OG)", flaeche: 11.38, breite: 3.10, tiefe: 3.67 },
      ],
      [
        { name: "Treppe OG", flaeche: 1.41, breite: 1.00, tiefe: 1.41 },
        { name: "Büro", flaeche: 12.55, breite: 3.23, tiefe: 3.89 },
        { name: "Zimmer Süd (OG)", flaeche: 12.25, breite: 3.10, tiefe: 3.95 },
      ],
    ],
  },
  {
    name: "EG",
    titel: "Erdgeschoss",
    baender: [
      [
        { name: "Küche", flaeche: 6.16, breite: 2.60, tiefe: 2.37 },
        { name: "Badezimmer EG", flaeche: 3.69, breite: 1.55, tiefe: 2.38 },
        { name: "Zimmer Nord (EG)", flaeche: 13.98, breite: 3.80, tiefe: 3.68 },
      ],
      [
        { name: "Treppe EG", flaeche: 1.35, breite: 1.00, tiefe: 1.35 },
        { name: "Gang EG", flaeche: 1.48, breite: 1.10, tiefe: 1.35 },
      ],
      [
        { name: "Eingang", flaeche: 1.31, breite: 1.30, tiefe: 1.00 },
        { name: "Esszimmer", flaeche: 10.26, breite: 2.85, tiefe: 3.60 },
        { name: "Wohnzimmer", flaeche: 13.76, breite: 3.80, tiefe: 3.62 },
      ],
    ],
  },
  {
    name: "UG",
    titel: "Untergeschoss",
    baender: [
      [
        { name: "Waschküche", flaeche: 13.50, breite: 3.60, tiefe: 3.75 },
        { name: "Raum (UG)", flaeche: 24.15, breite: 4.60, tiefe: 5.25 },
      ],
      [
        { name: "Treppe UG", flaeche: 0.87, breite: 0.90, tiefe: 0.97 },
        { name: "Gang UG", flaeche: 7.92, breite: 2.90, tiefe: 2.73 },
        { name: "Abstellraum Kellerhals", flaeche: 3.33, breite: 1.40, tiefe: 2.38 },
      ],
      [
        { name: "Abstellraum", flaeche: 4.02, breite: 2.10, tiefe: 1.91 },
      ],
    ],
  },
];

/** Alle Räume der Vorlage als flache Liste, bereit zum Anlegen. */
export function grundrissRaeume() {
  const alle = [];
  GESCHOSSE.forEach((geschoss) => {
    geschoss.baender.forEach((band, bandNr) => {
      band.forEach((raum, stelle) => {
        alle.push({
          name: raum.name,
          geschoss: geschoss.name,
          flaeche_plan: raum.flaeche,
          soll_breite: raum.breite,
          soll_tiefe: raum.tiefe,
          plan_band: bandNr + 1,
          plan_sort: stelle,
          sortierung: alle.length,
        });
      });
    });
  });
  return alle;
}

export const PLAN_HINWEIS =
  "Flächen aus den Verkaufsunterlagen – dort ausdrücklich nur als Richtwert bezeichnet. " +
  "Die Skizze ist massstäblich, aber kein Architektenplan: Räume stehen in waagrechten " +
  "Bändern nebeneinander. Sobald ein Raum gemessen ist, zeichnet sie mit Ihren Massen.";
