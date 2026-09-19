// Simulierte Dokumentenanalyse. Feste Demo-Werte, keine externe Schnittstelle.
// So gekapselt, dass später nur diese eine Funktion durch einen echten Aufruf
// (z.B. eine Edge Function mit serverseitigem Gemini-Key) ersetzt werden muss –
// der Rest der App ruft ausschliesslich analysiereDokument() auf.

function warten(ms) { return new Promise((ok) => setTimeout(ok, ms)); }

/**
 * @param {File} datei
 * @param {"offerte"|"beleg"} art
 * @param {(schritt: number) => void} [aufSchritt] wird pro Analyseschritt aufgerufen
 * @returns {Promise<object>} demo-Werte, passend zur Art
 */
export async function analysiereDokument(datei, art, aufSchritt) {
  const schritte = art === "beleg"
    ? ["Datei wird gelesen", "Lieferant und Betrag werden gesucht", "Werte werden übernommen"]
    : ["Datei wird gelesen", "Dokument wird ausgewertet", "Positionen werden übernommen"];

  for (let i = 0; i < schritte.length; i++) {
    await warten(550);
    if (aufSchritt) aufSchritt(i);
  }
  await warten(450);

  if (art === "beleg") {
    const brutto = 8750;
    const netto = Math.round((brutto / 1.081) * 100) / 100;
    return {
      demo: true,
      lieferant: "Muster AG",
      nummer: "RE-2026-235",
      datum: "2026-11-12",
      netto,
      mwst: Math.round((brutto - netto) * 100) / 100,
      brutto,
      kategorie: "Elektro",
    };
  }

  return {
    demo: true,
    lieferant: "Muster AG",
    nummer: "2026-1045",
    datum: "2026-09-19",
    mwstSatz: 8.1,
    kategorie: "Elektro",
    positionen: [
      { nr: "1", beschreibung: "Baustelleninstallation", menge: 1, einheit: "pauschal", einzelpreis: 1500 },
      { nr: "2", beschreibung: "Elektroinstallation EG", menge: 1, einheit: "pauschal", einzelpreis: 8500 },
      { nr: "3", beschreibung: "Elektroinstallation OG", menge: 1, einheit: "pauschal", einzelpreis: 6800 },
      { nr: "4", beschreibung: "Beleuchtung", menge: 1, einheit: "pauschal", einzelpreis: 2400 },
    ],
  };
}

export const ANALYSE_SCHRITTE = {
  offerte: ["Datei wird gelesen", "Dokument wird ausgewertet", "Positionen werden übernommen"],
  beleg: ["Datei wird gelesen", "Lieferant und Betrag werden gesucht", "Werte werden übernommen"],
};
