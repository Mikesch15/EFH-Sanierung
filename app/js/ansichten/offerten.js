import { esc, chf, datumCH, zahl, heuteISO, meldung, bestaetigen } from "../format.js";
import { leerZustand, statusBadge, offerteNetto, offerteMwst, kategorieOptionen, kategorieName, ladeSchritte } from "./gemeinsam.js";
import { offerteSpeichern, offerteLoeschen } from "../daten.js";
import { hochladen, signierterLink, loeschen as dateiLoeschen } from "../dateien.js";
import { analysiereDokument, ANALYSE_SCHRITTE } from "../ki.js";
import { modalOeffnen, neuLaden, kannBearbeiten, istEigentuemer } from "../app.js";
import { STATUS_LISTE } from "../konfig.js";

let entwurf = null;
let dateiWartend = null;

export function render(Z) {
  const bearbeitbar = kannBearbeiten();
  const summe = Z.offerten.filter((o) => o.status !== "Abgelehnt").reduce((s, o) => s + offerteNetto(o) + offerteMwst(o), 0);
  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Offerten</h2>' +
    "<p>" + Z.offerten.length + " erfasst · Summe " + chf(summe) + " (ohne abgelehnte)</p></div>" +
    (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="offerte-neu">+ Offerte</button>' : "") + "</div>";

  if (!Z.offerten.length) {
    h += leerZustand("Noch keine Offerten", "Laden Sie eine Offerte als PDF, JPG oder PNG hoch oder erfassen Sie die Positionen von Hand.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="offerte-neu">Offerte hinzufügen</button>' : "");
    return h + "</section>";
  }

  h += '<div class="karte"><div class="tab-scroll"><table><thead><tr>' +
    "<th>Lieferant</th><th>Nummer</th><th>Datum</th><th>Kategorie</th><th>Status</th>" +
    '<th class="num">Netto</th><th class="num">Total inkl. MWST</th><th></th></tr></thead><tbody>';
  Z.offerten.slice().reverse().forEach((o) => {
    h += "<tr><td><b>" + esc(o.lieferant || "–") + "</b> " +
      (o.ki_erkannt ? '<span class="badge demo">Demo</span>' : "") +
      (o.datei_pfad ? ' <span class="badge">Datei</span>' : "") +
      (o.handwerker_id ? ' <span class="badge blau">Handwerker</span>' : "") + "</td>" +
      "<td>" + esc(o.nummer || "–") + "</td>" +
      "<td>" + datumCH(o.datum) + "</td>" +
      "<td>" + esc(kategorieName(Z.budget, o.budgetposition_id)) + "</td>" +
      "<td>" + statusBadge(o.status) + "</td>" +
      '<td class="num">' + chf(offerteNetto(o)) + "</td>" +
      '<td class="num"><b>' + chf(offerteNetto(o) + offerteMwst(o)) + "</b></td>" +
      "<td><div class=\"zeile-aktion\">" +
      (o.datei_pfad ? '<button class="btn still klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(o.datei_pfad) + '">Datei</button>' : "") +
      '<button class="btn still klein" type="button" data-aktion="offerte-bearbeiten" data-id="' + o.id + '">' + (bearbeitbar ? "Bearbeiten" : "Ansehen") + "</button>" +
      (bearbeitbar ? '<button class="btn still klein" type="button" data-aktion="offerte-loeschen" data-id="' + o.id + '">Löschen</button>' : "") +
      "</div></td></tr>";
  });
  return h + "</tbody></table></div></div></section>";
}

function neuePosition() { return { nr: "", beschreibung: "", menge: 1, einheit: "pauschal", einzelpreis: 0 }; }

// Im Editor zählt, was gerade in den Feldern steht – nicht das in der Datenbank
// berechnete zeilentotal, das erst nach dem Speichern wieder stimmt.
function entwurfNetto() {
  return (entwurf.offert_positionen || []).reduce((s, p) => s + zahl(p.menge) * zahl(p.einzelpreis), 0);
}
function entwurfMwst() {
  return entwurf.mwst_satz == null ? 0 : entwurfNetto() * (zahl(entwurf.mwst_satz) / 100);
}

function formular(Z, o) {
  dateiWartend = null;
  entwurf = o ? JSON.parse(JSON.stringify(o)) : {
    id: null, budgetposition_id: null, lieferant: "", nummer: "", datum: heuteISO(), status: "Entwurf",
    mwst_satz: 8.1, bemerkung: "", datei_pfad: null, datei_name: null, ki_erkannt: false, handwerker_id: null,
    offert_positionen: [neuePosition()],
  };
  if (!entwurf.offert_positionen || !entwurf.offert_positionen.length) entwurf.offert_positionen = [neuePosition()];

  modalOeffnen({
    titel: entwurf.id ? "Offerte bearbeiten" : "Neue Offerte",
    koerper: koerper(Z),
    speichern: () => speichern(Z),
  });
}

function koerper(Z) {
  const o = entwurf;
  let h = '<div id="o-analyse">' + analyseBlock() + "</div>";
  if (o.ki_erkannt) {
    h += '<div class="hinweis demo" style="margin-bottom:14px"><div><b>Demo – simulierte KI-Erkennung</b>' +
      "Diese Werte sind fest hinterlegte Beispieldaten und wurden nicht aus Ihrer Datei ausgelesen. Bitte prüfen.</div></div>";
  }
  h += '<label class="feld"><span>Lieferant</span><input data-feld="lieferant" value="' + esc(o.lieferant) + '" placeholder="Firma"></label>' +
    '<div class="feld-paar">' +
    '<label class="feld"><span>Offertnummer</span><input data-feld="nummer" value="' + esc(o.nummer) + '" placeholder="2026-1045"></label>' +
    '<label class="feld"><span>Datum</span><input type="date" data-feld="datum" value="' + esc(o.datum || "") + '"></label>' +
    "</div>" +
    '<div class="feld-paar">' +
    '<label class="feld"><span>Budgetkategorie</span><select data-feld="budgetposition_id">' + kategorieOptionen(Z.budget, o.budgetposition_id) + "</select></label>" +
    '<label class="feld"><span>Status</span><select data-feld="status">' +
    STATUS_LISTE.map((s) => "<option" + (s === o.status ? " selected" : "") + ">" + s + "</option>").join("") +
    "</select></label></div>";

  if (istEigentuemer()) {
    const handwerker = Z.mitglieder.filter((m) => m.rolle === "handwerker");
    h += '<label class="feld"><span>Handwerker-Zugang (optional)</span><select data-feld="handwerker_id">' +
      '<option value="">Kein Zugang für Handwerker</option>' +
      handwerker.map((m) => '<option value="' + m.benutzer_id + '"' + (m.benutzer_id === o.handwerker_id ? " selected" : "") + '>' + esc(m.email) + "</option>").join("") +
      "</select><span style=\"font-size:.76rem;color:var(--grau);display:block;margin-top:4px\">" +
      "Diese Person sieht nur diese eine Offerte, über einen eigenen Link (siehe handwerker.html).</span></label>";
  }

  h += '<div class="abschnitt-kopf" style="margin:18px 2px 9px"><div><h3>Positionen</h3>' +
    "<p>Menge, Einheit und Einzelpreis sind frei änderbar</p></div>" +
    '<button class="btn zweit klein" type="button" data-aktion="o-pos-neu">+ Position</button></div>' +
    '<div class="pos-liste" id="o-positionen">' + o.offert_positionen.map(positionHtml).join("") + "</div>";

  h += '<div class="summe-box" id="o-summe">' + summeHtml() + "</div>";
  h += '<label class="feld" style="margin-top:14px"><span>Bemerkung</span><textarea data-feld="bemerkung" placeholder="optional">' + esc(o.bemerkung || "") + "</textarea></label>";
  return h;
}

function analyseBlock() {
  const o = entwurf;
  if (o.datei_pfad) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Datei: ' + esc(o.datei_name || "") + "</b>" +
      '<div class="btn-reihe" style="margin-top:9px">' +
      '<button class="btn zweit klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(o.datei_pfad) + '">Datei öffnen</button>' +
      '<button class="btn zweit klein" type="button" data-aktion="o-analysieren">Offerte analysieren (Demo)</button>' +
      '<button class="btn still klein" type="button" data-aktion="o-datei-entfernen">Datei entfernen</button>' +
      "</div></div></div>";
  }
  if (dateiWartend) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Gewählte Datei: ' + esc(dateiWartend.name) + "</b>" +
      "Wird beim Speichern hochgeladen." +
      '<div class="btn-reihe" style="margin-top:9px">' +
      '<button class="btn zweit klein" type="button" data-aktion="o-analysieren">Erneut analysieren (Demo)</button>' +
      '<button class="btn still klein" type="button" data-aktion="o-datei-entfernen">Datei entfernen</button>' +
      "</div></div></div>";
  }
  return '<div class="datei-feld" style="margin-bottom:14px"><p>Offerte als PDF, JPG oder PNG hochladen</p>' +
    '<input type="file" id="o-datei" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png">' +
    '<div class="btn-reihe" style="margin-top:11px;justify-content:center">' +
    '<button class="btn klein" type="button" data-aktion="o-analysieren">Offerte analysieren</button></div>' +
    '<p style="margin:9px 0 0;font-size:.76rem">Die Analyse ist simuliert und liefert immer dieselben Demo-Werte.</p></div>';
}

function positionHtml(p, i) {
  return '<div class="pos-zeile" data-zeile="' + i + '"><div class="pos-grid">' +
    '<div class="pos-mini">' +
    '<label class="feld"><span>Nr.</span><input class="p-nr" data-pos="' + i + '" data-feld="nr" value="' + esc(p.nr) + '"></label>' +
    '<label class="feld" style="grid-column:span 2"><span>Beschreibung</span>' +
    '<input data-pos="' + i + '" data-feld="beschreibung" value="' + esc(p.beschreibung) + '" placeholder="Leistung"></label></div>' +
    '<label class="feld"><span>Menge</span><input inputmode="decimal" data-pos="' + i + '" data-feld="menge" value="' + esc(p.menge) + '"></label>' +
    '<label class="feld"><span>Einheit</span><input list="einheit-liste" data-pos="' + i + '" data-feld="einheit" value="' + esc(p.einheit) + '"></label>' +
    '<label class="feld"><span>Einzelpreis CHF</span><input inputmode="decimal" data-pos="' + i + '" data-feld="einzelpreis" value="' + esc(p.einzelpreis) + '"></label>' +
    '<label class="feld"><span>Entfernen</span><button class="btn gefahr klein" type="button" data-aktion="o-pos-weg" data-pos="' + i + '">✕</button></label></div>' +
    '<div class="pos-fuss"><span style="color:var(--grau)">Zeilentotal</span><b class="zahl" data-zeilen-total="' + i + '">' + chf(zahl(p.menge) * zahl(p.einzelpreis)) + "</b></div></div>";
}

function summeHtml() {
  const o = entwurf;
  const netto = entwurfNetto(), mwst = entwurfMwst();
  const ohneMwst = o.mwst_satz == null;
  return '<div class="check"><input type="checkbox" id="o-ohne-mwst"' + (ohneMwst ? " checked" : "") + '> <label for="o-ohne-mwst" style="margin:0">Ohne MWST führen</label></div>' +
    '<div class="summe-zeile"><span>Zwischentotal (netto)</span><b class="zahl" id="o-netto">' + chf(netto) + "</b></div>" +
    '<div class="summe-zeile"><span>MWST <input inputmode="decimal" data-feld="mwst_satz" value="' + (ohneMwst ? "" : esc(o.mwst_satz)) +
    '" ' + (ohneMwst ? "disabled" : "") + ' style="width:74px;display:inline-block;min-height:34px;padding:4px 7px;text-align:right"> %</span>' +
    '<b class="zahl" id="o-mwst">' + chf(mwst) + "</b></div>" +
    '<div class="summe-zeile total"><span>Total inkl. MWST</span><b class="zahl" id="o-total">' + chf(netto + mwst) + "</b></div>";
}

function neuZeichnenKoerper(Z) {
  const koerperEl = document.querySelector(".modal-koerper");
  if (koerperEl) koerperEl.innerHTML = koerper(Z);
}
function summeAktualisieren() {
  if (!entwurf) return;
  const netto = entwurfNetto(), mwst = entwurfMwst();
  const setze = (id, wert) => { const x = document.getElementById(id); if (x) x.textContent = wert; };
  setze("o-netto", chf(netto)); setze("o-mwst", chf(mwst)); setze("o-total", chf(netto + mwst));
  entwurf.offert_positionen.forEach((p, i) => {
    const ziel = document.querySelector('[data-zeilen-total="' + i + '"]');
    if (ziel) ziel.textContent = chf(zahl(p.menge) * zahl(p.einzelpreis));
  });
}

async function analysieren(Z) {
  const dateiFeld = document.getElementById("o-datei");
  if (dateiFeld && dateiFeld.files && dateiFeld.files[0]) dateiWartend = dateiFeld.files[0];
  if (!dateiWartend && !entwurf.datei_pfad) { meldung("Bitte zuerst eine Datei auswählen.", true); return; }

  const block = document.getElementById("o-analyse");
  const schritte = ANALYSE_SCHRITTE.offerte;
  block.innerHTML = '<div class="karte karte-pad lade" style="margin-bottom:14px"><div class="lade-ring"></div>' +
    "<b>Offerte wird analysiert …</b>" + ladeSchritte(schritte, 0) +
    '<p style="margin:12px 0 0;font-size:.76rem;color:var(--grau)">Simulierter Ablauf – es wird keine Datei ausgelesen und keine Schnittstelle aufgerufen.</p></div>';

  let ergebnis;
  try {
    ergebnis = await analysiereDokument(dateiWartend || { name: entwurf.datei_name }, "offerte", (i) => {
      const liste = block.querySelector(".lade-schritte");
      if (liste) liste.innerHTML = ladeSchritte(schritte, i + 1);
    });
  } catch (e) {
    meldung("Analyse abgebrochen: " + (e.message || e), true);
    return;
  }
  if (!document.querySelector(".modal")) return;   // Modal wurde zwischenzeitlich geschlossen
  entwurf.ki_erkannt = true;
  entwurf.lieferant = ergebnis.lieferant;
  entwurf.nummer = ergebnis.nummer;
  entwurf.datum = ergebnis.datum;
  entwurf.mwst_satz = ergebnis.mwstSatz;
  entwurf.status = entwurf.status === "Entwurf" ? "Erfasst" : entwurf.status;
  entwurf.offert_positionen = ergebnis.positionen;
  neuZeichnenKoerper(Z);
  meldung("Demo-Erkennung eingefügt – bitte prüfen und korrigieren.");
}

async function speichern(Z) {
  const o = entwurf;
  if (!o.lieferant.trim() && !o.nummer.trim()) { meldung("Bitte mindestens Lieferant oder Offertnummer angeben.", true); return false; }
  o.offert_positionen = o.offert_positionen.filter((p) => p.beschreibung.trim() || zahl(p.einzelpreis) !== 0);
  if (!o.offert_positionen.length) o.offert_positionen = [neuePosition()];

  const dateiFeld = document.getElementById("o-datei");
  if (!dateiWartend && dateiFeld && dateiFeld.files && dateiFeld.files[0]) dateiWartend = dateiFeld.files[0];

  try {
    if (dateiWartend) {
      const info = await hochladen(dateiWartend, Z.projektId, "offerten");
      o.datei_pfad = info.datei_pfad; o.datei_name = info.datei_name;
    }
    await offerteSpeichern(Z.projektId, { ...o, positionen: o.offert_positionen }, o.geaendert_am);
    meldung(o.id ? "Offerte aktualisiert." : "Offerte gespeichert.");
    dateiWartend = null;
    await neuLaden(["offerten"]);
    return true;
  } catch (err) { meldung(err.message, true); return false; }
}

export function eingabe(e, Z) {
  if (!document.querySelector(".modal") || !entwurf) return;
  const feld = e.target.closest("[data-feld]");
  if (!feld) return;
  const name = feld.dataset.feld;

  if (feld.dataset.pos !== undefined) {
    const p = entwurf.offert_positionen[+feld.dataset.pos];
    if (!p) return;
    p[name] = feld.value;
    summeAktualisieren();
    return;
  }
  if (name === "handwerker_id") { entwurf.handwerker_id = feld.value || null; return; }
  if (name === "budgetposition_id") { entwurf.budgetposition_id = feld.value || null; return; }
  entwurf[name] = feld.value;
  if (name === "mwst_satz") summeAktualisieren();
}

export function aenderung(e, Z) {
  if (e.target.id === "o-ohne-mwst" && entwurf) {
    entwurf.mwst_satz = e.target.checked ? null : 8.1;
    neuZeichnenKoerper(Z);
  }
}

export function aktion(a, knopf, Z) {
  if (a === "offerte-neu") return formular(Z, null);
  if (a === "offerte-bearbeiten") return formular(Z, Z.offerten.find((o) => o.id === knopf.dataset.id));
  if (a === "offerte-loeschen") {
    const o = Z.offerten.find((x) => x.id === knopf.dataset.id);
    if (o && bestaetigen("Offerte " + (o.nummer || o.lieferant || "") + " löschen?")) {
      (async () => {
        try {
          if (o.datei_pfad) await dateiLoeschen(o.datei_pfad);
          await offerteLoeschen(o.id);
          meldung("Offerte gelöscht.");
          await neuLaden(["offerten", "belege"]);
        } catch (err) { meldung(err.message, true); }
      })();
    }
    return;
  }
  if (a === "o-analysieren") return analysieren(Z);
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
    if (entwurf.datei_pfad) dateiLoeschen(entwurf.datei_pfad).catch(() => {});
    entwurf.datei_pfad = null; entwurf.datei_name = null; dateiWartend = null;
    document.getElementById("o-analyse").innerHTML = analyseBlock();
    return;
  }
  if (a === "datei-oeffnen") {
    signierterLink(knopf.dataset.pfad).then((url) => { if (url) window.open(url, "_blank"); }).catch((e) => meldung(e.message, true));
  }
}
