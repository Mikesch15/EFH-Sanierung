import { supabase, aufAuthAchten, abmelden, gespeicherteSitzungVorhanden } from "./supabase.js";
import {
  DatenFehler, projekteLaden, mitgliederLaden, budgetLaden, offertenLaden,
  belegeLaden, dokumenteLaden, kostenvergleichLaden, projektAbonnieren,
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
  budget: [], offerten: [], belege: [], dokumente: [], kostenvergleich: [],
  aktuelleAnsicht: "uebersicht",
  online: navigator.onLine, ladeVorgaenge: 0,
  abmeldeAbo: null,
  // Beim Start wird sofort gezeichnet. sitzungVermutet kommt aus dem lokalen
  // Speicher, authGeklaert wird gesetzt, sobald Supabase geantwortet hat.
  sitzungVermutet: false, authGeklaert: false, authHinweis: "",
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
  try {
    if (alle || teile.includes("mitglieder")) Z.mitglieder = await mitgliederLaden(Z.projektId);
    if (alle || teile.includes("budget")) Z.budget = await budgetLaden(Z.projektId);
    if (alle || teile.includes("offerten")) Z.offerten = await offertenLaden(Z.projektId);
    if (alle || teile.includes("belege")) Z.belege = await belegeLaden(Z.projektId);
    if (alle || teile.includes("dokumente")) Z.dokumente = await dokumenteLaden(Z.projektId);
    if (alle || teile.includes("budget") || teile.includes("offerten") || teile.includes("belege")) {
      Z.kostenvergleich = await kostenvergleichLaden(Z.projektId);
    }
    const mich = Z.mitglieder.find((m) => m.benutzer_id === Z.benutzer.id);
    Z.meineRolle = mich ? mich.rolle : null;
    Z.online = true;
  } catch (e) {
    if (e instanceof DatenFehler && e.keineVerbindung) { Z.online = false; }
    meldung(e.message, true);
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
    Z.abmeldeAbo = projektAbonnieren(Z.projektId, (bereich) => neuLaden([bereich]));
  }
}

function ansichtWechseln(name) {
  Z.aktuelleAnsicht = name;
  zeichnen();
  window.scrollTo({ top: 0 });
}

/* ---------------------------------------------------------------- Zeichnen */
function zeichnen() {
  const wrap = el("app");
  wrap.dataset.gestartet = "ja";   // schaltet die Startfehler-Meldung in index.html ab

  // Angemeldet laut lokalem Speicher, aber der Server hat noch nicht geantwortet:
  // den Rahmen der App zeigen, nicht die Anmeldemaske und keinen leeren Bildschirm.
  if (!Z.session && Z.sitzungVermutet && !Z.authGeklaert) {
    el("kopf").hidden = false;
    el("nav-mobil").hidden = true;
    el("nav-desktop").innerHTML = "";
    wrap.innerHTML = '<main><div class="karte karte-pad" style="margin:20px auto;max-width:520px">' +
      '<div class="leer"><b>Daten werden geladen …</b>Anmeldung wird geprüft</div></div></main>';
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
    wrap.innerHTML = Uebersicht.renderProjektAnlegen();
    return;
  }
  el("nav-mobil").hidden = false;

  el("kopf-titel").textContent = Z.projekt.name || "Projekt";
  el("kopf-unter").textContent = Z.projekt.adresse || "Sanierung & Dokumente";

  const modul = ANSICHTS_MODULE[Z.aktuelleAnsicht];
  const innen = modul ? modul.render(Z) : "";
  wrap.innerHTML =
    (!Z.online ? '<div class="banner-offline">Keine Verbindung zum Server – Änderungen sind erst nach erneuter Verbindung möglich.</div>' : "") +
    '<main id="ansicht" tabindex="-1">' + innen + "</main>";
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
    if (a === "abmelden") { await abmelden(); return; }
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
  try {
    Z.projekte = await projekteLaden();
    Z.online = true;
  } catch (e) {
    Z.online = !(e instanceof DatenFehler && e.keineVerbindung);
    meldung(e.message, true);
    Z.projekte = [];
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
  if (ereignis === "SIGNED_IN" || ereignis === "INITIAL_SESSION" || ereignis === "TOKEN_REFRESHED") {
    if (!Z.projekte.length) await projekteUndDatenLaden();
    else zeichnen();
  }
});

(function start() {
  // Sofort zeichnen, ohne auf eine Antwort vom Server zu warten: Wer lokal ein
  // Anmeldetoken hat, sieht den Rahmen der App, alle anderen die Anmeldemaske.
  // Den Rest erledigt aufAuthAchten(), sobald Supabase geantwortet hat.
  Z.sitzungVermutet = gespeicherteSitzungVorhanden();
  zeichnen();

  // Notausgang: Antwortet die Anmeldung gar nicht, nicht ewig "lädt" anzeigen.
  setTimeout(() => {
    if (Z.authGeklaert || Z.session) return;
    Z.authGeklaert = true;
    Z.authHinweis = "Die Anmeldung konnte nicht geprüft werden – bitte erneut anmelden.";
    zeichnen();
  }, 15000);
})();
