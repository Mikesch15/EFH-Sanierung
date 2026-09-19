var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// app/js/supabase.js
import { createClient } from "../vendor/supabase-js.js";

// app/js/konfig.js
var SUPABASE_URL = "https://evozevkzwcvpbnvcmmfp.supabase.co";
var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_us-LmqO0xw7nYgraQ7KCNw_dukOK3K-";
var STORAGE_BUCKET = "projektdateien";
var DATEI_MAX_BYTES = 25 * 1024 * 1024;
var DATEI_ERLAUBTE_TYPEN = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"];
var DATEI_ERLAUBTE_ENDUNGEN = [".pdf", ".jpg", ".jpeg", ".png", ".heic", ".webp"];
var MWST_SATZ_VORGABE = 8.1;
var STATUS_LISTE = ["Entwurf", "Erfasst", "Verglichen", "Beauftragt", "Abgelehnt"];
var DOKUMENT_TYPEN = [
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
var STANDARD_KATEGORIEN = [
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
var NEBENKOSTEN_ARTEN = [
  "Notariat",
  "Handänderungssteuer",
  "Grundbuchgebühren",
  "Schätzung / Gutachten",
  "Bankspesen",
  "Gebäudeversicherung",
  "Umzug",
  "Sonstiges"
];
var ROLLEN = {
  eigentuemer: "Eigentümer",
  bearbeiter: "Bearbeiter",
  leser: "Leser",
  handwerker: "Handwerker"
};
var SIGNIERTER_LINK_SEKUNDEN = 120;

// app/js/supabase.js
var merker = /* @__PURE__ */ new Map();
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
var speicherIstFluechtig = (() => {
  try {
    window.localStorage.setItem("tw-probe", "1");
    window.localStorage.removeItem("tw-probe");
    return false;
  } catch (e) {
    return true;
  }
})();
var ZEITLIMIT_MS = 12e3;
var ZEITLIMIT_UPLOAD_MS = 12e4;
var ZEITLIMIT_FUNKTION_MS = 15e4;
function fetchMitZeitlimit(eingabe3, optionen) {
  const adresse = typeof eingabe3 === "string" ? eingabe3 : eingabe3 && eingabe3.url || "";
  const grenze = adresse.includes("/storage/v1/object") ? ZEITLIMIT_UPLOAD_MS : adresse.includes("/functions/v1/") ? ZEITLIMIT_FUNKTION_MS : ZEITLIMIT_MS;
  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), grenze);
  return fetch(eingabe3, Object.assign({}, optionen, { signal: abbruch.signal })).finally(() => clearTimeout(uhr));
}
var authSpeicher = sichererSpeicher();
var sperrKette = Promise.resolve();
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
var supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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
function istZeitueberschreitung(fehler) {
  if (!fehler) return false;
  const name = fehler.name || "";
  const text2 = String(fehler.message || fehler);
  return name === "AbortError" || /abort|timeout|Zeitüberschreitung/i.test(text2);
}
var MELDUNG_ZEITUEBERSCHREITUNG = "Der Server hat nicht geantwortet (Zeitüberschreitung). Bitte Verbindung prüfen und erneut versuchen.";
var AUTH_ZEITLIMIT_MS = 15e3;
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
var MELDUNG_KEINE_VERBINDUNG = "Keine Verbindung zum Server. Bitte Internetverbindung prüfen und erneut versuchen.";

// app/js/daten.js
var DatenFehler = class extends Error {
  constructor(text2, keineVerbindung) {
    super(text2);
    this.keineVerbindung = !!keineVerbindung;
  }
};
var VORGANG_ZEITLIMIT_MS = 15e3;
var UPLOAD_ZEITLIMIT_MS = 13e4;
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
var lesen = schreiben;
var ANALYSE_ZEITLIMIT_MS = 16e4;
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
function budgetAnlegen(projektId, { kategorie, betrag, bemerkung }) {
  return schreiben(
    async () => pruefen(
      await supabase.from("budgetpositionen").insert({ projekt_id: projektId, kategorie, betrag: betrag || 0, bemerkung: bemerkung || "" }).select().single()
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
  const kanal = supabase.channel("projekt-" + projektId).on("postgres_changes", { event: "*", schema: "public", table: "budgetpositionen", filter: "projekt_id=eq." + projektId }, () => aufAenderung("budget")).on("postgres_changes", { event: "*", schema: "public", table: "offerten", filter: "projekt_id=eq." + projektId }, () => aufAenderung("offerten")).on("postgres_changes", { event: "*", schema: "public", table: "offert_positionen" }, () => aufAenderung("offerten")).on("postgres_changes", { event: "*", schema: "public", table: "belege", filter: "projekt_id=eq." + projektId }, () => aufAenderung("belege")).on("postgres_changes", { event: "*", schema: "public", table: "dokumente", filter: "projekt_id=eq." + projektId }, () => aufAenderung("dokumente")).on("postgres_changes", { event: "*", schema: "public", table: "projekt_mitglieder", filter: "projekt_id=eq." + projektId }, () => aufAenderung("mitglieder")).subscribe();
  return () => supabase.removeChannel(kanal);
}

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

// app/js/ansichten/anmeldung.js
var modus = "anmelden";
var hinweis = "";
var schonUmgeschaltet = false;
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

// app/js/ansichten/uebersicht.js
var uebersicht_exports = {};
__export(uebersicht_exports, {
  aenderung: () => aenderung,
  aktion: () => aktion2,
  render: () => render2,
  renderProjektAnlegen: () => renderProjektAnlegen
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
function summen(Z2) {
  const gesamtbudget = zahl(Z2.projekt?.gesamtbudget);
  const kaufpreis = zahl(Z2.projekt?.kaufpreis);
  const kaufnebenkosten = (Z2.nebenkosten || []).reduce((s, n) => s + zahl(n.betrag), 0);
  const rahmen = gesamtbudget - kaufpreis - kaufnebenkosten;
  const budgetiert = Z2.budget.reduce((s, p) => s + zahl(p.betrag), 0);
  const offerten = Z2.offerten.filter(offerteZaehlt).reduce((s, o) => s + offerteTotal(o), 0);
  const rechnungen = Z2.belege.reduce((s, b) => s + belegBrutto(b), 0);
  const bezahlt = Z2.belege.filter((b) => b.bezahlt).reduce((s, b) => s + belegBrutto(b), 0);
  let verpflichtet = 0;
  Z2.offerten.filter((o) => o.status === "Beauftragt").forEach((o) => {
    const verrechnet = Z2.belege.filter((b) => b.offerte_id === o.id).reduce((s, b) => s + belegBrutto(b), 0);
    verpflichtet += Math.max(0, offerteTotal(o) - verrechnet);
  });
  return {
    gesamtbudget,
    kaufpreis,
    kaufnebenkosten,
    rahmen,
    budgetiert,
    offerten,
    rechnungen,
    bezahlt,
    verpflichtet,
    offen: rechnungen - bezahlt,
    verfuegbar: rahmen - rechnungen - verpflichtet
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

// app/js/ansichten/uebersicht.js
var importDaten = null;
function renderProjektAnlegen() {
  return '<main><div style="max-width:480px;margin:40px auto;padding:0 14px"><div class="karte karte-pad"><h2>Projekt einrichten</h2><p style="margin:6px 0 16px;font-size:.87rem;color:var(--text-2)">Objekt, Adresse, Kaufpreis und Gesamtbudget sind noch nicht erfasst.</p><label class="feld"><span>Objekt / Projektname</span><input id="p-name" placeholder="z.B. Einfamilienhaus Tulpenweg 37"></label><label class="feld"><span>Adresse</span><input id="p-adresse" placeholder="Strasse Nr., PLZ Ort"></label><label class="feld"><span>Kaufpreis (CHF)</span><input id="p-kauf" inputmode="decimal" placeholder="0"></label><p style="margin:-4px 0 12px;font-size:.78rem;color:var(--grau)">Kaufnebenkosten (Notariat, Handänderungssteuer, Grundbuch …) erfassen Sie danach einzeln in der Übersicht.</p><label class="feld"><span>Gesamtbudget (CHF)</span><input id="p-gesamt" inputmode="decimal" placeholder="0"></label><div id="p-fehler"></div><button class="btn breit" type="button" data-aktion="projekt-anlegen">Projekt anlegen</button></div></div></main>';
}
function render2(Z2) {
  const s = summen(Z2);
  let h = "";
  const anteilRahmen = s.rahmen > 0 ? Math.min(100, s.rechnungen / s.rahmen * 100) : 0;
  h += '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Übersicht</h2><p>' + esc([Z2.projekt.name, Z2.projekt.adresse].filter(Boolean).join(" · ") || "Projekt ohne Namen") + " · Stand " + datumCH(heuteISO()) + '</p></div><button class="btn still klein" type="button" data-aktion="eckdaten">Eckdaten</button></div><div class="kpi-raster"><div class="kpi gross"><div class="label">Verfügbar für die Sanierung</div><div class="wert zahl">' + chfKurz(s.verfuegbar) + '</div><div class="zusatz">Sanierungsrahmen ' + chfKurz(s.rahmen) + " abzüglich Rechnungen und beauftragter Offerten</div></div>" + kpi("Gesamtbudget", chfKurz(s.gesamtbudget), "inkl. Kaufpreis und Nebenkosten", "") + kpi(
    "Kaufpreis",
    chfKurz(s.kaufpreis),
    s.kaufnebenkosten ? "zzgl. Nebenkosten " + chfKurz(s.kaufnebenkosten) : "ohne Nebenkosten",
    ""
  ) + kpi(
    "Kaufnebenkosten",
    chfKurz(s.kaufnebenkosten),
    (Z2.nebenkosten || []).length + " Positionen, siehe unten",
    ""
  ) + kpi("Sanierungsrahmen", chfKurz(s.rahmen), "Gesamtbudget − Kaufpreis − Nebenkosten", "rand-blau") + kpi("Offertsumme", chfKurz(s.offerten), Z2.offerten.length + " Offerten, ohne abgelehnte", "rand-blau") + kpi("Rechnungssumme", chfKurz(s.rechnungen), Z2.belege.length + " Belege, inkl. MWST", "rand-amber") + kpi("Bezahlt", chfKurz(s.bezahlt), "offen: " + chfKurz(s.offen), "rand-gruen") + "</div></section>";
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
      h += '<div class="kat-zeile"><div class="kat-kopf"><b>' + esc(k.kategorie) + '</b><span class="zahl">' + chfKurz(k.ist) + " / " + chfKurz(k.budget) + '</span></div><div class="mini"><i class="' + (ueber ? "ueber" : "") + '" style="width:' + breite.toFixed(1) + '%"></i></div></div>';
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

// app/js/ansichten/budget.js
var budget_exports = {};
__export(budget_exports, {
  aktion: () => aktion3,
  render: () => render3
});
function render3(Z2) {
  const s = summen(Z2);
  const budgetiert = Z2.budget.reduce((a, p) => a + zahl(p.betrag), 0);
  const bearbeitbar = kannBearbeiten();
  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Budget</h2><p>Sanierungsrahmen ' + chfKurz(s.rahmen) + " · verplant " + chfKurz(budgetiert) + "</p></div>" + (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="budget-neu">+ Position</button>' : "") + "</div>";
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
      const ist = k.rechnung > 0 ? k.rechnung : k.offerte;
      const diff = zahl(p.betrag) - ist;
      h += "<tr><td><b>" + esc(p.kategorie) + "</b>" + (p.bemerkung ? '<div style="font-size:.76rem;color:var(--grau);white-space:normal;max-width:260px">' + esc(p.bemerkung) + "</div>" : "") + '</td><td class="num">' + chf(p.betrag) + '</td><td class="num">' + chf(k.offerte) + '</td><td class="num">' + chf(k.rechnung) + '</td><td class="num">' + chf(k.bezahlt) + '</td><td class="num ' + (diff < 0 ? "neg" : "pos") + '">' + (diff >= 0 ? "+" : "") + chf(diff) + "</td><td>" + (bearbeitbar ? '<div class="zeile-aktion"><button class="btn still klein" type="button" data-aktion="budget-bearbeiten" data-id="' + p.id + '">Bearbeiten</button><button class="btn still klein" type="button" data-aktion="budget-loeschen" data-id="' + p.id + '">Löschen</button></div>' : "") + "</td></tr>";
    });
    h += '</tbody><tfoot><tr><td>Total Budgetpositionen</td><td class="num">' + chf(budgetiert) + '</td><td class="num">' + chf(Z2.budget.reduce((a, p) => a + kv(p.id).offerte, 0)) + '</td><td class="num">' + chf(Z2.budget.reduce((a, p) => a + kv(p.id).rechnung, 0)) + '</td><td class="num">' + chf(Z2.budget.reduce((a, p) => a + kv(p.id).bezahlt, 0)) + '</td><td class="num"></td><td></td></tr></tfoot></table></div></div>';
  }
  h += "</section>";
  const liste = (Z2.kostenvergleich || []).filter((k) => k.budget > 0 || k.offerte > 0 || k.rechnung > 0);
  h += '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Kostenvergleich</h2><p>Budget gegen Offerten und Rechnungen, über alle Kategorien</p></div></div>';
  if (!liste.length) {
    h += leerZustand("Noch nichts zu vergleichen", "Sobald Budget, Offerten oder Rechnungen erfasst sind, erscheint hier die Gegenüberstellung.", "");
  } else {
    let tB = 0, tO = 0, tR = 0, tZ = 0, tD = 0;
    h += '<div class="karte"><div class="tab-scroll"><table><thead><tr><th>Kategorie</th><th class="num">Budget</th><th class="num">Offerte</th><th class="num">Rechnung</th><th class="num">Bezahlt</th><th class="num">Differenz zum Budget</th></tr></thead><tbody>';
    liste.forEach((k) => {
      tB += k.budget;
      tO += k.offerte;
      tR += k.rechnung;
      tZ += k.bezahlt;
      tD += k.differenz;
      h += "<tr><td><b>" + esc(k.kategorie) + '</b></td><td class="num">' + chf(k.budget) + '</td><td class="num">' + chf(k.offerte) + '</td><td class="num">' + chf(k.rechnung) + '</td><td class="num">' + chf(k.bezahlt) + '</td><td class="num ' + (k.differenz < 0 ? "neg" : "pos") + '">' + (k.differenz >= 0 ? "+" : "") + chf(k.differenz) + "</td></tr>";
    });
    h += '</tbody><tfoot><tr><td>Total</td><td class="num">' + chf(tB) + '</td><td class="num">' + chf(tO) + '</td><td class="num">' + chf(tR) + '</td><td class="num">' + chf(tZ) + '</td><td class="num ' + (tD < 0 ? "neg" : "pos") + '">' + (tD >= 0 ? "+" : "") + chf(tD) + '</td></tr></tfoot></table></div><div class="karte-pad" style="border-top:1px solid var(--linie);font-size:.8rem;color:var(--grau)">Als Ist-Kosten gilt die Rechnungssumme. Solange keine Rechnung erfasst ist, wird die Offertsumme verwendet. Alle Beträge inklusive MWST.</div></div>';
  }
  return h + "</section>";
}
function formular(Z2, p) {
  const optionen = STANDARD_KATEGORIEN.concat(Z2.budget.map((x) => x.kategorie).filter((k) => !STANDARD_KATEGORIEN.includes(k)));
  const koerper3 = '<label class="feld"><span>Kategorie</span><input id="f-kategorie" list="kat-liste" value="' + esc(p ? p.kategorie : "") + '" placeholder="z.B. Elektro" required><datalist id="kat-liste">' + optionen.map((k) => '<option value="' + esc(k) + '">').join("") + '</datalist></label><label class="feld"><span>Budgetbetrag (CHF, inkl. MWST)</span><input id="f-betrag" inputmode="decimal" value="' + (p ? zahl(p.betrag) : "") + '" placeholder="18000"></label><label class="feld"><span>Bemerkung</span><textarea id="f-bemerkung" placeholder="optional">' + esc(p ? p.bemerkung : "") + "</textarea></label>";
  modalOeffnen({
    titel: p ? "Budgetposition bearbeiten" : "Neue Budgetposition",
    koerper: koerper3,
    speichern: async () => {
      const kategorie = document.getElementById("f-kategorie").value.trim();
      if (!kategorie) {
        meldung("Bitte eine Kategorie angeben.", true);
        return false;
      }
      const daten = { kategorie, betrag: zahl(document.getElementById("f-betrag").value), bemerkung: document.getElementById("f-bemerkung").value.trim() };
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
function aktion3(a, knopf, Z2) {
  if (a === "budget-neu") return formular(Z2, null);
  if (a === "budget-bearbeiten") return formular(Z2, Z2.budget.find((p) => p.id === knopf.dataset.id));
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

// app/js/ansichten/offerten.js
var offerten_exports = {};
__export(offerten_exports, {
  aenderung: () => aenderung2,
  aktion: () => aktion4,
  eingabe: () => eingabe,
  render: () => render4
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

// app/js/ki.js
var ANALYSE_MAX_BYTES = 15 * 1024 * 1024;
var ANALYSE_SCHRITTE = {
  offerte: ["Datei wird hochgeladen", "Dokument wird gelesen", "Positionen werden übernommen"],
  beleg: ["Datei wird hochgeladen", "Dokument wird gelesen", "Werte werden übernommen"]
};
function analyseFehlerText(e) {
  const code = e && e.code;
  if (code === "kein_schluessel") {
    return "Die KI-Auswertung ist auf dem Server noch nicht freigeschaltet (es fehlt der Zugang zum KI-Dienst). Das Dokument kann weiterhin von Hand erfasst werden.";
  }
  if (code === "schluessel_ungueltig") return "Der KI-Dienst lehnt den hinterlegten Zugang ab. Bitte den Schlüssel prüfen.";
  if (code === "kontingent") return "Das Kontingent des KI-Dienstes ist erschöpft. Bitte später erneut versuchen.";
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

// app/js/ansichten/offerten.js
var entwurf = null;
var dateiWartend = null;
var letzterHinweis = "";
function render4(Z2) {
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
  return (entwurf.offert_positionen || []).reduce((s, p) => s + zahl(p.menge) * zahl(p.einzelpreis), 0);
}
function entwurfMwst() {
  return entwurf.mwst_satz == null ? 0 : entwurfNetto() * (zahl(entwurf.mwst_satz) / 100);
}
function formular2(Z2, o) {
  dateiWartend = null;
  letzterHinweis = "";
  entwurf = o ? JSON.parse(JSON.stringify(o)) : {
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
  if (!entwurf.offert_positionen || !entwurf.offert_positionen.length) entwurf.offert_positionen = [neuePosition()];
  modalOeffnen({
    titel: entwurf.id ? "Offerte bearbeiten" : "Neue Offerte",
    koerper: koerper(Z2),
    speichern: () => speichern(Z2)
  });
}
function koerper(Z2) {
  const o = entwurf;
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
  const o = entwurf;
  if (o.datei_pfad) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Datei: ' + esc(o.datei_name || "") + '</b><div class="btn-reihe" style="margin-top:9px"><button class="btn zweit klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(o.datei_pfad) + '">Datei öffnen</button><button class="btn zweit klein" type="button" data-aktion="o-analysieren">Offerte auslesen</button><button class="btn still klein" type="button" data-aktion="o-datei-entfernen">Datei entfernen</button></div></div></div>';
  }
  if (dateiWartend) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Gewählte Datei: ' + esc(dateiWartend.name) + '</b>Wird beim Speichern hochgeladen.<div class="btn-reihe" style="margin-top:9px"><button class="btn zweit klein" type="button" data-aktion="o-analysieren">Offerte auslesen</button><button class="btn still klein" type="button" data-aktion="o-datei-entfernen">Datei entfernen</button></div></div></div>';
  }
  return '<div class="datei-feld" style="margin-bottom:14px"><p>Offerte als PDF, JPG oder PNG hochladen</p><input type="file" id="o-datei" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"><div class="btn-reihe" style="margin-top:11px;justify-content:center"><button class="btn klein" type="button" data-aktion="o-analysieren">Offerte auslesen</button></div><p style="margin:9px 0 0;font-size:.76rem">Beim Auslesen wird die Datei gespeichert und einmalig an den KI-Dienst (Google Gemini) übermittelt. Ohne Klick auf diesen Knopf passiert das nicht.</p></div>';
}
function positionHtml(p, i) {
  return '<div class="pos-zeile" data-zeile="' + i + '"><div class="pos-grid"><div class="pos-mini"><label class="feld"><span>Nr.</span><input class="p-nr" data-pos="' + i + '" data-feld="nr" value="' + esc(p.nr) + '"></label><label class="feld" style="grid-column:span 2"><span>Beschreibung</span><input data-pos="' + i + '" data-feld="beschreibung" value="' + esc(p.beschreibung) + '" placeholder="Leistung"></label></div><label class="feld"><span>Menge</span><input inputmode="decimal" data-pos="' + i + '" data-feld="menge" value="' + esc(p.menge) + '"></label><label class="feld"><span>Einheit</span><input list="einheit-liste" data-pos="' + i + '" data-feld="einheit" value="' + esc(p.einheit) + '"></label><label class="feld"><span>Einzelpreis CHF</span><input inputmode="decimal" data-pos="' + i + '" data-feld="einzelpreis" value="' + esc(p.einzelpreis) + '"></label><label class="feld"><span>Entfernen</span><button class="btn gefahr klein" type="button" data-aktion="o-pos-weg" data-pos="' + i + '">✕</button></label></div><div class="pos-fuss"><span style="color:var(--grau)">Zeilentotal</span><b class="zahl" data-zeilen-total="' + i + '">' + chf(zahl(p.menge) * zahl(p.einzelpreis)) + "</b></div></div>";
}
function summeHtml() {
  const o = entwurf;
  const netto = entwurfNetto(), mwst = entwurfMwst();
  const ohneMwst = o.mwst_satz == null;
  return '<div class="check"><input type="checkbox" id="o-ohne-mwst"' + (ohneMwst ? " checked" : "") + '> <label for="o-ohne-mwst" style="margin:0">Ohne MWST führen</label></div><div class="summe-zeile"><span>Zwischentotal (netto)</span><b class="zahl" id="o-netto">' + chf(netto) + '</b></div><div class="summe-zeile"><span>MWST <input inputmode="decimal" data-feld="mwst_satz" value="' + (ohneMwst ? "" : esc(o.mwst_satz)) + '" ' + (ohneMwst ? "disabled" : "") + ' style="width:74px;display:inline-block;min-height:34px;padding:4px 7px;text-align:right"> %</span><b class="zahl" id="o-mwst">' + chf(mwst) + '</b></div><div class="summe-zeile total"><span>Total inkl. MWST</span><b class="zahl" id="o-total">' + chf(netto + mwst) + "</b></div>";
}
function neuZeichnenKoerper(Z2) {
  const koerperEl = document.querySelector(".modal-koerper");
  if (koerperEl) koerperEl.innerHTML = koerper(Z2);
}
function summeAktualisieren() {
  if (!entwurf) return;
  const netto = entwurfNetto(), mwst = entwurfMwst();
  const setze = (id, wert) => {
    const x = document.getElementById(id);
    if (x) x.textContent = wert;
  };
  setze("o-netto", chf(netto));
  setze("o-mwst", chf(mwst));
  setze("o-total", chf(netto + mwst));
  entwurf.offert_positionen.forEach((p, i) => {
    const ziel = document.querySelector('[data-zeilen-total="' + i + '"]');
    if (ziel) ziel.textContent = chf(zahl(p.menge) * zahl(p.einzelpreis));
  });
}
async function analysieren(Z2) {
  const dateiFeld = document.getElementById("o-datei");
  if (dateiFeld && dateiFeld.files && dateiFeld.files[0]) dateiWartend = dateiFeld.files[0];
  if (!dateiWartend && !entwurf.datei_pfad) {
    meldung("Bitte zuerst eine Datei auswählen.", true);
    return;
  }
  const block = document.getElementById("o-analyse");
  const schritte = ANALYSE_SCHRITTE.offerte;
  block.innerHTML = '<div class="karte karte-pad lade" style="margin-bottom:14px"><div class="lade-ring"></div><b>Offerte wird ausgelesen …</b>' + ladeSchritte(schritte, 0) + '<p style="margin:12px 0 0;font-size:.76rem;color:var(--grau)">Das dauert je nach Umfang bis zu einer Minute.</p></div>';
  let ergebnis;
  try {
    ergebnis = await analysiereDokument(
      { datei: dateiWartend, pfad: entwurf.datei_pfad, name: entwurf.datei_name, projektId: Z2.projektId, bereich: "offerten" },
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
  if (!document.querySelector(".modal") || !entwurf) return;
  entwurf.datei_pfad = ergebnis.datei_pfad;
  entwurf.datei_name = ergebnis.datei_name;
  dateiWartend = null;
  letzterHinweis = ergebnis.hinweis || "";
  entwurf.ki_erkannt = true;
  if (ergebnis.lieferant) entwurf.lieferant = ergebnis.lieferant;
  if (ergebnis.nummer) entwurf.nummer = ergebnis.nummer;
  if (ergebnis.datum) entwurf.datum = ergebnis.datum;
  entwurf.mwst_satz = ergebnis.mwstSatz;
  entwurf.status = entwurf.status === "Entwurf" ? "Erfasst" : entwurf.status;
  if (ergebnis.positionen.length) entwurf.offert_positionen = ergebnis.positionen;
  neuZeichnenKoerper(Z2);
  meldung(
    ergebnis.positionen.length ? "Offerte ausgelesen (" + ergebnis.positionen.length + " Positionen) – bitte prüfen." : "Es konnten keine Positionen erkannt werden. Bitte von Hand erfassen."
  );
}
async function speichern(Z2) {
  const o = entwurf;
  if (!o.lieferant.trim() && !o.nummer.trim()) {
    meldung("Bitte mindestens Lieferant oder Offertnummer angeben.", true);
    return false;
  }
  o.offert_positionen = o.offert_positionen.filter((p) => p.beschreibung.trim() || zahl(p.einzelpreis) !== 0);
  if (!o.offert_positionen.length) o.offert_positionen = [neuePosition()];
  const dateiFeld = document.getElementById("o-datei");
  if (!dateiWartend && dateiFeld && dateiFeld.files && dateiFeld.files[0]) dateiWartend = dateiFeld.files[0];
  try {
    if (dateiWartend) {
      const info = await hochladen(dateiWartend, Z2.projektId, "offerten");
      o.datei_pfad = info.datei_pfad;
      o.datei_name = info.datei_name;
    }
    await offerteSpeichern(Z2.projektId, { ...o, positionen: o.offert_positionen }, o.geaendert_am);
    meldung(o.id ? "Offerte aktualisiert." : "Offerte gespeichert.");
    dateiWartend = null;
    await neuLaden(["offerten"]);
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
  if (feld.dataset.pos !== void 0) {
    const p = entwurf.offert_positionen[+feld.dataset.pos];
    if (!p) return;
    p[name] = feld.value;
    summeAktualisieren();
    return;
  }
  if (name === "handwerker_id") {
    entwurf.handwerker_id = feld.value || null;
    return;
  }
  if (name === "budgetposition_id") {
    entwurf.budgetposition_id = feld.value || null;
    return;
  }
  entwurf[name] = feld.value;
  if (name === "mwst_satz") summeAktualisieren();
}
function aenderung2(e, Z2) {
  if (e.target.id === "o-ohne-mwst" && entwurf) {
    entwurf.mwst_satz = e.target.checked ? null : 8.1;
    neuZeichnenKoerper(Z2);
  }
}
function aktion4(a, knopf, Z2) {
  if (a === "offerte-neu") return formular2(Z2, null);
  if (a === "offerte-bearbeiten") return formular2(Z2, Z2.offerten.find((o) => o.id === knopf.dataset.id));
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
    entwurf.offert_positionen.push(neuePosition());
    entwurf.offert_positionen[entwurf.offert_positionen.length - 1].nr = String(entwurf.offert_positionen.length);
    document.getElementById("o-positionen").innerHTML = entwurf.offert_positionen.map(positionHtml).join("");
    summeAktualisieren();
    return;
  }
  if (a === "o-pos-weg") {
    entwurf.offert_positionen.splice(+knopf.dataset.pos, 1);
    if (!entwurf.offert_positionen.length) entwurf.offert_positionen.push(neuePosition());
    document.getElementById("o-positionen").innerHTML = entwurf.offert_positionen.map(positionHtml).join("");
    summeAktualisieren();
    return;
  }
  if (a === "o-datei-entfernen") {
    if (entwurf.datei_pfad) loeschen(entwurf.datei_pfad).catch(() => {
    });
    entwurf.datei_pfad = null;
    entwurf.datei_name = null;
    dateiWartend = null;
    document.getElementById("o-analyse").innerHTML = analyseBlock();
    return;
  }
  if (a === "datei-oeffnen") {
    signierterLink(knopf.dataset.pfad).then((url) => {
      if (url) window.open(url, "_blank");
    }).catch((e) => meldung(e.message, true));
  }
}

// app/js/ansichten/belege.js
var belege_exports = {};
__export(belege_exports, {
  aenderung: () => aenderung3,
  aktion: () => aktion5,
  eingabe: () => eingabe2,
  render: () => render5
});
var entwurf2 = null;
var dateiWartend2 = null;
var letzterHinweis2 = "";
var mwstManuell = false;
function render5(Z2) {
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
function formular3(Z2, b) {
  dateiWartend2 = null;
  letzterHinweis2 = "";
  mwstManuell = false;
  entwurf2 = b ? JSON.parse(JSON.stringify(b)) : {
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
  modalOeffnen({ titel: entwurf2.id ? "Beleg bearbeiten" : "Neuer Beleg", koerper: koerper2(Z2), speichern: () => speichern2(Z2) });
}
function koerper2(Z2) {
  const b = entwurf2;
  const ohneMwst = b.mwst == null;
  let h = '<div id="b-analyse">' + analyseBlock2() + "</div>";
  if (b.ki_erkannt) {
    h += '<div class="hinweis demo" style="margin-bottom:14px"><div><b>Von der KI ausgelesen – bitte prüfen</b>Automatisch erkannte Werte können falsch sein. Beträge und Datum bitte mit dem Beleg vergleichen.' + (letzterHinweis2 ? "<br>Hinweis der Auswertung: " + esc(letzterHinweis2) : "") + "</div></div>";
  }
  h += '<label class="feld"><span>Lieferant</span><input data-feld="lieferant" value="' + esc(b.lieferant) + '" placeholder="Firma"></label><div class="feld-paar"><label class="feld"><span>Rechnungsnummer</span><input data-feld="nummer" value="' + esc(b.nummer) + '" placeholder="RE-2026-235"></label><label class="feld"><span>Rechnungsdatum</span><input type="date" data-feld="datum" value="' + esc(b.datum || "") + '"></label></div><div class="check"><input type="checkbox" id="b-ohne-mwst"' + (ohneMwst ? " checked" : "") + '> <label for="b-ohne-mwst" style="margin:0">Ohne MWST (kein MWST-Ausweis auf dem Beleg)</label></div><div class="feld-paar"><label class="feld"><span>Betrag exkl. MWST</span><input inputmode="decimal" data-feld="netto" data-betrag="1" value="' + esc(b.netto) + '"' + (ohneMwst ? " disabled" : "") + '></label><label class="feld"><span>MWST</span><input inputmode="decimal" data-feld="mwst" data-betrag="1" value="' + (ohneMwst ? "" : esc(b.mwst)) + '"' + (ohneMwst ? " disabled" : "") + '></label></div><label class="feld"><span>Betrag' + (ohneMwst ? "" : " inkl. MWST") + '</span><input inputmode="decimal" data-feld="brutto" data-betrag="1" value="' + esc(b.brutto) + '"></label>' + (ohneMwst ? "" : '<div class="hinweis info" style="margin-bottom:14px"><div>Beim Ausfüllen von zwei Feldern wird das dritte automatisch ergänzt (MWST-Satz ' + MWST_SATZ_VORGABE + " %).</div></div>") + '<div class="feld-paar"><label class="feld"><span>Kategorie</span><select data-feld="budgetposition_id">' + kategorieOptionen(Z2.budget, b.budgetposition_id) + '</select></label><label class="feld"><span>Bezug zu Offerte</span><select data-feld="offerte_id"><option value="">Keine Zuordnung</option>' + Z2.offerten.map((o) => '<option value="' + o.id + '"' + (o.id === b.offerte_id ? " selected" : "") + ">" + esc((o.nummer || "ohne Nr.") + " · " + (o.lieferant || "")) + "</option>").join("") + '</select></label></div><label class="check"><input type="checkbox" data-feld="bezahlt"' + (b.bezahlt ? " checked" : "") + '> Rechnung ist bezahlt</label><label class="feld"><span>Zahlungsdatum</span><input type="date" data-feld="zahlungsdatum" value="' + esc(b.zahlungsdatum || "") + '"></label><label class="feld"><span>Bemerkung</span><textarea data-feld="bemerkung" placeholder="optional">' + esc(b.bemerkung || "") + "</textarea></label>";
  return h;
}
function analyseBlock2() {
  const b = entwurf2;
  if (b.datei_pfad) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Datei: ' + esc(b.datei_name || "") + '</b><div class="btn-reihe" style="margin-top:9px"><button class="btn zweit klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(b.datei_pfad) + '">Datei öffnen</button><button class="btn zweit klein" type="button" data-aktion="b-analysieren">Beleg auslesen</button><button class="btn still klein" type="button" data-aktion="b-datei-entfernen">Datei entfernen</button></div></div></div>';
  }
  if (dateiWartend2) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Gewählte Datei: ' + esc(dateiWartend2.name) + '</b>Wird beim Speichern hochgeladen.<div class="btn-reihe" style="margin-top:9px"><button class="btn zweit klein" type="button" data-aktion="b-analysieren">Beleg auslesen</button><button class="btn still klein" type="button" data-aktion="b-datei-entfernen">Datei entfernen</button></div></div></div>';
  }
  return '<div class="datei-feld" style="margin-bottom:14px"><p>Rechnung oder Quittung als PDF, JPG oder PNG hochladen</p><input type="file" id="b-datei" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"><div class="btn-reihe" style="margin-top:11px;justify-content:center"><button class="btn klein" type="button" data-aktion="b-analysieren">Beleg auslesen</button></div><p style="margin:9px 0 0;font-size:.76rem">Beim Auslesen wird die Datei gespeichert und einmalig an den KI-Dienst (Google Gemini) übermittelt. Ohne Klick auf diesen Knopf passiert das nicht.</p></div>';
}
function betraegeAbgleichen(zuletzt) {
  const b = entwurf2;
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
  if (feld && feld.files && feld.files[0]) dateiWartend2 = feld.files[0];
  if (!dateiWartend2 && !entwurf2.datei_pfad) {
    meldung("Bitte zuerst eine Datei auswählen.", true);
    return;
  }
  const block = document.getElementById("b-analyse");
  const schritte = ANALYSE_SCHRITTE.beleg;
  block.innerHTML = '<div class="karte karte-pad lade" style="margin-bottom:14px"><div class="lade-ring"></div><b>Beleg wird ausgelesen …</b>' + ladeSchritte(schritte, 0) + '<p style="margin:12px 0 0;font-size:.76rem;color:var(--grau)">Das dauert in der Regel wenige Sekunden.</p></div>';
  let e;
  try {
    e = await analysiereDokument(
      { datei: dateiWartend2, pfad: entwurf2.datei_pfad, name: entwurf2.datei_name, projektId: Z2.projektId, bereich: "belege" },
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
  if (!document.querySelector(".modal") || !entwurf2) return;
  entwurf2.datei_pfad = e.datei_pfad;
  entwurf2.datei_name = e.datei_name;
  dateiWartend2 = null;
  letzterHinweis2 = e.hinweis || "";
  mwstManuell = false;
  Object.assign(entwurf2, {
    ki_erkannt: true,
    lieferant: e.lieferant || entwurf2.lieferant,
    nummer: e.nummer || entwurf2.nummer,
    datum: e.datum || entwurf2.datum,
    netto: e.netto,
    mwst: e.mwst,
    brutto: e.brutto,
    bezahlt: e.bezahlt || entwurf2.bezahlt,
    zahlungsdatum: e.zahlungsdatum || entwurf2.zahlungsdatum
  });
  if (!entwurf2.offerte_id && entwurf2.lieferant) {
    const gesucht = entwurf2.lieferant.toLowerCase();
    const passend = Z2.offerten.find((o) => (o.lieferant || "").toLowerCase() === gesucht);
    if (passend) entwurf2.offerte_id = passend.id;
  }
  const koerperEl = document.querySelector(".modal-koerper");
  if (koerperEl) koerperEl.innerHTML = koerper2(Z2);
  meldung(
    e.brutto ? "Beleg ausgelesen – bitte prüfen." : "Es konnte kein Betrag erkannt werden. Bitte von Hand erfassen."
  );
}
async function speichern2(Z2) {
  const b = entwurf2;
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
  if (!dateiWartend2 && feld && feld.files && feld.files[0]) dateiWartend2 = feld.files[0];
  try {
    if (dateiWartend2) {
      const info = await hochladen(dateiWartend2, Z2.projektId, "belege");
      b.datei_pfad = info.datei_pfad;
      b.datei_name = info.datei_name;
    }
    await belegSpeichern(Z2.projektId, b, b.geaendert_am);
    meldung(b.id ? "Beleg aktualisiert." : "Beleg gespeichert.");
    dateiWartend2 = null;
    await neuLaden(["belege"]);
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
  const name = feld.dataset.feld;
  const wert = feld.type === "checkbox" ? feld.checked : feld.value;
  if (name === "budgetposition_id" || name === "offerte_id") {
    entwurf2[name] = wert || null;
    return;
  }
  entwurf2[name] = wert;
  if (name === "mwst") mwstManuell = true;
  if (feld.dataset.betrag) betraegeAbgleichen(name);
  if (name === "bezahlt" && wert && !entwurf2.zahlungsdatum) {
    entwurf2.zahlungsdatum = heuteISO();
    const zd = document.querySelector('[data-feld="zahlungsdatum"]');
    if (zd) zd.value = entwurf2.zahlungsdatum;
  }
}
function aenderung3(e, Z2) {
  if (e.target.id === "b-ohne-mwst" && entwurf2) {
    if (e.target.checked) {
      entwurf2.mwst = null;
      entwurf2.netto = zahl(entwurf2.brutto);
    } else {
      entwurf2.mwst = 0;
      betraegeAbgleichen("brutto");
    }
    const koerperEl = document.querySelector(".modal-koerper");
    if (koerperEl) koerperEl.innerHTML = koerper2(Z2);
  }
}
function aktion5(a, knopf, Z2) {
  if (a === "beleg-neu") return formular3(Z2, null);
  if (a === "beleg-bearbeiten") return formular3(Z2, Z2.belege.find((b) => b.id === knopf.dataset.id));
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
    if (entwurf2.datei_pfad) loeschen(entwurf2.datei_pfad).catch(() => {
    });
    entwurf2.datei_pfad = null;
    entwurf2.datei_name = null;
    dateiWartend2 = null;
    document.getElementById("b-analyse").innerHTML = analyseBlock2();
    return;
  }
  if (a === "datei-oeffnen") {
    signierterLink(knopf.dataset.pfad).then((url) => {
      if (url) window.open(url, "_blank");
    }).catch((e) => meldung(e.message, true));
  }
}

// app/js/ansichten/dokumente.js
var dokumente_exports = {};
__export(dokumente_exports, {
  aktion: () => aktion6,
  render: () => render6
});
function render6(Z2) {
  const bearbeitbar = kannBearbeiten();
  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Dokumente</h2><p>' + Z2.dokumente.length + " Ablagen · Kaufvertrag, Pläne, Bewilligungen, Garantien</p></div>" + (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="dokument-neu">+ Dateien</button>' : "") + "</div>";
  if (!Z2.dokumente.length) {
    h += leerZustand(
      "Die Ablage ist leer",
      "Mehrere Dateien auf einmal hochladen und anschliessend Typ, Datum und Kategorie ergänzen.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="dokument-neu">Dateien hochladen</button>' : ""
    );
    return h + "</section>";
  }
  h += '<div class="karte"><div class="tab-scroll"><table><thead><tr><th>Dateiname</th><th>Dokumenttyp</th><th>Datum</th><th>Kategorie</th><th>Bemerkung</th><th></th></tr></thead><tbody>';
  Z2.dokumente.slice().reverse().forEach((d) => {
    h += "<tr><td><b>" + esc(d.dateiname) + "</b>" + (d.groesse ? ' <span class="badge">' + dateigroesse(d.groesse) + "</span>" : "") + "</td><td>" + esc(d.typ || "Sonstiges") + "</td><td>" + datumCH(d.datum) + "</td><td>" + esc(kategorieName(Z2.budget, d.budgetposition_id)) + '</td><td style="white-space:normal;max-width:260px">' + esc(d.bemerkung || "") + '</td><td><div class="zeile-aktion">' + (d.datei_pfad ? '<button class="btn still klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(d.datei_pfad) + '">Öffnen</button>' : "") + '<button class="btn still klein" type="button" data-aktion="dokument-bearbeiten" data-id="' + d.id + '">' + (bearbeitbar ? "Bearbeiten" : "Ansehen") + "</button>" + (bearbeitbar ? '<button class="btn still klein" type="button" data-aktion="dokument-loeschen" data-id="' + d.id + '">Löschen</button>' : "") + "</div></td></tr>";
  });
  return h + "</tbody></table></div></div></section>";
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
function aktion6(a, knopf, Z2) {
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

// app/js/app.js
var el = (id) => document.getElementById(id);
var Z = {
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
var ANSICHTEN = [
  { id: "uebersicht", text: "Übersicht", icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>' },
  { id: "budget", text: "Budget", icon: '<path d="M3 20V9"/><path d="M9 20V4"/><path d="M15 20v-8"/><path d="M21 20V7"/>' },
  { id: "offerten", text: "Offerten", icon: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>' },
  { id: "belege", text: "Belege", icon: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9.5 8h5M9.5 12h5"/>' },
  { id: "dokumente", text: "Dokumente", icon: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' }
];
var ANSICHTS_MODULE = { uebersicht: uebersicht_exports, budget: budget_exports, offerten: offerten_exports, belege: belege_exports, dokumente: dokumente_exports };
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
var sammelUhr = null;
var sammelBereiche = /* @__PURE__ */ new Set();
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
var modalSpeichern = null;
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
var ladenLaeuft = false;
var EINLADUNG_SCHLUESSEL = "tw-einladung";
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
