// Übernahme der Prototyp-Sicherung (JSON-Export aus prototyp/index.html)
// in ein Supabase-Projekt. Kategorien (Texte im Prototyp) werden auf
// budgetpositionen.id abgebildet: gleiche Kategorie im Zielprojekt suchen,
// sonst neue Budgetposition mit Betrag 0 anlegen.
import { zahl } from "./format.js";
import {
  budgetLaden, budgetAnlegen, offerteSpeichern, belegSpeichern, dokumenteAnlegen,
} from "./daten.js";

export function paketAusDatei(text) {
  let paket;
  try {
    paket = JSON.parse(text);
  } catch (e) {
    throw new Error("Die Datei ist keine gültige Sicherung: " + e.message);
  }
  const daten = paket && paket.daten ? paket.daten : paket;
  if (!daten || !Array.isArray(daten.budget) || !Array.isArray(daten.offerten)) {
    throw new Error("Die Datei enthält keine Projektdaten dieses Prototyps.");
  }
  ["budget", "offerten", "belege", "dokumente"].forEach((k) => { if (!Array.isArray(daten[k])) daten[k] = []; });
  return { erstellt: paket.erstellt || null, daten };
}

/** Fasst zusammen, was der Import einfügen würde – zur Anzeige vor dem Import. */
export function importVorschau(daten) {
  const kategorien = new Set();
  daten.budget.forEach((p) => p.kategorie && kategorien.add(p.kategorie));
  daten.offerten.forEach((o) => o.kategorie && kategorien.add(o.kategorie));
  daten.belege.forEach((b) => b.kategorie && kategorien.add(b.kategorie));
  daten.dokumente.forEach((d) => d.kategorie && kategorien.add(d.kategorie));
  return {
    budget: daten.budget.length,
    offerten: daten.offerten.length,
    belege: daten.belege.length,
    dokumente: daten.dokumente.length,
    kategorien: kategorien.size,
  };
}

function marke(projektId, erstellt) { return "tw-import-" + projektId + "-" + (erstellt || "ohne-datum"); }

export function bereitsImportiert(projektId, erstellt) {
  try { return !!localStorage.getItem(marke(projektId, erstellt)); } catch (e) { return false; }
}

/** Führt den Import durch. Gibt eine kurze Zusammenfassung zurück. */
export async function importDurchfuehren(projektId, erstellt, daten) {
  const bestehend = await budgetLaden(projektId);
  const kategorieZuId = new Map(bestehend.map((p) => [p.kategorie, p.id]));

  let neueBudgetpositionen = 0;
  for (const p of daten.budget) {
    const kategorie = p.kategorie || "Nicht zugeordnet";
    if (kategorieZuId.has(kategorie)) continue;
    const zeile = await budgetAnlegen(projektId, { kategorie, betrag: zahl(p.betrag), bemerkung: p.bemerkung || "" });
    kategorieZuId.set(kategorie, zeile.id);
    neueBudgetpositionen++;
  }

  const alleKategorien = new Set();
  daten.offerten.forEach((o) => o.kategorie && alleKategorien.add(o.kategorie));
  daten.belege.forEach((b) => b.kategorie && alleKategorien.add(b.kategorie));
  daten.dokumente.forEach((d) => d.kategorie && alleKategorien.add(d.kategorie));
  for (const kategorie of alleKategorien) {
    if (kategorieZuId.has(kategorie)) continue;
    const zeile = await budgetAnlegen(projektId, { kategorie, betrag: 0, bemerkung: "beim Import angelegt" });
    kategorieZuId.set(kategorie, zeile.id);
    neueBudgetpositionen++;
  }

  const offerteIdAlt2Neu = new Map();
  for (const o of daten.offerten) {
    const zeile = await offerteSpeichern(projektId, {
      budgetposition_id: kategorieZuId.get(o.kategorie) || null,
      lieferant: o.lieferant || "",
      nummer: o.nummer || "",
      datum: o.datum || null,
      status: o.status || "Entwurf",
      mwst_satz: o.mwstSatz != null ? zahl(o.mwstSatz) : null,
      bemerkung: o.bemerkung || "",
      ki_erkannt: !!o.demoErkannt,
      positionen: (o.positionen || []).map((p, i) => ({
        nr: p.nr || "", beschreibung: p.beschreibung || "", menge: zahl(p.menge) || 1,
        einheit: p.einheit || "pauschal", einzelpreis: zahl(p.preis), sortierung: i,
      })),
    });
    offerteIdAlt2Neu.set(o.id, zeile.id);
  }

  for (const b of daten.belege) {
    await belegSpeichern(projektId, {
      budgetposition_id: kategorieZuId.get(b.kategorie) || null,
      offerte_id: offerteIdAlt2Neu.get(b.offerteId) || null,
      lieferant: b.lieferant || "",
      nummer: b.nummer || "",
      datum: b.datum || null,
      netto: zahl(b.netto),
      mwst: zahl(b.mwst),
      brutto: zahl(b.brutto),
      bezahlt: !!b.bezahlt,
      zahlungsdatum: b.zahlungsdatum || null,
      bemerkung: b.bemerkung || "",
      ki_erkannt: !!b.demoErkannt,
    });
  }

  if (daten.dokumente.length) {
    await dokumenteAnlegen(
      projektId,
      daten.dokumente.map((d) => ({
        budgetposition_id: kategorieZuId.get(d.kategorie) || null,
        dateiname: d.dateiname || "Ohne Namen",
        typ: d.typ || "Sonstiges",
        datum: d.datum || null,
        bemerkung: (d.bemerkung || "") + " (importiert, ohne Datei)",
      }))
    );
  }

  try { localStorage.setItem(marke(projektId, erstellt), new Date().toISOString()); } catch (e) { /* egal */ }

  return {
    budgetpositionen: neueBudgetpositionen,
    offerten: daten.offerten.length,
    belege: daten.belege.length,
    dokumente: daten.dokumente.length,
  };
}
