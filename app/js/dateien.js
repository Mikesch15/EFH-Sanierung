// Datei-Upload, signierte Links, Löschen. Bucket "projektdateien" (privat).
import { supabase, istVerbindungsfehler, MELDUNG_KEINE_VERBINDUNG } from "./supabase.js";
import {
  STORAGE_BUCKET, DATEI_MAX_BYTES, DATEI_ERLAUBTE_TYPEN, DATEI_ERLAUBTE_ENDUNGEN,
  SIGNIERTER_LINK_SEKUNDEN,
} from "./konfig.js";
import { DatenFehler } from "./daten.js";

function endung(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

/** Prüft Typ und Grösse, bevor überhaupt hochgeladen wird. */
export function dateiPruefen(datei) {
  if (datei.size > DATEI_MAX_BYTES) {
    return "Datei ist zu gross (" + (datei.size / 1024 / 1024).toFixed(1) + " MB). Erlaubt sind höchstens 25 MB.";
  }
  const typOk = datei.type ? DATEI_ERLAUBTE_TYPEN.includes(datei.type) : false;
  const endungOk = DATEI_ERLAUBTE_ENDUNGEN.includes(endung(datei.name));
  if (!typOk && !endungOk) {
    return "Dateityp nicht erlaubt. Nur PDF, JPG, PNG, HEIC oder WEBP.";
  }
  return null;
}

/**
 * Lädt eine Datei hoch. bereich ist "offerten", "belege" oder "dokumente" –
 * für Handwerker-Uploads "handwerker/<offerte_id>" (siehe Migration 0005).
 */
export async function hochladen(datei, projektId, bereich) {
  const fehler = dateiPruefen(datei);
  if (fehler) { const e = new DatenFehler(fehler); e.ungueltig = true; throw e; }
  const uuid = crypto.randomUUID();
  const pfad = projektId + "/" + bereich + "/" + uuid + endung(datei.name);
  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(pfad, datei, {
      contentType: datei.type || undefined,
      upsert: false,
    });
    if (error) throw error;
  } catch (e) {
    if (istVerbindungsfehler(e)) throw new DatenFehler(MELDUNG_KEINE_VERBINDUNG, true);
    throw new DatenFehler("Hochladen fehlgeschlagen: " + (e.message || e));
  }
  return { datei_pfad: pfad, datei_name: datei.name };
}

export async function signierterLink(pfad) {
  if (!pfad) return null;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(pfad, SIGNIERTER_LINK_SEKUNDEN);
  if (error) {
    throw new DatenFehler(istVerbindungsfehler(error) ? MELDUNG_KEINE_VERBINDUNG : "Datei nicht verfügbar: " + error.message, istVerbindungsfehler(error));
  }
  return data.signedUrl;
}

export async function loeschen(pfad) {
  if (!pfad) return;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([pfad]);
  if (error && !istVerbindungsfehler(error)) {
    // Datensatz soll trotzdem gelöscht werden können, nur melden.
    console.warn("Datei konnte nicht gelöscht werden:", pfad, error.message);
  }
}
