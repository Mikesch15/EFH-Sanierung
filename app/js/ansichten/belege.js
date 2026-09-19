import { esc, chf, datumCH, zahl, heuteISO, meldung, bestaetigen } from "../format.js";
import { leerZustand, kategorieOptionen, kategorieName, ladeSchritte, offerteNetto, offerteMwst } from "./gemeinsam.js";
import { belegSpeichern, belegLoeschen } from "../daten.js";
import { hochladen, signierterLink, loeschen as dateiLoeschen } from "../dateien.js";
import { analysiereDokument, analyseFehlerText, ANALYSE_SCHRITTE } from "../ki.js";
import { modalOeffnen, neuLaden, kannBearbeiten } from "../app.js";
import { MWST_SATZ_VORGABE } from "../konfig.js";

let entwurf = null;
let dateiWartend = null;
let letzterHinweis = "";   // Anmerkung der KI zum zuletzt ausgelesenen Beleg
let mwstManuell = false;

export function render(Z) {
  const bearbeitbar = kannBearbeiten();
  const rechnungen = Z.belege.reduce((s, b) => s + zahl(b.brutto), 0);
  const bezahlt = Z.belege.filter((b) => b.bezahlt).reduce((s, b) => s + zahl(b.brutto), 0);

  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Belege &amp; Rechnungen</h2>' +
    "<p>" + Z.belege.length + " erfasst · " + chf(rechnungen) + " · davon bezahlt " + chf(bezahlt) + "</p></div>" +
    (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="beleg-neu">+ Beleg</button>' : "") + "</div>";

  if (!Z.belege.length) {
    h += leerZustand("Noch keine Belege", "Rechnungen und Quittungen als PDF, JPG oder PNG hochladen und einer Kategorie zuordnen.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="beleg-neu">Beleg hinzufügen</button>' : "");
    return h + "</section>";
  }

  h += '<div class="karte"><div class="tab-scroll"><table><thead><tr>' +
    "<th>Lieferant</th><th>Nummer</th><th>Datum</th><th>Kategorie</th><th>Offerte</th>" +
    '<th class="num">Netto</th><th class="num">MWST</th><th class="num">Total</th><th>Zahlung</th><th></th></tr></thead><tbody>';
  Z.belege.slice().reverse().forEach((b) => {
    const offerte = Z.offerten.find((o) => o.id === b.offerte_id);
    h += "<tr><td><b>" + esc(b.lieferant || "–") + "</b> " +
      (b.ki_erkannt ? '<span class="badge demo">KI</span>' : "") +
      (b.datei_pfad ? ' <span class="badge">Datei</span>' : "") + "</td>" +
      "<td>" + esc(b.nummer || "–") + "</td>" +
      "<td>" + datumCH(b.datum) + "</td>" +
      "<td>" + esc(kategorieName(Z.budget, b.budgetposition_id)) + "</td>" +
      "<td>" + (offerte ? esc(offerte.nummer || offerte.lieferant || "Offerte") : "–") + "</td>" +
      '<td class="num">' + chf(b.netto) + "</td>" +
      '<td class="num">' + (b.mwst == null ? "ohne" : chf(b.mwst)) + "</td>" +
      '<td class="num"><b>' + chf(b.brutto) + "</b></td>" +
      "<td>" + (b.bezahlt
        ? '<span class="badge gruen">bezahlt ' + (b.zahlungsdatum ? datumCH(b.zahlungsdatum) : "") + "</span>"
        : '<span class="badge amber">offen</span>') + "</td>" +
      '<td><div class="zeile-aktion">' +
      (b.datei_pfad ? '<button class="btn still klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(b.datei_pfad) + '">Datei</button>' : "") +
      '<button class="btn still klein" type="button" data-aktion="beleg-bearbeiten" data-id="' + b.id + '">' + (bearbeitbar ? "Bearbeiten" : "Ansehen") + "</button>" +
      (bearbeitbar ? '<button class="btn still klein" type="button" data-aktion="beleg-loeschen" data-id="' + b.id + '">Löschen</button>' : "") +
      "</div></td></tr>";
  });
  h += '</tbody><tfoot><tr><td colspan="7">Total</td><td class="num">' + chf(rechnungen) + '</td><td colspan="2"></td></tr></tfoot>';
  return h + "</table></div></div></section>";
}

function formular(Z, b) {
  dateiWartend = null;
  letzterHinweis = "";
  mwstManuell = false;
  entwurf = b ? JSON.parse(JSON.stringify(b)) : {
    id: null, budgetposition_id: null, offerte_id: null, lieferant: "", nummer: "", datum: heuteISO(),
    netto: 0, mwst: 0, brutto: 0, bezahlt: false, zahlungsdatum: "", bemerkung: "",
    datei_pfad: null, datei_name: null, ki_erkannt: false,
  };
  modalOeffnen({ titel: entwurf.id ? "Beleg bearbeiten" : "Neuer Beleg", koerper: koerper(Z), speichern: () => speichern(Z) });
}

function koerper(Z) {
  const b = entwurf;
  const ohneMwst = b.mwst == null;
  let h = '<div id="b-analyse">' + analyseBlock() + "</div>";
  if (b.ki_erkannt) {
    h += '<div class="hinweis demo" style="margin-bottom:14px"><div><b>Von der KI ausgelesen – bitte prüfen</b>' +
      "Automatisch erkannte Werte können falsch sein. Beträge und Datum bitte mit dem Beleg vergleichen." +
      (letzterHinweis ? "<br>Hinweis der Auswertung: " + esc(letzterHinweis) : "") +
      "</div></div>";
  }
  h += '<label class="feld"><span>Lieferant</span><input data-feld="lieferant" value="' + esc(b.lieferant) + '" placeholder="Firma"></label>' +
    '<div class="feld-paar">' +
    '<label class="feld"><span>Rechnungsnummer</span><input data-feld="nummer" value="' + esc(b.nummer) + '" placeholder="RE-2026-235"></label>' +
    '<label class="feld"><span>Rechnungsdatum</span><input type="date" data-feld="datum" value="' + esc(b.datum || "") + '"></label></div>' +
    '<div class="check"><input type="checkbox" id="b-ohne-mwst"' + (ohneMwst ? " checked" : "") + '> <label for="b-ohne-mwst" style="margin:0">Ohne MWST (kein MWST-Ausweis auf dem Beleg)</label></div>' +
    '<div class="feld-paar">' +
    '<label class="feld"><span>Betrag exkl. MWST</span><input inputmode="decimal" data-feld="netto" data-betrag="1" value="' + esc(b.netto) + '"' + (ohneMwst ? " disabled" : "") + "></label>" +
    '<label class="feld"><span>MWST</span><input inputmode="decimal" data-feld="mwst" data-betrag="1" value="' + (ohneMwst ? "" : esc(b.mwst)) + '"' + (ohneMwst ? " disabled" : "") + "></label></div>" +
    '<label class="feld"><span>Betrag' + (ohneMwst ? "" : " inkl. MWST") + '</span><input inputmode="decimal" data-feld="brutto" data-betrag="1" value="' + esc(b.brutto) + '"></label>' +
    (ohneMwst ? "" : '<div class="hinweis info" style="margin-bottom:14px"><div>Beim Ausfüllen von zwei Feldern wird das dritte automatisch ergänzt (MWST-Satz ' + MWST_SATZ_VORGABE + " %).</div></div>") +
    '<div class="feld-paar">' +
    '<label class="feld"><span>Kategorie</span><select data-feld="budgetposition_id">' + kategorieOptionen(Z.budget, b.budgetposition_id) + "</select></label>" +
    '<label class="feld"><span>Bezug zu Offerte</span><select data-feld="offerte_id"><option value="">Keine Zuordnung</option>' +
    Z.offerten.map((o) => '<option value="' + o.id + '"' + (o.id === b.offerte_id ? " selected" : "") + ">" +
      esc((o.nummer || "ohne Nr.") + " · " + (o.lieferant || "")) + "</option>").join("") +
    "</select></label></div>" +
    '<label class="check"><input type="checkbox" data-feld="bezahlt"' + (b.bezahlt ? " checked" : "") + "> Rechnung ist bezahlt</label>" +
    '<label class="feld"><span>Zahlungsdatum</span><input type="date" data-feld="zahlungsdatum" value="' + esc(b.zahlungsdatum || "") + '"></label>' +
    '<label class="feld"><span>Bemerkung</span><textarea data-feld="bemerkung" placeholder="optional">' + esc(b.bemerkung || "") + "</textarea></label>";
  return h;
}

function analyseBlock() {
  const b = entwurf;
  if (b.datei_pfad) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Datei: ' + esc(b.datei_name || "") + "</b>" +
      '<div class="btn-reihe" style="margin-top:9px">' +
      '<button class="btn zweit klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(b.datei_pfad) + '">Datei öffnen</button>' +
      '<button class="btn zweit klein" type="button" data-aktion="b-analysieren">Beleg auslesen</button>' +
      '<button class="btn still klein" type="button" data-aktion="b-datei-entfernen">Datei entfernen</button></div></div></div>';
  }
  if (dateiWartend) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Gewählte Datei: ' + esc(dateiWartend.name) + "</b>" +
      "Wird beim Speichern hochgeladen." +
      '<div class="btn-reihe" style="margin-top:9px">' +
      '<button class="btn zweit klein" type="button" data-aktion="b-analysieren">Beleg auslesen</button>' +
      '<button class="btn still klein" type="button" data-aktion="b-datei-entfernen">Datei entfernen</button></div></div></div>';
  }
  return '<div class="datei-feld" style="margin-bottom:14px"><p>Rechnung oder Quittung als PDF, JPG oder PNG hochladen</p>' +
    '<input type="file" id="b-datei" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png">' +
    '<div class="btn-reihe" style="margin-top:11px;justify-content:center">' +
    '<button class="btn klein" type="button" data-aktion="b-analysieren">Beleg auslesen</button></div>' +
    '<p style="margin:9px 0 0;font-size:.76rem">Beim Auslesen wird die Datei gespeichert und einmalig an den KI-Dienst ' +
    "(Google Gemini) übermittelt. Ohne Klick auf diesen Knopf passiert das nicht.</p></div>";
}

function betraegeAbgleichen(zuletzt) {
  const b = entwurf;
  if (b.mwst == null) { // ohne MWST: nur Brutto zählt
    b.netto = zahl(b.brutto);
    return;
  }
  const f = 1 + MWST_SATZ_VORGABE / 100;
  const r = (n) => Math.round(n * 100) / 100;
  if (zuletzt === "brutto") {
    b.netto = r(zahl(b.brutto) / f);
    b.mwst = r(zahl(b.brutto) - zahl(b.netto));
  } else if (zuletzt === "netto") {
    if (!mwstManuell) b.mwst = r((zahl(b.netto) * MWST_SATZ_VORGABE) / 100);
    b.brutto = r(zahl(b.netto) + zahl(b.mwst));
  } else if (zuletzt === "mwst") {
    b.brutto = r(zahl(b.netto) + zahl(b.mwst));
  }
  document.querySelectorAll("[data-betrag]").forEach((inp) => {
    if (inp.dataset.feld !== zuletzt) inp.value = zahl(b[inp.dataset.feld]);
  });
}

async function analysieren(Z) {
  const feld = document.getElementById("b-datei");
  if (feld && feld.files && feld.files[0]) dateiWartend = feld.files[0];
  if (!dateiWartend && !entwurf.datei_pfad) { meldung("Bitte zuerst eine Datei auswählen.", true); return; }

  const block = document.getElementById("b-analyse");
  const schritte = ANALYSE_SCHRITTE.beleg;
  block.innerHTML = '<div class="karte karte-pad lade" style="margin-bottom:14px"><div class="lade-ring"></div>' +
    "<b>Beleg wird ausgelesen …</b>" + ladeSchritte(schritte, 0) +
    '<p style="margin:12px 0 0;font-size:.76rem;color:var(--grau)">Das dauert in der Regel wenige Sekunden.</p></div>';

  let e;
  try {
    e = await analysiereDokument(
      { datei: dateiWartend, pfad: entwurf.datei_pfad, name: entwurf.datei_name, projektId: Z.projektId, bereich: "belege" },
      "beleg",
      (i) => {
        const liste = block.querySelector(".lade-schritte");
        if (liste) liste.innerHTML = ladeSchritte(schritte, i + 1);
      }
    );
  } catch (fehler) {
    const el = document.getElementById("b-analyse");
    if (el) el.innerHTML = analyseBlock();
    meldung(analyseFehlerText(fehler), true);
    return;
  }
  // Modal zwischenzeitlich geschlossen: Ergebnis verwerfen, nichts anfassen.
  if (!document.querySelector(".modal") || !entwurf) return;
  // Die Datei liegt jetzt im Speicher – beim Speichern nicht noch einmal hochladen.
  entwurf.datei_pfad = e.datei_pfad;
  entwurf.datei_name = e.datei_name;
  dateiWartend = null;
  letzterHinweis = e.hinweis || "";
  mwstManuell = false;
  Object.assign(entwurf, {
    ki_erkannt: true,
    lieferant: e.lieferant || entwurf.lieferant,
    nummer: e.nummer || entwurf.nummer,
    datum: e.datum || entwurf.datum,
    netto: e.netto, mwst: e.mwst, brutto: e.brutto,
    bezahlt: e.bezahlt || entwurf.bezahlt,
    zahlungsdatum: e.zahlungsdatum || entwurf.zahlungsdatum,
  });
  // Zum selben Lieferanten passende Offerte vorschlagen – nur als Vorauswahl.
  if (!entwurf.offerte_id && entwurf.lieferant) {
    const gesucht = entwurf.lieferant.toLowerCase();
    const passend = Z.offerten.find((o) => (o.lieferant || "").toLowerCase() === gesucht);
    if (passend) entwurf.offerte_id = passend.id;
  }
  const koerperEl = document.querySelector(".modal-koerper");
  if (koerperEl) koerperEl.innerHTML = koerper(Z);
  meldung(
    e.brutto ? "Beleg ausgelesen – bitte prüfen." : "Es konnte kein Betrag erkannt werden. Bitte von Hand erfassen."
  );
}

async function speichern(Z) {
  const b = entwurf;
  if (!b.lieferant.trim() && !b.nummer.trim()) { meldung("Bitte mindestens Lieferant oder Rechnungsnummer angeben.", true); return false; }
  if (zahl(b.brutto) <= 0) { meldung("Bitte einen Betrag erfassen.", true); return false; }
  b.netto = zahl(b.netto); b.brutto = zahl(b.brutto);
  b.mwst = b.mwst == null ? null : zahl(b.mwst);
  if (b.bezahlt && !b.zahlungsdatum) b.zahlungsdatum = heuteISO();
  if (!b.bezahlt) b.zahlungsdatum = "";

  const feld = document.getElementById("b-datei");
  if (!dateiWartend && feld && feld.files && feld.files[0]) dateiWartend = feld.files[0];

  try {
    if (dateiWartend) {
      const info = await hochladen(dateiWartend, Z.projektId, "belege");
      b.datei_pfad = info.datei_pfad; b.datei_name = info.datei_name;
    }
    await belegSpeichern(Z.projektId, b, b.geaendert_am);
    meldung(b.id ? "Beleg aktualisiert." : "Beleg gespeichert.");
    dateiWartend = null;
    await neuLaden(["belege"]);
    return true;
  } catch (err) { meldung(err.message, true); return false; }
}

export function eingabe(e) {
  if (!document.querySelector(".modal") || !entwurf) return;
  const feld = e.target.closest("[data-feld]");
  if (!feld) return;
  const name = feld.dataset.feld;
  const wert = feld.type === "checkbox" ? feld.checked : feld.value;
  if (name === "budgetposition_id" || name === "offerte_id") { entwurf[name] = wert || null; return; }
  entwurf[name] = wert;
  if (name === "mwst") mwstManuell = true;
  if (feld.dataset.betrag) betraegeAbgleichen(name);
  if (name === "bezahlt" && wert && !entwurf.zahlungsdatum) {
    entwurf.zahlungsdatum = heuteISO();
    const zd = document.querySelector('[data-feld="zahlungsdatum"]');
    if (zd) zd.value = entwurf.zahlungsdatum;
  }
}

export function aenderung(e, Z) {
  if (e.target.id === "b-ohne-mwst" && entwurf) {
    if (e.target.checked) { entwurf.mwst = null; entwurf.netto = zahl(entwurf.brutto); }
    else { entwurf.mwst = 0; betraegeAbgleichen("brutto"); }
    const koerperEl = document.querySelector(".modal-koerper");
    if (koerperEl) koerperEl.innerHTML = koerper(Z);
  }
}

export function aktion(a, knopf, Z) {
  if (a === "beleg-neu") return formular(Z, null);
  if (a === "beleg-bearbeiten") return formular(Z, Z.belege.find((b) => b.id === knopf.dataset.id));
  if (a === "beleg-loeschen") {
    const b = Z.belege.find((x) => x.id === knopf.dataset.id);
    if (b && bestaetigen("Beleg " + (b.nummer || b.lieferant || "") + " löschen?")) {
      (async () => {
        try {
          if (b.datei_pfad) await dateiLoeschen(b.datei_pfad);
          await belegLoeschen(b.id);
          meldung("Beleg gelöscht.");
          await neuLaden(["belege"]);
        } catch (err) { meldung(err.message, true); }
      })();
    }
    return;
  }
  if (a === "b-analysieren") return analysieren(Z);
  if (a === "b-datei-entfernen") {
    if (entwurf.datei_pfad) dateiLoeschen(entwurf.datei_pfad).catch(() => {});
    entwurf.datei_pfad = null; entwurf.datei_name = null; dateiWartend = null;
    document.getElementById("b-analyse").innerHTML = analyseBlock();
    return;
  }
  if (a === "datei-oeffnen") {
    signierterLink(knopf.dataset.pfad).then((url) => { if (url) window.open(url, "_blank"); }).catch((e) => meldung(e.message, true));
  }
}
