// Alle Datenbankzugriffe – eine Funktion pro Vorgang. Keine Ansicht greift
// direkt auf Supabase zu, alles läuft über dieses Modul.
//
// Jede Schreibfunktion geht über schreiben(), die einzige Stelle, durch die
// alle Änderungen laufen. Das hält die Tür offen für eine spätere
// Warteschlange (Offline-Betrieb) ohne die Ansichten anfassen zu müssen.

import {
  supabase, istVerbindungsfehler, MELDUNG_KEINE_VERBINDUNG,
  istZeitueberschreitung, MELDUNG_ZEITUEBERSCHREITUNG,
} from "./supabase.js";

export class DatenFehler extends Error {
  constructor(text, keineVerbindung) {
    super(text);
    this.keineVerbindung = !!keineVerbindung;
  }
}

// Das Zeitlimit am fetch reicht nicht: Ein Aufruf kann auch INNERHALB der
// Bibliothek hängen bleiben (Warten auf die Sitzung, interne Sperren), bevor
// überhaupt eine Anfrage ans Netz geht. Deshalb bekommt jeder Vorgang zusätzlich
// eine harte Obergrenze – die Oberfläche darf nie ohne Antwort zurückbleiben.
const VORGANG_ZEITLIMIT_MS = 15000;
const UPLOAD_ZEITLIMIT_MS = 130000;

export function mitZeitlimit(versprechen, grenze = VORGANG_ZEITLIMIT_MS) {
  let uhr;
  const wecker = new Promise((_, ablehnen) => {
    uhr = setTimeout(() => {
      const fehler = new DatenFehler(MELDUNG_ZEITUEBERSCHREITUNG, true);
      fehler.zeitueberschreitung = true;
      ablehnen(fehler);
    }, grenze);
  });
  return Promise.race([versprechen, wecker]).finally(() => clearTimeout(uhr));
}

async function schreiben(fn, grenze) {
  try {
    return await mitZeitlimit(Promise.resolve().then(fn), grenze);
  } catch (e) {
    if (e instanceof DatenFehler) throw e;
    if (istZeitueberschreitung(e)) throw new DatenFehler(MELDUNG_ZEITUEBERSCHREITUNG, true);
    if (istVerbindungsfehler(e)) throw new DatenFehler(MELDUNG_KEINE_VERBINDUNG, true);
    throw new DatenFehler(e.message || String(e));
  }
}
export { UPLOAD_ZEITLIMIT_MS };
const lesen = schreiben;

/* ------------------------------------------------------- KI-Dokumentanalyse */
// Die Auswertung läuft in einer Edge Function auf dem Server ("dokument-analysieren").
// Nur dort liegt der Schlüssel des KI-Dienstes; im Browser ist er nie vorhanden.
export const ANALYSE_ZEITLIMIT_MS = 160000;

export async function dokumentAnalysieren(pfad, art) {
  let antwort;
  try {
    antwort = await mitZeitlimit(
      supabase.functions.invoke("dokument-analysieren", { body: { pfad, art } }),
      ANALYSE_ZEITLIMIT_MS
    );
  } catch (e) {
    if (e instanceof DatenFehler) throw e;
    if (istZeitueberschreitung(e)) throw new DatenFehler(MELDUNG_ZEITUEBERSCHREITUNG, true);
    if (istVerbindungsfehler(e)) throw new DatenFehler(MELDUNG_KEINE_VERBINDUNG, true);
    throw new DatenFehler(e.message || String(e));
  }
  if (antwort.error) {
    // Die Funktion legt ihre eigene Begründung in den Antwortkörper – die ist für
    // die Bedienung viel brauchbarer als "Edge Function returned a non-2xx status".
    let text = antwort.error.message || "Die Analyse ist fehlgeschlagen.";
    let code = null;
    const rohantwort = antwort.error.context;
    if (rohantwort && typeof rohantwort.json === "function") {
      try {
        const inhalt = await rohantwort.json();
        if (inhalt && inhalt.fehler) text = inhalt.fehler;
        if (inhalt && inhalt.code) code = inhalt.code;
      } catch (e) { /* kein JSON – dann bleibt die allgemeine Meldung */ }
    }
    const fehler = new DatenFehler(text);
    fehler.code = code;
    throw fehler;
  }
  if (!antwort.data || !antwort.data.werte) throw new DatenFehler("Die Analyse hat keine Werte zurückgegeben.");
  return antwort.data;
}

function pruefen({ data, error }) {
  if (error) throw error;
  return data;
}

/** Wirft, wenn der Datensatz seit dem Laden geändert wurde (anderer Stand von geaendert_am). */
export async function konfliktPruefen(tabelle, id, geladenAm) {
  if (!geladenAm) return;
  const aktuell = pruefen(await supabase.from(tabelle).select("geaendert_am").eq("id", id).single());
  if (aktuell && aktuell.geaendert_am !== geladenAm) {
    const fehler = new DatenFehler(
      "Dieser Datensatz wurde inzwischen von jemand anderem geändert. Bitte neu laden und die Änderung erneut vornehmen."
    );
    fehler.konflikt = true;
    throw fehler;
  }
}

/* ---------------------------------------------------------------- Projekte */
export function projekteLaden() {
  return lesen(async () => pruefen(await supabase.from("projekte").select("*").order("erstellt_am")));
}

export function projektAnlegen({ name, adresse, kaufpreis, gesamtbudget }) {
  return schreiben(async () =>
    pruefen(
      await supabase
        .from("projekte")
        .insert({
          name, adresse,
          kaufpreis: kaufpreis || 0,
          gesamtbudget: gesamtbudget || 0,
        })
        .select()
        .single()
    )
  );
}

export function projektAktualisieren(id, daten, geladenAm) {
  return schreiben(async () => {
    await konfliktPruefen("projekte", id, geladenAm);
    return pruefen(await supabase.from("projekte").update(daten).eq("id", id).select().single());
  });
}

/* -------------------------------------------------------------- Mitglieder */
export function mitgliederLaden(projektId) {
  return lesen(async () =>
    pruefen(
      await supabase
        .from("projekt_mitglieder")
        .select("*")
        .eq("projekt_id", projektId)
        .order("rolle")
    )
  );
}

export function mitgliedHinzufuegen(projektId, email, rolle) {
  return schreiben(async () => {
    const benutzerId = pruefen(await supabase.rpc("benutzer_id_zu_email", { p_email: email }));
    if (!benutzerId) {
      const fehler = new DatenFehler(
        "Diese Person hat noch kein Konto. Sie muss sich zuerst selbst registrieren, danach kann sie hinzugefügt werden."
      );
      fehler.unbekannt = true;
      throw fehler;
    }
    return pruefen(
      await supabase
        .from("projekt_mitglieder")
        .insert({ projekt_id: projektId, benutzer_id: benutzerId, rolle, email: email.trim() })
        .select()
        .single()
    );
  });
}

export function mitgliedRolleAendern(projektId, benutzerId, rolle) {
  return schreiben(async () =>
    pruefen(
      await supabase
        .from("projekt_mitglieder")
        .update({ rolle })
        .eq("projekt_id", projektId)
        .eq("benutzer_id", benutzerId)
        .select()
        .single()
    )
  );
}

export function mitgliedEntfernen(projektId, benutzerId) {
  return schreiben(async () =>
    pruefen(
      await supabase
        .from("projekt_mitglieder")
        .delete()
        .eq("projekt_id", projektId)
        .eq("benutzer_id", benutzerId)
    )
  );
}

/* --------------------------------------------------------- Kaufnebenkosten */
export function nebenkostenLaden(projektId) {
  return lesen(async () =>
    pruefen(
      await supabase
        .from("kaufnebenkosten")
        .select("*")
        .eq("projekt_id", projektId)
        .order("sortierung")
        .order("erstellt_am")
    )
  );
}

export function nebenkostenAnlegen(projektId, daten) {
  return schreiben(async () =>
    pruefen(
      await supabase
        .from("kaufnebenkosten")
        .insert({
          projekt_id: projektId,
          bezeichnung: daten.bezeichnung || "",
          betrag: daten.betrag || 0,
          datum: daten.datum || null,
          bezahlt: !!daten.bezahlt,
          bemerkung: daten.bemerkung || "",
        })
        .select()
        .single()
    )
  );
}

export function nebenkostenAktualisieren(id, daten, geladenAm) {
  return schreiben(async () => {
    await konfliktPruefen("kaufnebenkosten", id, geladenAm);
    return pruefen(await supabase.from("kaufnebenkosten").update(daten).eq("id", id).select().single());
  });
}

export function nebenkostenLoeschen(id) {
  return schreiben(async () => pruefen(await supabase.from("kaufnebenkosten").delete().eq("id", id)));
}

/* ------------------------------------------------------------- Einladungen */
export function einladungenLaden(projektId) {
  return lesen(async () =>
    pruefen(
      await supabase
        .from("einladungen")
        .select("*")
        .eq("projekt_id", projektId)
        .order("erstellt_am", { ascending: false })
    )
  );
}

export function einladungAnlegen(projektId, email, rolle) {
  return schreiben(async () =>
    pruefen(
      await supabase
        .from("einladungen")
        .insert({ projekt_id: projektId, email: (email || "").trim(), rolle })
        .select()
        .single()
    )
  );
}

export function einladungZuruecknehmen(id) {
  return schreiben(async () => pruefen(await supabase.from("einladungen").delete().eq("id", id)));
}

/** Was steckt hinter dem Link? Geht auch ohne Anmeldung. */
export function einladungInfo(token) {
  return lesen(async () => {
    const zeilen = pruefen(await supabase.rpc("einladung_info", { p_token: token }));
    return Array.isArray(zeilen) ? zeilen[0] || null : zeilen;
  });
}

/** Macht die angemeldete Person zum Mitglied. Gibt die Projekt-ID zurück. */
export function einladungEinloesen(token) {
  return schreiben(async () => pruefen(await supabase.rpc("einladung_einloesen", { p_token: token })));
}

/* --------------------------------------------------------- Budgetpositionen */
export function budgetLaden(projektId) {
  return lesen(async () =>
    pruefen(
      await supabase
        .from("budgetpositionen")
        .select("*")
        .eq("projekt_id", projektId)
        .order("sortierung")
        .order("erstellt_am")
    )
  );
}

export function budgetAnlegen(projektId, { kategorie, betrag, bemerkung, beruecksichtigt }) {
  return schreiben(async () =>
    pruefen(
      await supabase
        .from("budgetpositionen")
        .insert({
          projekt_id: projektId, kategorie, betrag: betrag || 0, bemerkung: bemerkung || "",
          beruecksichtigt: beruecksichtigt !== false,
        })
        .select()
        .single()
    )
  );
}

export function budgetAktualisieren(id, daten, geladenAm) {
  return schreiben(async () => {
    await konfliktPruefen("budgetpositionen", id, geladenAm);
    return pruefen(await supabase.from("budgetpositionen").update(daten).eq("id", id).select().single());
  });
}

export function budgetLoeschen(id) {
  return schreiben(async () => pruefen(await supabase.from("budgetpositionen").delete().eq("id", id)));
}

/* ------------------------------------------------------------------ Offerten */
export function offertenLaden(projektId) {
  return lesen(async () =>
    pruefen(
      await supabase
        .from("offerten")
        .select("*, offert_positionen(*)")
        .eq("projekt_id", projektId)
        .order("erstellt_am")
    )
  );
}

/** Legt eine Offerte an oder aktualisiert sie und ersetzt dabei die Positionen
 *  in einem Vorgang (siehe Migration 0005, offerte_positionen_ersetzen). */
export function offerteSpeichern(projektId, offerte, geladenAm) {
  return schreiben(async () => {
    const kopf = {
      projekt_id: projektId,
      budgetposition_id: offerte.budgetposition_id || null,
      lieferant: offerte.lieferant || "",
      nummer: offerte.nummer || "",
      datum: offerte.datum || null,
      status: offerte.status || "Entwurf",
      mwst_satz: offerte.mwst_satz === null ? null : offerte.mwst_satz,
      handwerker_id: offerte.handwerker_id || null,
      bemerkung: offerte.bemerkung || "",
      datei_pfad: offerte.datei_pfad ?? undefined,
      datei_name: offerte.datei_name ?? undefined,
      ki_erkannt: !!offerte.ki_erkannt,
      ki_geprueft: !!offerte.ki_geprueft,
    };
    let zeile;
    if (offerte.id) {
      await konfliktPruefen("offerten", offerte.id, geladenAm);
      zeile = pruefen(await supabase.from("offerten").update(kopf).eq("id", offerte.id).select().single());
    } else {
      zeile = pruefen(await supabase.from("offerten").insert(kopf).select().single());
    }
    const { error } = await supabase.rpc("offerte_positionen_ersetzen", {
      p_offerte_id: zeile.id,
      p_positionen: offerte.positionen || [],
    });
    if (error) throw error;
    return zeile;
  });
}

export function offerteLoeschen(id) {
  return schreiben(async () => pruefen(await supabase.from("offerten").delete().eq("id", id)));
}

/** Für die Handwerker-Ansicht: die eine Offerte, die dieser Person zugewiesen ist. */
export function eigeneHandwerkerOfferte(offerteId) {
  return lesen(async () =>
    pruefen(
      await supabase.from("offerten").select("*, offert_positionen(*)").eq("id", offerteId).single()
    )
  );
}

/* -------------------------------------------------------------------- Belege */
export function belegeLaden(projektId) {
  return lesen(async () =>
    pruefen(
      await supabase.from("belege").select("*").eq("projekt_id", projektId).order("erstellt_am")
    )
  );
}

export function belegSpeichern(projektId, beleg, geladenAm) {
  return schreiben(async () => {
    const zeile = {
      projekt_id: projektId,
      budgetposition_id: beleg.budgetposition_id || null,
      offerte_id: beleg.offerte_id || null,
      lieferant: beleg.lieferant || "",
      nummer: beleg.nummer || "",
      datum: beleg.datum || null,
      netto: beleg.netto || 0,
      mwst: beleg.mwst === null ? null : beleg.mwst || 0,
      brutto: beleg.brutto || 0,
      bezahlt: !!beleg.bezahlt,
      zahlungsdatum: beleg.zahlungsdatum || null,
      bemerkung: beleg.bemerkung || "",
      datei_pfad: beleg.datei_pfad ?? undefined,
      datei_name: beleg.datei_name ?? undefined,
      ki_erkannt: !!beleg.ki_erkannt,
      ki_geprueft: !!beleg.ki_geprueft,
    };
    if (beleg.id) {
      await konfliktPruefen("belege", beleg.id, geladenAm);
      return pruefen(await supabase.from("belege").update(zeile).eq("id", beleg.id).select().single());
    }
    return pruefen(await supabase.from("belege").insert(zeile).select().single());
  });
}

export function belegLoeschen(id) {
  return schreiben(async () => pruefen(await supabase.from("belege").delete().eq("id", id)));
}

/* ----------------------------------------------------------------- Dokumente */
export function dokumenteLaden(projektId) {
  return lesen(async () =>
    pruefen(
      await supabase.from("dokumente").select("*").eq("projekt_id", projektId).order("erstellt_am")
    )
  );
}

export function dokumenteAnlegen(projektId, dokumente) {
  return schreiben(async () =>
    pruefen(
      await supabase
        .from("dokumente")
        .insert(dokumente.map((d) => ({ ...d, projekt_id: projektId })))
        .select()
    )
  );
}

export function dokumentAktualisieren(id, daten, geladenAm) {
  return schreiben(async () => {
    await konfliktPruefen("dokumente", id, geladenAm);
    return pruefen(await supabase.from("dokumente").update(daten).eq("id", id).select().single());
  });
}

export function dokumentLoeschen(id) {
  return schreiben(async () => pruefen(await supabase.from("dokumente").delete().eq("id", id)));
}

/* --------------------------------------------------------------- Auswertung */
export function kostenvergleichLaden(projektId) {
  return lesen(async () =>
    pruefen(await supabase.from("v_kostenvergleich").select("*").eq("projekt_id", projektId))
  );
}

/* ------------------------------------------------------------------ Realtime */
/** Meldet Änderungen an den Projekttabellen zurück, damit die aufrufende
 *  Stelle die betroffenen Daten neu laden kann. Gibt eine Abmelde-Funktion zurück. */
export function projektAbonnieren(projektId, aufAenderung) {
  const kanal = supabase
    .channel("projekt-" + projektId)
    .on("postgres_changes", { event: "*", schema: "public", table: "budgetpositionen", filter: "projekt_id=eq." + projektId }, () => aufAenderung("budget"))
    .on("postgres_changes", { event: "*", schema: "public", table: "offerten", filter: "projekt_id=eq." + projektId }, () => aufAenderung("offerten"))
    .on("postgres_changes", { event: "*", schema: "public", table: "offert_positionen" }, () => aufAenderung("offerten"))
    .on("postgres_changes", { event: "*", schema: "public", table: "belege", filter: "projekt_id=eq." + projektId }, () => aufAenderung("belege"))
    .on("postgres_changes", { event: "*", schema: "public", table: "dokumente", filter: "projekt_id=eq." + projektId }, () => aufAenderung("dokumente"))
    .on("postgres_changes", { event: "*", schema: "public", table: "projekt_mitglieder", filter: "projekt_id=eq." + projektId }, () => aufAenderung("mitglieder"))
    .subscribe();
  return () => supabase.removeChannel(kanal);
}
