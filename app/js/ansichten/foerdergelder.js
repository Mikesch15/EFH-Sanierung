// Register der Fördergelder: Gebäudeprogramm, Kanton, Gemeinde, Werke.
//
// Der Status sagt, wie sicher das Geld ist. Nur zugesicherte und ausbezahlte
// Beiträge fliessen in den verfügbaren Betrag ein (siehe gemeinsam.js) – ein
// eingereichtes Gesuch ist noch kein Geld.
//
// Wird als eigener Abschnitt im Tab "Budget" gezeichnet.
import { esc, chf, chfKurz, datumCH, zahl, heuteISO, meldung, bestaetigen } from "../format.js";
import { leerZustand, kategorieOptionen, kategorieName, foerderIstSicher, foerderIstOffen } from "./gemeinsam.js";
import { foerdergeldAnlegen, foerdergeldAktualisieren, foerdergeldLoeschen } from "../daten.js";
import { hochladen, signierterLink, loeschen as dateiLoeschen } from "../dateien.js";
import { modalOeffnen, neuLaden, kannBearbeiten } from "../app.js";
import { FOERDER_STATUS, FOERDER_STELLEN } from "../konfig.js";

let entwurf = null;
let dateiWartend = null;

function statusBadge(status) {
  const farbe = { Geplant: "", Beantragt: "blau", Zugesichert: "gruen", Ausbezahlt: "gruen", Abgelehnt: "rot" };
  return '<span class="badge ' + (farbe[status] || "") + '">' + esc(status || "Geplant") + "</span>";
}

/** Frist verstrichen, ohne dass das Gesuch draussen ist? Dann muss das auffallen. */
function fristVersaeumt(f) {
  return !!f.frist && f.status === "Geplant" && f.frist < heuteISO();
}

/** Nächstes für diese Zeile sprechendes Datum. */
function datumSpalte(f) {
  if (f.status === "Ausbezahlt" && f.auszahlung_am) return "ausbezahlt " + datumCH(f.auszahlung_am);
  if (f.status === "Zugesichert" && f.entscheid_am) return "zugesichert " + datumCH(f.entscheid_am);
  if (f.status === "Abgelehnt" && f.entscheid_am) return "abgelehnt " + datumCH(f.entscheid_am);
  if (f.status === "Beantragt" && f.eingereicht_am) return "eingereicht " + datumCH(f.eingereicht_am);
  if (f.frist) return "Frist " + datumCH(f.frist);
  return "–";
}

export function render(Z) {
  const liste = Z.foerdergelder || [];
  const bearbeitbar = kannBearbeiten();
  const gesichert = liste.filter(foerderIstSicher).reduce((s, f) => s + zahl(f.betrag), 0);
  const erwartet = liste.filter(foerderIstOffen).reduce((s, f) => s + zahl(f.betrag), 0);

  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Fördergelder</h2>' +
    "<p>" + (liste.length
      ? "gesichert " + chfKurz(gesichert) + (erwartet ? " · erwartet " + chfKurz(erwartet) : "")
      : "Beiträge von Bund, Kanton, Gemeinde und Werken") + "</p></div>" +
    (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="foerder-neu">+ Fördergeld</button>' : "") +
    "</div>";

  if (!liste.length) {
    h += leerZustand("Noch keine Fördergelder erfasst",
      "Gesuche für Wärmepumpe, Dämmung, Fenster oder Solaranlage hier festhalten – mit Frist, " +
      "Stand und Betrag. Achtung: Viele Programme verlangen das Gesuch vor Baubeginn.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="foerder-neu">Erstes Fördergeld erfassen</button>' : "");
    return h + "</section>";
  }

  const offeneFristen = liste.filter(fristVersaeumt);
  if (offeneFristen.length) {
    h += '<div class="hinweis warn" style="margin-bottom:12px"><div><b>Frist verstrichen</b>' +
      offeneFristen.map((f) => esc(f.bezeichnung || f.stelle || "Fördergeld") + " (" + datumCH(f.frist) + ")").join(" · ") +
      " – noch nicht eingereicht.</div></div>";
  }

  h += '<div class="karte"><div class="tab-scroll"><table><thead><tr>' +
    "<th>Förderung</th><th>Stelle</th><th>Kategorie</th><th>Stand</th><th>Datum</th>" +
    '<th class="num">Betrag</th><th></th></tr></thead><tbody>';
  liste.forEach((f) => {
    const sicher = foerderIstSicher(f);
    h += "<tr><td><b>" + esc(f.bezeichnung || "Ohne Bezeichnung") + "</b>" +
      (f.datei_pfad ? ' <span class="badge">Datei</span>' : "") +
      (f.gesuchsnummer ? '<div style="font-size:.76rem;color:var(--grau)">Gesuch ' + esc(f.gesuchsnummer) + "</div>" : "") +
      "</td>" +
      "<td>" + esc(f.stelle || "–") + "</td>" +
      "<td>" + esc(kategorieName(Z.budget, f.budgetposition_id)) + "</td>" +
      "<td>" + statusBadge(f.status) +
        (fristVersaeumt(f) ? ' <span class="badge rot">Frist</span>' : "") + "</td>" +
      "<td>" + esc(datumSpalte(f)) + "</td>" +
      '<td class="num"' + (sicher ? "" : ' style="color:var(--grau)"') + "><b>" + chf(f.betrag) + "</b></td>" +
      '<td><div class="zeile-aktion">' +
      (f.datei_pfad ? '<button class="btn still klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(f.datei_pfad) + '">Datei</button>' : "") +
      '<button class="btn still klein" type="button" data-aktion="foerder-bearbeiten" data-id="' + f.id + '">' + (bearbeitbar ? "Bearbeiten" : "Ansehen") + "</button>" +
      (bearbeitbar ? '<button class="btn still klein" type="button" data-aktion="foerder-loeschen" data-id="' + f.id + '">Löschen</button>' : "") +
      "</div></td></tr>";
  });
  h += "</tbody><tfoot>" +
    '<tr><td colspan="5">Gesichert (zugesichert oder ausbezahlt)</td><td class="num">' + chf(gesichert) + "</td><td></td></tr>" +
    (erwartet
      ? '<tr><td colspan="5" style="color:var(--grau)">Erwartet (geplant oder eingereicht)</td>' +
        '<td class="num" style="color:var(--grau)">' + chf(erwartet) + "</td><td></td></tr>"
      : "") +
    "</tfoot></table></div>" +
    '<div class="karte-pad" style="border-top:1px solid var(--linie);font-size:.8rem;color:var(--grau)">' +
    "Nur gesicherte Beiträge erhöhen den verfügbaren Betrag. Erwartete Beiträge sind hier " +
    "ausgewiesen, zählen aber erst mit der Zusicherung.</div></div>";

  return h + "</section>";
}

function formular(Z, f) {
  dateiWartend = null;
  entwurf = f ? JSON.parse(JSON.stringify(f)) : {
    id: null, bezeichnung: "", stelle: "", gesuchsnummer: "", betrag: 0, status: "Geplant",
    budgetposition_id: null, frist: "", eingereicht_am: "", entscheid_am: "", auszahlung_am: "",
    bemerkung: "", datei_pfad: null, datei_name: null,
  };
  modalOeffnen({
    titel: entwurf.id ? "Fördergeld bearbeiten" : "Neues Fördergeld",
    koerper: koerper(Z),
    speichern: () => speichern(Z),
  });
}

function koerper(Z) {
  const f = entwurf;
  return '<label class="feld"><span>Förderung / Massnahme</span>' +
    '<input data-feld="bezeichnung" value="' + esc(f.bezeichnung) + '" placeholder="z.B. Ersatz Ölheizung durch Wärmepumpe"></label>' +
    '<div class="feld-paar">' +
    '<label class="feld"><span>Fördergeber</span><input list="foerder-stellen" data-feld="stelle" value="' + esc(f.stelle) + '" placeholder="z.B. Das Gebäudeprogramm">' +
    '<datalist id="foerder-stellen">' + FOERDER_STELLEN.map((s) => '<option value="' + esc(s) + '">').join("") + "</datalist></label>" +
    '<label class="feld"><span>Gesuchsnummer</span><input data-feld="gesuchsnummer" value="' + esc(f.gesuchsnummer) + '" placeholder="optional"></label>' +
    "</div>" +
    '<div class="feld-paar">' +
    '<label class="feld"><span>Betrag (CHF)</span><input inputmode="decimal" data-feld="betrag" value="' + zahl(f.betrag) + '" placeholder="8000"></label>' +
    '<label class="feld"><span>Stand</span><select data-feld="status">' +
    FOERDER_STATUS.map((s) => "<option" + (s === f.status ? " selected" : "") + ">" + s + "</option>").join("") +
    "</select></label></div>" +
    '<p style="margin:-6px 0 12px;font-size:.78rem;color:var(--grau)">' +
    "Bis zur Zusicherung ist das der erwartete Beitrag, danach der verfügte. " +
    "Erst ab «Zugesichert» zählt er zum verfügbaren Geld.</p>" +
    '<label class="feld"><span>Budgetkategorie</span><select data-feld="budgetposition_id">' +
    kategorieOptionen(Z.budget, f.budgetposition_id) + "</select></label>" +
    '<div class="feld-paar">' +
    '<label class="feld"><span>Eingabefrist</span><input type="date" data-feld="frist" value="' + esc(f.frist || "") + '"></label>' +
    '<label class="feld"><span>Eingereicht am</span><input type="date" data-feld="eingereicht_am" value="' + esc(f.eingereicht_am || "") + '"></label>' +
    "</div>" +
    '<div class="feld-paar">' +
    '<label class="feld"><span>Entscheid am</span><input type="date" data-feld="entscheid_am" value="' + esc(f.entscheid_am || "") + '"></label>' +
    '<label class="feld"><span>Ausbezahlt am</span><input type="date" data-feld="auszahlung_am" value="' + esc(f.auszahlung_am || "") + '"></label>' +
    "</div>" +
    dateiBlock() +
    '<label class="feld"><span>Bemerkung</span><textarea data-feld="bemerkung" placeholder="optional">' + esc(f.bemerkung || "") + "</textarea></label>";
}

function dateiBlock() {
  const f = entwurf;
  if (f.datei_pfad) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Datei: ' + esc(f.datei_name || "") + "</b>" +
      '<div class="btn-reihe" style="margin-top:9px">' +
      '<button class="btn zweit klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(f.datei_pfad) + '">Datei öffnen</button>' +
      '<button class="btn still klein" type="button" data-aktion="foerder-datei-entfernen">Datei entfernen</button>' +
      "</div></div></div>";
  }
  return '<div class="datei-feld" style="margin-bottom:14px"><p>Zusicherung, Verfügung oder Gesuch anhängen (optional)</p>' +
    '<input type="file" id="foerder-datei" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"></div>';
}

/** Setzt das passende Datum, wenn der Stand wechselt und es noch leer ist. */
function datumNachziehen() {
  const f = entwurf;
  if (f.status === "Beantragt" && !f.eingereicht_am) f.eingereicht_am = heuteISO();
  if ((f.status === "Zugesichert" || f.status === "Abgelehnt") && !f.entscheid_am) f.entscheid_am = heuteISO();
  if (f.status === "Ausbezahlt" && !f.auszahlung_am) f.auszahlung_am = heuteISO();
}

async function speichern(Z) {
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
    datei_name: f.datei_name,
  };

  const feld = document.getElementById("foerder-datei");
  if (!dateiWartend && feld && feld.files && feld.files[0]) dateiWartend = feld.files[0];

  try {
    if (dateiWartend) {
      const info = await hochladen(dateiWartend, Z.projektId, "foerdergelder");
      daten.datei_pfad = info.datei_pfad;
      daten.datei_name = info.datei_name;
    }
    if (f.id) await foerdergeldAktualisieren(f.id, daten, f.geaendert_am);
    else await foerdergeldAnlegen(Z.projektId, daten);
    meldung(f.id ? "Fördergeld aktualisiert." : "Fördergeld erfasst.");
    dateiWartend = null;
    await neuLaden(["foerdergelder"]);
    return true;
  } catch (err) { meldung(err.message, true); return false; }
}

export function eingabe(e, Z) {
  if (!document.querySelector(".modal") || !entwurf) return;
  const feld = e.target.closest("[data-feld]");
  if (!feld) return;
  const name = feld.dataset.feld;
  if (name === "budgetposition_id") { entwurf.budgetposition_id = feld.value || null; return; }
  entwurf[name] = feld.value;
  if (name === "status") {
    // Beim Wechsel des Stands das passende Datum vorschlagen – sichtbar im Formular,
    // damit es jederzeit korrigiert werden kann.
    datumNachziehen();
    const koerperEl = document.querySelector(".modal-koerper");
    if (koerperEl) koerperEl.innerHTML = koerper(Z);
  }
}

export function aktion(a, knopf, Z) {
  if (a === "foerder-neu") return formular(Z, null);
  if (a === "foerder-bearbeiten") return formular(Z, (Z.foerdergelder || []).find((f) => f.id === knopf.dataset.id));
  if (a === "foerder-loeschen") {
    const f = (Z.foerdergelder || []).find((x) => x.id === knopf.dataset.id);
    if (f && bestaetigen("Fördergeld " + (f.bezeichnung || f.stelle || "") + " löschen?")) {
      (async () => {
        try {
          if (f.datei_pfad) await dateiLoeschen(f.datei_pfad);
          await foerdergeldLoeschen(f.id);
          meldung("Fördergeld gelöscht.");
          await neuLaden(["foerdergelder"]);
        } catch (err) { meldung(err.message, true); }
      })();
    }
    return;
  }
  if (a === "foerder-datei-entfernen") {
    if (entwurf.datei_pfad) dateiLoeschen(entwurf.datei_pfad).catch(() => {});
    entwurf.datei_pfad = null; entwurf.datei_name = null; dateiWartend = null;
    const koerperEl = document.querySelector(".modal-koerper");
    if (koerperEl) koerperEl.innerHTML = koerper(Z);
    return;
  }
  if (a === "datei-oeffnen" && knopf.dataset.pfad) {
    signierterLink(knopf.dataset.pfad).then((url) => { if (url) window.open(url, "_blank"); }).catch((e) => meldung(e.message, true));
  }
}
