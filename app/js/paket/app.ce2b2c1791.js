var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// app/js/konfig.js
var SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, STORAGE_BUCKET, DATEI_MAX_BYTES, DATEI_ERLAUBTE_TYPEN, DATEI_ERLAUBTE_ENDUNGEN, MWST_SATZ_VORGABE, STATUS_LISTE, DOKUMENT_TYPEN, STANDARD_KATEGORIEN, NEBENKOSTEN_ARTEN, FOERDER_STATUS, FOERDER_STATUS_SICHER, FOERDER_STELLEN, ANSCHAFFUNG_ARTEN, FINANZIERUNGEN, ROLLEN, SIGNIERTER_LINK_SEKUNDEN, VORSCHAU_LINK_SEKUNDEN;
var init_konfig = __esm({
  "app/js/konfig.js"() {
    SUPABASE_URL = "https://evozevkzwcvpbnvcmmfp.supabase.co";
    SUPABASE_PUBLISHABLE_KEY = "sb_publishable_us-LmqO0xw7nYgraQ7KCNw_dukOK3K-";
    STORAGE_BUCKET = "projektdateien";
    DATEI_MAX_BYTES = 25 * 1024 * 1024;
    DATEI_ERLAUBTE_TYPEN = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"];
    DATEI_ERLAUBTE_ENDUNGEN = [".pdf", ".jpg", ".jpeg", ".png", ".heic", ".webp"];
    MWST_SATZ_VORGABE = 8.1;
    STATUS_LISTE = ["Entwurf", "Erfasst", "Verglichen", "Beauftragt", "Abgelehnt"];
    DOKUMENT_TYPEN = [
      "Kaufvertrag",
      "Reservationsvereinbarung",
      "Grundriss",
      "Plan",
      "Baubewilligung",
      "Handwerkerunterlagen",
      "Garantie",
      "Foto",
      "Versicherungsunterlagen",
      "Sonstiges"
    ];
    STANDARD_KATEGORIEN = [
      "Rückbau / Entsorgung",
      "Elektro",
      "Wasser / Sanitär",
      "Maurerarbeiten / Wanddurchbrüche",
      "Wände / Decken",
      "Böden",
      "Küche",
      "Badezimmer EG",
      "Badezimmer OG",
      "Fassade",
      "Heizung",
      "Fenster",
      "Sonstiges",
      "Reserve"
    ];
    NEBENKOSTEN_ARTEN = [
      "Notariat",
      "Handänderungssteuer",
      "Grundbuchgebühren",
      "Schätzung / Gutachten",
      "Bankspesen",
      "Gebäudeversicherung",
      "Umzug",
      "Sonstiges"
    ];
    FOERDER_STATUS = ["Geplant", "Beantragt", "Zugesichert", "Ausbezahlt", "Abgelehnt"];
    FOERDER_STATUS_SICHER = ["Zugesichert", "Ausbezahlt"];
    FOERDER_STELLEN = [
      "Das Gebäudeprogramm",
      "Kanton",
      "Gemeinde",
      "Bund",
      "Elektrizitätswerk",
      "Gasversorgung",
      "Pronovo (Einmalvergütung)",
      "Stiftung Klimaschutz",
      "Sonstige"
    ];
    ANSCHAFFUNG_ARTEN = [
      "Umzug",
      "Möbel",
      "Haushaltgeräte",
      "Maschinen / Werkzeug",
      "Garten",
      "Reinigung",
      "Vorhänge / Storen",
      "Sonstiges"
    ];
    FINANZIERUNGEN = ["Kredit", "Eigenmittel"];
    ROLLEN = {
      eigentuemer: "Eigentümer",
      bearbeiter: "Bearbeiter",
      leser: "Leser",
      handwerker: "Handwerker"
    };
    SIGNIERTER_LINK_SEKUNDEN = 120;
    VORSCHAU_LINK_SEKUNDEN = 600;
  }
});

// app/js/supabase.js
import { createClient } from "../vendor/supabase-js.js";
function sichererSpeicher() {
  let echt = null;
  try {
    echt = window.localStorage;
    const probe = "tw-probe";
    echt.setItem(probe, "1");
    echt.removeItem(probe);
  } catch (e) {
    echt = null;
  }
  if (echt) {
    return {
      getItem: (k) => {
        try {
          return echt.getItem(k);
        } catch (e) {
          return merker.get(k) ?? null;
        }
      },
      setItem: (k, v) => {
        try {
          echt.setItem(k, v);
        } catch (e) {
          merker.set(k, v);
        }
      },
      removeItem: (k) => {
        try {
          echt.removeItem(k);
        } catch (e) {
          merker.delete(k);
        }
      }
    };
  }
  return {
    getItem: (k) => merker.has(k) ? merker.get(k) : null,
    setItem: (k, v) => merker.set(k, v),
    removeItem: (k) => merker.delete(k)
  };
}
function fetchMitZeitlimit(eingabe6, optionen) {
  const adresse = typeof eingabe6 === "string" ? eingabe6 : eingabe6 && eingabe6.url || "";
  const grenze = adresse.includes("/storage/v1/object") ? ZEITLIMIT_UPLOAD_MS : adresse.includes("/functions/v1/") ? ZEITLIMIT_FUNKTION_MS : ZEITLIMIT_MS;
  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), grenze);
  return fetch(eingabe6, Object.assign({}, optionen, { signal: abbruch.signal })).finally(() => clearTimeout(uhr));
}
function eigeneSperre(name, dauer, fn) {
  const vorher = sperrKette;
  const ergebnis = (async () => {
    await Promise.race([vorher.catch(() => {
    }), new Promise((ok) => setTimeout(ok, 1e4))]);
    return fn();
  })();
  sperrKette = ergebnis.then(() => void 0, () => void 0);
  return ergebnis;
}
function gespeicherteSitzungVorhanden() {
  try {
    const referenz = new URL(SUPABASE_URL).hostname.split(".")[0];
    return !!authSpeicher.getItem("sb-" + referenz + "-auth-token");
  } catch (e) {
    return false;
  }
}
function istZeitueberschreitung(fehler) {
  if (!fehler) return false;
  const name = fehler.name || "";
  const text2 = String(fehler.message || fehler);
  return name === "AbortError" || /abort|timeout|Zeitüberschreitung/i.test(text2);
}
function authMitZeitlimit(versprechen) {
  let uhr;
  const wecker = new Promise((_, ablehnen) => {
    uhr = setTimeout(() => ablehnen(new Error(MELDUNG_ZEITUEBERSCHREITUNG)), AUTH_ZEITLIMIT_MS);
  });
  return Promise.race([versprechen, wecker]).finally(() => clearTimeout(uhr));
}
async function registrieren(email, passwort) {
  const { data, error } = await authMitZeitlimit(supabase.auth.signUp({ email, password: passwort }));
  if (error) throw error;
  return data;
}
async function anmelden(email, passwort) {
  const { data, error } = await authMitZeitlimit(supabase.auth.signInWithPassword({ email, password: passwort }));
  if (error) throw error;
  return data;
}
async function abmelden() {
  const { error } = await authMitZeitlimit(supabase.auth.signOut());
  if (error) throw error;
}
async function passwortZuruecksetzen(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });
  if (error) throw error;
}
function aufAuthAchten(callback) {
  const { data } = supabase.auth.onAuthStateChange((ereignis, sitzung) => callback(ereignis, sitzung));
  return () => data.subscription.unsubscribe();
}
function istVerbindungsfehler(fehler) {
  if (!fehler) return false;
  const text2 = String(fehler.message || fehler);
  return /fetch|network|failed to fetch|NetworkError|Load failed/i.test(text2);
}
var merker, speicherIstFluechtig, ZEITLIMIT_MS, ZEITLIMIT_UPLOAD_MS, ZEITLIMIT_FUNKTION_MS, authSpeicher, sperrKette, supabase, MELDUNG_ZEITUEBERSCHREITUNG, AUTH_ZEITLIMIT_MS, MELDUNG_KEINE_VERBINDUNG;
var init_supabase = __esm({
  "app/js/supabase.js"() {
    init_konfig();
    merker = /* @__PURE__ */ new Map();
    speicherIstFluechtig = (() => {
      try {
        window.localStorage.setItem("tw-probe", "1");
        window.localStorage.removeItem("tw-probe");
        return false;
      } catch (e) {
        return true;
      }
    })();
    ZEITLIMIT_MS = 12e3;
    ZEITLIMIT_UPLOAD_MS = 12e4;
    ZEITLIMIT_FUNKTION_MS = 15e4;
    authSpeicher = sichererSpeicher();
    sperrKette = Promise.resolve();
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { fetch: fetchMitZeitlimit },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: authSpeicher,
        // supabase-js serialisiert Auth-Vorgänge normalerweise über die Web-Locks-
        // Schnittstelle. Die gilt fensterübergreifend: Hängt ein anderes Fenster
        // derselben Adresse, warten hier alle Aufrufe endlos.
        //
        // Ganz ohne Serialisierung ist es aber auch nicht richtig – zwei gleichzeitige
        // Token-Erneuerungen entwerten sich gegenseitig, und die Anmeldung geht
        // verloren. Deshalb eine eigene Warteschlange, die nur in diesem Fenster gilt
        // und zusätzlich nach 10 Sekunden weitermacht, statt zu blockieren.
        lock: eigeneSperre
      }
    });
    MELDUNG_ZEITUEBERSCHREITUNG = "Der Server hat nicht geantwortet (Zeitüberschreitung). Bitte Verbindung prüfen und erneut versuchen.";
    AUTH_ZEITLIMIT_MS = 15e3;
    MELDUNG_KEINE_VERBINDUNG = "Keine Verbindung zum Server. Bitte Internetverbindung prüfen und erneut versuchen.";
  }
});

// app/js/daten.js
var daten_exports = {};
__export(daten_exports, {
  ANALYSE_ZEITLIMIT_MS: () => ANALYSE_ZEITLIMIT_MS,
  DatenFehler: () => DatenFehler,
  UPLOAD_ZEITLIMIT_MS: () => UPLOAD_ZEITLIMIT_MS,
  anschaffungAktualisieren: () => anschaffungAktualisieren,
  anschaffungAnlegen: () => anschaffungAnlegen,
  anschaffungLoeschen: () => anschaffungLoeschen,
  anschaffungenLaden: () => anschaffungenLaden,
  belegLoeschen: () => belegLoeschen,
  belegSpeichern: () => belegSpeichern,
  belegeLaden: () => belegeLaden,
  budgetAktualisieren: () => budgetAktualisieren,
  budgetAnlegen: () => budgetAnlegen,
  budgetLaden: () => budgetLaden,
  budgetLoeschen: () => budgetLoeschen,
  dokumentAktualisieren: () => dokumentAktualisieren,
  dokumentAnalysieren: () => dokumentAnalysieren,
  dokumentLoeschen: () => dokumentLoeschen,
  dokumenteAnlegen: () => dokumenteAnlegen,
  dokumenteLaden: () => dokumenteLaden,
  eigeneHandwerkerOfferte: () => eigeneHandwerkerOfferte,
  einladungAnlegen: () => einladungAnlegen,
  einladungEinloesen: () => einladungEinloesen,
  einladungInfo: () => einladungInfo,
  einladungZuruecknehmen: () => einladungZuruecknehmen,
  einladungenLaden: () => einladungenLaden,
  foerdergeldAktualisieren: () => foerdergeldAktualisieren,
  foerdergeldAnlegen: () => foerdergeldAnlegen,
  foerdergeldLoeschen: () => foerdergeldLoeschen,
  foerdergelderLaden: () => foerdergelderLaden,
  konfliktPruefen: () => konfliktPruefen,
  kostenvergleichLaden: () => kostenvergleichLaden,
  mitZeitlimit: () => mitZeitlimit,
  mitgliedEntfernen: () => mitgliedEntfernen,
  mitgliedHinzufuegen: () => mitgliedHinzufuegen,
  mitgliedRolleAendern: () => mitgliedRolleAendern,
  mitgliederLaden: () => mitgliederLaden,
  nebenkostenAktualisieren: () => nebenkostenAktualisieren,
  nebenkostenAnlegen: () => nebenkostenAnlegen,
  nebenkostenLaden: () => nebenkostenLaden,
  nebenkostenLoeschen: () => nebenkostenLoeschen,
  offerteLoeschen: () => offerteLoeschen,
  offerteSpeichern: () => offerteSpeichern,
  offertenLaden: () => offertenLaden,
  projektAbonnieren: () => projektAbonnieren,
  projektAktualisieren: () => projektAktualisieren,
  projektAnlegen: () => projektAnlegen,
  projekteLaden: () => projekteLaden
});
function mitZeitlimit(versprechen, grenze = VORGANG_ZEITLIMIT_MS) {
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
async function dokumentAnalysieren(pfad, art) {
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
    let text2 = antwort.error.message || "Die Analyse ist fehlgeschlagen.";
    let code = null;
    const rohantwort = antwort.error.context;
    if (rohantwort && typeof rohantwort.json === "function") {
      try {
        const inhalt = await rohantwort.json();
        if (inhalt && inhalt.fehler) text2 = inhalt.fehler;
        if (inhalt && inhalt.code) code = inhalt.code;
      } catch (e) {
      }
    }
    const fehler = new DatenFehler(text2);
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
async function konfliktPruefen(tabelle, id, geladenAm) {
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
function projekteLaden() {
  return lesen(async () => pruefen(await supabase.from("projekte").select("*").order("erstellt_am")));
}
function projektAnlegen({ name, adresse, kaufpreis, gesamtbudget }) {
  return schreiben(
    async () => pruefen(
      await supabase.from("projekte").insert({
        name,
        adresse,
        kaufpreis: kaufpreis || 0,
        gesamtbudget: gesamtbudget || 0
      }).select().single()
    )
  );
}
function projektAktualisieren(id, daten, geladenAm) {
  return schreiben(async () => {
    await konfliktPruefen("projekte", id, geladenAm);
    return pruefen(await supabase.from("projekte").update(daten).eq("id", id).select().single());
  });
}
function mitgliederLaden(projektId) {
  return lesen(
    async () => pruefen(
      await supabase.from("projekt_mitglieder").select("*").eq("projekt_id", projektId).order("rolle")
    )
  );
}
function mitgliedHinzufuegen(projektId, email, rolle) {
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
      await supabase.from("projekt_mitglieder").insert({ projekt_id: projektId, benutzer_id: benutzerId, rolle, email: email.trim() }).select().single()
    );
  });
}
function mitgliedRolleAendern(projektId, benutzerId, rolle) {
  return schreiben(
    async () => pruefen(
      await supabase.from("projekt_mitglieder").update({ rolle }).eq("projekt_id", projektId).eq("benutzer_id", benutzerId).select().single()
    )
  );
}
function mitgliedEntfernen(projektId, benutzerId) {
  return schreiben(
    async () => pruefen(
      await supabase.from("projekt_mitglieder").delete().eq("projekt_id", projektId).eq("benutzer_id", benutzerId)
    )
  );
}
function nebenkostenLaden(projektId) {
  return lesen(
    async () => pruefen(
      await supabase.from("kaufnebenkosten").select("*").eq("projekt_id", projektId).order("sortierung").order("erstellt_am")
    )
  );
}
function nebenkostenAnlegen(projektId, daten) {
  return schreiben(
    async () => pruefen(
      await supabase.from("kaufnebenkosten").insert({
        projekt_id: projektId,
        bezeichnung: daten.bezeichnung || "",
        betrag: daten.betrag || 0,
        datum: daten.datum || null,
        bezahlt: !!daten.bezahlt,
        bemerkung: daten.bemerkung || ""
      }).select().single()
    )
  );
}
function nebenkostenAktualisieren(id, daten, geladenAm) {
  return schreiben(async () => {
    await konfliktPruefen("kaufnebenkosten", id, geladenAm);
    return pruefen(await supabase.from("kaufnebenkosten").update(daten).eq("id", id).select().single());
  });
}
function nebenkostenLoeschen(id) {
  return schreiben(async () => pruefen(await supabase.from("kaufnebenkosten").delete().eq("id", id)));
}
function anschaffungenLaden(projektId) {
  return lesen(
    async () => pruefen(
      await supabase.from("anschaffungen").select("*").eq("projekt_id", projektId).order("sortierung").order("erstellt_am")
    )
  );
}
function anschaffungAnlegen(projektId, daten) {
  return schreiben(
    async () => pruefen(
      await supabase.from("anschaffungen").insert({
        projekt_id: projektId,
        bezeichnung: daten.bezeichnung || "",
        kategorie: daten.kategorie || "",
        betrag: daten.betrag || 0,
        datum: daten.datum || null,
        bezahlt: !!daten.bezahlt,
        finanzierung: daten.finanzierung === "Eigenmittel" ? "Eigenmittel" : "Kredit",
        bemerkung: daten.bemerkung || ""
      }).select().single()
    )
  );
}
function anschaffungAktualisieren(id, daten, geladenAm) {
  return schreiben(async () => {
    await konfliktPruefen("anschaffungen", id, geladenAm);
    return pruefen(await supabase.from("anschaffungen").update(daten).eq("id", id).select().single());
  });
}
function anschaffungLoeschen(id) {
  return schreiben(async () => pruefen(await supabase.from("anschaffungen").delete().eq("id", id)));
}
function foerdergelderLaden(projektId) {
  return lesen(
    async () => pruefen(
      await supabase.from("foerdergelder").select("*").eq("projekt_id", projektId).order("sortierung").order("erstellt_am")
    )
  );
}
function foerderFelder(daten) {
  return {
    bezeichnung: daten.bezeichnung || "",
    stelle: daten.stelle || "",
    gesuchsnummer: daten.gesuchsnummer || "",
    betrag: daten.betrag || 0,
    status: daten.status || "Geplant",
    budgetposition_id: daten.budgetposition_id || null,
    frist: daten.frist || null,
    eingereicht_am: daten.eingereicht_am || null,
    entscheid_am: daten.entscheid_am || null,
    auszahlung_am: daten.auszahlung_am || null,
    bemerkung: daten.bemerkung || "",
    datei_pfad: daten.datei_pfad || null,
    datei_name: daten.datei_name || null
  };
}
function foerdergeldAnlegen(projektId, daten) {
  return schreiben(
    async () => pruefen(
      await supabase.from("foerdergelder").insert({ projekt_id: projektId, ...foerderFelder(daten) }).select().single()
    )
  );
}
function foerdergeldAktualisieren(id, daten, geladenAm) {
  return schreiben(async () => {
    await konfliktPruefen("foerdergelder", id, geladenAm);
    return pruefen(await supabase.from("foerdergelder").update(daten).eq("id", id).select().single());
  });
}
function foerdergeldLoeschen(id) {
  return schreiben(async () => pruefen(await supabase.from("foerdergelder").delete().eq("id", id)));
}
function einladungenLaden(projektId) {
  return lesen(
    async () => pruefen(
      await supabase.from("einladungen").select("*").eq("projekt_id", projektId).order("erstellt_am", { ascending: false })
    )
  );
}
function einladungAnlegen(projektId, email, rolle) {
  return schreiben(
    async () => pruefen(
      await supabase.from("einladungen").insert({ projekt_id: projektId, email: (email || "").trim(), rolle }).select().single()
    )
  );
}
function einladungZuruecknehmen(id) {
  return schreiben(async () => pruefen(await supabase.from("einladungen").delete().eq("id", id)));
}
function einladungInfo(token) {
  return lesen(async () => {
    const zeilen = pruefen(await supabase.rpc("einladung_info", { p_token: token }));
    return Array.isArray(zeilen) ? zeilen[0] || null : zeilen;
  });
}
function einladungEinloesen(token) {
  return schreiben(async () => pruefen(await supabase.rpc("einladung_einloesen", { p_token: token })));
}
function budgetLaden(projektId) {
  return lesen(
    async () => pruefen(
      await supabase.from("budgetpositionen").select("*").eq("projekt_id", projektId).order("sortierung").order("erstellt_am")
    )
  );
}
function budgetAnlegen(projektId, { kategorie, betrag, bemerkung, beruecksichtigt }) {
  return schreiben(
    async () => pruefen(
      await supabase.from("budgetpositionen").insert({
        projekt_id: projektId,
        kategorie,
        betrag: betrag || 0,
        bemerkung: bemerkung || "",
        beruecksichtigt: beruecksichtigt !== false
      }).select().single()
    )
  );
}
function budgetAktualisieren(id, daten, geladenAm) {
  return schreiben(async () => {
    await konfliktPruefen("budgetpositionen", id, geladenAm);
    return pruefen(await supabase.from("budgetpositionen").update(daten).eq("id", id).select().single());
  });
}
function budgetLoeschen(id) {
  return schreiben(async () => pruefen(await supabase.from("budgetpositionen").delete().eq("id", id)));
}
function offertenLaden(projektId) {
  return lesen(
    async () => pruefen(
      await supabase.from("offerten").select("*, offert_positionen(*)").eq("projekt_id", projektId).order("erstellt_am")
    )
  );
}
function offerteSpeichern(projektId, offerte, geladenAm) {
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
      datei_pfad: offerte.datei_pfad ?? void 0,
      datei_name: offerte.datei_name ?? void 0,
      ki_erkannt: !!offerte.ki_erkannt,
      ki_geprueft: !!offerte.ki_geprueft
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
      p_positionen: offerte.positionen || []
    });
    if (error) throw error;
    return zeile;
  });
}
function offerteLoeschen(id) {
  return schreiben(async () => pruefen(await supabase.from("offerten").delete().eq("id", id)));
}
function eigeneHandwerkerOfferte(offerteId) {
  return lesen(
    async () => pruefen(
      await supabase.from("offerten").select("*, offert_positionen(*)").eq("id", offerteId).single()
    )
  );
}
function belegeLaden(projektId) {
  return lesen(
    async () => pruefen(
      await supabase.from("belege").select("*").eq("projekt_id", projektId).order("erstellt_am")
    )
  );
}
function belegSpeichern(projektId, beleg, geladenAm) {
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
      datei_pfad: beleg.datei_pfad ?? void 0,
      datei_name: beleg.datei_name ?? void 0,
      ki_erkannt: !!beleg.ki_erkannt,
      ki_geprueft: !!beleg.ki_geprueft
    };
    if (beleg.id) {
      await konfliktPruefen("belege", beleg.id, geladenAm);
      return pruefen(await supabase.from("belege").update(zeile).eq("id", beleg.id).select().single());
    }
    return pruefen(await supabase.from("belege").insert(zeile).select().single());
  });
}
function belegLoeschen(id) {
  return schreiben(async () => pruefen(await supabase.from("belege").delete().eq("id", id)));
}
function dokumenteLaden(projektId) {
  return lesen(
    async () => pruefen(
      await supabase.from("dokumente").select("*").eq("projekt_id", projektId).order("erstellt_am")
    )
  );
}
function dokumenteAnlegen(projektId, dokumente) {
  return schreiben(
    async () => pruefen(
      await supabase.from("dokumente").insert(dokumente.map((d) => ({ ...d, projekt_id: projektId }))).select()
    )
  );
}
function dokumentAktualisieren(id, daten, geladenAm) {
  return schreiben(async () => {
    await konfliktPruefen("dokumente", id, geladenAm);
    return pruefen(await supabase.from("dokumente").update(daten).eq("id", id).select().single());
  });
}
function dokumentLoeschen(id) {
  return schreiben(async () => pruefen(await supabase.from("dokumente").delete().eq("id", id)));
}
function kostenvergleichLaden(projektId) {
  return lesen(
    async () => pruefen(await supabase.from("v_kostenvergleich").select("*").eq("projekt_id", projektId))
  );
}
function projektAbonnieren(projektId, aufAenderung) {
  const kanal = supabase.channel("projekt-" + projektId).on("postgres_changes", { event: "*", schema: "public", table: "budgetpositionen", filter: "projekt_id=eq." + projektId }, () => aufAenderung("budget")).on("postgres_changes", { event: "*", schema: "public", table: "offerten", filter: "projekt_id=eq." + projektId }, () => aufAenderung("offerten")).on("postgres_changes", { event: "*", schema: "public", table: "offert_positionen" }, () => aufAenderung("offerten")).on("postgres_changes", { event: "*", schema: "public", table: "belege", filter: "projekt_id=eq." + projektId }, () => aufAenderung("belege")).on("postgres_changes", { event: "*", schema: "public", table: "dokumente", filter: "projekt_id=eq." + projektId }, () => aufAenderung("dokumente")).on("postgres_changes", { event: "*", schema: "public", table: "kaufnebenkosten", filter: "projekt_id=eq." + projektId }, () => aufAenderung("nebenkosten")).on("postgres_changes", { event: "*", schema: "public", table: "foerdergelder", filter: "projekt_id=eq." + projektId }, () => aufAenderung("foerdergelder")).on("postgres_changes", { event: "*", schema: "public", table: "anschaffungen", filter: "projekt_id=eq." + projektId }, () => aufAenderung("anschaffungen")).on("postgres_changes", { event: "*", schema: "public", table: "projekt_mitglieder", filter: "projekt_id=eq." + projektId }, () => aufAenderung("mitglieder")).subscribe();
  return () => supabase.removeChannel(kanal);
}
var DatenFehler, VORGANG_ZEITLIMIT_MS, UPLOAD_ZEITLIMIT_MS, lesen, ANALYSE_ZEITLIMIT_MS;
var init_daten = __esm({
  "app/js/daten.js"() {
    init_supabase();
    DatenFehler = class extends Error {
      constructor(text2, keineVerbindung) {
        super(text2);
        this.keineVerbindung = !!keineVerbindung;
      }
    };
    VORGANG_ZEITLIMIT_MS = 15e3;
    UPLOAD_ZEITLIMIT_MS = 13e4;
    lesen = schreiben;
    ANALYSE_ZEITLIMIT_MS = 16e4;
  }
});

// app/js/format.js
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function chf(n, mitWaehrung = true) {
  const z = Number.isFinite(+n) ? +n : 0;
  const neg = z < 0;
  const t = Math.abs(z).toFixed(2).split(".");
  t[0] = t[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return (neg ? "−" : "") + (mitWaehrung ? "CHF " : "") + t[0] + "." + t[1];
}
function chfKurz(n) {
  const z = Number.isFinite(+n) ? +n : 0;
  const neg = z < 0;
  let t = Math.round(Math.abs(z)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return (neg ? "−" : "") + "CHF " + t + ".–";
}
function datumCH(iso) {
  if (!iso) return "–";
  const t = String(iso).split("-");
  if (t.length !== 3) return iso;
  return t[2] + "." + t[1] + "." + t[0];
}
function heuteISO() {
  const d = /* @__PURE__ */ new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function zahl(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v == null || v === "") return 0;
  const s = String(v).replace(/['\s’]/g, "").replace(",", ".").replace(/[^0-9.\-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
function dateigroesse(bytes) {
  if (!Number.isFinite(+bytes)) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return Math.round(kb) + " KB";
  return (kb / 1024).toFixed(1) + " MB";
}
function meldung(text2, fehler) {
  const box = document.getElementById("meldung");
  if (!box) return;
  const d = document.createElement("div");
  d.className = "toast" + (fehler ? " fehler" : "");
  d.textContent = text2;
  box.appendChild(d);
  setTimeout(() => d.remove(), fehler ? 6e3 : 3200);
}
function bestaetigen(text2) {
  return window.confirm(text2);
}
var init_format = __esm({
  "app/js/format.js"() {
  }
});

// app/js/ansichten/anmeldung.js
function render() {
  if (Z.einladung && modus === "anmelden" && !schonUmgeschaltet) {
    schonUmgeschaltet = true;
    modus = "registrieren";
  }
  const titel = { anmelden: "Anmelden", registrieren: "Konto erstellen", zuruecksetzen: "Passwort zurücksetzen" }[modus];
  return '<div class="anmelde-buehne"><div class="karte karte-pad anmelde-karte"><div class="anmelde-kopf"><b>Tulpenweg 37</b><span>Sanierungs- und Dokumentenverwaltung</span></div>' + (hinweis ? '<div class="hinweis info" style="margin-bottom:14px"><div>' + esc(hinweis) + "</div></div>" : "") + (Z.authHinweis ? '<div class="hinweis warn" style="margin-bottom:14px"><div>' + esc(Z.authHinweis) + "</div></div>" : "") + (Z.einladung ? '<div class="hinweis info" style="margin-bottom:14px"><div><b>Einladung zu «' + esc(Z.einladung.projekt_name) + "»</b>" + (Z.einladung.gueltig ? "Als " + esc(ROLLEN[Z.einladung.rolle] || Z.einladung.rolle) + ". Legen Sie ein Konto an oder melden Sie sich an – danach sind Sie automatisch dabei." : "Dieser Einladungslink ist nicht mehr gültig. Bitte einen neuen anfordern.") + "</div></div>" : "") + (speicherIstFluechtig ? '<div class="hinweis warn" style="margin-bottom:14px"><div><b>Websitedaten sind blockiert</b>Die Anmeldung gilt nur für diese Sitzung und geht beim Neuladen verloren. In den Browser-Einstellungen für diese Seite Cookies und Websitedaten erlauben.</div></div>' : "") + '<form id="anmelde-formular"><h2 style="margin-bottom:14px">' + titel + '</h2><label class="feld"><span>E-Mail</span><input type="email" id="a-email" required autocomplete="email"></label>' + (modus !== "zuruecksetzen" ? '<label class="feld"><span>Passwort</span><input type="password" id="a-passwort" required minlength="6" autocomplete="' + (modus === "registrieren" ? "new-password" : "current-password") + '"></label>' : "") + '<button class="btn breit" type="submit">' + { anmelden: "Anmelden", registrieren: "Konto erstellen", zuruecksetzen: "Link senden" }[modus] + '</button></form><div class="anmelde-wechsel">' + wechselLinks() + "</div></div></div>";
}
function wechselLinks() {
  if (modus === "anmelden") {
    return 'Noch kein Konto? <button type="button" data-aktion="modus-registrieren">Registrieren</button><br><button type="button" data-aktion="modus-zuruecksetzen">Passwort vergessen?</button>';
  }
  if (modus === "registrieren") {
    return 'Bereits ein Konto? <button type="button" data-aktion="modus-anmelden">Anmelden</button>';
  }
  return '<button type="button" data-aktion="modus-anmelden">Zurück zur Anmeldung</button>';
}
function aktion(a) {
  if (a === "modus-anmelden") {
    modus = "anmelden";
    hinweis = "";
  } else if (a === "modus-registrieren") {
    modus = "registrieren";
    hinweis = "";
  } else if (a === "modus-zuruecksetzen") {
    modus = "zuruecksetzen";
    hinweis = "";
  } else return;
  neuZeichnen();
}
async function formularAbschicken(form) {
  const knopf = form.querySelector("button[type=submit]");
  const email = form.querySelector("#a-email").value.trim();
  const passwortFeld = form.querySelector("#a-passwort");
  const passwort = passwortFeld ? passwortFeld.value : "";
  knopf.disabled = true;
  try {
    if (modus === "anmelden") {
      await anmelden(email, passwort);
      knopf.textContent = "Anmeldung läuft …";
      return;
    } else if (modus === "registrieren") {
      await registrieren(email, passwort);
      hinweis = "Konto erstellt. Falls eine Bestätigung nötig ist, prüfen Sie Ihr E-Mail-Postfach.";
      modus = "anmelden";
      neuZeichnen();
    } else if (modus === "zuruecksetzen") {
      await passwortZuruecksetzen(email);
      hinweis = "Falls diese E-Mail-Adresse registriert ist, wurde ein Link zum Zurücksetzen gesendet.";
      modus = "anmelden";
      neuZeichnen();
    }
  } catch (e) {
    meldung(uebersetzeFehler(e.message), true);
  } finally {
    knopf.disabled = false;
  }
}
function uebersetzeFehler(text2) {
  if (/abort|timeout/i.test(text2)) return "Der Server hat nicht geantwortet (Zeitüberschreitung). Bitte Verbindung prüfen.";
  if (/Invalid login credentials/i.test(text2)) return "E-Mail oder Passwort ist falsch.";
  if (/already registered|already exists/i.test(text2)) return "Für diese E-Mail-Adresse besteht bereits ein Konto.";
  if (/fetch|network/i.test(text2)) return "Keine Verbindung zum Server. Bitte Internetverbindung prüfen.";
  return text2;
}
var modus, hinweis, schonUmgeschaltet;
var init_anmeldung = __esm({
  "app/js/ansichten/anmeldung.js"() {
    init_format();
    init_supabase();
    init_app();
    init_konfig();
    modus = "anmelden";
    hinweis = "";
    schonUmgeschaltet = false;
  }
});

// app/js/ansichten/gemeinsam.js
function offerteNetto(o) {
  return (o.offert_positionen || []).reduce((s, p) => s + zahl(p.zeilentotal), 0);
}
function offerteMwstSatz(o) {
  return o.mwst_satz == null ? 0 : zahl(o.mwst_satz);
}
function offerteMwst(o) {
  return offerteNetto(o) * (offerteMwstSatz(o) / 100);
}
function offerteTotal(o) {
  return offerteNetto(o) + offerteMwst(o);
}
function offerteZaehlt(o) {
  return o.status !== "Abgelehnt";
}
function belegBrutto(b) {
  return zahl(b.brutto);
}
function budgetZaehlt(p) {
  return p.beruecksichtigt !== false;
}
function foerderIstSicher(f) {
  return FOERDER_STATUS_SICHER.includes(f.status);
}
function foerderIstOffen(f) {
  return f.status === "Geplant" || f.status === "Beantragt";
}
function summen(Z2) {
  const gesamtbudget = zahl(Z2.projekt?.gesamtbudget);
  const kaufpreis = zahl(Z2.projekt?.kaufpreis);
  const kaufnebenkosten = (Z2.nebenkosten || []).reduce((s, n) => s + zahl(n.betrag), 0);
  const rahmen = gesamtbudget - kaufpreis - kaufnebenkosten;
  const budgetiert = Z2.budget.filter(budgetZaehlt).reduce((s, p) => s + zahl(p.betrag), 0);
  const spaeter = Z2.budget.filter((p) => !budgetZaehlt(p)).reduce((s, p) => s + zahl(p.betrag), 0);
  const spaeterAnzahl = Z2.budget.filter((p) => !budgetZaehlt(p)).length;
  const offerten = Z2.offerten.filter(offerteZaehlt).reduce((s, o) => s + offerteTotal(o), 0);
  const rechnungen = Z2.belege.reduce((s, b) => s + belegBrutto(b), 0);
  const bezahlt = Z2.belege.filter((b) => b.bezahlt).reduce((s, b) => s + belegBrutto(b), 0);
  let verpflichtet = 0;
  Z2.offerten.filter((o) => o.status === "Beauftragt").forEach((o) => {
    const verrechnet = Z2.belege.filter((b) => b.offerte_id === o.id).reduce((s, b) => s + belegBrutto(b), 0);
    verpflichtet += Math.max(0, offerteTotal(o) - verrechnet);
  });
  const foerder = Z2.foerdergelder || [];
  const foerderGesichert = foerder.filter(foerderIstSicher).reduce((s, f) => s + zahl(f.betrag), 0);
  const foerderErwartet = foerder.filter(foerderIstOffen).reduce((s, f) => s + zahl(f.betrag), 0);
  const foerderAusbezahlt = foerder.filter((f) => f.status === "Ausbezahlt").reduce((s, f) => s + zahl(f.betrag), 0);
  const anschaffungen = Z2.anschaffungen || [];
  const anschaffungenSumme = anschaffungen.reduce((s, a) => s + zahl(a.betrag), 0);
  const anschaffungenBezahlt = anschaffungen.filter((a) => a.bezahlt).reduce((s, a) => s + zahl(a.betrag), 0);
  const kreditVerwendet = anschaffungen.filter((a) => a.finanzierung !== "Eigenmittel").reduce((s, a) => s + zahl(a.betrag), 0);
  const kreditRahmen = zahl(Z2.projekt?.kredit_rahmen);
  return {
    gesamtbudget,
    kaufpreis,
    kaufnebenkosten,
    rahmen,
    budgetiert,
    spaeter,
    spaeterAnzahl,
    anschaffungenSumme,
    anschaffungenBezahlt,
    kreditVerwendet,
    kreditRahmen,
    kreditFrei: kreditRahmen - kreditVerwendet,
    offerten,
    rechnungen,
    bezahlt,
    verpflichtet,
    foerderGesichert,
    foerderErwartet,
    foerderAusbezahlt,
    offen: rechnungen - bezahlt,
    verfuegbar: rahmen - rechnungen - verpflichtet + foerderGesichert
  };
}
function kpi(label, wert, zusatz, klasse) {
  return '<div class="kpi ' + (klasse || "") + '"><div class="label">' + esc(label) + '</div><div class="wert zahl">' + wert + '</div><div class="zusatz">' + esc(zusatz) + "</div></div>";
}
function statusBadge(status) {
  const farbe = { Entwurf: "", Erfasst: "blau", Verglichen: "blau", Beauftragt: "gruen", Abgelehnt: "rot" };
  return '<span class="badge ' + (farbe[status] || "") + '">' + esc(status || "Entwurf") + "</span>";
}
function leerZustand(titel, text2, knopf) {
  return '<div class="karte leer"><b>' + esc(titel) + "</b>" + esc(text2) + (knopf ? '<div style="margin-top:14px">' + knopf + "</div>" : "") + "</div>";
}
function listenKarte(titel, ansicht, eintraege) {
  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><h2>' + esc(titel) + '</h2><button class="btn still klein" type="button" data-ansicht="' + ansicht + '">Alle</button></div><div class="karte karte-pad">';
  if (!eintraege.length) {
    h += '<div class="leer" style="padding:10px 0">Noch nichts erfasst.</div>';
  } else {
    h += '<ul class="liste">' + eintraege.map(
      (e) => '<li><div class="haupt"><div class="titel">' + esc(e.titel) + '</div><div class="unter">' + e.unter + " " + (e.badge || "") + "</div></div>" + (e.betrag ? '<div class="betrag">' + e.betrag + "</div>" : "") + "</li>"
    ).join("") + "</ul>";
  }
  return h + "</div></section>";
}
function kategorieOptionen(budget, gewaehlt) {
  return '<option value=""' + (!gewaehlt ? " selected" : "") + ">Nicht zugeordnet</option>" + budget.map((p) => '<option value="' + p.id + '"' + (p.id === gewaehlt ? " selected" : "") + ">" + esc(p.kategorie) + "</option>").join("");
}
function kategorieName(budget, id) {
  const p = budget.find((x) => x.id === id);
  return p ? p.kategorie : "Nicht zugeordnet";
}
function ladeSchritte(schritte, aktiv) {
  return '<ul class="lade-schritte">' + schritte.map(
    (t, i) => "<li" + (i < aktiv ? ' class="fertig"' : "") + ">" + esc(t) + "</li>"
  ).join("") + "</ul>";
}
var init_gemeinsam = __esm({
  "app/js/ansichten/gemeinsam.js"() {
    init_format();
    init_konfig();
  }
});

// app/js/import.js
function paketAusDatei(text2) {
  let paket;
  try {
    paket = JSON.parse(text2);
  } catch (e) {
    throw new Error("Die Datei ist keine gültige Sicherung: " + e.message);
  }
  const daten = paket && paket.daten ? paket.daten : paket;
  if (!daten || !Array.isArray(daten.budget) || !Array.isArray(daten.offerten)) {
    throw new Error("Die Datei enthält keine Projektdaten dieses Prototyps.");
  }
  ["budget", "offerten", "belege", "dokumente"].forEach((k) => {
    if (!Array.isArray(daten[k])) daten[k] = [];
  });
  return { erstellt: paket.erstellt || null, daten };
}
function importVorschau(daten) {
  const kategorien = /* @__PURE__ */ new Set();
  daten.budget.forEach((p) => p.kategorie && kategorien.add(p.kategorie));
  daten.offerten.forEach((o) => o.kategorie && kategorien.add(o.kategorie));
  daten.belege.forEach((b) => b.kategorie && kategorien.add(b.kategorie));
  daten.dokumente.forEach((d) => d.kategorie && kategorien.add(d.kategorie));
  return {
    budget: daten.budget.length,
    offerten: daten.offerten.length,
    belege: daten.belege.length,
    dokumente: daten.dokumente.length,
    kategorien: kategorien.size
  };
}
function marke(projektId, erstellt) {
  return "tw-import-" + projektId + "-" + (erstellt || "ohne-datum");
}
function bereitsImportiert(projektId, erstellt) {
  try {
    return !!localStorage.getItem(marke(projektId, erstellt));
  } catch (e) {
    return false;
  }
}
async function importDurchfuehren(projektId, erstellt, daten) {
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
  const alleKategorien = /* @__PURE__ */ new Set();
  daten.offerten.forEach((o) => o.kategorie && alleKategorien.add(o.kategorie));
  daten.belege.forEach((b) => b.kategorie && alleKategorien.add(b.kategorie));
  daten.dokumente.forEach((d) => d.kategorie && alleKategorien.add(d.kategorie));
  for (const kategorie of alleKategorien) {
    if (kategorieZuId.has(kategorie)) continue;
    const zeile = await budgetAnlegen(projektId, { kategorie, betrag: 0, bemerkung: "beim Import angelegt" });
    kategorieZuId.set(kategorie, zeile.id);
    neueBudgetpositionen++;
  }
  const offerteIdAlt2Neu = /* @__PURE__ */ new Map();
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
        nr: p.nr || "",
        beschreibung: p.beschreibung || "",
        menge: zahl(p.menge) || 1,
        einheit: p.einheit || "pauschal",
        einzelpreis: zahl(p.preis),
        sortierung: i
      }))
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
      ki_erkannt: !!b.demoErkannt
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
        bemerkung: (d.bemerkung || "") + " (importiert, ohne Datei)"
      }))
    );
  }
  try {
    localStorage.setItem(marke(projektId, erstellt), (/* @__PURE__ */ new Date()).toISOString());
  } catch (e) {
  }
  return {
    budgetpositionen: neueBudgetpositionen,
    offerten: daten.offerten.length,
    belege: daten.belege.length,
    dokumente: daten.dokumente.length
  };
}
var init_import = __esm({
  "app/js/import.js"() {
    init_format();
    init_daten();
  }
});

// app/js/ansichten/uebersicht.js
var uebersicht_exports = {};
__export(uebersicht_exports, {
  aenderung: () => aenderung,
  aktion: () => aktion2,
  render: () => render2,
  renderProjektAnlegen: () => renderProjektAnlegen
});
function renderProjektAnlegen() {
  return '<main><div style="max-width:480px;margin:40px auto;padding:0 14px"><div class="karte karte-pad"><h2>Projekt einrichten</h2><p style="margin:6px 0 16px;font-size:.87rem;color:var(--text-2)">Objekt, Adresse, Kaufpreis und Gesamtbudget sind noch nicht erfasst.</p><label class="feld"><span>Objekt / Projektname</span><input id="p-name" placeholder="z.B. Einfamilienhaus Tulpenweg 37"></label><label class="feld"><span>Adresse</span><input id="p-adresse" placeholder="Strasse Nr., PLZ Ort"></label><label class="feld"><span>Kaufpreis (CHF)</span><input id="p-kauf" inputmode="decimal" placeholder="0"></label><p style="margin:-4px 0 12px;font-size:.78rem;color:var(--grau)">Kaufnebenkosten (Notariat, Handänderungssteuer, Grundbuch …) erfassen Sie danach einzeln in der Übersicht.</p><label class="feld"><span>Gesamtbudget (CHF)</span><input id="p-gesamt" inputmode="decimal" placeholder="0"></label><div id="p-fehler"></div><button class="btn breit" type="button" data-aktion="projekt-anlegen">Projekt anlegen</button></div></div></main>';
}
function render2(Z2) {
  const s = summen(Z2);
  let h = "";
  const anteilRahmen = s.rahmen > 0 ? Math.min(100, s.rechnungen / s.rahmen * 100) : 0;
  h += '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Übersicht</h2><p>' + esc([Z2.projekt.name, Z2.projekt.adresse].filter(Boolean).join(" · ") || "Projekt ohne Namen") + " · Stand " + datumCH(heuteISO()) + '</p></div><button class="btn still klein" type="button" data-aktion="eckdaten">Eckdaten</button></div><div class="kpi-raster"><div class="kpi gross"><div class="label">Verfügbar für die Sanierung</div><div class="wert zahl">' + chfKurz(s.verfuegbar) + '</div><div class="zusatz">Sanierungsrahmen ' + chfKurz(s.rahmen) + " abzüglich Rechnungen und beauftragter Offerten" + (s.foerderGesichert ? ", zuzüglich gesicherter Fördergelder " + chfKurz(s.foerderGesichert) : "") + "</div></div>" + kpi("Gesamtbudget", chfKurz(s.gesamtbudget), "inkl. Kaufpreis und Nebenkosten", "") + kpi(
    "Kaufpreis",
    chfKurz(s.kaufpreis),
    s.kaufnebenkosten ? "zzgl. Nebenkosten " + chfKurz(s.kaufnebenkosten) : "ohne Nebenkosten",
    ""
  ) + kpi(
    "Kaufnebenkosten",
    chfKurz(s.kaufnebenkosten),
    (Z2.nebenkosten || []).length + " Positionen, siehe unten",
    ""
  ) + kpi("Sanierungsrahmen", chfKurz(s.rahmen), "Gesamtbudget − Kaufpreis − Nebenkosten", "rand-blau") + kpi("Offertsumme", chfKurz(s.offerten), Z2.offerten.length + " Offerten, ohne abgelehnte", "rand-blau") + kpi("Rechnungssumme", chfKurz(s.rechnungen), Z2.belege.length + " Belege, inkl. MWST", "rand-amber") + kpi("Bezahlt", chfKurz(s.bezahlt), "offen: " + chfKurz(s.offen), "rand-gruen") + (s.foerderGesichert || s.foerderErwartet ? kpi(
    "Fördergelder gesichert",
    chfKurz(s.foerderGesichert),
    s.foerderErwartet ? "erwartet: " + chfKurz(s.foerderErwartet) : "zugesichert oder ausbezahlt",
    "rand-gruen"
  ) : "") + (s.anschaffungenSumme ? kpi(
    "Anschaffungen",
    chfKurz(s.anschaffungenSumme),
    s.kreditVerwendet ? "ausserhalb des Budgets · Kredit " + chfKurz(s.kreditVerwendet) : "ausserhalb des Sanierungsbudgets",
    ""
  ) : "") + (s.spaeter ? kpi(
    "Später vorgesehen",
    chfKurz(s.spaeter),
    s.spaeterAnzahl + (s.spaeterAnzahl === 1 ? " Position zählt" : " Positionen zählen") + " noch nicht mit",
    ""
  ) : "") + "</div></section>";
  const b1 = s.rahmen > 0 ? Math.max(0, Math.min(100, s.bezahlt / s.rahmen * 100)) : 0;
  const b2 = s.rahmen > 0 ? Math.max(0, Math.min(100 - b1, (s.rechnungen - s.bezahlt) / s.rahmen * 100)) : 0;
  const b3 = s.rahmen > 0 ? Math.max(0, Math.min(100 - b1 - b2, s.verpflichtet / s.rahmen * 100)) : 0;
  h += '<section class="abschnitt"><div class="karte karte-pad"><div class="abschnitt-kopf" style="margin-left:0;margin-right:0"><div><h3>Sanierungsbudget</h3><p>' + Math.round(anteilRahmen) + ' % des Rahmens sind verrechnet</p></div><div class="zahl" style="font-weight:650">' + chfKurz(s.rechnungen) + " / " + chfKurz(s.rahmen) + '</div></div><div class="balken"><i class="b-bezahlt" style="width:' + b1.toFixed(2) + '%"></i><i class="b-offen" style="width:' + b2.toFixed(2) + '%"></i><i class="b-verpflichtet" style="width:' + b3.toFixed(2) + '%"></i></div><div class="legende"><span><i class="punkt" style="background:var(--blau-700)"></i>bezahlt ' + chfKurz(s.bezahlt) + '</span><span><i class="punkt" style="background:#8FB6D4"></i>Rechnungen offen ' + chfKurz(s.offen) + '</span><span><i class="punkt" style="background:#D3DFEA"></i>beauftragt, noch ohne Rechnung ' + chfKurz(s.verpflichtet) + "</span></div>" + (s.budgetiert > s.rahmen ? '<div class="hinweis warn" style="margin-top:12px"><div>Die Budgetpositionen ergeben ' + chf(s.budgetiert) + " und liegen damit über dem Sanierungsrahmen von " + chf(s.rahmen) + ".</div></div>" : "") + "</div></section>";
  const kats = (Z2.kostenvergleich || []).filter((k) => k.budget > 0 || k.ist > 0).slice(0, 8);
  h += '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Kosten nach Kategorien</h2><p>Ist-Kosten im Vergleich zum Budget</p></div><button class="btn still klein" type="button" data-ansicht="budget">Alle</button></div><div class="karte karte-pad">';
  if (!kats.length) {
    h += '<div class="leer" style="padding:8px 0">Noch keine Kosten erfasst.</div>';
  } else {
    kats.forEach((k) => {
      const basis = Math.max(k.budget, k.ist, 1);
      const breite = Math.min(100, k.ist / basis * 100);
      const ueber = k.budget > 0 && k.ist > k.budget;
      h += '<div class="kat-zeile"><div class="kat-kopf"><b>' + esc(k.kategorie) + "</b>" + (budgetZaehlt(k) ? "" : ' <span class="badge">später</span>') + '<span class="zahl">' + chfKurz(k.ist) + " / " + chfKurz(k.budget) + '</span></div><div class="mini"><i class="' + (ueber ? "ueber" : "") + '" style="width:' + breite.toFixed(1) + '%"></i></div></div>';
    });
  }
  h += "</div></section>";
  h += '<div class="zwei-spalten">';
  h += listenKarte("Letzte Offerten", "offerten", Z2.offerten.slice().reverse().slice(0, 4).map((o) => ({
    titel: (o.lieferant || "Ohne Lieferant") + " · " + (o.nummer || "ohne Nummer"),
    unter: datumCH(o.datum) + " · " + esc(kategorieName(Z2.budget, o.budgetposition_id)),
    betrag: chfKurz(offerteTotal(o)),
    badge: statusBadge(o.status)
  })));
  h += listenKarte("Letzte Belege", "belege", Z2.belege.slice().reverse().slice(0, 4).map((b) => ({
    titel: (b.lieferant || "Ohne Lieferant") + " · " + (b.nummer || "ohne Nummer"),
    unter: datumCH(b.datum) + " · " + esc(kategorieName(Z2.budget, b.budgetposition_id)),
    betrag: chfKurz(belegBrutto(b)),
    badge: b.bezahlt ? '<span class="badge gruen">bezahlt</span>' : '<span class="badge amber">offen</span>'
  })));
  h += "</div>";
  h += listenKarte("Letzte Dokumente", "dokumente", Z2.dokumente.slice().reverse().slice(0, 5).map((d) => ({
    titel: d.dateiname || "Ohne Namen",
    unter: (d.typ || "Sonstiges") + " · " + datumCH(d.datum),
    betrag: "",
    badge: ""
  })));
  h += nebenkostenAbschnitt(Z2);
  h += mitgliederAbschnitt(Z2);
  h += datenAbschnitt(Z2);
  h += kontoAbschnitt(Z2);
  return h;
}
function nebenkostenAbschnitt(Z2) {
  const liste = Z2.nebenkosten || [];
  const summe = liste.reduce((a, n) => a + zahl(n.betrag), 0);
  const bezahlt = liste.filter((n) => n.bezahlt).reduce((a, n) => a + zahl(n.betrag), 0);
  const bearbeitbar = Z2.meineRolle === "eigentuemer" || Z2.meineRolle === "bearbeiter";
  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Kaufnebenkosten</h2><p>' + (liste.length ? chf(summe) + " · davon bezahlt " + chf(bezahlt) : "Notariat, Steuern, Grundbuch, Schätzung …") + "</p></div>" + (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="neben-neu">+ Position</button>' : "") + '</div><div class="karte">';
  if (!liste.length) {
    h += '<div class="leer" style="padding:16px">Noch keine Nebenkosten erfasst.' + (bearbeitbar ? '<div style="margin-top:12px"><button class="btn zweit klein" type="button" data-aktion="neben-neu">Erste Position erfassen</button></div>' : "") + "</div>";
    return h + "</div></section>";
  }
  h += '<div class="tab-scroll"><table><thead><tr><th>Position</th><th>Datum</th><th class="num">Betrag</th><th>Status</th><th></th></tr></thead><tbody>';
  liste.forEach((n) => {
    h += "<tr><td><b>" + esc(n.bezeichnung || "ohne Bezeichnung") + "</b>" + (n.bemerkung ? '<div style="font-size:.76rem;color:var(--grau);white-space:normal;max-width:240px">' + esc(n.bemerkung) + "</div>" : "") + "</td><td>" + datumCH(n.datum) + '</td><td class="num">' + chf(n.betrag) + "</td><td>" + (n.bezahlt ? '<span class="badge gruen">bezahlt</span>' : '<span class="badge amber">offen</span>') + '</td><td><div class="zeile-aktion">' + (bearbeitbar ? '<button class="btn still klein" type="button" data-aktion="neben-bearbeiten" data-id="' + n.id + '">Bearbeiten</button><button class="btn still klein" type="button" data-aktion="neben-loeschen" data-id="' + n.id + '">Löschen</button>' : "") + "</div></td></tr>";
  });
  h += '</tbody><tfoot><tr><td>Total</td><td></td><td class="num">' + chf(summe) + '</td><td colspan="2"></td></tr></tfoot></table></div>';
  return h + "</div></section>";
}
function nebenkostenFormular(Z2, n) {
  modalOeffnen({
    titel: n ? "Nebenkosten bearbeiten" : "Kaufnebenkosten erfassen",
    koerper: '<label class="feld"><span>Position</span><input id="n-bezeichnung" list="neben-arten" value="' + esc(n ? n.bezeichnung : "") + '" placeholder="z.B. Notariat"><datalist id="neben-arten">' + NEBENKOSTEN_ARTEN.map((a) => '<option value="' + esc(a) + '">').join("") + '</datalist></label><div class="feld-paar"><label class="feld"><span>Betrag (CHF)</span><input id="n-betrag" inputmode="decimal" value="' + (n ? zahl(n.betrag) : "") + '"></label><label class="feld"><span>Datum</span><input type="date" id="n-datum" value="' + esc(n && n.datum ? n.datum : "") + '"></label></div><label class="check"><input type="checkbox" id="n-bezahlt"' + (n && n.bezahlt ? " checked" : "") + '> bereits bezahlt</label><label class="feld"><span>Bemerkung</span><textarea id="n-bemerkung" placeholder="optional">' + esc(n ? n.bemerkung : "") + "</textarea></label>",
    speichern: async () => {
      const bezeichnung = document.getElementById("n-bezeichnung").value.trim();
      const betrag = zahl(document.getElementById("n-betrag").value);
      if (!bezeichnung) {
        meldung("Bitte die Position benennen.", true);
        return false;
      }
      const daten = {
        bezeichnung,
        betrag,
        datum: document.getElementById("n-datum").value || null,
        bezahlt: document.getElementById("n-bezahlt").checked,
        bemerkung: document.getElementById("n-bemerkung").value.trim()
      };
      try {
        if (n) await nebenkostenAktualisieren(n.id, daten, n.geaendert_am);
        else await nebenkostenAnlegen(Z2.projektId, daten);
        meldung(n ? "Position aktualisiert." : "Position erfasst.");
        await neuLaden(["nebenkosten"]);
        return true;
      } catch (err) {
        meldung(err.message, true);
        return false;
      }
    }
  });
}
function kontoAbschnitt(Z2) {
  const projektWahl = Z2.projekte.length > 1 ? '<label class="feld" style="margin-top:12px"><span>Projekt wechseln</span><select id="projekt-wahl">' + Z2.projekte.map((p) => '<option value="' + p.id + '"' + (p.id === Z2.projektId ? " selected" : "") + ">" + esc(p.name || "Projekt") + "</option>").join("") + "</select></label>" : "";
  return '<section class="abschnitt"><div class="karte karte-pad"><h3>Konto</h3><p style="margin:5px 0 12px;font-size:.84rem;color:var(--grau)">Angemeldet als ' + esc(Z2.benutzer ? Z2.benutzer.email : "") + " · " + (ROLLEN[Z2.meineRolle] || "keine Rolle") + "</p>" + projektWahl + '<div class="btn-reihe"><button class="btn zweit" type="button" data-aktion="abmelden">Abmelden</button></div></div></section>';
}
function mitgliederAbschnitt(Z2) {
  const istEigentuemer2 = Z2.meineRolle === "eigentuemer";
  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Mitglieder</h2><p>Wer sieht und bearbeitet dieses Projekt</p></div>' + (istEigentuemer2 ? '<button class="btn klein" type="button" data-aktion="mitglied-neu">+ Mitglied</button>' : "") + '</div><div class="karte karte-pad">';
  h += (Z2.mitglieder || []).map((m) => {
    const ichSelbst = !!Z2.benutzer && m.benutzer_id === Z2.benutzer.id;
    return '<div class="mitglied-zeile"><div class="haupt"><b>' + esc(m.email || m.benutzer_id) + (ichSelbst ? " (Sie)" : "") + '</b><span style="font-size:.78rem;color:var(--grau)">' + ROLLEN[m.rolle] + "</span></div>" + (istEigentuemer2 && !ichSelbst ? '<select data-aenderung="mitglied-rolle" data-id="' + m.benutzer_id + '">' + Object.keys(ROLLEN).map((r) => '<option value="' + r + '"' + (r === m.rolle ? " selected" : "") + ">" + ROLLEN[r] + "</option>").join("") + '</select><button class="btn still klein" type="button" data-aktion="mitglied-entfernen" data-id="' + m.benutzer_id + '">Entfernen</button>' : "") + "</div>";
  }).join("");
  h += einladungenListe(Z2);
  h += "</div></section>";
  return h;
}
function einladungenListe(Z2) {
  if (Z2.meineRolle !== "eigentuemer") return "";
  const offen = (Z2.einladungen || []).filter((e) => !e.eingeloest_am);
  if (!offen.length) return "";
  return '<div style="margin-top:14px;border-top:1px solid var(--linie);padding-top:12px"><div style="font-size:.78rem;font-weight:600;color:var(--text-2);margin-bottom:8px">Offene Einladungen</div>' + offen.map(
    (e) => '<div class="mitglied-zeile"><div class="haupt"><b>' + esc(e.email || "ohne E-Mail") + '</b><span style="font-size:.78rem;color:var(--grau)">' + (ROLLEN[e.rolle] || e.rolle) + " · gültig bis " + datumCH((e.gueltig_bis || "").slice(0, 10)) + '</span></div><button class="btn zweit klein" type="button" data-aktion="einladung-teilen" data-token="' + esc(e.token) + '">Link</button><button class="btn still klein" type="button" data-aktion="einladung-zuruecknehmen" data-id="' + e.id + '">Zurückziehen</button></div>'
  ).join("") + "</div>";
}
function datenAbschnitt() {
  return '<section class="abschnitt"><div class="karte karte-pad"><h3>Prototyp-Sicherung übernehmen</h3><p style="margin:5px 0 12px;font-size:.84rem;color:var(--grau)">JSON-Export aus dem lokalen Prototyp (prototyp/index.html) einmalig in dieses Projekt einlesen. Hochgeladene Dateien sind darin nicht enthalten.</p><div class="btn-reihe"><button class="btn zweit" type="button" data-aktion="import">Sicherung importieren</button></div></div></section>';
}
function aenderung(e, Z2) {
  if (e.target.dataset.aenderung === "mitglied-rolle") {
    mitgliedRolleAendern(Z2.projektId, e.target.dataset.id, e.target.value).then(async () => {
      meldung("Rolle geändert.");
      Z2.mitglieder = await mitgliederLaden(Z2.projektId);
      neuZeichnen();
    }).catch((err) => {
      meldung(err.message, true);
      neuZeichnen();
    });
  }
}
async function aktion2(a, knopf, Z2) {
  const el2 = (id) => document.getElementById(id);
  if (a === "projekt-anlegen") {
    const fehlerFeld = el2("p-fehler");
    const zeigeFehler = (text2) => {
      if (fehlerFeld) {
        fehlerFeld.innerHTML = '<div class="hinweis fehler" style="margin-bottom:12px"><div><b>Anlegen fehlgeschlagen</b>' + esc(text2) + ' <a href="hilfe.html">Diagnose öffnen</a></div></div>';
      }
      meldung(text2, true);
    };
    const name = el2("p-name").value.trim();
    if (!name) {
      zeigeFehler("Bitte einen Projektnamen angeben.");
      return;
    }
    if (fehlerFeld) fehlerFeld.innerHTML = "";
    knopf.disabled = true;
    knopf.textContent = "Projekt wird angelegt …";
    try {
      const projekt = await projektAnlegen({
        name,
        adresse: el2("p-adresse").value.trim(),
        kaufpreis: zahl(el2("p-kauf").value),
        gesamtbudget: zahl(el2("p-gesamt").value)
      });
      Z.projekte.push(projekt);
      await projektWechseln(projekt.id);
      meldung("Projekt angelegt.");
    } catch (err) {
      try {
        const vorhanden = (await projekteLaden()).find((p) => p.name === name);
        if (vorhanden) {
          Z.projekte = await projekteLaden();
          await projektWechseln(vorhanden.id);
          meldung("Projekt war bereits angelegt.");
          return;
        }
      } catch (e2) {
      }
      knopf.disabled = false;
      knopf.textContent = "Projekt anlegen";
      zeigeFehler(err.message);
    }
    return;
  }
  if (a === "eckdaten") {
    const p = Z2.projekt;
    modalOeffnen({
      titel: "Eckdaten des Projekts",
      koerper: '<label class="feld"><span>Objekt / Projektname</span><input id="e-name" value="' + esc(p.name) + '"></label><label class="feld"><span>Adresse</span><input id="e-adresse" value="' + esc(p.adresse || "") + '"></label><label class="feld"><span>Kaufpreis (CHF)</span><input id="e-kauf" inputmode="decimal" value="' + (zahl(p.kaufpreis) || "") + '"></label><p style="margin:-4px 0 12px;font-size:.78rem;color:var(--grau)">Die Kaufnebenkosten stehen als eigene Liste in der Übersicht.</p><label class="feld"><span>Gesamtbudget (CHF)</span><input id="e-gesamt" inputmode="decimal" value="' + (zahl(p.gesamtbudget) || "") + '"></label><div class="hinweis info"><div>Sanierungsrahmen = Gesamtbudget − Kaufpreis − Kaufnebenkosten.</div></div>',
      speichern: async () => {
        try {
          const neu = await projektAktualisieren(p.id, {
            name: el2("e-name").value.trim(),
            adresse: el2("e-adresse").value.trim(),
            kaufpreis: zahl(el2("e-kauf").value),
            gesamtbudget: zahl(el2("e-gesamt").value)
          }, p.geaendert_am);
          Object.assign(Z.projekt, neu);
          const ix = Z.projekte.findIndex((x) => x.id === neu.id);
          if (ix !== -1) Z.projekte[ix] = neu;
          meldung("Eckdaten gespeichert.");
          neuZeichnen();
          return true;
        } catch (err) {
          meldung(err.message, true);
          return false;
        }
      }
    });
    return;
  }
  if (a === "neben-neu") return nebenkostenFormular(Z2, null);
  if (a === "neben-bearbeiten") return nebenkostenFormular(Z2, (Z2.nebenkosten || []).find((n) => n.id === knopf.dataset.id));
  if (a === "neben-loeschen") {
    const n = (Z2.nebenkosten || []).find((x) => x.id === knopf.dataset.id);
    if (n && bestaetigen('Position "' + (n.bezeichnung || "") + '" löschen?')) {
      try {
        await nebenkostenLoeschen(n.id);
        meldung("Position gelöscht.");
        await neuLaden(["nebenkosten"]);
      } catch (err) {
        meldung(err.message, true);
      }
    }
    return;
  }
  if (a === "mitglied-neu") {
    modalOeffnen({
      titel: "Person einladen",
      koerper: '<div class="hinweis info" style="margin-bottom:14px"><div>Sie erhalten einen Einladungslink zum Weiterschicken. Die Person braucht noch kein Konto – sie legt es beim Öffnen des Links an und ist danach automatisch dabei.</div></div><label class="feld"><span>E-Mail-Adresse (nur als Merkhilfe, optional)</span><input id="m-email" type="email" placeholder="partnerin@beispiel.ch"></label><label class="feld"><span>Rolle</span><select id="m-rolle"><option value="bearbeiter" selected>Bearbeiter – lesen und schreiben</option><option value="leser">Leser – nur lesen</option><option value="handwerker">Handwerker – nur die zugewiesene Offerte</option></select></label>',
      knopfText: "Link erzeugen",
      speichern: async () => {
        try {
          const einladung = await einladungAnlegen(Z2.projektId, el2("m-email").value, el2("m-rolle").value);
          Z.einladungen = await einladungenLaden(Z2.projektId);
          neuZeichnen();
          linkAnzeigen(einladung.token, einladung.rolle);
          return false;
        } catch (err) {
          meldung(err.message, true);
          return false;
        }
      }
    });
    return;
  }
  if (a === "einladung-teilen") {
    const e = (Z2.einladungen || []).find((x) => x.token === knopf.dataset.token);
    linkAnzeigen(knopf.dataset.token, e ? e.rolle : "");
    return;
  }
  if (a === "einladung-zuruecknehmen") {
    if (!bestaetigen("Diese Einladung zurückziehen? Der Link funktioniert danach nicht mehr.")) return;
    try {
      await einladungZuruecknehmen(knopf.dataset.id);
      Z.einladungen = await einladungenLaden(Z2.projektId);
      meldung("Einladung zurückgezogen.");
      neuZeichnen();
    } catch (err) {
      meldung(err.message, true);
    }
    return;
  }
  if (a === "einladung-kopieren") {
    const adresse = document.getElementById("einladung-link").value;
    try {
      await navigator.clipboard.writeText(adresse);
      meldung("Link kopiert.");
    } catch (e) {
      const feld = document.getElementById("einladung-link");
      feld.select();
      meldung("Bitte den markierten Link von Hand kopieren.", true);
    }
    return;
  }
  if (a === "einladung-versenden") {
    const adresse = document.getElementById("einladung-link").value;
    const text2 = "Einladung zur Sanierungsverwaltung " + (Z2.projekt ? Z2.projekt.name : "") + ": " + adresse;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Einladung", text: text2 });
        return;
      } catch (e) {
      }
    }
    window.location.href = "mailto:?subject=" + encodeURIComponent("Einladung zur Sanierungsverwaltung") + "&body=" + encodeURIComponent(text2);
    return;
  }
  if (a === "mitglied-entfernen") {
    if (!bestaetigen("Dieses Mitglied wirklich entfernen?")) return;
    try {
      await mitgliedEntfernen(Z2.projektId, knopf.dataset.id);
      Z2.mitglieder = await mitgliederLaden(Z2.projektId);
      meldung("Mitglied entfernt.");
      neuZeichnen();
    } catch (err) {
      meldung(err.message, true);
    }
    return;
  }
  if (a === "import") return importOeffnen(Z2, modalOeffnen, neuLaden);
}
function linkAnzeigen(token, rolle) {
  const adresse = new URL("index.html?einladung=" + token, window.location.href).href;
  modalOeffnen({
    titel: "Einladung verschicken",
    koerper: '<div class="hinweis info" style="margin-bottom:14px"><div><b>Link ist bereit</b>Schicken Sie ihn der Person' + (rolle ? " (Rolle: " + esc(ROLLEN[rolle] || rolle) + ")" : "") + '. Beim Öffnen kann sie sich ein Konto anlegen und ist danach automatisch im Projekt. Der Link gilt 30 Tage und nur einmal.</div></div><label class="feld"><span>Einladungslink</span><input id="einladung-link" readonly value="' + esc(adresse) + '" style="font-size:14px"></label><div class="btn-reihe"><button class="btn" type="button" data-aktion="einladung-versenden">Link verschicken</button><button class="btn zweit" type="button" data-aktion="einladung-kopieren">Kopieren</button></div>',
    knopfText: "Fertig",
    speichern: () => true
  });
}
function importOeffnen(Z2, modalOeffnen2, neuLaden2) {
  importDaten = null;
  modalOeffnen2({
    titel: "Prototyp-Sicherung importieren",
    koerper: '<div class="hinweis warn" style="margin-bottom:14px"><div><b>Wird zum aktuellen Projekt hinzugefügt</b>Bestehende Daten werden nicht gelöscht oder überschrieben.</div></div><div class="datei-feld"><p>Sicherungsdatei (.json) auswählen</p><input type="file" id="i-datei" accept=".json,application/json"></div><div id="i-vorschau"></div>',
    knopfText: "Importieren",
    speichern: async () => {
      const feld = document.getElementById("i-datei");
      const datei = feld && feld.files ? feld.files[0] : null;
      if (!importDaten) {
        if (!datei) {
          meldung("Bitte eine Sicherungsdatei auswählen.", true);
          return false;
        }
        try {
          const text2 = await datei.text();
          importDaten = paketAusDatei(text2);
        } catch (err) {
          meldung(err.message, true);
          return false;
        }
        if (bereitsImportiert(Z2.projektId, importDaten.erstellt)) {
          meldung("Diese Sicherung wurde für dieses Projekt bereits importiert.", true);
          return false;
        }
        const v = importVorschau(importDaten.daten);
        document.getElementById("i-vorschau").innerHTML = '<div class="hinweis info" style="margin-top:14px"><div><b>Wird eingefügt</b>' + v.budget + " Budgetpositionen (ggf. weniger, falls Kategorie schon existiert), " + v.offerten + " Offerten, " + v.belege + " Belege, " + v.dokumente + " Dokumente.</div></div>";
        meldung("Bitte prüfen und erneut auf Importieren klicken, um zu bestätigen.");
        return false;
      }
      try {
        const ergebnis = await importDurchfuehren(Z2.projektId, importDaten.erstellt, importDaten.daten);
        importDaten = null;
        await neuLaden2();
        meldung(
          "Importiert: " + ergebnis.budgetpositionen + " neue Budgetpositionen, " + ergebnis.offerten + " Offerten, " + ergebnis.belege + " Belege, " + ergebnis.dokumente + " Dokumente."
        );
        return true;
      } catch (err) {
        meldung(err.message, true);
        return false;
      }
    }
  });
}
var importDaten;
var init_uebersicht = __esm({
  "app/js/ansichten/uebersicht.js"() {
    init_format();
    init_gemeinsam();
    init_daten();
    init_konfig();
    init_import();
    init_app();
    importDaten = null;
  }
});

// app/js/dateien.js
function endung(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}
function dateiPruefen(datei) {
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
async function hochladen(datei, projektId, bereich) {
  const fehler = dateiPruefen(datei);
  if (fehler) {
    const e = new DatenFehler(fehler);
    e.ungueltig = true;
    throw e;
  }
  const uuid = crypto.randomUUID();
  const pfad = projektId + "/" + bereich + "/" + uuid + endung(datei.name);
  try {
    const { error } = await mitZeitlimit(
      supabase.storage.from(STORAGE_BUCKET).upload(pfad, datei, {
        contentType: datei.type || void 0,
        upsert: false
      }),
      UPLOAD_ZEITLIMIT_MS
    );
    if (error) throw error;
  } catch (e) {
    if (istZeitueberschreitung(e)) throw new DatenFehler(MELDUNG_ZEITUEBERSCHREITUNG, true);
    if (istVerbindungsfehler(e)) throw new DatenFehler(MELDUNG_KEINE_VERBINDUNG, true);
    throw new DatenFehler("Hochladen fehlgeschlagen: " + (e.message || e));
  }
  return { datei_pfad: pfad, datei_name: datei.name };
}
async function signierterLink(pfad) {
  if (!pfad) return null;
  let data, error;
  try {
    ({ data, error } = await mitZeitlimit(
      supabase.storage.from(STORAGE_BUCKET).createSignedUrl(pfad, SIGNIERTER_LINK_SEKUNDEN)
    ));
  } catch (e) {
    throw e instanceof DatenFehler ? e : new DatenFehler("Datei nicht verfügbar: " + (e.message || e));
  }
  if (error) {
    if (istZeitueberschreitung(error)) throw new DatenFehler(MELDUNG_ZEITUEBERSCHREITUNG, true);
    throw new DatenFehler(istVerbindungsfehler(error) ? MELDUNG_KEINE_VERBINDUNG : "Datei nicht verfügbar: " + error.message, istVerbindungsfehler(error));
  }
  return data.signedUrl;
}
async function vorschauLinks(pfade) {
  if (!pfade.length) return {};
  let data, error;
  try {
    ({ data, error } = await mitZeitlimit(
      supabase.storage.from(STORAGE_BUCKET).createSignedUrls(pfade, VORSCHAU_LINK_SEKUNDEN)
    ));
  } catch (e) {
    throw e instanceof DatenFehler ? e : new DatenFehler("Vorschau nicht verfügbar: " + (e.message || e));
  }
  if (error) throw new DatenFehler("Vorschau nicht verfügbar: " + error.message, istVerbindungsfehler(error));
  const karte = {};
  (data || []).forEach((eintrag) => {
    if (eintrag && eintrag.signedUrl && !eintrag.error) karte[eintrag.path] = eintrag.signedUrl;
  });
  return karte;
}
async function loeschen(pfad) {
  if (!pfad) return;
  let error = null;
  try {
    ({ error } = await supabase.storage.from(STORAGE_BUCKET).remove([pfad]));
  } catch (e) {
    console.warn("Datei konnte nicht gelöscht werden:", pfad, e.message);
    return;
  }
  if (error && !istVerbindungsfehler(error)) {
    console.warn("Datei konnte nicht gelöscht werden:", pfad, error.message);
  }
}
var init_dateien = __esm({
  "app/js/dateien.js"() {
    init_supabase();
    init_konfig();
    init_daten();
  }
});

// app/js/ansichten/foerdergelder.js
function statusBadge2(status) {
  const farbe = { Geplant: "", Beantragt: "blau", Zugesichert: "gruen", Ausbezahlt: "gruen", Abgelehnt: "rot" };
  return '<span class="badge ' + (farbe[status] || "") + '">' + esc(status || "Geplant") + "</span>";
}
function fristVersaeumt(f) {
  return !!f.frist && f.status === "Geplant" && f.frist < heuteISO();
}
function datumSpalte(f) {
  if (f.status === "Ausbezahlt" && f.auszahlung_am) return "ausbezahlt " + datumCH(f.auszahlung_am);
  if (f.status === "Zugesichert" && f.entscheid_am) return "zugesichert " + datumCH(f.entscheid_am);
  if (f.status === "Abgelehnt" && f.entscheid_am) return "abgelehnt " + datumCH(f.entscheid_am);
  if (f.status === "Beantragt" && f.eingereicht_am) return "eingereicht " + datumCH(f.eingereicht_am);
  if (f.frist) return "Frist " + datumCH(f.frist);
  return "–";
}
function render3(Z2) {
  const liste = Z2.foerdergelder || [];
  const bearbeitbar = kannBearbeiten();
  const gesichert = liste.filter(foerderIstSicher).reduce((s, f) => s + zahl(f.betrag), 0);
  const erwartet = liste.filter(foerderIstOffen).reduce((s, f) => s + zahl(f.betrag), 0);
  let h = '<section class="abschnitt" id="abschnitt-foerderung"><div class="abschnitt-kopf"><div><h2>Fördergelder</h2><p>' + (liste.length ? "gesichert " + chfKurz(gesichert) + (erwartet ? " · erwartet " + chfKurz(erwartet) : "") : "Beiträge von Bund, Kanton, Gemeinde und Werken") + "</p></div>" + (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="foerder-neu">+ Fördergeld</button>' : "") + "</div>";
  if (!liste.length) {
    h += leerZustand(
      "Noch keine Fördergelder erfasst",
      "Gesuche für Wärmepumpe, Dämmung, Fenster oder Solaranlage hier festhalten – mit Frist, Stand und Betrag. Achtung: Viele Programme verlangen das Gesuch vor Baubeginn.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="foerder-neu">Erstes Fördergeld erfassen</button>' : ""
    );
    return h + "</section>";
  }
  const offeneFristen = liste.filter(fristVersaeumt);
  if (offeneFristen.length) {
    h += '<div class="hinweis warn" style="margin-bottom:12px"><div><b>Frist verstrichen</b>' + offeneFristen.map((f) => esc(f.bezeichnung || f.stelle || "Fördergeld") + " (" + datumCH(f.frist) + ")").join(" · ") + " – noch nicht eingereicht.</div></div>";
  }
  h += '<div class="karte"><div class="tab-scroll"><table><thead><tr><th>Förderung</th><th>Stelle</th><th>Kategorie</th><th>Stand</th><th>Datum</th><th class="num">Betrag</th><th></th></tr></thead><tbody>';
  liste.forEach((f) => {
    const sicher = foerderIstSicher(f);
    h += "<tr><td><b>" + esc(f.bezeichnung || "Ohne Bezeichnung") + "</b>" + (f.datei_pfad ? ' <span class="badge">Datei</span>' : "") + (f.gesuchsnummer ? '<div style="font-size:.76rem;color:var(--grau)">Gesuch ' + esc(f.gesuchsnummer) + "</div>" : "") + "</td><td>" + esc(f.stelle || "–") + "</td><td>" + esc(kategorieName(Z2.budget, f.budgetposition_id)) + "</td><td>" + statusBadge2(f.status) + (fristVersaeumt(f) ? ' <span class="badge rot">Frist</span>' : "") + "</td><td>" + esc(datumSpalte(f)) + '</td><td class="num"' + (sicher ? "" : ' style="color:var(--grau)"') + "><b>" + chf(f.betrag) + '</b></td><td><div class="zeile-aktion">' + (f.datei_pfad ? '<button class="btn still klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(f.datei_pfad) + '">Datei</button>' : "") + '<button class="btn still klein" type="button" data-aktion="foerder-bearbeiten" data-id="' + f.id + '">' + (bearbeitbar ? "Bearbeiten" : "Ansehen") + "</button>" + (bearbeitbar ? '<button class="btn still klein" type="button" data-aktion="foerder-loeschen" data-id="' + f.id + '">Löschen</button>' : "") + "</div></td></tr>";
  });
  h += '</tbody><tfoot><tr><td colspan="5">Gesichert (zugesichert oder ausbezahlt)</td><td class="num">' + chf(gesichert) + "</td><td></td></tr>" + (erwartet ? '<tr><td colspan="5" style="color:var(--grau)">Erwartet (geplant oder eingereicht)</td><td class="num" style="color:var(--grau)">' + chf(erwartet) + "</td><td></td></tr>" : "") + '</tfoot></table></div><div class="karte-pad" style="border-top:1px solid var(--linie);font-size:.8rem;color:var(--grau)">Nur gesicherte Beiträge erhöhen den verfügbaren Betrag. Erwartete Beiträge sind hier ausgewiesen, zählen aber erst mit der Zusicherung.</div></div>';
  return h + "</section>";
}
function formular(Z2, f) {
  dateiWartend = null;
  entwurf = f ? JSON.parse(JSON.stringify(f)) : {
    id: null,
    bezeichnung: "",
    stelle: "",
    gesuchsnummer: "",
    betrag: 0,
    status: "Geplant",
    budgetposition_id: null,
    frist: "",
    eingereicht_am: "",
    entscheid_am: "",
    auszahlung_am: "",
    bemerkung: "",
    datei_pfad: null,
    datei_name: null
  };
  modalOeffnen({
    titel: entwurf.id ? "Fördergeld bearbeiten" : "Neues Fördergeld",
    koerper: koerper(Z2),
    speichern: () => speichern(Z2)
  });
}
function koerper(Z2) {
  const f = entwurf;
  return '<label class="feld"><span>Förderung / Massnahme</span><input data-feld="bezeichnung" value="' + esc(f.bezeichnung) + '" placeholder="z.B. Ersatz Ölheizung durch Wärmepumpe"></label><div class="feld-paar"><label class="feld"><span>Fördergeber</span><input list="foerder-stellen" data-feld="stelle" value="' + esc(f.stelle) + '" placeholder="z.B. Das Gebäudeprogramm"><datalist id="foerder-stellen">' + FOERDER_STELLEN.map((s) => '<option value="' + esc(s) + '">').join("") + '</datalist></label><label class="feld"><span>Gesuchsnummer</span><input data-feld="gesuchsnummer" value="' + esc(f.gesuchsnummer) + '" placeholder="optional"></label></div><div class="feld-paar"><label class="feld"><span>Betrag (CHF)</span><input inputmode="decimal" data-feld="betrag" value="' + zahl(f.betrag) + '" placeholder="8000"></label><label class="feld"><span>Stand</span><select data-feld="status">' + FOERDER_STATUS.map((s) => "<option" + (s === f.status ? " selected" : "") + ">" + s + "</option>").join("") + '</select></label></div><p style="margin:-6px 0 12px;font-size:.78rem;color:var(--grau)">Bis zur Zusicherung ist das der erwartete Beitrag, danach der verfügte. Erst ab «Zugesichert» zählt er zum verfügbaren Geld.</p><label class="feld"><span>Budgetkategorie</span><select data-feld="budgetposition_id">' + kategorieOptionen(Z2.budget, f.budgetposition_id) + '</select></label><div class="feld-paar"><label class="feld"><span>Eingabefrist</span><input type="date" data-feld="frist" value="' + esc(f.frist || "") + '"></label><label class="feld"><span>Eingereicht am</span><input type="date" data-feld="eingereicht_am" value="' + esc(f.eingereicht_am || "") + '"></label></div><div class="feld-paar"><label class="feld"><span>Entscheid am</span><input type="date" data-feld="entscheid_am" value="' + esc(f.entscheid_am || "") + '"></label><label class="feld"><span>Ausbezahlt am</span><input type="date" data-feld="auszahlung_am" value="' + esc(f.auszahlung_am || "") + '"></label></div>' + dateiBlock() + '<label class="feld"><span>Bemerkung</span><textarea data-feld="bemerkung" placeholder="optional">' + esc(f.bemerkung || "") + "</textarea></label>";
}
function dateiBlock() {
  const f = entwurf;
  if (f.datei_pfad) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Datei: ' + esc(f.datei_name || "") + '</b><div class="btn-reihe" style="margin-top:9px"><button class="btn zweit klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(f.datei_pfad) + '">Datei öffnen</button><button class="btn still klein" type="button" data-aktion="foerder-datei-entfernen">Datei entfernen</button></div></div></div>';
  }
  return '<div class="datei-feld" style="margin-bottom:14px"><p>Zusicherung, Verfügung oder Gesuch anhängen (optional)</p><input type="file" id="foerder-datei" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"></div>';
}
function datumNachziehen() {
  const f = entwurf;
  if (f.status === "Beantragt" && !f.eingereicht_am) f.eingereicht_am = heuteISO();
  if ((f.status === "Zugesichert" || f.status === "Abgelehnt") && !f.entscheid_am) f.entscheid_am = heuteISO();
  if (f.status === "Ausbezahlt" && !f.auszahlung_am) f.auszahlung_am = heuteISO();
}
async function speichern(Z2) {
  const f = entwurf;
  if (!f.bezeichnung.trim() && !f.stelle.trim()) {
    meldung("Bitte mindestens eine Bezeichnung oder den Fördergeber angeben.", true);
    return false;
  }
  const daten = {
    bezeichnung: f.bezeichnung.trim(),
    stelle: f.stelle.trim(),
    gesuchsnummer: f.gesuchsnummer.trim(),
    betrag: zahl(f.betrag),
    status: f.status,
    budgetposition_id: f.budgetposition_id || null,
    frist: f.frist || null,
    eingereicht_am: f.eingereicht_am || null,
    entscheid_am: f.entscheid_am || null,
    auszahlung_am: f.auszahlung_am || null,
    bemerkung: f.bemerkung.trim(),
    datei_pfad: f.datei_pfad,
    datei_name: f.datei_name
  };
  const feld = document.getElementById("foerder-datei");
  if (!dateiWartend && feld && feld.files && feld.files[0]) dateiWartend = feld.files[0];
  try {
    if (dateiWartend) {
      const info = await hochladen(dateiWartend, Z2.projektId, "foerdergelder");
      daten.datei_pfad = info.datei_pfad;
      daten.datei_name = info.datei_name;
    }
    if (f.id) await foerdergeldAktualisieren(f.id, daten, f.geaendert_am);
    else await foerdergeldAnlegen(Z2.projektId, daten);
    meldung(f.id ? "Fördergeld aktualisiert." : "Fördergeld erfasst.");
    dateiWartend = null;
    await neuLaden(["foerdergelder"]);
    return true;
  } catch (err) {
    meldung(err.message, true);
    return false;
  }
}
function eingabe(e, Z2) {
  if (!document.querySelector(".modal") || !entwurf) return;
  const feld = e.target.closest("[data-feld]");
  if (!feld) return;
  const name = feld.dataset.feld;
  if (name === "budgetposition_id") {
    entwurf.budgetposition_id = feld.value || null;
    return;
  }
  entwurf[name] = feld.value;
  if (name === "status") {
    datumNachziehen();
    const koerperEl = document.querySelector(".modal-koerper");
    if (koerperEl) koerperEl.innerHTML = koerper(Z2);
  }
}
function aktion3(a, knopf, Z2) {
  if (a === "foerder-neu") return formular(Z2, null);
  if (a === "foerder-bearbeiten") return formular(Z2, (Z2.foerdergelder || []).find((f) => f.id === knopf.dataset.id));
  if (a === "foerder-loeschen") {
    const f = (Z2.foerdergelder || []).find((x) => x.id === knopf.dataset.id);
    if (f && bestaetigen("Fördergeld " + (f.bezeichnung || f.stelle || "") + " löschen?")) {
      (async () => {
        try {
          if (f.datei_pfad) await loeschen(f.datei_pfad);
          await foerdergeldLoeschen(f.id);
          meldung("Fördergeld gelöscht.");
          await neuLaden(["foerdergelder"]);
        } catch (err) {
          meldung(err.message, true);
        }
      })();
    }
    return;
  }
  if (a === "foerder-datei-entfernen") {
    if (entwurf.datei_pfad) loeschen(entwurf.datei_pfad).catch(() => {
    });
    entwurf.datei_pfad = null;
    entwurf.datei_name = null;
    dateiWartend = null;
    const koerperEl = document.querySelector(".modal-koerper");
    if (koerperEl) koerperEl.innerHTML = koerper(Z2);
    return;
  }
  if (a === "datei-oeffnen" && knopf.dataset.pfad) {
    signierterLink(knopf.dataset.pfad).then((url) => {
      if (url) window.open(url, "_blank");
    }).catch((e) => meldung(e.message, true));
  }
}
var entwurf, dateiWartend;
var init_foerdergelder = __esm({
  "app/js/ansichten/foerdergelder.js"() {
    init_format();
    init_gemeinsam();
    init_daten();
    init_dateien();
    init_app();
    init_konfig();
    entwurf = null;
    dateiWartend = null;
  }
});

// app/js/ansichten/anschaffungen.js
function render4(Z2) {
  const liste = Z2.anschaffungen || [];
  const s = summen(Z2);
  const bearbeitbar = kannBearbeiten();
  let h = '<section class="abschnitt" id="abschnitt-anschaffungen"><div class="abschnitt-kopf"><div><h2>Anschaffungen</h2><p>Umzug, Einrichtung, Maschinen – ausserhalb des Sanierungsbudgets</p></div>' + (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="ansch-neu">+ Anschaffung</button>' : "") + "</div>";
  if (!liste.length) {
    h += leerZustand(
      "Noch keine Anschaffungen erfasst",
      "Hier gehören Kosten hin, die nicht zur Sanierung zählen: Umzug, Möbel, Haushaltgeräte, Maschinen und Werkzeug. Sie verändern den Sanierungsrahmen nicht.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="ansch-neu">Erste Anschaffung erfassen</button>' : ""
    );
    return h + "</section>";
  }
  h += '<div class="karte"><div class="tab-scroll"><table><thead><tr><th>Anschaffung</th><th>Art</th><th>Datum</th><th>Finanzierung</th><th>Zahlung</th><th class="num">Betrag</th><th></th></tr></thead><tbody>';
  liste.forEach((a) => {
    h += "<tr><td><b>" + esc(a.bezeichnung || "Ohne Bezeichnung") + "</b>" + (a.bemerkung ? '<div style="font-size:.76rem;color:var(--grau);white-space:normal;max-width:260px">' + esc(a.bemerkung) + "</div>" : "") + "</td><td>" + esc(a.kategorie || "–") + "</td><td>" + (a.datum ? datumCH(a.datum) : "–") + "</td><td>" + (a.finanzierung === "Eigenmittel" ? '<span class="badge">Eigenmittel</span>' : '<span class="badge blau">Kredit</span>') + "</td><td>" + (a.bezahlt ? '<span class="badge gruen">bezahlt</span>' : '<span class="badge amber">offen</span>') + '</td><td class="num"><b>' + chf(a.betrag) + '</b></td><td><div class="zeile-aktion"><button class="btn still klein" type="button" data-aktion="ansch-bearbeiten" data-id="' + a.id + '">' + (bearbeitbar ? "Bearbeiten" : "Ansehen") + "</button>" + (bearbeitbar ? '<button class="btn still klein" type="button" data-aktion="ansch-loeschen" data-id="' + a.id + '">Löschen</button>' : "") + "</div></td></tr>";
  });
  h += '</tbody><tfoot><tr><td colspan="5">Total Anschaffungen · davon bezahlt ' + chf(s.anschaffungenBezahlt) + '</td><td class="num">' + chf(s.anschaffungenSumme) + "</td><td></td></tr></tfoot></table></div>";
  if (s.kreditRahmen || s.kreditVerwendet) {
    const anteil = s.kreditRahmen > 0 ? Math.max(0, Math.min(100, s.kreditVerwendet / s.kreditRahmen * 100)) : 0;
    h += '<div class="karte-pad" style="border-top:1px solid var(--linie)"><div class="abschnitt-kopf" style="margin:0 0 9px"><div><h3>Kredit</h3><p>' + (s.kreditRahmen ? "über Kredit finanziert " + chfKurz(s.kreditVerwendet) + " von " + chfKurz(s.kreditRahmen) : "über Kredit finanziert " + chfKurz(s.kreditVerwendet) + " · kein Kreditrahmen erfasst") + "</p></div>" + (kannBearbeiten() ? '<button class="btn still klein" type="button" data-aktion="kredit-rahmen">Kreditrahmen</button>' : "") + "</div>" + (s.kreditRahmen ? '<div class="balken"><i class="b-bezahlt" style="width:' + anteil.toFixed(2) + '%"></i></div><div class="legende"><span><i class="punkt" style="background:var(--blau-700)"></i>verwendet ' + chfKurz(s.kreditVerwendet) + '</span><span><i class="punkt" style="background:#D3DFEA"></i>frei ' + chfKurz(s.kreditFrei) + "</span></div>" + (s.kreditFrei < 0 ? '<div class="hinweis warn" style="margin-top:12px"><div>Die Anschaffungen übersteigen den Kreditrahmen um ' + chf(-s.kreditFrei) + ".</div></div>" : "") : "") + "</div>";
  } else if (kannBearbeiten()) {
    h += '<div class="karte-pad" style="border-top:1px solid var(--linie);font-size:.8rem;color:var(--grau)">Wurde dafür ein Kredit aufgenommen? <button class="btn still klein" type="button" data-aktion="kredit-rahmen">Kreditrahmen erfassen</button></div>';
  }
  h += '<div class="karte-pad" style="border-top:1px solid var(--linie);font-size:.8rem;color:var(--grau)">Diese Beträge zählen nicht zum Sanierungsbudget: Sie verändern weder den Sanierungsrahmen noch den verfügbaren Betrag noch den Kostenvergleich.</div></div>';
  return h + "</section>";
}
function formular2(Z2, a) {
  entwurf2 = a ? JSON.parse(JSON.stringify(a)) : {
    id: null,
    bezeichnung: "",
    kategorie: "",
    betrag: 0,
    datum: heuteISO(),
    bezahlt: false,
    finanzierung: "Kredit",
    bemerkung: ""
  };
  modalOeffnen({
    titel: entwurf2.id ? "Anschaffung bearbeiten" : "Neue Anschaffung",
    koerper: koerper2(),
    speichern: () => speichern2(Z2)
  });
}
function koerper2() {
  const a = entwurf2;
  return '<label class="feld"><span>Anschaffung</span><input data-feld="bezeichnung" value="' + esc(a.bezeichnung) + '" placeholder="z.B. Waschmaschine"></label><div class="feld-paar"><label class="feld"><span>Art</span><input list="ansch-arten" data-feld="kategorie" value="' + esc(a.kategorie) + '" placeholder="z.B. Haushaltgeräte"><datalist id="ansch-arten">' + ANSCHAFFUNG_ARTEN.map((x) => '<option value="' + esc(x) + '">').join("") + '</datalist></label><label class="feld"><span>Betrag (CHF)</span><input inputmode="decimal" data-feld="betrag" value="' + zahl(a.betrag) + '" placeholder="1200"></label></div><div class="feld-paar"><label class="feld"><span>Datum</span><input type="date" data-feld="datum" value="' + esc(a.datum || "") + '"></label><label class="feld"><span>Finanzierung</span><select data-feld="finanzierung">' + FINANZIERUNGEN.map((x) => "<option" + (x === a.finanzierung ? " selected" : "") + ">" + x + "</option>").join("") + '</select></label></div><label class="check"><input type="checkbox" data-feld="bezahlt"' + (a.bezahlt ? " checked" : "") + '> Bereits bezahlt</label><label class="feld"><span>Bemerkung</span><textarea data-feld="bemerkung" placeholder="optional">' + esc(a.bemerkung || "") + '</textarea></label><div class="hinweis info"><div>Diese Kosten bleiben ausserhalb des Sanierungsbudgets und verändern den verfügbaren Betrag nicht.</div></div>';
}
async function speichern2(Z2) {
  const a = entwurf2;
  if (!a.bezeichnung.trim()) {
    meldung("Bitte eine Bezeichnung angeben.", true);
    return false;
  }
  const daten = {
    bezeichnung: a.bezeichnung.trim(),
    kategorie: a.kategorie.trim(),
    betrag: zahl(a.betrag),
    datum: a.datum || null,
    bezahlt: !!a.bezahlt,
    finanzierung: a.finanzierung === "Eigenmittel" ? "Eigenmittel" : "Kredit",
    bemerkung: a.bemerkung.trim()
  };
  try {
    if (a.id) await anschaffungAktualisieren(a.id, daten, a.geaendert_am);
    else await anschaffungAnlegen(Z2.projektId, daten);
    meldung(a.id ? "Anschaffung aktualisiert." : "Anschaffung erfasst.");
    await neuLaden(["anschaffungen"]);
    return true;
  } catch (err) {
    meldung(err.message, true);
    return false;
  }
}
function eingabe2(e) {
  if (!document.querySelector(".modal") || !entwurf2) return;
  const feld = e.target.closest("[data-feld]");
  if (!feld) return;
  entwurf2[feld.dataset.feld] = feld.type === "checkbox" ? feld.checked : feld.value;
}
function aktion4(a, knopf, Z2) {
  if (a === "ansch-neu") return formular2(Z2, null);
  if (a === "ansch-bearbeiten") return formular2(Z2, (Z2.anschaffungen || []).find((x) => x.id === knopf.dataset.id));
  if (a === "ansch-loeschen") {
    const x = (Z2.anschaffungen || []).find((y) => y.id === knopf.dataset.id);
    if (x && bestaetigen('Anschaffung "' + (x.bezeichnung || "") + '" löschen?')) {
      anschaffungLoeschen(x.id).then(() => {
        meldung("Anschaffung gelöscht.");
        return neuLaden(["anschaffungen"]);
      }).catch((err) => meldung(err.message, true));
    }
    return;
  }
  if (a === "kredit-rahmen") return kreditFormular(Z2);
}
function kreditFormular(Z2) {
  const p = Z2.projekt;
  modalOeffnen({
    titel: "Kredit für Anschaffungen",
    koerper: '<label class="feld"><span>Aufgenommener Kredit (CHF)</span><input id="k-rahmen" inputmode="decimal" value="' + (zahl(p.kredit_rahmen) || "") + '" placeholder="30000"></label><div class="hinweis info"><div>Der Kredit gehört nicht zum Gesamtbudget der Liegenschaft. Er dient nur dazu, den Anschaffungen einen Rahmen zu geben – 0 blendet ihn wieder aus.</div></div>',
    speichern: async () => {
      try {
        const { projektAktualisieren: projektAktualisieren2 } = await Promise.resolve().then(() => (init_daten(), daten_exports));
        const { Z: ZUstand, neuZeichnen: neuZeichnen2 } = await Promise.resolve().then(() => (init_app(), app_exports));
        const neu = await projektAktualisieren2(p.id, { kredit_rahmen: zahl(document.getElementById("k-rahmen").value) }, p.geaendert_am);
        Object.assign(ZUstand.projekt, neu);
        const ix = ZUstand.projekte.findIndex((x) => x.id === neu.id);
        if (ix !== -1) ZUstand.projekte[ix] = neu;
        meldung("Kreditrahmen gespeichert.");
        neuZeichnen2();
        return true;
      } catch (err) {
        meldung(err.message, true);
        return false;
      }
    }
  });
}
var entwurf2;
var init_anschaffungen = __esm({
  "app/js/ansichten/anschaffungen.js"() {
    init_format();
    init_gemeinsam();
    init_daten();
    init_app();
    init_konfig();
    entwurf2 = null;
  }
});

// app/js/ansichten/budget.js
var budget_exports = {};
__export(budget_exports, {
  aktion: () => aktion5,
  eingabe: () => eingabe3,
  render: () => render5
});
function render5(Z2) {
  const s = summen(Z2);
  const budgetiert = s.budgetiert;
  const bearbeitbar = kannBearbeiten();
  let h = '<nav class="sprungleiste"><a href="#abschnitt-budget">Budget</a><a href="#abschnitt-vergleich">Kostenvergleich</a><a href="#abschnitt-foerderung">Fördergelder</a><a href="#abschnitt-anschaffungen">Anschaffungen</a></nav>';
  h += '<section class="abschnitt" id="abschnitt-budget"><div class="abschnitt-kopf"><div><h2>Budget</h2><p>Sanierungsrahmen ' + chfKurz(s.rahmen) + " · verplant " + chfKurz(budgetiert) + (s.spaeter ? " · später " + chfKurz(s.spaeter) : "") + "</p></div>" + (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="budget-neu">+ Position</button>' : "") + "</div>";
  if (!Z2.budget.length) {
    h += leerZustand(
      "Noch keine Budgetpositionen",
      "Legen Sie Positionen wie Elektro, Küche oder Fassade an, um Offerten und Rechnungen zuzuordnen.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="budget-neu">Erste Position anlegen</button>' : ""
    );
  } else {
    const kv = (id) => (Z2.kostenvergleich || []).find((k) => k.budgetposition_id === id) || { offerte: 0, rechnung: 0, bezahlt: 0 };
    h += '<div class="karte"><div class="tab-scroll"><table><thead><tr><th>Kategorie</th><th class="num">Budget</th><th class="num">Offerten</th><th class="num">Rechnungen</th><th class="num">Bezahlt</th><th class="num">Differenz</th><th></th></tr></thead><tbody>';
    Z2.budget.forEach((p) => {
      const k = kv(p.id);
      const zaehlt = budgetZaehlt(p);
      const ist = k.rechnung > 0 ? k.rechnung : k.offerte;
      const diff = zahl(p.betrag) - ist;
      h += "<tr" + (zaehlt ? "" : ' class="spaeter"') + "><td><b>" + esc(p.kategorie) + "</b>" + (zaehlt ? "" : ' <span class="badge">später</span>') + (p.bemerkung ? '<div style="font-size:.76rem;color:var(--grau);white-space:normal;max-width:260px">' + esc(p.bemerkung) + "</div>" : "") + '</td><td class="num">' + chf(p.betrag) + '</td><td class="num">' + chf(k.offerte) + '</td><td class="num">' + chf(k.rechnung) + '</td><td class="num">' + chf(k.bezahlt) + '</td><td class="num ' + (diff < 0 ? "neg" : "pos") + '">' + (diff >= 0 ? "+" : "") + chf(diff) + "</td><td>" + (bearbeitbar ? '<div class="zeile-aktion"><button class="btn still klein" type="button" data-aktion="budget-umschalten" data-id="' + p.id + '">' + (zaehlt ? "Später" : "Einrechnen") + '</button><button class="btn still klein" type="button" data-aktion="budget-bearbeiten" data-id="' + p.id + '">Bearbeiten</button><button class="btn still klein" type="button" data-aktion="budget-loeschen" data-id="' + p.id + '">Löschen</button></div>' : "") + "</td></tr>";
    });
    h += '</tbody><tfoot><tr><td>Total berücksichtigte Positionen</td><td class="num">' + chf(budgetiert) + '</td><td class="num">' + chf(Z2.budget.reduce((a, p) => a + kv(p.id).offerte, 0)) + '</td><td class="num">' + chf(Z2.budget.reduce((a, p) => a + kv(p.id).rechnung, 0)) + '</td><td class="num">' + chf(Z2.budget.reduce((a, p) => a + kv(p.id).bezahlt, 0)) + '</td><td class="num"></td><td></td></tr>' + (s.spaeter ? '<tr class="spaeter"><td>Erst später (' + s.spaeterAnzahl + ')</td><td class="num">' + chf(s.spaeter) + '</td><td colspan="5"></td></tr>' : "") + "</tfoot></table></div>" + (s.spaeter ? '<div class="karte-pad" style="border-top:1px solid var(--linie);font-size:.8rem;color:var(--grau)">Auf «später» gestellte Positionen zählen nicht in die Summen und nicht in den Sanierungsrahmen. Offerten und Rechnungen, die einer solchen Kategorie zugeordnet sind, zählen weiterhin – dieses Geld ist bereits gebunden.</div>' : "") + "</div>";
  }
  h += "</section>";
  const liste = (Z2.kostenvergleich || []).filter((k) => k.budget > 0 || k.offerte > 0 || k.rechnung > 0);
  h += '<section class="abschnitt" id="abschnitt-vergleich"><div class="abschnitt-kopf"><div><h2>Kostenvergleich</h2><p>Budget gegen Offerten und Rechnungen, über alle Kategorien</p></div></div>';
  if (!liste.length) {
    h += leerZustand("Noch nichts zu vergleichen", "Sobald Budget, Offerten oder Rechnungen erfasst sind, erscheint hier die Gegenüberstellung.", "");
  } else {
    let tB = 0, tO = 0, tR = 0, tZ = 0, tD = 0;
    h += '<div class="karte"><div class="tab-scroll"><table><thead><tr><th>Kategorie</th><th class="num">Budget</th><th class="num">Offerte</th><th class="num">Rechnung</th><th class="num">Bezahlt</th><th class="num">Differenz zum Budget</th></tr></thead><tbody>';
    liste.forEach((k) => {
      const zaehlt = budgetZaehlt(k);
      if (zaehlt) {
        tB += k.budget;
        tD += k.differenz;
      }
      tO += k.offerte;
      tR += k.rechnung;
      tZ += k.bezahlt;
      h += "<tr" + (zaehlt ? "" : ' class="spaeter"') + "><td><b>" + esc(k.kategorie) + "</b>" + (zaehlt ? "" : ' <span class="badge">später</span>') + '</td><td class="num">' + chf(k.budget) + '</td><td class="num">' + chf(k.offerte) + '</td><td class="num">' + chf(k.rechnung) + '</td><td class="num">' + chf(k.bezahlt) + '</td><td class="num ' + (k.differenz < 0 ? "neg" : "pos") + '">' + (k.differenz >= 0 ? "+" : "") + chf(k.differenz) + "</td></tr>";
    });
    h += '</tbody><tfoot><tr><td>Total</td><td class="num">' + chf(tB) + '</td><td class="num">' + chf(tO) + '</td><td class="num">' + chf(tR) + '</td><td class="num">' + chf(tZ) + '</td><td class="num ' + (tD < 0 ? "neg" : "pos") + '">' + (tD >= 0 ? "+" : "") + chf(tD) + '</td></tr></tfoot></table></div><div class="karte-pad" style="border-top:1px solid var(--linie);font-size:.8rem;color:var(--grau)">Als Ist-Kosten gilt die Rechnungssumme. Solange keine Rechnung erfasst ist, wird die Offertsumme verwendet. Alle Beträge inklusive MWST.' + (tB !== liste.reduce((a, k) => a + k.budget, 0) ? " Positionen mit «später» sind im Total der Budgetspalte nicht enthalten." : "") + "</div></div>";
  }
  h += "</section>";
  return h + render3(Z2) + render4(Z2);
}
function formular3(Z2, p) {
  const optionen = STANDARD_KATEGORIEN.concat(Z2.budget.map((x) => x.kategorie).filter((k) => !STANDARD_KATEGORIEN.includes(k)));
  const koerper5 = '<label class="feld"><span>Kategorie</span><input id="f-kategorie" list="kat-liste" value="' + esc(p ? p.kategorie : "") + '" placeholder="z.B. Elektro" required><datalist id="kat-liste">' + optionen.map((k) => '<option value="' + esc(k) + '">').join("") + '</datalist></label><label class="feld"><span>Budgetbetrag (CHF, inkl. MWST)</span><input id="f-betrag" inputmode="decimal" value="' + (p ? zahl(p.betrag) : "") + '" placeholder="18000"></label><label class="feld"><span>Bemerkung</span><textarea id="f-bemerkung" placeholder="optional">' + esc(p ? p.bemerkung : "") + '</textarea></label><div class="check"><input type="checkbox" id="f-spaeter"' + (p && p.beruecksichtigt === false ? " checked" : "") + '><label for="f-spaeter" style="margin:0">Erst später berücksichtigen</label></div><p style="margin:-6px 0 4px;font-size:.78rem;color:var(--grau)">Angehakt zählt der Budgetbetrag nirgends mit – die Position bleibt aber erfasst und lässt sich jederzeit wieder einrechnen. Bereits erfasste Offerten und Rechnungen dieser Kategorie zählen weiterhin, denn dieses Geld ist ausgegeben.</p>';
  modalOeffnen({
    titel: p ? "Budgetposition bearbeiten" : "Neue Budgetposition",
    koerper: koerper5,
    speichern: async () => {
      const kategorie = document.getElementById("f-kategorie").value.trim();
      if (!kategorie) {
        meldung("Bitte eine Kategorie angeben.", true);
        return false;
      }
      const daten = {
        kategorie,
        betrag: zahl(document.getElementById("f-betrag").value),
        bemerkung: document.getElementById("f-bemerkung").value.trim(),
        beruecksichtigt: !document.getElementById("f-spaeter").checked
      };
      try {
        if (p) await budgetAktualisieren(p.id, daten, p.geaendert_am);
        else await budgetAnlegen(Z2.projektId, daten);
        meldung(p ? "Budgetposition aktualisiert." : "Budgetposition angelegt.");
        await neuLaden(["budget"]);
        return true;
      } catch (err) {
        meldung(err.message, true);
        return false;
      }
    }
  });
}
function eingabe3(e, Z2) {
  eingabe(e, Z2);
  eingabe2(e, Z2);
}
function aktion5(a, knopf, Z2) {
  if (a.startsWith("foerder-") || a === "datei-oeffnen") return aktion3(a, knopf, Z2);
  if (a.startsWith("ansch-") || a === "kredit-rahmen") return aktion4(a, knopf, Z2);
  if (a === "budget-neu") return formular3(Z2, null);
  if (a === "budget-bearbeiten") return formular3(Z2, Z2.budget.find((p) => p.id === knopf.dataset.id));
  if (a === "budget-umschalten") {
    const p = Z2.budget.find((x) => x.id === knopf.dataset.id);
    if (!p) return;
    const neu = !budgetZaehlt(p);
    knopf.disabled = true;
    budgetAktualisieren(p.id, { beruecksichtigt: neu }, p.geaendert_am).then(() => {
      meldung(neu ? '"' + p.kategorie + '" zählt jetzt mit.' : '"' + p.kategorie + '" ist auf später gestellt.');
      return neuLaden(["budget"]);
    }).catch((e) => {
      knopf.disabled = false;
      meldung(e.message, true);
    });
    return;
  }
  if (a === "budget-loeschen") {
    const p = Z2.budget.find((x) => x.id === knopf.dataset.id);
    if (p && bestaetigen('Budgetposition "' + p.kategorie + '" löschen?')) {
      budgetLoeschen(p.id).then(() => {
        meldung("Budgetposition gelöscht.");
        neuLaden(["budget"]);
      }).catch((e) => meldung(e.message, true));
    }
  }
}
var init_budget = __esm({
  "app/js/ansichten/budget.js"() {
    init_format();
    init_gemeinsam();
    init_daten();
    init_app();
    init_konfig();
    init_foerdergelder();
    init_anschaffungen();
  }
});

// app/js/ki.js
function analyseFehlerText(e) {
  const code = e && e.code;
  if (code === "kein_schluessel") {
    return "Die KI-Auswertung ist auf dem Server noch nicht freigeschaltet (es fehlt der Zugang zum KI-Dienst). Das Dokument kann weiterhin von Hand erfasst werden.";
  }
  if (code === "schluessel_ungueltig") return "Der KI-Dienst lehnt den hinterlegten Zugang ab. Bitte den Schlüssel prüfen.";
  if (code === "kontingent" || code === "kein_modell") return e && e.message || "Die Analyse ist fehlgeschlagen.";
  return "Auslesen fehlgeschlagen: " + (e && e.message || e);
}
function zahl2(wert) {
  if (wert === null || wert === void 0 || wert === "") return 0;
  const n = typeof wert === "number" ? wert : parseFloat(String(wert).replace(/['\s]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function runden(n) {
  return Math.round(n * 100) / 100;
}
function text(wert) {
  return wert === null || wert === void 0 ? "" : String(wert).trim();
}
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
    mwstSatz: w.mwst_satz === null ? null : zahl2(w.mwst_satz) || 8.1,
    hinweis: text(w.hinweis),
    positionen: positionen.map((p, i) => ({
      nr: text(p.nr) || String(i + 1),
      beschreibung: text(p.beschreibung),
      menge: zahl2(p.menge) || 1,
      einheit: text(p.einheit) || "pauschal",
      einzelpreis: runden(zahl2(p.einzelpreis))
    })).filter((p) => p.beschreibung || p.einzelpreis)
  };
}
function belegAufbereiten(w) {
  const brutto = runden(zahl2(w.brutto));
  const ohneMwst = w.mwst === null || w.mwst === void 0;
  let mwst = ohneMwst ? null : runden(zahl2(w.mwst));
  let netto = runden(zahl2(w.netto));
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
    netto,
    mwst,
    brutto,
    bezahlt: w.bezahlt === true,
    zahlungsdatum: datumOderLeer(w.zahlungsdatum),
    hinweis: text(w.hinweis)
  };
}
async function analysiereDokument(quelle, art, aufSchritt) {
  const melden = (i) => {
    if (aufSchritt) aufSchritt(i);
  };
  let pfad = quelle.pfad || null;
  let name = quelle.name || quelle.datei && quelle.datei.name || "";
  if (!pfad) {
    if (!quelle.datei) throw new DatenFehler("Es wurde keine Datei ausgewählt.");
    if (quelle.datei.size > ANALYSE_MAX_BYTES) {
      throw new DatenFehler(
        "Die Datei ist mit " + (quelle.datei.size / 1024 / 1024).toFixed(1) + " MB zu gross für die Analyse (höchstens 15 MB). Sie kann trotzdem gespeichert werden."
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
var ANALYSE_MAX_BYTES, ANALYSE_SCHRITTE;
var init_ki = __esm({
  "app/js/ki.js"() {
    init_daten();
    init_dateien();
    ANALYSE_MAX_BYTES = 15 * 1024 * 1024;
    ANALYSE_SCHRITTE = {
      offerte: ["Datei wird hochgeladen", "Dokument wird gelesen", "Positionen werden übernommen"],
      beleg: ["Datei wird hochgeladen", "Dokument wird gelesen", "Werte werden übernommen"]
    };
  }
});

// app/js/ansichten/offerten.js
var offerten_exports = {};
__export(offerten_exports, {
  aenderung: () => aenderung2,
  aktion: () => aktion6,
  eingabe: () => eingabe4,
  render: () => render6
});
function render6(Z2) {
  const bearbeitbar = kannBearbeiten();
  const summe = Z2.offerten.filter((o) => o.status !== "Abgelehnt").reduce((s, o) => s + offerteNetto(o) + offerteMwst(o), 0);
  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Offerten</h2><p>' + Z2.offerten.length + " erfasst · Summe " + chf(summe) + " (ohne abgelehnte)</p></div>" + (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="offerte-neu">+ Offerte</button>' : "") + "</div>";
  if (!Z2.offerten.length) {
    h += leerZustand(
      "Noch keine Offerten",
      "Laden Sie eine Offerte als PDF, JPG oder PNG hoch oder erfassen Sie die Positionen von Hand.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="offerte-neu">Offerte hinzufügen</button>' : ""
    );
    return h + "</section>";
  }
  h += '<div class="karte"><div class="tab-scroll"><table><thead><tr><th>Lieferant</th><th>Nummer</th><th>Datum</th><th>Kategorie</th><th>Status</th><th class="num">Netto</th><th class="num">Total inkl. MWST</th><th></th></tr></thead><tbody>';
  Z2.offerten.slice().reverse().forEach((o) => {
    h += "<tr><td><b>" + esc(o.lieferant || "–") + "</b> " + (o.ki_erkannt ? '<span class="badge demo">KI</span>' : "") + (o.datei_pfad ? ' <span class="badge">Datei</span>' : "") + (o.handwerker_id ? ' <span class="badge blau">Handwerker</span>' : "") + "</td><td>" + esc(o.nummer || "–") + "</td><td>" + datumCH(o.datum) + "</td><td>" + esc(kategorieName(Z2.budget, o.budgetposition_id)) + "</td><td>" + statusBadge(o.status) + '</td><td class="num">' + chf(offerteNetto(o)) + '</td><td class="num"><b>' + chf(offerteNetto(o) + offerteMwst(o)) + '</b></td><td><div class="zeile-aktion">' + (o.datei_pfad ? '<button class="btn still klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(o.datei_pfad) + '">Datei</button>' : "") + '<button class="btn still klein" type="button" data-aktion="offerte-bearbeiten" data-id="' + o.id + '">' + (bearbeitbar ? "Bearbeiten" : "Ansehen") + "</button>" + (bearbeitbar ? '<button class="btn still klein" type="button" data-aktion="offerte-loeschen" data-id="' + o.id + '">Löschen</button>' : "") + "</div></td></tr>";
  });
  return h + "</tbody></table></div></div></section>";
}
function neuePosition() {
  return { nr: "", beschreibung: "", menge: 1, einheit: "pauschal", einzelpreis: 0 };
}
function entwurfNetto() {
  return (entwurf3.offert_positionen || []).reduce((s, p) => s + zahl(p.menge) * zahl(p.einzelpreis), 0);
}
function entwurfMwst() {
  return entwurf3.mwst_satz == null ? 0 : entwurfNetto() * (zahl(entwurf3.mwst_satz) / 100);
}
function formular4(Z2, o) {
  dateiWartend2 = null;
  letzterHinweis = "";
  entwurf3 = o ? JSON.parse(JSON.stringify(o)) : {
    id: null,
    budgetposition_id: null,
    lieferant: "",
    nummer: "",
    datum: heuteISO(),
    status: "Entwurf",
    mwst_satz: 8.1,
    bemerkung: "",
    datei_pfad: null,
    datei_name: null,
    ki_erkannt: false,
    handwerker_id: null,
    offert_positionen: [neuePosition()]
  };
  if (!entwurf3.offert_positionen || !entwurf3.offert_positionen.length) entwurf3.offert_positionen = [neuePosition()];
  modalOeffnen({
    titel: entwurf3.id ? "Offerte bearbeiten" : "Neue Offerte",
    koerper: koerper3(Z2),
    speichern: () => speichern3(Z2)
  });
}
function koerper3(Z2) {
  const o = entwurf3;
  let h = '<div id="o-analyse">' + analyseBlock() + "</div>";
  if (o.ki_erkannt) {
    h += '<div class="hinweis demo" style="margin-bottom:14px"><div><b>Von der KI ausgelesen – bitte prüfen</b>Automatisch erkannte Werte können falsch sein. Beträge, Mengen und das Datum bitte mit der Offerte vergleichen.' + (letzterHinweis ? "<br>Hinweis der Auswertung: " + esc(letzterHinweis) : "") + "</div></div>";
  }
  h += '<label class="feld"><span>Lieferant</span><input data-feld="lieferant" value="' + esc(o.lieferant) + '" placeholder="Firma"></label><div class="feld-paar"><label class="feld"><span>Offertnummer</span><input data-feld="nummer" value="' + esc(o.nummer) + '" placeholder="2026-1045"></label><label class="feld"><span>Datum</span><input type="date" data-feld="datum" value="' + esc(o.datum || "") + '"></label></div><div class="feld-paar"><label class="feld"><span>Budgetkategorie</span><select data-feld="budgetposition_id">' + kategorieOptionen(Z2.budget, o.budgetposition_id) + '</select></label><label class="feld"><span>Status</span><select data-feld="status">' + STATUS_LISTE.map((s) => "<option" + (s === o.status ? " selected" : "") + ">" + s + "</option>").join("") + "</select></label></div>";
  if (istEigentuemer()) {
    const handwerker = Z2.mitglieder.filter((m) => m.rolle === "handwerker");
    h += '<label class="feld"><span>Handwerker-Zugang (optional)</span><select data-feld="handwerker_id"><option value="">Kein Zugang für Handwerker</option>' + handwerker.map((m) => '<option value="' + m.benutzer_id + '"' + (m.benutzer_id === o.handwerker_id ? " selected" : "") + ">" + esc(m.email) + "</option>").join("") + '</select><span style="font-size:.76rem;color:var(--grau);display:block;margin-top:4px">Diese Person sieht nur diese eine Offerte, über einen eigenen Link (siehe handwerker.html).</span></label>';
  }
  h += '<div class="abschnitt-kopf" style="margin:18px 2px 9px"><div><h3>Positionen</h3><p>Menge, Einheit und Einzelpreis sind frei änderbar</p></div><button class="btn zweit klein" type="button" data-aktion="o-pos-neu">+ Position</button></div><div class="pos-liste" id="o-positionen">' + o.offert_positionen.map(positionHtml).join("") + "</div>";
  h += '<div class="summe-box" id="o-summe">' + summeHtml() + "</div>";
  h += '<label class="feld" style="margin-top:14px"><span>Bemerkung</span><textarea data-feld="bemerkung" placeholder="optional">' + esc(o.bemerkung || "") + "</textarea></label>";
  return h;
}
function analyseBlock() {
  const o = entwurf3;
  if (o.datei_pfad) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Datei: ' + esc(o.datei_name || "") + '</b><div class="btn-reihe" style="margin-top:9px"><button class="btn zweit klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(o.datei_pfad) + '">Datei öffnen</button><button class="btn zweit klein" type="button" data-aktion="o-analysieren">Offerte auslesen</button><button class="btn still klein" type="button" data-aktion="o-datei-entfernen">Datei entfernen</button></div></div></div>';
  }
  if (dateiWartend2) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Gewählte Datei: ' + esc(dateiWartend2.name) + '</b>Wird beim Speichern hochgeladen.<div class="btn-reihe" style="margin-top:9px"><button class="btn zweit klein" type="button" data-aktion="o-analysieren">Offerte auslesen</button><button class="btn still klein" type="button" data-aktion="o-datei-entfernen">Datei entfernen</button></div></div></div>';
  }
  return '<div class="datei-feld" style="margin-bottom:14px"><p>Offerte als PDF, JPG oder PNG hochladen</p><input type="file" id="o-datei" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"><div class="btn-reihe" style="margin-top:11px;justify-content:center"><button class="btn klein" type="button" data-aktion="o-analysieren">Offerte auslesen</button></div><p style="margin:9px 0 0;font-size:.76rem">Beim Auslesen wird die Datei gespeichert und einmalig an den KI-Dienst (Google Gemini) übermittelt. Ohne Klick auf diesen Knopf passiert das nicht.</p></div>';
}
function positionHtml(p, i) {
  return '<div class="pos-zeile" data-zeile="' + i + '"><div class="pos-grid"><div class="pos-mini"><label class="feld"><span>Nr.</span><input class="p-nr" data-pos="' + i + '" data-feld="nr" value="' + esc(p.nr) + '"></label><label class="feld" style="grid-column:span 2"><span>Beschreibung</span><input data-pos="' + i + '" data-feld="beschreibung" value="' + esc(p.beschreibung) + '" placeholder="Leistung"></label></div><label class="feld"><span>Menge</span><input inputmode="decimal" data-pos="' + i + '" data-feld="menge" value="' + esc(p.menge) + '"></label><label class="feld"><span>Einheit</span><input list="einheit-liste" data-pos="' + i + '" data-feld="einheit" value="' + esc(p.einheit) + '"></label><label class="feld"><span>Einzelpreis CHF</span><input inputmode="decimal" data-pos="' + i + '" data-feld="einzelpreis" value="' + esc(p.einzelpreis) + '"></label><label class="feld"><span>Entfernen</span><button class="btn gefahr klein" type="button" data-aktion="o-pos-weg" data-pos="' + i + '">✕</button></label></div><div class="pos-fuss"><span style="color:var(--grau)">Zeilentotal</span><b class="zahl" data-zeilen-total="' + i + '">' + chf(zahl(p.menge) * zahl(p.einzelpreis)) + "</b></div></div>";
}
function summeHtml() {
  const o = entwurf3;
  const netto = entwurfNetto(), mwst = entwurfMwst();
  const ohneMwst = o.mwst_satz == null;
  return '<div class="check"><input type="checkbox" id="o-ohne-mwst"' + (ohneMwst ? " checked" : "") + '> <label for="o-ohne-mwst" style="margin:0">Ohne MWST führen</label></div><div class="summe-zeile"><span>Zwischentotal (netto)</span><b class="zahl" id="o-netto">' + chf(netto) + '</b></div><div class="summe-zeile"><span>MWST <input inputmode="decimal" data-feld="mwst_satz" value="' + (ohneMwst ? "" : esc(o.mwst_satz)) + '" ' + (ohneMwst ? "disabled" : "") + ' style="width:74px;display:inline-block;min-height:34px;padding:4px 7px;text-align:right"> %</span><b class="zahl" id="o-mwst">' + chf(mwst) + '</b></div><div class="summe-zeile total"><span>Total inkl. MWST</span><b class="zahl" id="o-total">' + chf(netto + mwst) + "</b></div>";
}
function neuZeichnenKoerper(Z2) {
  const koerperEl = document.querySelector(".modal-koerper");
  if (koerperEl) koerperEl.innerHTML = koerper3(Z2);
}
function summeAktualisieren() {
  if (!entwurf3) return;
  const netto = entwurfNetto(), mwst = entwurfMwst();
  const setze = (id, wert) => {
    const x = document.getElementById(id);
    if (x) x.textContent = wert;
  };
  setze("o-netto", chf(netto));
  setze("o-mwst", chf(mwst));
  setze("o-total", chf(netto + mwst));
  entwurf3.offert_positionen.forEach((p, i) => {
    const ziel = document.querySelector('[data-zeilen-total="' + i + '"]');
    if (ziel) ziel.textContent = chf(zahl(p.menge) * zahl(p.einzelpreis));
  });
}
async function analysieren(Z2) {
  const dateiFeld = document.getElementById("o-datei");
  if (dateiFeld && dateiFeld.files && dateiFeld.files[0]) dateiWartend2 = dateiFeld.files[0];
  if (!dateiWartend2 && !entwurf3.datei_pfad) {
    meldung("Bitte zuerst eine Datei auswählen.", true);
    return;
  }
  const block = document.getElementById("o-analyse");
  const schritte = ANALYSE_SCHRITTE.offerte;
  block.innerHTML = '<div class="karte karte-pad lade" style="margin-bottom:14px"><div class="lade-ring"></div><b>Offerte wird ausgelesen …</b>' + ladeSchritte(schritte, 0) + '<p style="margin:12px 0 0;font-size:.76rem;color:var(--grau)">Das dauert je nach Umfang bis zu einer Minute.</p></div>';
  let ergebnis;
  try {
    ergebnis = await analysiereDokument(
      { datei: dateiWartend2, pfad: entwurf3.datei_pfad, name: entwurf3.datei_name, projektId: Z2.projektId, bereich: "offerten" },
      "offerte",
      (i) => {
        const liste = block.querySelector(".lade-schritte");
        if (liste) liste.innerHTML = ladeSchritte(schritte, i + 1);
      }
    );
  } catch (e) {
    if (document.getElementById("o-analyse")) document.getElementById("o-analyse").innerHTML = analyseBlock();
    meldung(analyseFehlerText(e), true);
    return;
  }
  if (!document.querySelector(".modal") || !entwurf3) return;
  entwurf3.datei_pfad = ergebnis.datei_pfad;
  entwurf3.datei_name = ergebnis.datei_name;
  dateiWartend2 = null;
  letzterHinweis = ergebnis.hinweis || "";
  entwurf3.ki_erkannt = true;
  if (ergebnis.lieferant) entwurf3.lieferant = ergebnis.lieferant;
  if (ergebnis.nummer) entwurf3.nummer = ergebnis.nummer;
  if (ergebnis.datum) entwurf3.datum = ergebnis.datum;
  entwurf3.mwst_satz = ergebnis.mwstSatz;
  entwurf3.status = entwurf3.status === "Entwurf" ? "Erfasst" : entwurf3.status;
  if (ergebnis.positionen.length) entwurf3.offert_positionen = ergebnis.positionen;
  neuZeichnenKoerper(Z2);
  meldung(
    ergebnis.positionen.length ? "Offerte ausgelesen (" + ergebnis.positionen.length + " Positionen) – bitte prüfen." : "Es konnten keine Positionen erkannt werden. Bitte von Hand erfassen."
  );
}
async function speichern3(Z2) {
  const o = entwurf3;
  if (!o.lieferant.trim() && !o.nummer.trim()) {
    meldung("Bitte mindestens Lieferant oder Offertnummer angeben.", true);
    return false;
  }
  o.offert_positionen = o.offert_positionen.filter((p) => p.beschreibung.trim() || zahl(p.einzelpreis) !== 0);
  if (!o.offert_positionen.length) o.offert_positionen = [neuePosition()];
  const dateiFeld = document.getElementById("o-datei");
  if (!dateiWartend2 && dateiFeld && dateiFeld.files && dateiFeld.files[0]) dateiWartend2 = dateiFeld.files[0];
  try {
    if (dateiWartend2) {
      const info = await hochladen(dateiWartend2, Z2.projektId, "offerten");
      o.datei_pfad = info.datei_pfad;
      o.datei_name = info.datei_name;
    }
    await offerteSpeichern(Z2.projektId, { ...o, positionen: o.offert_positionen }, o.geaendert_am);
    meldung(o.id ? "Offerte aktualisiert." : "Offerte gespeichert.");
    dateiWartend2 = null;
    await neuLaden(["offerten"]);
    return true;
  } catch (err) {
    meldung(err.message, true);
    return false;
  }
}
function eingabe4(e, Z2) {
  if (!document.querySelector(".modal") || !entwurf3) return;
  const feld = e.target.closest("[data-feld]");
  if (!feld) return;
  const name = feld.dataset.feld;
  if (feld.dataset.pos !== void 0) {
    const p = entwurf3.offert_positionen[+feld.dataset.pos];
    if (!p) return;
    p[name] = feld.value;
    summeAktualisieren();
    return;
  }
  if (name === "handwerker_id") {
    entwurf3.handwerker_id = feld.value || null;
    return;
  }
  if (name === "budgetposition_id") {
    entwurf3.budgetposition_id = feld.value || null;
    return;
  }
  entwurf3[name] = feld.value;
  if (name === "mwst_satz") summeAktualisieren();
}
function aenderung2(e, Z2) {
  if (e.target.id === "o-ohne-mwst" && entwurf3) {
    entwurf3.mwst_satz = e.target.checked ? null : 8.1;
    neuZeichnenKoerper(Z2);
  }
}
function aktion6(a, knopf, Z2) {
  if (a === "offerte-neu") return formular4(Z2, null);
  if (a === "offerte-bearbeiten") return formular4(Z2, Z2.offerten.find((o) => o.id === knopf.dataset.id));
  if (a === "offerte-loeschen") {
    const o = Z2.offerten.find((x) => x.id === knopf.dataset.id);
    if (o && bestaetigen("Offerte " + (o.nummer || o.lieferant || "") + " löschen?")) {
      (async () => {
        try {
          if (o.datei_pfad) await loeschen(o.datei_pfad);
          await offerteLoeschen(o.id);
          meldung("Offerte gelöscht.");
          await neuLaden(["offerten", "belege"]);
        } catch (err) {
          meldung(err.message, true);
        }
      })();
    }
    return;
  }
  if (a === "o-analysieren") return analysieren(Z2);
  if (a === "o-pos-neu") {
    entwurf3.offert_positionen.push(neuePosition());
    entwurf3.offert_positionen[entwurf3.offert_positionen.length - 1].nr = String(entwurf3.offert_positionen.length);
    document.getElementById("o-positionen").innerHTML = entwurf3.offert_positionen.map(positionHtml).join("");
    summeAktualisieren();
    return;
  }
  if (a === "o-pos-weg") {
    entwurf3.offert_positionen.splice(+knopf.dataset.pos, 1);
    if (!entwurf3.offert_positionen.length) entwurf3.offert_positionen.push(neuePosition());
    document.getElementById("o-positionen").innerHTML = entwurf3.offert_positionen.map(positionHtml).join("");
    summeAktualisieren();
    return;
  }
  if (a === "o-datei-entfernen") {
    if (entwurf3.datei_pfad) loeschen(entwurf3.datei_pfad).catch(() => {
    });
    entwurf3.datei_pfad = null;
    entwurf3.datei_name = null;
    dateiWartend2 = null;
    document.getElementById("o-analyse").innerHTML = analyseBlock();
    return;
  }
  if (a === "datei-oeffnen") {
    signierterLink(knopf.dataset.pfad).then((url) => {
      if (url) window.open(url, "_blank");
    }).catch((e) => meldung(e.message, true));
  }
}
var entwurf3, dateiWartend2, letzterHinweis;
var init_offerten = __esm({
  "app/js/ansichten/offerten.js"() {
    init_format();
    init_gemeinsam();
    init_daten();
    init_dateien();
    init_ki();
    init_app();
    init_konfig();
    entwurf3 = null;
    dateiWartend2 = null;
    letzterHinweis = "";
  }
});

// app/js/ansichten/belege.js
var belege_exports = {};
__export(belege_exports, {
  aenderung: () => aenderung3,
  aktion: () => aktion7,
  eingabe: () => eingabe5,
  render: () => render7
});
function render7(Z2) {
  const bearbeitbar = kannBearbeiten();
  const rechnungen = Z2.belege.reduce((s, b) => s + zahl(b.brutto), 0);
  const bezahlt = Z2.belege.filter((b) => b.bezahlt).reduce((s, b) => s + zahl(b.brutto), 0);
  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Belege &amp; Rechnungen</h2><p>' + Z2.belege.length + " erfasst · " + chf(rechnungen) + " · davon bezahlt " + chf(bezahlt) + "</p></div>" + (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="beleg-neu">+ Beleg</button>' : "") + "</div>";
  if (!Z2.belege.length) {
    h += leerZustand(
      "Noch keine Belege",
      "Rechnungen und Quittungen als PDF, JPG oder PNG hochladen und einer Kategorie zuordnen.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="beleg-neu">Beleg hinzufügen</button>' : ""
    );
    return h + "</section>";
  }
  h += '<div class="karte"><div class="tab-scroll"><table><thead><tr><th>Lieferant</th><th>Nummer</th><th>Datum</th><th>Kategorie</th><th>Offerte</th><th class="num">Netto</th><th class="num">MWST</th><th class="num">Total</th><th>Zahlung</th><th></th></tr></thead><tbody>';
  Z2.belege.slice().reverse().forEach((b) => {
    const offerte = Z2.offerten.find((o) => o.id === b.offerte_id);
    h += "<tr><td><b>" + esc(b.lieferant || "–") + "</b> " + (b.ki_erkannt ? '<span class="badge demo">KI</span>' : "") + (b.datei_pfad ? ' <span class="badge">Datei</span>' : "") + "</td><td>" + esc(b.nummer || "–") + "</td><td>" + datumCH(b.datum) + "</td><td>" + esc(kategorieName(Z2.budget, b.budgetposition_id)) + "</td><td>" + (offerte ? esc(offerte.nummer || offerte.lieferant || "Offerte") : "–") + '</td><td class="num">' + chf(b.netto) + '</td><td class="num">' + (b.mwst == null ? "ohne" : chf(b.mwst)) + '</td><td class="num"><b>' + chf(b.brutto) + "</b></td><td>" + (b.bezahlt ? '<span class="badge gruen">bezahlt ' + (b.zahlungsdatum ? datumCH(b.zahlungsdatum) : "") + "</span>" : '<span class="badge amber">offen</span>') + '</td><td><div class="zeile-aktion">' + (b.datei_pfad ? '<button class="btn still klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(b.datei_pfad) + '">Datei</button>' : "") + '<button class="btn still klein" type="button" data-aktion="beleg-bearbeiten" data-id="' + b.id + '">' + (bearbeitbar ? "Bearbeiten" : "Ansehen") + "</button>" + (bearbeitbar ? '<button class="btn still klein" type="button" data-aktion="beleg-loeschen" data-id="' + b.id + '">Löschen</button>' : "") + "</div></td></tr>";
  });
  h += '</tbody><tfoot><tr><td colspan="7">Total</td><td class="num">' + chf(rechnungen) + '</td><td colspan="2"></td></tr></tfoot>';
  return h + "</table></div></div></section>";
}
function formular5(Z2, b) {
  dateiWartend3 = null;
  letzterHinweis2 = "";
  mwstManuell = false;
  entwurf4 = b ? JSON.parse(JSON.stringify(b)) : {
    id: null,
    budgetposition_id: null,
    offerte_id: null,
    lieferant: "",
    nummer: "",
    datum: heuteISO(),
    netto: 0,
    mwst: 0,
    brutto: 0,
    bezahlt: false,
    zahlungsdatum: "",
    bemerkung: "",
    datei_pfad: null,
    datei_name: null,
    ki_erkannt: false
  };
  modalOeffnen({ titel: entwurf4.id ? "Beleg bearbeiten" : "Neuer Beleg", koerper: koerper4(Z2), speichern: () => speichern4(Z2) });
}
function koerper4(Z2) {
  const b = entwurf4;
  const ohneMwst = b.mwst == null;
  let h = '<div id="b-analyse">' + analyseBlock2() + "</div>";
  if (b.ki_erkannt) {
    h += '<div class="hinweis demo" style="margin-bottom:14px"><div><b>Von der KI ausgelesen – bitte prüfen</b>Automatisch erkannte Werte können falsch sein. Beträge und Datum bitte mit dem Beleg vergleichen.' + (letzterHinweis2 ? "<br>Hinweis der Auswertung: " + esc(letzterHinweis2) : "") + "</div></div>";
  }
  h += '<label class="feld"><span>Lieferant</span><input data-feld="lieferant" value="' + esc(b.lieferant) + '" placeholder="Firma"></label><div class="feld-paar"><label class="feld"><span>Rechnungsnummer</span><input data-feld="nummer" value="' + esc(b.nummer) + '" placeholder="RE-2026-235"></label><label class="feld"><span>Rechnungsdatum</span><input type="date" data-feld="datum" value="' + esc(b.datum || "") + '"></label></div><div class="check"><input type="checkbox" id="b-ohne-mwst"' + (ohneMwst ? " checked" : "") + '> <label for="b-ohne-mwst" style="margin:0">Ohne MWST (kein MWST-Ausweis auf dem Beleg)</label></div><div class="feld-paar"><label class="feld"><span>Betrag exkl. MWST</span><input inputmode="decimal" data-feld="netto" data-betrag="1" value="' + esc(b.netto) + '"' + (ohneMwst ? " disabled" : "") + '></label><label class="feld"><span>MWST</span><input inputmode="decimal" data-feld="mwst" data-betrag="1" value="' + (ohneMwst ? "" : esc(b.mwst)) + '"' + (ohneMwst ? " disabled" : "") + '></label></div><label class="feld"><span>Betrag' + (ohneMwst ? "" : " inkl. MWST") + '</span><input inputmode="decimal" data-feld="brutto" data-betrag="1" value="' + esc(b.brutto) + '"></label>' + (ohneMwst ? "" : '<div class="hinweis info" style="margin-bottom:14px"><div>Beim Ausfüllen von zwei Feldern wird das dritte automatisch ergänzt (MWST-Satz ' + MWST_SATZ_VORGABE + " %).</div></div>") + '<div class="feld-paar"><label class="feld"><span>Kategorie</span><select data-feld="budgetposition_id">' + kategorieOptionen(Z2.budget, b.budgetposition_id) + '</select></label><label class="feld"><span>Bezug zu Offerte</span><select data-feld="offerte_id"><option value="">Keine Zuordnung</option>' + Z2.offerten.map((o) => '<option value="' + o.id + '"' + (o.id === b.offerte_id ? " selected" : "") + ">" + esc((o.nummer || "ohne Nr.") + " · " + (o.lieferant || "")) + "</option>").join("") + '</select></label></div><label class="check"><input type="checkbox" data-feld="bezahlt"' + (b.bezahlt ? " checked" : "") + '> Rechnung ist bezahlt</label><label class="feld"><span>Zahlungsdatum</span><input type="date" data-feld="zahlungsdatum" value="' + esc(b.zahlungsdatum || "") + '"></label><label class="feld"><span>Bemerkung</span><textarea data-feld="bemerkung" placeholder="optional">' + esc(b.bemerkung || "") + "</textarea></label>";
  return h;
}
function analyseBlock2() {
  const b = entwurf4;
  if (b.datei_pfad) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Datei: ' + esc(b.datei_name || "") + '</b><div class="btn-reihe" style="margin-top:9px"><button class="btn zweit klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(b.datei_pfad) + '">Datei öffnen</button><button class="btn zweit klein" type="button" data-aktion="b-analysieren">Beleg auslesen</button><button class="btn still klein" type="button" data-aktion="b-datei-entfernen">Datei entfernen</button></div></div></div>';
  }
  if (dateiWartend3) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Gewählte Datei: ' + esc(dateiWartend3.name) + '</b>Wird beim Speichern hochgeladen.<div class="btn-reihe" style="margin-top:9px"><button class="btn zweit klein" type="button" data-aktion="b-analysieren">Beleg auslesen</button><button class="btn still klein" type="button" data-aktion="b-datei-entfernen">Datei entfernen</button></div></div></div>';
  }
  return '<div class="datei-feld" style="margin-bottom:14px"><p>Rechnung oder Quittung als PDF, JPG oder PNG hochladen</p><input type="file" id="b-datei" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"><div class="btn-reihe" style="margin-top:11px;justify-content:center"><button class="btn klein" type="button" data-aktion="b-analysieren">Beleg auslesen</button></div><p style="margin:9px 0 0;font-size:.76rem">Beim Auslesen wird die Datei gespeichert und einmalig an den KI-Dienst (Google Gemini) übermittelt. Ohne Klick auf diesen Knopf passiert das nicht.</p></div>';
}
function betraegeAbgleichen(zuletzt) {
  const b = entwurf4;
  if (b.mwst == null) {
    b.netto = zahl(b.brutto);
    return;
  }
  const f = 1 + MWST_SATZ_VORGABE / 100;
  const r = (n) => Math.round(n * 100) / 100;
  if (zuletzt === "brutto") {
    b.netto = r(zahl(b.brutto) / f);
    b.mwst = r(zahl(b.brutto) - zahl(b.netto));
  } else if (zuletzt === "netto") {
    if (!mwstManuell) b.mwst = r(zahl(b.netto) * MWST_SATZ_VORGABE / 100);
    b.brutto = r(zahl(b.netto) + zahl(b.mwst));
  } else if (zuletzt === "mwst") {
    b.brutto = r(zahl(b.netto) + zahl(b.mwst));
  }
  document.querySelectorAll("[data-betrag]").forEach((inp) => {
    if (inp.dataset.feld !== zuletzt) inp.value = zahl(b[inp.dataset.feld]);
  });
}
async function analysieren2(Z2) {
  const feld = document.getElementById("b-datei");
  if (feld && feld.files && feld.files[0]) dateiWartend3 = feld.files[0];
  if (!dateiWartend3 && !entwurf4.datei_pfad) {
    meldung("Bitte zuerst eine Datei auswählen.", true);
    return;
  }
  const block = document.getElementById("b-analyse");
  const schritte = ANALYSE_SCHRITTE.beleg;
  block.innerHTML = '<div class="karte karte-pad lade" style="margin-bottom:14px"><div class="lade-ring"></div><b>Beleg wird ausgelesen …</b>' + ladeSchritte(schritte, 0) + '<p style="margin:12px 0 0;font-size:.76rem;color:var(--grau)">Das dauert in der Regel wenige Sekunden.</p></div>';
  let e;
  try {
    e = await analysiereDokument(
      { datei: dateiWartend3, pfad: entwurf4.datei_pfad, name: entwurf4.datei_name, projektId: Z2.projektId, bereich: "belege" },
      "beleg",
      (i) => {
        const liste = block.querySelector(".lade-schritte");
        if (liste) liste.innerHTML = ladeSchritte(schritte, i + 1);
      }
    );
  } catch (fehler) {
    const el2 = document.getElementById("b-analyse");
    if (el2) el2.innerHTML = analyseBlock2();
    meldung(analyseFehlerText(fehler), true);
    return;
  }
  if (!document.querySelector(".modal") || !entwurf4) return;
  entwurf4.datei_pfad = e.datei_pfad;
  entwurf4.datei_name = e.datei_name;
  dateiWartend3 = null;
  letzterHinweis2 = e.hinweis || "";
  mwstManuell = false;
  Object.assign(entwurf4, {
    ki_erkannt: true,
    lieferant: e.lieferant || entwurf4.lieferant,
    nummer: e.nummer || entwurf4.nummer,
    datum: e.datum || entwurf4.datum,
    netto: e.netto,
    mwst: e.mwst,
    brutto: e.brutto,
    bezahlt: e.bezahlt || entwurf4.bezahlt,
    zahlungsdatum: e.zahlungsdatum || entwurf4.zahlungsdatum
  });
  if (!entwurf4.offerte_id && entwurf4.lieferant) {
    const gesucht = entwurf4.lieferant.toLowerCase();
    const passend = Z2.offerten.find((o) => (o.lieferant || "").toLowerCase() === gesucht);
    if (passend) entwurf4.offerte_id = passend.id;
  }
  const koerperEl = document.querySelector(".modal-koerper");
  if (koerperEl) koerperEl.innerHTML = koerper4(Z2);
  meldung(
    e.brutto ? "Beleg ausgelesen – bitte prüfen." : "Es konnte kein Betrag erkannt werden. Bitte von Hand erfassen."
  );
}
async function speichern4(Z2) {
  const b = entwurf4;
  if (!b.lieferant.trim() && !b.nummer.trim()) {
    meldung("Bitte mindestens Lieferant oder Rechnungsnummer angeben.", true);
    return false;
  }
  if (zahl(b.brutto) <= 0) {
    meldung("Bitte einen Betrag erfassen.", true);
    return false;
  }
  b.netto = zahl(b.netto);
  b.brutto = zahl(b.brutto);
  b.mwst = b.mwst == null ? null : zahl(b.mwst);
  if (b.bezahlt && !b.zahlungsdatum) b.zahlungsdatum = heuteISO();
  if (!b.bezahlt) b.zahlungsdatum = "";
  const feld = document.getElementById("b-datei");
  if (!dateiWartend3 && feld && feld.files && feld.files[0]) dateiWartend3 = feld.files[0];
  try {
    if (dateiWartend3) {
      const info = await hochladen(dateiWartend3, Z2.projektId, "belege");
      b.datei_pfad = info.datei_pfad;
      b.datei_name = info.datei_name;
    }
    await belegSpeichern(Z2.projektId, b, b.geaendert_am);
    meldung(b.id ? "Beleg aktualisiert." : "Beleg gespeichert.");
    dateiWartend3 = null;
    await neuLaden(["belege"]);
    return true;
  } catch (err) {
    meldung(err.message, true);
    return false;
  }
}
function eingabe5(e) {
  if (!document.querySelector(".modal") || !entwurf4) return;
  const feld = e.target.closest("[data-feld]");
  if (!feld) return;
  const name = feld.dataset.feld;
  const wert = feld.type === "checkbox" ? feld.checked : feld.value;
  if (name === "budgetposition_id" || name === "offerte_id") {
    entwurf4[name] = wert || null;
    return;
  }
  entwurf4[name] = wert;
  if (name === "mwst") mwstManuell = true;
  if (feld.dataset.betrag) betraegeAbgleichen(name);
  if (name === "bezahlt" && wert && !entwurf4.zahlungsdatum) {
    entwurf4.zahlungsdatum = heuteISO();
    const zd = document.querySelector('[data-feld="zahlungsdatum"]');
    if (zd) zd.value = entwurf4.zahlungsdatum;
  }
}
function aenderung3(e, Z2) {
  if (e.target.id === "b-ohne-mwst" && entwurf4) {
    if (e.target.checked) {
      entwurf4.mwst = null;
      entwurf4.netto = zahl(entwurf4.brutto);
    } else {
      entwurf4.mwst = 0;
      betraegeAbgleichen("brutto");
    }
    const koerperEl = document.querySelector(".modal-koerper");
    if (koerperEl) koerperEl.innerHTML = koerper4(Z2);
  }
}
function aktion7(a, knopf, Z2) {
  if (a === "beleg-neu") return formular5(Z2, null);
  if (a === "beleg-bearbeiten") return formular5(Z2, Z2.belege.find((b) => b.id === knopf.dataset.id));
  if (a === "beleg-loeschen") {
    const b = Z2.belege.find((x) => x.id === knopf.dataset.id);
    if (b && bestaetigen("Beleg " + (b.nummer || b.lieferant || "") + " löschen?")) {
      (async () => {
        try {
          if (b.datei_pfad) await loeschen(b.datei_pfad);
          await belegLoeschen(b.id);
          meldung("Beleg gelöscht.");
          await neuLaden(["belege"]);
        } catch (err) {
          meldung(err.message, true);
        }
      })();
    }
    return;
  }
  if (a === "b-analysieren") return analysieren2(Z2);
  if (a === "b-datei-entfernen") {
    if (entwurf4.datei_pfad) loeschen(entwurf4.datei_pfad).catch(() => {
    });
    entwurf4.datei_pfad = null;
    entwurf4.datei_name = null;
    dateiWartend3 = null;
    document.getElementById("b-analyse").innerHTML = analyseBlock2();
    return;
  }
  if (a === "datei-oeffnen") {
    signierterLink(knopf.dataset.pfad).then((url) => {
      if (url) window.open(url, "_blank");
    }).catch((e) => meldung(e.message, true));
  }
}
var entwurf4, dateiWartend3, letzterHinweis2, mwstManuell;
var init_belege = __esm({
  "app/js/ansichten/belege.js"() {
    init_format();
    init_gemeinsam();
    init_daten();
    init_dateien();
    init_ki();
    init_app();
    init_konfig();
    entwurf4 = null;
    dateiWartend3 = null;
    letzterHinweis2 = "";
    mwstManuell = false;
  }
});

// app/js/ansichten/dokumente.js
var dokumente_exports = {};
__export(dokumente_exports, {
  aktion: () => aktion8,
  render: () => render8
});
function istFoto(d) {
  if (d.mime_typ) return d.mime_typ.startsWith("image/");
  return BILD_ENDUNG.test(d.dateiname || "");
}
function istAnzeigbar(d) {
  if (d.mime_typ) return ANZEIGBAR.test(d.mime_typ);
  return /\.(jpe?g|png|webp|gif)$/i.test(d.dateiname || "");
}
function vorschauAusSpeicher(pfad) {
  const eintrag = vorschauSpeicher.get(pfad);
  if (!eintrag || Date.now() - eintrag.zeit > VORSCHAU_GUELTIG_MS) return null;
  return eintrag.url;
}
async function vorschauenNachladen() {
  if (vorschauLaeuft) return;
  document.querySelectorAll("img[data-vorschau]").forEach((bild) => {
    if (bild.dataset.wacht) return;
    bild.dataset.wacht = "1";
    bild.addEventListener("error", () => kachelOhneBild(bild, "Vorschau nicht geladen"));
  });
  const offen = Array.from(document.querySelectorAll("img[data-vorschau]")).filter((bild) => !bild.getAttribute("src"));
  const pfade = [...new Set(offen.map((bild) => bild.dataset.vorschau))];
  if (!pfade.length) return;
  vorschauLaeuft = true;
  try {
    const karte = await vorschauLinks(pfade);
    Object.entries(karte).forEach(([pfad, url]) => vorschauSpeicher.set(pfad, { url, zeit: Date.now() }));
    offen.forEach((bild) => {
      const url = karte[bild.dataset.vorschau];
      if (url) bild.setAttribute("src", url);
      else kachelOhneBild(bild, "kein Zugriff");
    });
  } catch (e) {
    offen.forEach((bild) => kachelOhneBild(bild, "Vorschau nicht geladen"));
  } finally {
    vorschauLaeuft = false;
  }
}
function kachelOhneBild(bild, text2) {
  const halter = bild.parentElement;
  if (!halter) return;
  bild.remove();
  halter.innerHTML = '<span class="foto-ersatz">' + esc(text2) + "</span>";
}
function render8(Z2) {
  const bearbeitbar = kannBearbeiten();
  const fotos = Z2.dokumente.filter(istFoto).slice().reverse();
  const uebrige = Z2.dokumente.filter((d) => !istFoto(d)).slice().reverse();
  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Dokumente</h2><p>' + uebrige.length + (uebrige.length === 1 ? " Dokument" : " Dokumente") + (fotos.length ? " · " + fotos.length + (fotos.length === 1 ? " Foto" : " Fotos") : "") + "</p></div>" + (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="dokument-neu">+ Dateien</button>' : "") + "</div>";
  if (!Z2.dokumente.length) {
    h += leerZustand(
      "Die Ablage ist leer",
      "Mehrere Dateien auf einmal hochladen und anschliessend Typ, Datum und Kategorie ergänzen.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="dokument-neu">Dateien hochladen</button>' : ""
    );
    return h + "</section>";
  }
  if (!uebrige.length) {
    h += '<div class="karte karte-pad"><div class="leer" style="padding:8px 0">Nur Fotos abgelegt – Verträge, Pläne und Bewilligungen erscheinen hier.</div></div>';
  } else {
    h += '<div class="karte"><div class="tab-scroll"><table><thead><tr><th>Dateiname</th><th>Dokumenttyp</th><th>Datum</th><th>Kategorie</th><th>Bemerkung</th><th></th></tr></thead><tbody>';
    uebrige.forEach((d) => {
      h += "<tr><td><b>" + esc(d.dateiname) + "</b>" + (d.groesse ? ' <span class="badge">' + dateigroesse(d.groesse) + "</span>" : "") + "</td><td>" + esc(d.typ || "Sonstiges") + "</td><td>" + datumCH(d.datum) + "</td><td>" + esc(kategorieName(Z2.budget, d.budgetposition_id)) + '</td><td style="white-space:normal;max-width:260px">' + esc(d.bemerkung || "") + '</td><td><div class="zeile-aktion">' + (d.datei_pfad ? '<button class="btn still klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(d.datei_pfad) + '">Öffnen</button>' : "") + '<button class="btn still klein" type="button" data-aktion="dokument-bearbeiten" data-id="' + d.id + '">' + (bearbeitbar ? "Bearbeiten" : "Ansehen") + "</button>" + (bearbeitbar ? '<button class="btn still klein" type="button" data-aktion="dokument-loeschen" data-id="' + d.id + '">Löschen</button>' : "") + "</div></td></tr>";
    });
    h += "</tbody></table></div></div>";
  }
  h += "</section>";
  if (fotos.length) h += fotoAbschnitt(Z2, fotos, bearbeitbar);
  return h;
}
function fotoAbschnitt(Z2, fotos, bearbeitbar) {
  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Fotos</h2><p>' + fotos.length + ' Bilder · zum Vergrössern antippen</p></div></div><div class="foto-raster">';
  fotos.forEach((d) => {
    const gespeichert = d.datei_pfad ? vorschauAusSpeicher(d.datei_pfad) : null;
    h += '<figure class="foto-kachel"><button class="foto-bild" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(d.datei_pfad || "") + '" title="' + esc(d.dateiname) + '">' + (d.datei_pfad && istAnzeigbar(d) ? '<img alt="' + esc(d.dateiname) + '" loading="lazy" data-vorschau="' + esc(d.datei_pfad) + '"' + (gespeichert ? ' src="' + esc(gespeichert) + '"' : "") + ">" : '<span class="foto-ersatz">' + (d.datei_pfad ? "Format ohne Vorschau" : "keine Datei") + "</span>") + '</button><figcaption><b title="' + esc(d.dateiname) + '">' + esc(d.dateiname) + "</b><span>" + (d.datum ? datumCH(d.datum) : "ohne Datum") + (d.budgetposition_id ? " · " + esc(kategorieName(Z2.budget, d.budgetposition_id)) : "") + "</span>" + (d.bemerkung ? '<span class="bemerkung">' + esc(d.bemerkung) + "</span>" : "") + '<span class="foto-aktionen"><button class="btn still klein" type="button" data-aktion="dokument-bearbeiten" data-id="' + d.id + '">' + (bearbeitbar ? "Bearbeiten" : "Ansehen") + "</button>" + (bearbeitbar ? '<button class="btn still klein" type="button" data-aktion="dokument-loeschen" data-id="' + d.id + '">Löschen</button>' : "") + "</span></figcaption></figure>";
  });
  setTimeout(vorschauenNachladen, 0);
  return h + "</div></section>";
}
function hochladenFormular(Z2) {
  modalOeffnen({
    titel: "Dokumente hochladen",
    koerper: '<div class="datei-feld" style="margin-bottom:14px"><p>Mehrere Dateien auswählen (PDF, JPG, PNG, HEIC, WEBP – je max. 25 MB)</p><input type="file" id="d-dateien" multiple accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"></div><div class="feld-paar"><label class="feld"><span>Dokumenttyp</span><select id="d-typ">' + DOKUMENT_TYPEN.map((t) => "<option>" + t + "</option>").join("") + '</select></label><label class="feld"><span>Datum</span><input type="date" id="d-datum" value="' + heuteISO() + '"></label></div><label class="feld"><span>Kategorie</span><select id="d-kategorie">' + kategorieOptionen(Z2.budget, null) + '</select></label><label class="feld"><span>Bemerkung</span><textarea id="d-bemerkung" placeholder="gilt für alle gewählten Dateien"></textarea></label><div id="d-fortschritt"></div>',
    knopfText: "Hochladen",
    speichern: async () => {
      const feld = document.getElementById("d-dateien");
      const dateien = feld && feld.files ? Array.from(feld.files) : [];
      if (!dateien.length) {
        meldung("Bitte mindestens eine Datei auswählen.", true);
        return false;
      }
      for (const datei of dateien) {
        const fehler = dateiPruefen(datei);
        if (fehler) {
          meldung(datei.name + ": " + fehler, true);
          return false;
        }
      }
      const typ = document.getElementById("d-typ").value;
      const datum = document.getElementById("d-datum").value || null;
      const budgetposition_id = document.getElementById("d-kategorie").value || null;
      const bemerkung = document.getElementById("d-bemerkung").value.trim();
      const fortschritt = document.getElementById("d-fortschritt");
      const zeilen = [];
      try {
        for (let i = 0; i < dateien.length; i++) {
          fortschritt.innerHTML = '<div class="hinweis info"><div>Lade Datei ' + (i + 1) + " von " + dateien.length + " hoch …</div></div>";
          const info = await hochladen(dateien[i], Z2.projektId, "dokumente");
          zeilen.push({
            budgetposition_id,
            dateiname: dateien[i].name,
            typ,
            datum,
            bemerkung,
            datei_pfad: info.datei_pfad,
            mime_typ: dateien[i].type || null,
            groesse: dateien[i].size
          });
        }
        await dokumenteAnlegen(Z2.projektId, zeilen);
        meldung(zeilen.length + " Dokument(e) gespeichert.");
        await neuLaden(["dokumente"]);
        return true;
      } catch (err) {
        await Promise.allSettled(zeilen.map((z) => loeschen(z.datei_pfad)));
        meldung(err.message, true);
        return false;
      }
    }
  });
}
function bearbeitenFormular(Z2, d) {
  modalOeffnen({
    titel: "Dokument bearbeiten",
    koerper: '<label class="feld"><span>Dateiname / Bezeichnung</span><input id="d-name" value="' + esc(d.dateiname) + '"></label><div class="feld-paar"><label class="feld"><span>Dokumenttyp</span><select id="d-typ">' + DOKUMENT_TYPEN.map((t) => "<option" + (t === d.typ ? " selected" : "") + ">" + t + "</option>").join("") + (!DOKUMENT_TYPEN.includes(d.typ) && d.typ ? "<option selected>" + esc(d.typ) + "</option>" : "") + '</select></label><label class="feld"><span>Datum</span><input type="date" id="d-datum" value="' + esc(d.datum || "") + '"></label></div><label class="feld"><span>Kategorie</span><select id="d-kategorie">' + kategorieOptionen(Z2.budget, d.budgetposition_id) + '</select></label><label class="feld"><span>Bemerkung</span><textarea id="d-bemerkung">' + esc(d.bemerkung || "") + "</textarea></label>",
    speichern: async () => {
      try {
        await dokumentAktualisieren(d.id, {
          dateiname: document.getElementById("d-name").value.trim() || d.dateiname,
          typ: document.getElementById("d-typ").value,
          datum: document.getElementById("d-datum").value || null,
          budgetposition_id: document.getElementById("d-kategorie").value || null,
          bemerkung: document.getElementById("d-bemerkung").value.trim()
        }, d.geaendert_am);
        meldung("Dokument aktualisiert.");
        await neuLaden(["dokumente"]);
        return true;
      } catch (err) {
        meldung(err.message, true);
        return false;
      }
    }
  });
}
function aktion8(a, knopf, Z2) {
  if (a === "dokument-neu") return hochladenFormular(Z2);
  if (a === "dokument-bearbeiten") return bearbeitenFormular(Z2, Z2.dokumente.find((d) => d.id === knopf.dataset.id));
  if (a === "dokument-loeschen") {
    const d = Z2.dokumente.find((x) => x.id === knopf.dataset.id);
    if (d && bestaetigen('Dokument "' + d.dateiname + '" löschen?')) {
      (async () => {
        try {
          if (d.datei_pfad) await loeschen(d.datei_pfad);
          await dokumentLoeschen(d.id);
          meldung("Dokument gelöscht.");
          await neuLaden(["dokumente"]);
        } catch (err) {
          meldung(err.message, true);
        }
      })();
    }
    return;
  }
  if (a === "datei-oeffnen") {
    signierterLink(knopf.dataset.pfad).then((url) => {
      if (url) window.open(url, "_blank");
    }).catch((e) => meldung(e.message, true));
  }
}
var BILD_ENDUNG, ANZEIGBAR, vorschauSpeicher, VORSCHAU_GUELTIG_MS, vorschauLaeuft;
var init_dokumente = __esm({
  "app/js/ansichten/dokumente.js"() {
    init_format();
    init_gemeinsam();
    init_daten();
    init_dateien();
    init_app();
    init_konfig();
    BILD_ENDUNG = /\.(jpe?g|png|webp|gif|heic|heif)$/i;
    ANZEIGBAR = /^image\/(jpeg|png|webp|gif)$/i;
    vorschauSpeicher = /* @__PURE__ */ new Map();
    VORSCHAU_GUELTIG_MS = 8 * 60 * 1e3;
    vorschauLaeuft = false;
  }
});

// app/js/app.js
var app_exports = {};
__export(app_exports, {
  Z: () => Z,
  frischLaden: () => frischLaden,
  istEigentuemer: () => istEigentuemer,
  kannBearbeiten: () => kannBearbeiten,
  modalOeffnen: () => modalOeffnen,
  modalSchliessen: () => modalSchliessen,
  neuLaden: () => neuLaden,
  neuZeichnen: () => neuZeichnen,
  projektWechseln: () => projektWechseln
});
function kannBearbeiten() {
  return Z.meineRolle === "eigentuemer" || Z.meineRolle === "bearbeiter";
}
function istEigentuemer() {
  return Z.meineRolle === "eigentuemer";
}
function neuZeichnen() {
  zeichnen();
}
async function neuLaden(teile) {
  if (!Z.projektId) return;
  const alle = !teile;
  const projektId = Z.projektId;
  const braucht = (name) => alle || teile.includes(name);
  const auftraege = [];
  Z.ladeStand = {};
  const holen = (name, fn, ziel) => {
    if (!braucht(name)) return;
    Z.ladeStand[name] = "läuft";
    auftraege.push(
      Promise.resolve().then(() => fn(projektId)).then(
        (daten) => {
          Z[ziel] = daten;
          Z.ladeStand[name] = "fertig";
          return null;
        },
        (fehler) => {
          Z.ladeStand[name] = fehler.message || String(fehler);
          return fehler;
        }
      )
    );
  };
  holen("mitglieder", mitgliederLaden, "mitglieder");
  if (braucht("mitglieder")) {
    auftraege.push(einladungenLaden(projektId).then((d) => {
      Z.einladungen = d;
      return null;
    }, () => null));
  }
  holen("nebenkosten", nebenkostenLaden, "nebenkosten");
  holen("foerdergelder", foerdergelderLaden, "foerdergelder");
  holen("anschaffungen", anschaffungenLaden, "anschaffungen");
  holen("budget", budgetLaden, "budget");
  holen("offerten", offertenLaden, "offerten");
  holen("belege", belegeLaden, "belege");
  holen("dokumente", dokumenteLaden, "dokumente");
  if (alle || braucht("budget") || braucht("offerten") || braucht("belege")) {
    Z.ladeStand.kostenvergleich = "läuft";
    auftraege.push(
      Promise.resolve().then(() => kostenvergleichLaden(projektId)).then(
        (d) => {
          Z.kostenvergleich = d;
          Z.ladeStand.kostenvergleich = "fertig";
          return null;
        },
        (f) => {
          Z.ladeStand.kostenvergleich = f.message || String(f);
          return f;
        }
      )
    );
  }
  Z.laedt = true;
  Z.ladeBegonnen = Date.now();
  zeichnen();
  const zwischenstand = setTimeout(() => {
    if (Z.laedt) zeichnen();
  }, 5e3);
  const waechter = setTimeout(() => {
    if (!Z.laedt || Z.projektId !== projektId) return;
    Z.laedt = false;
    Z.ladeFehler = "Der Server hat nicht vollständig geantwortet. Offen: " + Object.keys(Z.ladeStand).filter((k) => Z.ladeStand[k] === "läuft").join(", ");
    zeichnen();
  }, 2e4);
  const fehlerListe = (await Promise.all(auftraege)).filter(Boolean);
  clearTimeout(zwischenstand);
  clearTimeout(waechter);
  Z.laedt = false;
  if (Z.projektId !== projektId) return;
  if (Z.benutzer) {
    const mich = Z.mitglieder.find((m) => m.benutzer_id === Z.benutzer.id);
    Z.meineRolle = mich ? mich.rolle : null;
  }
  if (fehlerListe.length) {
    const ersterFehler = fehlerListe[0];
    Z.online = !(ersterFehler instanceof DatenFehler && ersterFehler.keineVerbindung);
    Z.ladeFehler = ersterFehler.message || String(ersterFehler);
  } else {
    Z.online = true;
    Z.ladeFehler = "";
  }
  zeichnen();
}
async function projektWechseln(projektId) {
  if (Z.abmeldeAbo) {
    Z.abmeldeAbo();
    Z.abmeldeAbo = null;
  }
  Z.projektId = projektId;
  Z.projekt = Z.projekte.find((p) => p.id === projektId) || null;
  try {
    localStorage.setItem("tw-letztes-projekt", projektId);
  } catch (e) {
  }
  await neuLaden();
  if (Z.projektId) {
    Z.abmeldeAbo = projektAbonnieren(Z.projektId, (bereich) => neuLadenGesammelt(bereich));
  }
}
function neuLadenGesammelt(bereich) {
  sammelBereiche.add(bereich);
  clearTimeout(sammelUhr);
  sammelUhr = setTimeout(() => {
    const bereiche = Array.from(sammelBereiche);
    sammelBereiche.clear();
    neuLaden(bereiche);
  }, 400);
}
function laufendeKennung() {
  const skript = document.querySelector('script[type=module][src*="js/paket/"]');
  const treffer = skript && /app\.([0-9a-f]+)\.js/.exec(skript.getAttribute("src"));
  return treffer ? treffer[1] : null;
}
async function neueVersionPruefen() {
  if (Z.neueVersion) return;
  const laufend = laufendeKennung();
  if (!laufend) return;
  try {
    const antwort = await fetch("index.html?stand=" + Date.now(), { cache: "no-store" });
    if (!antwort.ok) return;
    const html = await antwort.text();
    const treffer = /js\/paket\/app\.([0-9a-f]+)\.js/.exec(html);
    if (treffer && treffer[1] !== laufend) {
      Z.neueVersion = true;
      zeichnen();
    }
  } catch (e) {
  }
}
function frischLaden() {
  location.replace(location.pathname + "?stand=" + Date.now());
}
function ansichtWechseln(name) {
  Z.aktuelleAnsicht = name;
  zeichnen();
  window.scrollTo({ top: 0 });
}
function zeichnen() {
  try {
    zeichnenInner();
    el("app").dataset.gestartet = "ja";
  } catch (e) {
    el("app").innerHTML = '<main><div class="karte karte-pad" style="margin:20px auto;max-width:520px"><div class="hinweis fehler"><div><b>Anzeigefehler</b>' + esc(e.message || String(e)) + '</div></div><div class="btn-reihe" style="margin-top:12px"><button class="btn" type="button" onclick="location.reload()">Neu laden</button><button class="btn zweit" type="button" data-aktion="abmelden">Abmelden</button></div></div></main>';
    el("app").dataset.gestartet = "ja";
  }
}
function zeichnenInner() {
  const wrap = el("app");
  if (!Z.session && Z.sitzungVermutet && !Z.authGeklaert) {
    el("kopf").hidden = false;
    el("nav-mobil").hidden = true;
    el("nav-desktop").innerHTML = "";
    wrap.innerHTML = '<main><div class="karte karte-pad" style="margin:20px auto;max-width:520px"><div class="leer"><b>Anmeldung wird geprüft …</b>Das dauert normalerweise einen Augenblick.</div><div class="btn-reihe" style="margin-top:14px"><button class="btn zweit" type="button" data-aktion="neu-laden">Erneut versuchen</button><button class="btn zweit" type="button" data-aktion="abmelden">Abmelden</button><a class="btn still" href="hilfe.html">Diagnose</a></div></div></main>';
    return;
  }
  if (!Z.session) {
    el("kopf").hidden = true;
    el("nav-mobil").hidden = true;
    wrap.innerHTML = render();
    return;
  }
  el("kopf").hidden = false;
  navZeichnen();
  if (!Z.projekt) {
    el("nav-mobil").hidden = true;
    wrap.innerHTML = Z.laedt || Z.ladeFehler ? '<main><div style="max-width:520px;margin:20px auto;padding:0 14px">' + ladeBanner() + '<div class="btn-reihe" style="margin-top:12px"><button class="btn zweit" type="button" data-aktion="abmelden">Abmelden</button><a class="btn still" href="hilfe.html">Diagnose</a></div></div></main>' : renderProjektAnlegen();
    return;
  }
  el("nav-mobil").hidden = false;
  el("kopf-titel").textContent = Z.projekt.name || "Projekt";
  el("kopf-unter").textContent = Z.projekt.adresse || "Sanierung & Dokumente";
  const modul = ANSICHTS_MODULE[Z.aktuelleAnsicht];
  let innen = "";
  try {
    innen = modul ? modul.render(Z) : "";
  } catch (e) {
    innen = '<div class="karte karte-pad"><div class="hinweis fehler"><div><b>Diese Ansicht konnte nicht aufgebaut werden</b>' + esc(e.message || String(e)) + '</div></div><div class="btn-reihe" style="margin-top:12px"><button class="btn zweit" type="button" data-ansicht="uebersicht">Zur Übersicht</button><button class="btn zweit" type="button" data-aktion="neu-laden">Daten neu laden</button></div></div>';
  }
  wrap.innerHTML = (!Z.online ? '<div class="banner-offline">Keine Verbindung zum Server – Änderungen sind erst nach erneuter Verbindung möglich.</div>' : "") + '<main id="ansicht" tabindex="-1">' + ladeBanner() + innen + "</main>";
}
function ladeBanner() {
  const aktualisierung = Z.neueVersion ? '<div class="hinweis info abschnitt"><div style="flex:1"><b>Neue Version verfügbar</b>Ihre Änderungen sind gespeichert – ein Klick genügt.<div class="btn-reihe" style="margin-top:9px"><button class="btn klein" type="button" data-aktion="version-laden">Jetzt aktualisieren</button></div></div></div>' : "";
  if (Z.laedt) {
    const dauer = Z.ladeBegonnen ? Math.round((Date.now() - Z.ladeBegonnen) / 1e3) : 0;
    const offen = Object.keys(Z.ladeStand).filter((k) => Z.ladeStand[k] === "läuft");
    const fertig = Object.keys(Z.ladeStand).filter((k) => Z.ladeStand[k] === "fertig");
    return aktualisierung + '<div class="hinweis info abschnitt"><div style="flex:1">Daten werden geladen …' + (dauer >= 5 ? "<br>Das dauert ungewöhnlich lange (" + dauer + " s). Fertig: " + (fertig.length ? esc(fertig.join(", ")) : "nichts") + ". Offen: " + esc(offen.join(", ")) + '<div class="btn-reihe" style="margin-top:9px"><button class="btn zweit klein" type="button" data-aktion="neu-laden">Erneut versuchen</button><a class="btn still klein" href="hilfe.html">Diagnose</a></div>' : "") + "</div></div>";
  }
  if (Z.ladeFehler) {
    return aktualisierung + '<div class="hinweis fehler abschnitt"><div style="flex:1"><b>Daten konnten nicht geladen werden</b>' + esc(Z.ladeFehler) + '<div class="btn-reihe" style="margin-top:9px"><button class="btn zweit klein" type="button" data-aktion="neu-laden">Erneut versuchen</button><a class="btn still klein" href="hilfe.html">Diagnose</a></div></div></div>';
  }
  return aktualisierung;
}
function navZeichnen() {
  const projektAuswahl = Z.projekte.length > 1 ? '<select id="projekt-wahl" style="width:auto;min-height:34px;padding:4px 8px;font-size:.82rem;margin-right:6px">' + Z.projekte.map((p) => '<option value="' + p.id + '"' + (p.id === Z.projektId ? " selected" : "") + ">" + esc(p.name || "Projekt") + "</option>").join("") + "</select>" : "";
  el("nav-desktop").innerHTML = (Z.projekt ? ANSICHTEN.map(
    (a) => '<button type="button" data-ansicht="' + a.id + '"' + (a.id === Z.aktuelleAnsicht ? ' aria-current="page"' : "") + ">" + a.text + "</button>"
  ).join("") : "") + '<span class="kopf-rechts">' + projektAuswahl + '<span class="sync-punkt' + (Z.online ? "" : " aus") + '" title="' + (Z.online ? "Verbunden" : "Keine Verbindung") + '"></span><button class="btn still klein" type="button" data-aktion="abmelden" style="color:#fff">Abmelden</button></span>';
  el("nav-mobil").innerHTML = ANSICHTEN.map(
    (a) => '<button type="button" data-ansicht="' + a.id + '"' + (a.id === Z.aktuelleAnsicht ? ' aria-current="page"' : "") + '><svg viewBox="0 0 24 24" aria-hidden="true">' + a.icon + "</svg>" + a.text + "</button>"
  ).join("");
}
function modalOeffnen(o) {
  modalSpeichern = o.speichern || null;
  el("modal-wrap").innerHTML = '<div class="modal-hg" id="modal-hg"><div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(o.titel) + '"><div class="modal-kopf"><h2>' + esc(o.titel) + '</h2><button class="x-btn" type="button" data-aktion="modal-zu" aria-label="Schliessen">×</button></div><div class="modal-koerper">' + o.koerper + '</div><div class="modal-fuss"><button class="btn zweit" type="button" data-aktion="modal-zu">Abbrechen</button><button class="btn" type="button" data-aktion="modal-speichern">' + (o.knopfText || "Speichern") + "</button></div></div></div>";
  document.body.style.overflow = "hidden";
  const erstesFeld = document.querySelector(".modal-koerper input, .modal-koerper select");
  if (erstesFeld) setTimeout(() => erstesFeld.focus(), 10);
}
function modalSchliessen() {
  el("modal-wrap").innerHTML = "";
  document.body.style.overflow = "";
  modalSpeichern = null;
}
async function modalSpeichernAusloesen(knopf) {
  if (!modalSpeichern) return modalSchliessen();
  knopf.disabled = true;
  try {
    const fertig = await modalSpeichern();
    if (fertig !== false) modalSchliessen();
  } catch (e) {
    meldung(e.message || "Fehler beim Speichern.", true);
  } finally {
    if (knopf) knopf.disabled = false;
  }
}
async function projekteUndDatenLaden() {
  Z.laedt = true;
  Z.ladeFehler = "";
  zeichnen();
  let gescheitert = null;
  try {
    Z.projekte = await projekteLaden();
    Z.online = true;
  } catch (e) {
    Z.online = !(e instanceof DatenFehler && e.keineVerbindung);
    gescheitert = e;
    Z.projekte = [];
  }
  Z.laedt = false;
  if (gescheitert) {
    Z.ladeFehler = gescheitert.message || String(gescheitert);
    zeichnen();
    return;
  }
  let letztes = null;
  try {
    letztes = localStorage.getItem("tw-letztes-projekt");
  } catch (e) {
  }
  const gewaehlt = Z.projekte.find((p) => p.id === letztes) || Z.projekte[0] || null;
  if (gewaehlt) await projektWechseln(gewaehlt.id);
  else zeichnen();
}
function einladungAusAdresse() {
  const ausAdresse = new URLSearchParams(location.search).get("einladung");
  if (ausAdresse) {
    try {
      sessionStorage.setItem(EINLADUNG_SCHLUESSEL, ausAdresse);
    } catch (e) {
    }
    return ausAdresse;
  }
  try {
    return sessionStorage.getItem(EINLADUNG_SCHLUESSEL);
  } catch (e) {
    return null;
  }
}
function einladungVergessen() {
  try {
    sessionStorage.removeItem(EINLADUNG_SCHLUESSEL);
  } catch (e) {
  }
  Z.einladung = null;
}
async function einladungVerarbeiten() {
  const token = einladungAusAdresse();
  if (!token || !Z.session) return false;
  try {
    const projektId = await einladungEinloesen(token);
    einladungVergessen();
    Z.projekte = await projekteLaden();
    await projektWechseln(projektId);
    meldung("Sie sind jetzt Mitglied dieses Projekts.");
    return true;
  } catch (e) {
    einladungVergessen();
    Z.ladeFehler = e.message || String(e);
    zeichnen();
    return true;
  }
}
var el, Z, ANSICHTEN, ANSICHTS_MODULE, sammelUhr, sammelBereiche, modalSpeichern, ladenLaeuft, EINLADUNG_SCHLUESSEL;
var init_app = __esm({
  "app/js/app.js"() {
    init_supabase();
    init_daten();
    init_format();
    init_anmeldung();
    init_uebersicht();
    init_budget();
    init_offerten();
    init_belege();
    init_dokumente();
    el = (id) => document.getElementById(id);
    Z = {
      session: null,
      benutzer: null,
      projekte: [],
      projektId: null,
      projekt: null,
      mitglieder: [],
      meineRolle: null,
      budget: [],
      offerten: [],
      belege: [],
      dokumente: [],
      kostenvergleich: [],
      nebenkosten: [],
      foerdergelder: [],
      anschaffungen: [],
      aktuelleAnsicht: "uebersicht",
      online: navigator.onLine,
      ladeVorgaenge: 0,
      abmeldeAbo: null,
      // Beim Start wird sofort gezeichnet. sitzungVermutet kommt aus dem lokalen
      // Speicher, authGeklaert wird gesetzt, sobald Supabase geantwortet hat.
      sitzungVermutet: false,
      authGeklaert: false,
      authHinweis: "",
      laedt: false,
      ladeFehler: "",
      neueVersion: false,
      ladeStand: {},
      // je Abfrage: "läuft" | "fertig" | Fehlertext
      ladeBegonnen: 0,
      einladungen: [],
      einladung: null
      // einladung: offener Link, noch nicht eingelöst
    };
    ANSICHTEN = [
      { id: "uebersicht", text: "Übersicht", icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>' },
      { id: "budget", text: "Budget", icon: '<path d="M3 20V9"/><path d="M9 20V4"/><path d="M15 20v-8"/><path d="M21 20V7"/>' },
      { id: "offerten", text: "Offerten", icon: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>' },
      { id: "belege", text: "Belege", icon: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9.5 8h5M9.5 12h5"/>' },
      { id: "dokumente", text: "Dokumente", icon: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' }
    ];
    ANSICHTS_MODULE = { uebersicht: uebersicht_exports, budget: budget_exports, offerten: offerten_exports, belege: belege_exports, dokumente: dokumente_exports };
    sammelUhr = null;
    sammelBereiche = /* @__PURE__ */ new Set();
    modalSpeichern = null;
    document.addEventListener("click", async (e) => {
      const knopf = e.target.closest("[data-ansicht]");
      if (knopf) return ansichtWechseln(knopf.dataset.ansicht);
      const aktionsKnopf = e.target.closest("[data-aktion]");
      if (aktionsKnopf) {
        const a = aktionsKnopf.dataset.aktion;
        if (a === "modal-zu") return modalSchliessen();
        if (a === "modal-speichern") return modalSpeichernAusloesen(aktionsKnopf);
        if (a === "abmelden") {
          if (Z.abmeldeAbo) {
            Z.abmeldeAbo();
            Z.abmeldeAbo = null;
          }
          Z.session = null;
          Z.benutzer = null;
          Z.sitzungVermutet = false;
          Z.authGeklaert = true;
          Z.projekte = [];
          Z.projekt = null;
          Z.projektId = null;
          Z.laedt = false;
          Z.ladeFehler = "";
          Z.authHinweis = "";
          zeichnen();
          abmelden().catch(() => {
          });
          return;
        }
        if (a === "version-laden") return frischLaden();
        if (a === "neu-laden") {
          Z.ladeFehler = "";
          if (Z.projektId) neuLaden();
          else projekteUndDatenLaden();
          return;
        }
        if (!Z.session) return aktion(a, aktionsKnopf, Z);
        const modul = ANSICHTS_MODULE[Z.aktuelleAnsicht];
        if (modul && modul.aktion) return modul.aktion(a, aktionsKnopf, Z);
        return aktion2(a, aktionsKnopf, Z);
      }
      if (e.target.id === "modal-hg") modalSchliessen();
    });
    document.addEventListener("submit", (e) => {
      if (e.target.closest("#anmelde-formular")) {
        e.preventDefault();
        formularAbschicken(e.target);
      }
    });
    document.addEventListener("input", (e) => {
      const modul = ANSICHTS_MODULE[Z.aktuelleAnsicht];
      if (modul && modul.eingabe) modul.eingabe(e, Z);
    });
    document.addEventListener("change", (e) => {
      if (e.target.id === "projekt-wahl") return projektWechseln(e.target.value);
      const modul = ANSICHTS_MODULE[Z.aktuelleAnsicht];
      if (modul && modul.aenderung) return modul.aenderung(e, Z);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && el("modal-wrap").innerHTML) modalSchliessen();
    });
    window.addEventListener("online", () => {
      Z.online = true;
      if (Z.projektId) neuLaden();
      else zeichnen();
    });
    window.addEventListener("offline", () => {
      Z.online = false;
      zeichnen();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      neueVersionPruefen();
      if (Z.projektId) neuLaden();
    });
    aufAuthAchten((ereignis, sitzung) => {
      Z.authGeklaert = true;
      Z.authHinweis = "";
      Z.session = sitzung;
      Z.benutzer = sitzung ? sitzung.user : null;
      if (ereignis === "SIGNED_OUT" || !sitzung) {
        if (Z.abmeldeAbo) {
          Z.abmeldeAbo();
          Z.abmeldeAbo = null;
        }
        Z.projektId = null;
        Z.projekt = null;
        Z.projekte = [];
        zeichnen();
        return;
      }
      zeichnen();
      if (ereignis === "SIGNED_IN" || ereignis === "INITIAL_SESSION" || ereignis === "TOKEN_REFRESHED") {
        setTimeout(() => {
          if (ladenLaeuft) return;
          ladenLaeuft = true;
          einladungVerarbeiten().then((erledigt) => erledigt || Z.projekte.length ? null : projekteUndDatenLaden()).catch((e) => {
            Z.ladeFehler = e.message || String(e);
            zeichnen();
          }).finally(() => {
            ladenLaeuft = false;
          });
        }, 0);
      }
    });
    ladenLaeuft = false;
    EINLADUNG_SCHLUESSEL = "tw-einladung";
    (function start() {
      Z.sitzungVermutet = gespeicherteSitzungVorhanden();
      zeichnen();
      const token = einladungAusAdresse();
      if (token) {
        einladungInfo(token).then((info) => {
          if (info) {
            Z.einladung = info;
            zeichnen();
          }
        }).catch(() => {
        });
      }
      setTimeout(neueVersionPruefen, 3e3);
      setInterval(neueVersionPruefen, 15 * 60 * 1e3);
      setTimeout(() => {
        if (Z.session || Z.projekt || Z.ladeFehler) return;
        Z.authGeklaert = true;
        if (!Z.session) Z.authHinweis = "Die Anmeldung konnte nicht geprüft werden – bitte erneut anmelden.";
        zeichnen();
      }, 15e3);
    })();
  }
});
init_app();
export {
  Z,
  frischLaden,
  istEigentuemer,
  kannBearbeiten,
  modalOeffnen,
  modalSchliessen,
  neuLaden,
  neuZeichnen,
  projektWechseln
};
