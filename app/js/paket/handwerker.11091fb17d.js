// app/js/supabase.js
import { createClient } from "../vendor/supabase-js.js";

// app/js/konfig.js
var SUPABASE_URL = "https://evozevkzwcvpbnvcmmfp.supabase.co";
var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_us-LmqO0xw7nYgraQ7KCNw_dukOK3K-";
var STORAGE_BUCKET = "projektdateien";
var DATEI_MAX_BYTES = 25 * 1024 * 1024;
var DATEI_ERLAUBTE_TYPEN = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"];
var DATEI_ERLAUBTE_ENDUNGEN = [".pdf", ".jpg", ".jpeg", ".png", ".heic", ".webp"];
var EINHEITEN = ["pauschal", "Stk", "m²", "m", "lfm", "h", "Tag", "kg", "Pos"];
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
function fetchMitZeitlimit(eingabe, optionen) {
  const adresse = typeof eingabe === "string" ? eingabe : eingabe && eingabe.url || "";
  const grenze = adresse.includes("/storage/v1/object") ? ZEITLIMIT_UPLOAD_MS : adresse.includes("/functions/v1/") ? ZEITLIMIT_FUNKTION_MS : ZEITLIMIT_MS;
  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), grenze);
  return fetch(eingabe, Object.assign({}, optionen, { signal: abbruch.signal })).finally(() => clearTimeout(uhr));
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
  const text = String(fehler.message || fehler);
  return name === "AbortError" || /abort|timeout|Zeitüberschreitung/i.test(text);
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
async function anmelden(email, passwort) {
  const { data, error } = await authMitZeitlimit(supabase.auth.signInWithPassword({ email, password: passwort }));
  if (error) throw error;
  return data;
}
async function abmelden() {
  const { error } = await authMitZeitlimit(supabase.auth.signOut());
  if (error) throw error;
}
async function aktuelleSitzung() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
function aufAuthAchten(callback) {
  const { data } = supabase.auth.onAuthStateChange((ereignis, sitzung2) => callback(ereignis, sitzung2));
  return () => data.subscription.unsubscribe();
}
function istVerbindungsfehler(fehler) {
  if (!fehler) return false;
  const text = String(fehler.message || fehler);
  return /fetch|network|failed to fetch|NetworkError|Load failed/i.test(text);
}
var MELDUNG_KEINE_VERBINDUNG = "Keine Verbindung zum Server. Bitte Internetverbindung prüfen und erneut versuchen.";

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
function meldung(text, fehler) {
  const box = document.getElementById("meldung");
  if (!box) return;
  const d = document.createElement("div");
  d.className = "toast" + (fehler ? " fehler" : "");
  d.textContent = text;
  box.appendChild(d);
  setTimeout(() => d.remove(), fehler ? 6e3 : 3200);
}

// app/js/daten.js
var DatenFehler = class extends Error {
  constructor(text, keineVerbindung) {
    super(text);
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
function offerteSpeichern(projektId, offerte2, geladenAm) {
  return schreiben(async () => {
    const kopf = {
      projekt_id: projektId,
      budgetposition_id: offerte2.budgetposition_id || null,
      lieferant: offerte2.lieferant || "",
      nummer: offerte2.nummer || "",
      datum: offerte2.datum || null,
      status: offerte2.status || "Entwurf",
      mwst_satz: offerte2.mwst_satz === null ? null : offerte2.mwst_satz,
      handwerker_id: offerte2.handwerker_id || null,
      bemerkung: offerte2.bemerkung || "",
      datei_pfad: offerte2.datei_pfad ?? void 0,
      datei_name: offerte2.datei_name ?? void 0,
      ki_erkannt: !!offerte2.ki_erkannt,
      ki_geprueft: !!offerte2.ki_geprueft
    };
    let zeile;
    if (offerte2.id) {
      await konfliktPruefen("offerten", offerte2.id, geladenAm);
      zeile = pruefen(await supabase.from("offerten").update(kopf).eq("id", offerte2.id).select().single());
    } else {
      zeile = pruefen(await supabase.from("offerten").insert(kopf).select().single());
    }
    const { error } = await supabase.rpc("offerte_positionen_ersetzen", {
      p_offerte_id: zeile.id,
      p_positionen: offerte2.positionen || []
    });
    if (error) throw error;
    return zeile;
  });
}
function eigeneHandwerkerOfferte(offerteId2) {
  return lesen(
    async () => pruefen(
      await supabase.from("offerten").select("*, offert_positionen(*)").eq("id", offerteId2).single()
    )
  );
}

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

// app/js/handwerker.js
var el = (id) => document.getElementById(id);
var offerteId = new URLSearchParams(location.search).get("offerte");
var sitzung = null;
var offerte = null;
var dateiWartend = null;
function neuePosition() {
  return { nr: "", beschreibung: "", menge: 1, einheit: "pauschal", einzelpreis: 0 };
}
function netto() {
  return (offerte.offert_positionen || []).reduce((s, p) => s + zahl(p.menge) * zahl(p.einzelpreis), 0);
}
function mwst() {
  return offerte.mwst_satz == null ? 0 : netto() * (zahl(offerte.mwst_satz) / 100);
}
function zeichnen() {
  if (!sitzung) {
    el("app").innerHTML = '<div class="anmelde-buehne"><div class="karte karte-pad anmelde-karte"><div class="anmelde-kopf"><b>Anmelden</b><span>Zugang für Handwerker</span></div><label class="feld"><span>E-Mail</span><input type="email" id="h-email" autocomplete="email"></label><label class="feld"><span>Passwort</span><input type="password" id="h-passwort" autocomplete="current-password"></label><button class="btn breit" type="button" data-aktion="anmelden">Anmelden</button></div></div>';
    return;
  }
  if (!offerteId) {
    el("app").innerHTML = '<main><div class="karte karte-pad" style="margin:20px auto;max-width:520px"><div class="hinweis warn"><div><b>Kein Offert-Link</b>Bitte den Link verwenden, den Sie von der Bauherrschaft erhalten haben (er endet mit <code>?offerte=…</code>).</div></div></div></main>';
    return;
  }
  if (!offerte) {
    el("app").innerHTML = '<main><div class="karte karte-pad" style="margin:20px auto;max-width:520px"><div class="leer">Offerte wird geladen …</div></div></main>';
    return;
  }
  const n = netto(), m = mwst();
  el("app").innerHTML = '<main><div style="max-width:720px;margin:0 auto"><section class="abschnitt"><div class="karte karte-pad"><div class="hinweis info" style="margin-bottom:14px"><div><b>Ihre Offerte</b>Sie sehen und bearbeiten ausschliesslich diese eine Offerte.</div></div><div class="feld-paar"><label class="feld"><span>Ihre Firma</span><input data-feld="lieferant" value="' + esc(offerte.lieferant || "") + '"></label><label class="feld"><span>Offertnummer</span><input data-feld="nummer" value="' + esc(offerte.nummer || "") + '"></label></div><div class="feld-paar"><label class="feld"><span>Datum</span><input type="date" data-feld="datum" value="' + esc(offerte.datum || heuteISO()) + '"></label><label class="feld"><span>MWST-Satz %</span><input inputmode="decimal" data-feld="mwst_satz" value="' + (offerte.mwst_satz == null ? "" : esc(offerte.mwst_satz)) + '" placeholder="8.1 – leer = ohne MWST"></label></div><label class="feld"><span>Bemerkung</span><textarea data-feld="bemerkung">' + esc(offerte.bemerkung || "") + '</textarea></label></div></section><section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Positionen</h2></div><button class="btn zweit klein" type="button" data-aktion="pos-neu">+ Position</button></div><div class="karte karte-pad"><div class="pos-liste" id="positionen">' + (offerte.offert_positionen || []).map(positionHtml).join("") + '</div><div class="summe-box"><div class="summe-zeile"><span>Zwischentotal (netto)</span><b class="zahl">' + chf(n) + '</b></div><div class="summe-zeile"><span>MWST</span><b class="zahl">' + chf(m) + '</b></div><div class="summe-zeile total"><span>Total</span><b class="zahl">' + chf(n + m) + '</b></div></div></div></section><section class="abschnitt"><div class="karte karte-pad"><h3>Offerte als Datei</h3>' + (offerte.datei_pfad ? '<p style="font-size:.85rem">Hinterlegt: ' + esc(offerte.datei_name || "") + ' <button class="btn zweit klein" type="button" data-aktion="datei-oeffnen">Öffnen</button></p>' : '<p style="font-size:.85rem;color:var(--grau)">Noch keine Datei hinterlegt.</p>') + '<div class="datei-feld" style="margin-top:10px"><p>PDF, JPG oder PNG (max. 25 MB)</p><input type="file" id="h-datei" accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"></div></div></section><div class="btn-reihe" style="margin-bottom:30px"><button class="btn breit" type="button" data-aktion="speichern">Offerte speichern</button></div></div></main><datalist id="einheit-liste">' + EINHEITEN.map((e) => '<option value="' + e + '">').join("") + "</datalist>";
}
function positionHtml(p, i) {
  return '<div class="pos-zeile"><div class="pos-grid"><div class="pos-mini"><label class="feld"><span>Nr.</span><input class="p-nr" data-pos="' + i + '" data-feld="nr" value="' + esc(p.nr || "") + '"></label><label class="feld" style="grid-column:span 2"><span>Beschreibung</span><input data-pos="' + i + '" data-feld="beschreibung" value="' + esc(p.beschreibung || "") + '"></label></div><label class="feld"><span>Menge</span><input inputmode="decimal" data-pos="' + i + '" data-feld="menge" value="' + esc(p.menge) + '"></label><label class="feld"><span>Einheit</span><input list="einheit-liste" data-pos="' + i + '" data-feld="einheit" value="' + esc(p.einheit || "") + '"></label><label class="feld"><span>Einzelpreis CHF</span><input inputmode="decimal" data-pos="' + i + '" data-feld="einzelpreis" value="' + esc(p.einzelpreis) + '"></label><label class="feld"><span>Entfernen</span><button class="btn gefahr klein" type="button" data-aktion="pos-weg" data-pos="' + i + '">✕</button></label></div><div class="pos-fuss"><span style="color:var(--grau)">Zeilentotal</span><b class="zahl">' + chf(zahl(p.menge) * zahl(p.einzelpreis)) + "</b></div></div>";
}
async function offerteLaden() {
  try {
    offerte = await eigeneHandwerkerOfferte(offerteId);
    if (!offerte.offert_positionen || !offerte.offert_positionen.length) offerte.offert_positionen = [neuePosition()];
  } catch (e) {
    offerte = null;
    el("app").innerHTML = '<main><div class="karte karte-pad" style="margin:20px auto;max-width:520px"><div class="hinweis fehler"><div><b>Offerte nicht zugänglich</b>Diese Offerte ist Ihrem Konto nicht zugewiesen, oder der Link ist falsch.</div></div></div></main>';
    return;
  }
  zeichnen();
}
async function speichern(knopf) {
  knopf.disabled = true;
  try {
    const datei = el("h-datei");
    if (datei && datei.files && datei.files[0]) dateiWartend = datei.files[0];
    if (dateiWartend) {
      const info = await hochladen(dateiWartend, offerte.projekt_id, "handwerker/" + offerte.id);
      offerte.datei_pfad = info.datei_pfad;
      offerte.datei_name = info.datei_name;
      dateiWartend = null;
    }
    await offerteSpeichern(offerte.projekt_id, {
      ...offerte,
      mwst_satz: offerte.mwst_satz === "" || offerte.mwst_satz == null ? null : zahl(offerte.mwst_satz),
      positionen: offerte.offert_positionen.filter((p) => (p.beschreibung || "").trim() || zahl(p.einzelpreis) !== 0)
    }, offerte.geaendert_am);
    meldung("Offerte gespeichert. Die Bauherrschaft sieht die Änderung sofort.");
    await offerteLaden();
  } catch (e) {
    meldung(e.message, true);
  } finally {
    knopf.disabled = false;
  }
}
document.addEventListener("click", async (e) => {
  const knopf = e.target.closest("[data-aktion]");
  if (!knopf) return;
  const a = knopf.dataset.aktion;
  if (a === "anmelden") {
    try {
      await anmelden(el("h-email").value.trim(), el("h-passwort").value);
    } catch (err) {
      meldung(/abort|timeout/i.test(err.message) ? "Der Server hat nicht geantwortet (Zeitüberschreitung)." : /Invalid login/i.test(err.message) ? "E-Mail oder Passwort ist falsch." : err.message, true);
    }
    return;
  }
  if (a === "abmelden") return abmelden();
  if (a === "speichern") return speichern(knopf);
  if (a === "pos-neu") {
    offerte.offert_positionen.push(neuePosition());
    zeichnen();
    return;
  }
  if (a === "pos-weg") {
    offerte.offert_positionen.splice(+knopf.dataset.pos, 1);
    if (!offerte.offert_positionen.length) offerte.offert_positionen.push(neuePosition());
    zeichnen();
    return;
  }
  if (a === "datei-oeffnen") {
    try {
      const url = await signierterLink(offerte.datei_pfad);
      if (url) window.open(url, "_blank");
    } catch (err) {
      meldung(err.message, true);
    }
  }
});
document.addEventListener("input", (e) => {
  const feld = e.target.closest("[data-feld]");
  if (!feld || !offerte) return;
  if (feld.dataset.pos !== void 0) {
    const p = offerte.offert_positionen[+feld.dataset.pos];
    if (p) p[feld.dataset.feld] = feld.value;
    return;
  }
  offerte[feld.dataset.feld] = feld.value;
});
aufAuthAchten(async (ereignis, neueSitzung) => {
  sitzung = neueSitzung;
  if (!sitzung) {
    offerte = null;
    zeichnen();
    return;
  }
  zeichnen();
  if (offerteId) await offerteLaden();
});
(async function start() {
  sitzung = await aktuelleSitzung();
  zeichnen();
  if (sitzung && offerteId) await offerteLaden();
})();
