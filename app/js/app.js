import { supabase, aufAuthAchten, abmelden, gespeicherteSitzungVorhanden } from "./supabase.js";
import {
  DatenFehler, projekteLaden, mitgliederLaden, budgetLaden, offertenLaden,
  belegeLaden, dokumenteLaden, kostenvergleichLaden, projektAbonnieren,
  einladungenLaden, einladungInfo, einladungEinloesen, nebenkostenLaden,
} from "./daten.js";
import { esc, meldung } from "./format.js";
import * as Anmeldung from "./ansichten/anmeldung.js";
import * as Uebersicht from "./ansichten/uebersicht.js";
import * as Budget from "./ansichten/budget.js";
import * as Offerten from "./ansichten/offerten.js";
import * as Belege from "./ansichten/belege.js";
import * as Dokumente from "./ansichten/dokumente.js";

const el = (id) => document.getElementById(id);

export const Z = {
  session: null, benutzer: null,
  projekte: [], projektId: null, projekt: null, mitglieder: [], meineRolle: null,
  budget: [], offerten: [], belege: [], dokumente: [], kostenvergleich: [], nebenkosten: [],
  aktuelleAnsicht: "uebersicht",
  online: navigator.onLine, ladeVorgaenge: 0,
  abmeldeAbo: null,
  // Beim Start wird sofort gezeichnet. sitzungVermutet kommt aus dem lokalen
  // Speicher, authGeklaert wird gesetzt, sobald Supabase geantwortet hat.
  sitzungVermutet: false, authGeklaert: false, authHinweis: "",
  laedt: false, ladeFehler: "",
  einladungen: [], einladung: null,   // einladung: offener Link, noch nicht eingelöst
};

const ANSICHTEN = [
  { id: "uebersicht", text: "Übersicht", icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>' },
  { id: "budget", text: "Budget", icon: '<path d="M3 20V9"/><path d="M9 20V4"/><path d="M15 20v-8"/><path d="M21 20V7"/>' },
  { id: "offerten", text: "Offerten", icon: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>' },
  { id: "belege", text: "Belege", icon: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9.5 8h5M9.5 12h5"/>' },
  { id: "dokumente", text: "Dokumente", icon: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' },
];

const ANSICHTS_MODULE = { uebersicht: Uebersicht, budget: Budget, offerten: Offerten, belege: Belege, dokumente: Dokumente };

export function kannBearbeiten() { return Z.meineRolle === "eigentuemer" || Z.meineRolle === "bearbeiter"; }
export function istEigentuemer() { return Z.meineRolle === "eigentuemer"; }

export function neuZeichnen() { zeichnen(); }

async function neuLaden(teile) {
  if (!Z.projektId) return;
  const alle = !teile;
  const projektId = Z.projektId;
  const braucht = (name) => alle || teile.includes(name);

  // Alle Abfragen gleichzeitig: nacheinander würden sich die Wartezeiten
  // addieren, und bei einer wackligen Verbindung stünde die App minutenlang.
  const auftraege = [];
  const holen = (name, fn, ziel) => {
    if (!braucht(name)) return;
    auftraege.push(
      fn(projektId).then(
        (daten) => { Z[ziel] = daten; return null; },
        (fehler) => fehler
      )
    );
  };
  holen("mitglieder", mitgliederLaden, "mitglieder");
  if (braucht("mitglieder")) {
    auftraege.push(einladungenLaden(projektId).then((d) => { Z.einladungen = d; return null; }, () => null));
  }
  holen("nebenkosten", nebenkostenLaden, "nebenkosten");
  holen("budget", budgetLaden, "budget");
  holen("offerten", offertenLaden, "offerten");
  holen("belege", belegeLaden, "belege");
  holen("dokumente", dokumenteLaden, "dokumente");
  if (alle || braucht("budget") || braucht("offerten") || braucht("belege")) {
    auftraege.push(kostenvergleichLaden(projektId).then((d) => { Z.kostenvergleich = d; return null; }, (f) => f));
  }

  Z.laedt = true;
  zeichnen();
  const fehlerListe = (await Promise.all(auftraege)).filter(Boolean);
  Z.laedt = false;

  // Zwischenzeitlich das Projekt gewechselt oder abgemeldet: Ergebnis verwerfen.
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
export { neuLaden };

export async function projektWechseln(projektId) {
  if (Z.abmeldeAbo) { Z.abmeldeAbo(); Z.abmeldeAbo = null; }
  Z.projektId = projektId;
  Z.projekt = Z.projekte.find((p) => p.id === projektId) || null;
  try { localStorage.setItem("tw-letztes-projekt", projektId); } catch (e) { /* egal */ }
  await neuLaden();
  if (Z.projektId) {
    Z.abmeldeAbo = projektAbonnieren(Z.projektId, (bereich) => neuLadenGesammelt(bereich));
  }
}

// Ein Import löst dutzende Realtime-Ereignisse aus. Ohne Sammelfenster würde
// jedes einzelne einen neuen Ladelauf starten.
let sammelUhr = null;
const sammelBereiche = new Set();
function neuLadenGesammelt(bereich) {
  sammelBereiche.add(bereich);
  clearTimeout(sammelUhr);
  sammelUhr = setTimeout(() => {
    const bereiche = Array.from(sammelBereiche);
    sammelBereiche.clear();
    neuLaden(bereiche);
  }, 400);
}

function ansichtWechseln(name) {
  Z.aktuelleAnsicht = name;
  zeichnen();
  window.scrollTo({ top: 0 });
}

/* ---------------------------------------------------------------- Zeichnen */
function zeichnen() {
  try {
    zeichnenInner();
    el("app").dataset.gestartet = "ja";   // erst jetzt: es steht wirklich etwas auf dem Schirm
  } catch (e) {
    el("app").innerHTML =
      '<main><div class="karte karte-pad" style="margin:20px auto;max-width:520px">' +
      '<div class="hinweis fehler"><div><b>Anzeigefehler</b>' + esc(e.message || String(e)) + "</div></div>" +
      '<div class="btn-reihe" style="margin-top:12px">' +
      '<button class="btn" type="button" onclick="location.reload()">Neu laden</button>' +
      '<button class="btn zweit" type="button" data-aktion="abmelden">Abmelden</button></div></div></main>';
    el("app").dataset.gestartet = "ja";
  }
}

function zeichnenInner() {
  const wrap = el("app");

  // Angemeldet laut lokalem Speicher, aber der Server hat noch nicht geantwortet:
  // den Rahmen der App zeigen, nicht die Anmeldemaske und keinen leeren Bildschirm.
  if (!Z.session && Z.sitzungVermutet && !Z.authGeklaert) {
    el("kopf").hidden = false;
    el("nav-mobil").hidden = true;
    el("nav-desktop").innerHTML = "";
    wrap.innerHTML = '<main><div class="karte karte-pad" style="margin:20px auto;max-width:520px">' +
      '<div class="leer"><b>Anmeldung wird geprüft …</b>Das dauert normalerweise einen Augenblick.</div>' +
      '<div class="btn-reihe" style="margin-top:14px">' +
      '<button class="btn zweit" type="button" data-aktion="neu-laden">Erneut versuchen</button>' +
      '<button class="btn zweit" type="button" data-aktion="abmelden">Abmelden</button>' +
      '<a class="btn still" href="hilfe.html">Diagnose</a></div></div></main>';
    return;
  }

  if (!Z.session) {
    el("kopf").hidden = true;
    el("nav-mobil").hidden = true;
    wrap.innerHTML = Anmeldung.render();
    return;
  }
  el("kopf").hidden = false;
  navZeichnen();

  if (!Z.projekt) {
    el("nav-mobil").hidden = true;
    // Solange geladen wird oder das Laden fehlschlug, nicht die Einrichtungsmaske
    // zeigen: Sonst legt jemand ein zweites Projekt an, obwohl nur die Verbindung
    // fehlte und sein Projekt längst existiert.
    wrap.innerHTML = (Z.laedt || Z.ladeFehler)
      ? '<main><div style="max-width:520px;margin:20px auto;padding:0 14px">' + ladeBanner() +
        '<div class="btn-reihe" style="margin-top:12px">' +
        '<button class="btn zweit" type="button" data-aktion="abmelden">Abmelden</button>' +
        '<a class="btn still" href="hilfe.html">Diagnose</a></div></div></main>'
      : Uebersicht.renderProjektAnlegen();
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
    // Ein Fehler beim Aufbau einer Ansicht darf nicht den ganzen Bildschirm leeren.
    innen = '<div class="karte karte-pad"><div class="hinweis fehler"><div><b>Diese Ansicht konnte nicht aufgebaut werden</b>' +
      esc(e.message || String(e)) + "</div></div>" +
      '<div class="btn-reihe" style="margin-top:12px">' +
      '<button class="btn zweit" type="button" data-ansicht="uebersicht">Zur Übersicht</button>' +
      '<button class="btn zweit" type="button" data-aktion="neu-laden">Daten neu laden</button></div></div>';
  }

  wrap.innerHTML =
    (!Z.online ? '<div class="banner-offline">Keine Verbindung zum Server – Änderungen sind erst nach erneuter Verbindung möglich.</div>' : "") +
    '<main id="ansicht" tabindex="-1">' + ladeBanner() + innen + "</main>";
}

/** Zeigt dauerhaft an, ob gerade geladen wird oder etwas fehlgeschlagen ist –
 *  ein flüchtiger Hinweis reicht dafür nicht. */
function ladeBanner() {
  if (Z.laedt) {
    return '<div class="hinweis info abschnitt"><div>Daten werden geladen …</div></div>';
  }
  if (Z.ladeFehler) {
    return '<div class="hinweis fehler abschnitt"><div style="flex:1"><b>Daten konnten nicht geladen werden</b>' +
      esc(Z.ladeFehler) +
      '<div class="btn-reihe" style="margin-top:9px">' +
      '<button class="btn zweit klein" type="button" data-aktion="neu-laden">Erneut versuchen</button>' +
      '<a class="btn still klein" href="hilfe.html">Diagnose</a></div></div></div>';
  }
  return "";
}

function navZeichnen() {
  const projektAuswahl = Z.projekte.length > 1
    ? '<select id="projekt-wahl" style="width:auto;min-height:34px;padding:4px 8px;font-size:.82rem;margin-right:6px">' +
      Z.projekte.map((p) => '<option value="' + p.id + '"' + (p.id === Z.projektId ? " selected" : "") + '>' + esc(p.name || "Projekt") + "</option>").join("") +
      "</select>"
    : "";
  el("nav-desktop").innerHTML = (Z.projekt ? ANSICHTEN.map((a) =>
    '<button type="button" data-ansicht="' + a.id + '"' + (a.id === Z.aktuelleAnsicht ? ' aria-current="page"' : "") + ">" + a.text + "</button>"
  ).join("") : "") +
    '<span class="kopf-rechts">' + projektAuswahl +
    '<span class="sync-punkt' + (Z.online ? "" : " aus") + '" title="' + (Z.online ? "Verbunden" : "Keine Verbindung") + '"></span>' +
    '<button class="btn still klein" type="button" data-aktion="abmelden" style="color:#fff">Abmelden</button></span>';
  el("nav-mobil").innerHTML = ANSICHTEN.map((a) =>
    '<button type="button" data-ansicht="' + a.id + '"' + (a.id === Z.aktuelleAnsicht ? ' aria-current="page"' : "") + '>' +
    '<svg viewBox="0 0 24 24" aria-hidden="true">' + a.icon + "</svg>" + a.text + "</button>"
  ).join("");
}

/* -------------------------------------------------------------------- Modal */
let modalSpeichern = null;
export function modalOeffnen(o) {
  modalSpeichern = o.speichern || null;
  el("modal-wrap").innerHTML =
    '<div class="modal-hg" id="modal-hg"><div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(o.titel) + '">' +
    '<div class="modal-kopf"><h2>' + esc(o.titel) + '</h2>' +
    '<button class="x-btn" type="button" data-aktion="modal-zu" aria-label="Schliessen">×</button></div>' +
    '<div class="modal-koerper">' + o.koerper + "</div>" +
    '<div class="modal-fuss">' +
    '<button class="btn zweit" type="button" data-aktion="modal-zu">Abbrechen</button>' +
    '<button class="btn" type="button" data-aktion="modal-speichern">' + (o.knopfText || "Speichern") + "</button>" +
    "</div></div></div>";
  document.body.style.overflow = "hidden";
  const erstesFeld = document.querySelector(".modal-koerper input, .modal-koerper select");
  if (erstesFeld) setTimeout(() => erstesFeld.focus(), 10);
}
export function modalSchliessen() {
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

/* ----------------------------------------------------------------- Aktionen */
document.addEventListener("click", async (e) => {
  const knopf = e.target.closest("[data-ansicht]");
  if (knopf) return ansichtWechseln(knopf.dataset.ansicht);

  const aktionsKnopf = e.target.closest("[data-aktion]");
  if (aktionsKnopf) {
    const a = aktionsKnopf.dataset.aktion;
    if (a === "modal-zu") return modalSchliessen();
    if (a === "modal-speichern") return modalSpeichernAusloesen(aktionsKnopf);
    if (a === "abmelden") {
      // Sofort lokal abmelden – niemand soll auf den Server warten müssen.
      if (Z.abmeldeAbo) { Z.abmeldeAbo(); Z.abmeldeAbo = null; }
      Z.session = null; Z.benutzer = null; Z.sitzungVermutet = false; Z.authGeklaert = true;
      Z.projekte = []; Z.projekt = null; Z.projektId = null;
      Z.laedt = false; Z.ladeFehler = ""; Z.authHinweis = "";
      zeichnen();
      abmelden().catch(() => { /* Server erfährt es beim nächsten Mal */ });
      return;
    }
    if (a === "neu-laden") {
      Z.ladeFehler = "";
      if (Z.projektId) neuLaden();
      else projekteUndDatenLaden();
      return;
    }
    if (!Z.session) return Anmeldung.aktion(a, aktionsKnopf, Z);
    const modul = ANSICHTS_MODULE[Z.aktuelleAnsicht];
    if (modul && modul.aktion) return modul.aktion(a, aktionsKnopf, Z);
    return Uebersicht.aktion(a, aktionsKnopf, Z);
  }
  if (e.target.id === "modal-hg") modalSchliessen();
});
document.addEventListener("submit", (e) => {
  if (e.target.closest("#anmelde-formular")) { e.preventDefault(); Anmeldung.formularAbschicken(e.target); }
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
window.addEventListener("online", () => { Z.online = true; if (Z.projektId) neuLaden(); else zeichnen(); });
window.addEventListener("offline", () => { Z.online = false; zeichnen(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && Z.projektId) neuLaden(); });

/* ------------------------------------------------------------------- Start */
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
    // Wichtig: Beim Fehler NICHT die Maske "Projekt einrichten" zeigen – sonst
    // legt jemand ein zweites Projekt an, obwohl nur die Verbindung fehlte.
    Z.ladeFehler = gescheitert.message || String(gescheitert);
    zeichnen();
    return;
  }

  let letztes = null;
  try { letztes = localStorage.getItem("tw-letztes-projekt"); } catch (e) { /* egal */ }
  const gewaehlt = Z.projekte.find((p) => p.id === letztes) || Z.projekte[0] || null;
  if (gewaehlt) await projektWechseln(gewaehlt.id);
  else zeichnen();
}

aufAuthAchten(async (ereignis, sitzung) => {
  Z.authGeklaert = true;
  Z.authHinweis = "";
  Z.session = sitzung;
  Z.benutzer = sitzung ? sitzung.user : null;
  if (ereignis === "SIGNED_OUT" || !sitzung) {
    if (Z.abmeldeAbo) { Z.abmeldeAbo(); Z.abmeldeAbo = null; }
    Z.projektId = null; Z.projekt = null; Z.projekte = [];
    zeichnen();
    return;
  }
  zeichnen();   // sofort den richtigen Bildschirm zeigen, dann erst laden
  if (ereignis === "SIGNED_IN" || ereignis === "INITIAL_SESSION" || ereignis === "TOKEN_REFRESHED") {
    if (await einladungVerarbeiten()) return;
    if (!Z.projekte.length) await projekteUndDatenLaden();
  }
});

const EINLADUNG_SCHLUESSEL = "tw-einladung";

function einladungAusAdresse() {
  const ausAdresse = new URLSearchParams(location.search).get("einladung");
  if (ausAdresse) {
    try { sessionStorage.setItem(EINLADUNG_SCHLUESSEL, ausAdresse); } catch (e) { /* egal */ }
    return ausAdresse;
  }
  try { return sessionStorage.getItem(EINLADUNG_SCHLUESSEL); } catch (e) { return null; }
}

function einladungVergessen() {
  try { sessionStorage.removeItem(EINLADUNG_SCHLUESSEL); } catch (e) { /* egal */ }
  Z.einladung = null;
}

/** Nach der Anmeldung: Einladung einlösen und ins Projekt springen. */
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
  // Sofort zeichnen, ohne auf eine Antwort vom Server zu warten: Wer lokal ein
  // Anmeldetoken hat, sieht den Rahmen der App, alle anderen die Anmeldemaske.
  // Den Rest erledigt aufAuthAchten(), sobald Supabase geantwortet hat.
  Z.sitzungVermutet = gespeicherteSitzungVorhanden();
  zeichnen();

  // Wurde die App über einen Einladungslink geöffnet? Dann gleich zeigen, worum
  // es geht – noch bevor sich jemand angemeldet hat.
  const token = einladungAusAdresse();
  if (token) {
    einladungInfo(token)
      .then((info) => { if (info) { Z.einladung = info; zeichnen(); } })
      .catch(() => { /* Hinweis ist nur Beiwerk */ });
  }

  // Notausgang: Antwortet die Anmeldung gar nicht, nicht ewig "lädt" anzeigen.
  setTimeout(() => {
    if (Z.session || Z.projekt || Z.ladeFehler) return;
    Z.authGeklaert = true;
    if (!Z.session) Z.authHinweis = "Die Anmeldung konnte nicht geprüft werden – bitte erneut anmelden.";
    zeichnen();
  }, 15000);
})();
