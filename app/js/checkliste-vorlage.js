// Vorlage der Besichtigungs-Checkliste (Tulpenweg 37, Stand September 2026).
//
// Steht hier und nicht in der Datenbank: Jedes Projekt legt daraus einmal seine
// eigene Liste an und ändert sie danach frei. So bleibt die Vorlage eine Vorlage
// und die erfasste Liste gehört dem Projekt.
//
// Mitnehmen: Laser-Distanzmesser, Meterstab, Taschenlampe, Handy/Powerbank,
// Notizblock, Wasserwaage, kleiner Schraubendreher, optional Feuchtigkeitsmessgerät.

export const CHECKLISTE_VORLAGE = [
  {
    gruppe: "1. Grundmasse & Räume",
    punkte: [
      "Jeden Raum Länge × Breite messen",
      "Raumhöhe messen",
      "Wandstärken messen",
      "Türen: Breite/Höhe und Abstand zu Ecken",
      "Fenster: Breite/Höhe/Brüstung und Abstand zu Ecken",
      "Treppenbreite, Steigung und Auftritt",
      "Kellerhöhe",
      "Geschosshöhen",
    ],
  },
  {
    gruppe: "2. Böden & Decken",
    punkte: [
      "EG: Bodenbelag und Unterboden dokumentieren",
      "OG: Bodenbelag und Unterboden dokumentieren",
      "Balkenrichtung feststellen",
      "Wenn möglich: Balkenquerschnitt und Balkenabstand an Sondage messen",
      "Schüttung/Dämmung zwischen Balken feststellen",
      "Weiche/knarrende Stellen und Höhenunterschiede notieren",
      "Foto jeder Sondage mit Massstab",
    ],
  },
  {
    gruppe: "3. Tragende Wände",
    punkte: [
      "Jede Innenwand: Stärke + Material",
      "Prüfen, ob Wand im Geschoss darüber weiterläuft",
      "Prüfen, ob darunter im Keller eine Wand/Fundament liegt",
      "Balkenrichtung relativ zur Wand dokumentieren",
      "Küche/Wohnzimmer-Wand besonders genau aufnehmen",
      "Keine Wand ohne statische Prüfung abbrechen",
    ],
  },
  {
    gruppe: "4. Keller & Feuchtigkeit",
    punkte: [
      "Jede Kellerwand fotografieren",
      "Decke fotografieren",
      "Feuchte/Salzausblühungen/Schimmel",
      "Risse und Wasserflecken",
      "Kellerfenster/Lüftung",
      "Boden und Entwässerung",
      "Wasser-Hauptanschluss und Zähler",
      "Elektro-Hauptverteilung",
    ],
  },
  {
    gruppe: "5. Heizung / Wärmepumpe",
    punkte: [
      "Heizkessel: Typenschild, Leistung, Baujahr fotografieren",
      "Öltank: Typ, Volumen, Zustand fotografieren",
      "Warmwasserspeicher: Volumen/Baujahr",
      "Heizungsrohre und Leitungsdurchmesser",
      "Jeden Heizkörper: Foto + Breite/Höhe/Typ",
      "Vorlauf-/Rücklaufdaten falls ablesbar",
      "Kamin/Abgasführung dokumentieren",
    ],
  },
  {
    gruppe: "6. Wasser & Abwasser",
    punkte: [
      "Material der Wasserleitungen",
      "Durchmesser soweit sichtbar",
      "Absperrventile",
      "Warmwasserführung",
      "Fallleitungen lokalisieren",
      "Abwasser-Durchmesser/Material",
      "Küche, EG-Bad und OG-Bad: Zu-/Abläufe fotografieren",
      "Revisionsöffnungen",
    ],
  },
  {
    gruppe: "7. Elektro",
    punkte: [
      "Sicherungskasten komplett fotografieren",
      "FI/RCD vorhanden?",
      "Zähler/Hauptsicherung",
      "Leitungsart/-querschnitt soweit sichtbar",
      "Jede Steckdose/Schalter/Lichtstelle fotografieren",
      "Kellerinstallation",
      "Erdung/Potentialausgleich soweit erkennbar",
    ],
  },
  {
    gruppe: "8. Fenster & Fassade",
    punkte: [
      "Jedes Fenster innen + aussen fotografieren",
      "Rahmenmaterial/Verglasung",
      "Zustand/Dichtungen",
      "Rollläden/Jalousien",
      "Aussenfassade rundum fotografieren",
      "Risse/Feuchte/Sockel/Putz",
      "Wegen Gartenstadt-Schutz: geplante Änderungen separat abklären",
    ],
  },
  {
    gruppe: "9. Dach & Dachstock",
    punkte: [
      "Dachdeckung/Zustand",
      "Unterdach",
      "Sparrenquerschnitt/Abstände soweit zugänglich",
      "Dämmstärke",
      "Feuchtigkeit/Holzschäden",
      "Kamin",
      "Dachfenster/Lukarnen",
    ],
  },
  {
    gruppe: "10. Bäder & Küche",
    punkte: [
      "EG-Bad komplett vermessen + Anschlüsse fotografieren",
      "OG-Bad komplett vermessen + Anschlüsse fotografieren",
      "Fallstränge/Leitungswege",
      "Küche: Wasser/Abwasser",
      "Herd-/Backofenanschluss",
      "Geschirrspüler/Dunstabzug",
      "Alle Anschlusspunkte mit Abstandsmassen",
    ],
  },
  {
    gruppe: "11. Carport / Aussenbereich",
    punkte: [
      "Zufahrt Breite + Länge messen",
      "Abstand Haus/Grundstücksgrenzen",
      "Bereich für geplanten Carport vermessen",
      "Höhenunterschiede/Entwässerung",
      "Bestehende Garage/Nebenbau exakt aufnehmen",
      "Nachbar-/Grenzsituation fotografieren",
    ],
  },
  {
    gruppe: "12. Unterlagen vom Verkäufer/Makler",
    punkte: [
      "Alle Baupläne und späteren Baugesuche",
      "Baubewilligungen",
      "Heizungsunterlagen",
      "Kaminfegerberichte",
      "Elektro-Sicherheitsnachweis (SiNa) falls vorhanden",
      "Unterlagen zur erneuerten Abwasserleitung",
      "Rechnungen grösserer Renovationen",
      "Fensterunterlagen",
      "Versicherungs-/Schadensunterlagen",
      "Grundbuchauszug + Dienstbarkeiten",
    ],
  },
];

/** Alle Punkte der Vorlage als flache Liste, in der Reihenfolge des Papiers. */
export function vorlagePunkte() {
  const alle = [];
  CHECKLISTE_VORLAGE.forEach((abschnitt) => {
    abschnitt.punkte.forEach((titel) => {
      alle.push({ gruppe: abschnitt.gruppe, titel, sortierung: alle.length });
    });
  });
  return alle;
}

// Foto-Regel aus der Vorlage – als Erinnerung in der Ansicht.
export const FOTO_REGEL =
  "Pro Raum mindestens eine Gesamtaufnahme, jede Wand, Boden, Decke, Fenster, Tür und " +
  "technische Anschlüsse. Zusätzlich Detailfotos von Typenschildern, Leitungen und Sondagen.";

export const CHECKLISTE_HINWEIS =
  "Diese Checkliste dient der Sanierungsvorplanung. Tragende Bauteile, Elektroinstallation, " +
  "Heizung und bewilligungspflichtige Änderungen müssen vor Ausführung fachlich geprüft werden.";
