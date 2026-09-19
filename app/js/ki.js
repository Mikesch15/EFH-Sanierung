// Echte Dokumentenanalyse. Die Datei wird in den privaten Speicher geladen und
// anschliessend von der Edge Function "dokument-analysieren" ausgelesen (Google
// Gemini). Der Schlüssel des KI-Dienstes liegt ausschliesslich serverseitig als
// Supabase-Secret – er erreicht dieses Gerät nie.
//
// Die ganze App ruft nur analysiereDokument() auf. Soll der Dienst einmal
// gewechselt werden, ist das die einzige Stelle, die sich ändert (im Browser;
// dazu die Edge Function selbst).

import { dokumentAnalysieren, DatenFehler } from "./daten.js";
import { hochladen } from "./dateien.js";

// Grenze der Edge Function (Gemini nimmt grössere Anhänge nicht entgegen).
const ANALYSE_MAX_BYTES = 15 * 1024 * 1024;

export const ANALYSE_SCHRITTE = {
  offerte: ["Datei wird hochgeladen", "Dokument wird gelesen", "Positionen werden übernommen"],
  beleg: ["Datei wird hochgeladen", "Dokument wird gelesen", "Werte werden übernommen"],
};

/** Aus den Fehlercodes der Edge Function eine Meldung machen, mit der man etwas anfangen kann. */
export function analyseFehlerText(e) {
  const code = e && e.code;
  if (code === "kein_schluessel") {
    return "Die KI-Auswertung ist auf dem Server noch nicht freigeschaltet (es fehlt der Zugang zum KI-Dienst). " +
      "Das Dokument kann weiterhin von Hand erfasst werden.";
  }
  if (code === "schluessel_ungueltig") return "Der KI-Dienst lehnt den hinterlegten Zugang ab. Bitte den Schlüssel prüfen.";
  // Beim Kontingent zählt der Wortlaut des Dienstes: Er sagt, welches Limit greift
  // und wie lange zu warten ist. Eine eigene Kurzfassung würde das verschlucken.
  if (code === "kontingent" || code === "kein_modell") return (e && e.message) || "Die Analyse ist fehlgeschlagen.";
  return "Auslesen fehlgeschlagen: " + ((e && e.message) || e);
}

function zahl(wert) {
  if (wert === null || wert === undefined || wert === "") return 0;
  const n = typeof wert === "number" ? wert : parseFloat(String(wert).replace(/['\s]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function runden(n) { return Math.round(n * 100) / 100; }
function text(wert) { return wert === null || wert === undefined ? "" : String(wert).trim(); }

/** Nur ein echtes ISO-Datum übernehmen – sonst lieber leer lassen als falsch. */
function datumOderLeer(wert) {
  const t = text(wert);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : "";
}

function offerteAufbereiten(w) {
  const positionen = Array.isArray(w.positionen) ? w.positionen : [];
  return {
    lieferant: text(w.lieferant),
    nummer: text(w.nummer),
    datum: datumOderLeer(w.datum),
    // null bedeutet ausdrücklich "ohne MWST geführt"; fehlt die Angabe ganz,
    // bleibt es beim üblichen Satz, den die Person überschreiben kann.
    mwstSatz: w.mwst_satz === null ? null : (zahl(w.mwst_satz) || 8.1),
    hinweis: text(w.hinweis),
    positionen: positionen
      .map((p, i) => ({
        nr: text(p.nr) || String(i + 1),
        beschreibung: text(p.beschreibung),
        menge: zahl(p.menge) || 1,
        einheit: text(p.einheit) || "pauschal",
        einzelpreis: runden(zahl(p.einzelpreis)),
      }))
      .filter((p) => p.beschreibung || p.einzelpreis),
  };
}

function belegAufbereiten(w) {
  const brutto = runden(zahl(w.brutto));
  const ohneMwst = w.mwst === null || w.mwst === undefined;
  let mwst = ohneMwst ? null : runden(zahl(w.mwst));
  let netto = runden(zahl(w.netto));
  if (mwst === null) {
    netto = brutto;
  } else {
    if (!netto && brutto) netto = runden(brutto - mwst);
    if (!mwst && brutto && netto) mwst = runden(brutto - netto);
  }
  return {
    lieferant: text(w.lieferant),
    nummer: text(w.nummer),
    datum: datumOderLeer(w.datum),
    netto, mwst, brutto,
    bezahlt: w.bezahlt === true,
    zahlungsdatum: datumOderLeer(w.zahlungsdatum),
    hinweis: text(w.hinweis),
  };
}

/**
 * Liest eine Offerte oder einen Beleg aus.
 *
 * @param {{datei?: File, pfad?: string, name?: string, projektId: string, bereich: string}} quelle
 *        Entweder eine noch nicht hochgeladene Datei oder der Pfad einer bereits
 *        gespeicherten Datei.
 * @param {"offerte"|"beleg"} art
 * @param {(schritt: number) => void} [aufSchritt] nach jedem erledigten Schritt
 * @returns {Promise<object>} erkannte Werte plus datei_pfad/datei_name/modell
 */
export async function analysiereDokument(quelle, art, aufSchritt) {
  const melden = (i) => { if (aufSchritt) aufSchritt(i); };

  let pfad = quelle.pfad || null;
  let name = quelle.name || (quelle.datei && quelle.datei.name) || "";

  if (!pfad) {
    if (!quelle.datei) throw new DatenFehler("Es wurde keine Datei ausgewählt.");
    if (quelle.datei.size > ANALYSE_MAX_BYTES) {
      throw new DatenFehler(
        "Die Datei ist mit " + (quelle.datei.size / 1024 / 1024).toFixed(1) +
        " MB zu gross für die Analyse (höchstens 15 MB). Sie kann trotzdem gespeichert werden."
      );
    }
    const info = await hochladen(quelle.datei, quelle.projektId, quelle.bereich);
    pfad = info.datei_pfad;
    name = info.datei_name;
  }
  melden(0);

  const antwort = await dokumentAnalysieren(pfad, art);
  melden(1);

  const werte = art === "beleg" ? belegAufbereiten(antwort.werte) : offerteAufbereiten(antwort.werte);
  melden(2);

  return { ...werte, datei_pfad: pfad, datei_name: name, modell: antwort.modell || "" };
}
