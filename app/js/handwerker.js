// Eigene, eng begrenzte Ansicht für Handwerker: nur die eine Offerte, die
// ihnen zugewiesen wurde (RLS: offerten.handwerker_id = auth.uid()).
// Sie sehen weder Projekt, Budget, Belege noch andere Offerten.
import { aktuelleSitzung, aufAuthAchten, anmelden, abmelden, supabase } from "./supabase.js";
import { esc, chf, zahl, heuteISO, meldung } from "./format.js";
import { eigeneHandwerkerOfferte, offerteSpeichern } from "./daten.js";
import { hochladen, signierterLink } from "./dateien.js";
import { EINHEITEN } from "./konfig.js";

const el = (id) => document.getElementById(id);
const offerteId = new URLSearchParams(location.search).get("offerte");

let sitzung = null;
let offerte = null;
let dateiWartend = null;

function neuePosition() { return { nr: "", beschreibung: "", menge: 1, einheit: "pauschal", einzelpreis: 0 }; }
function netto() { return (offerte.offert_positionen || []).reduce((s, p) => s + zahl(p.menge) * zahl(p.einzelpreis), 0); }
function mwst() { return offerte.mwst_satz == null ? 0 : netto() * (zahl(offerte.mwst_satz) / 100); }

function zeichnen() {
  if (!sitzung) {
    el("app").innerHTML =
      '<div class="anmelde-buehne"><div class="karte karte-pad anmelde-karte">' +
      '<div class="anmelde-kopf"><b>Anmelden</b><span>Zugang für Handwerker</span></div>' +
      '<label class="feld"><span>E-Mail</span><input type="email" id="h-email" autocomplete="email"></label>' +
      '<label class="feld"><span>Passwort</span><input type="password" id="h-passwort" autocomplete="current-password"></label>' +
      '<button class="btn breit" type="button" data-aktion="anmelden">Anmelden</button></div></div>';
    return;
  }
  if (!offerteId) {
    el("app").innerHTML = '<main><div class="karte karte-pad" style="margin:20px auto;max-width:520px">' +
      '<div class="hinweis warn"><div><b>Kein Offert-Link</b>Bitte den Link verwenden, den Sie von der Bauherrschaft erhalten haben ' +
      "(er endet mit <code>?offerte=…</code>).</div></div></div></main>";
    return;
  }
  if (!offerte) {
    el("app").innerHTML = '<main><div class="karte karte-pad" style="margin:20px auto;max-width:520px">' +
      '<div class="leer">Offerte wird geladen …</div></div></main>';
    return;
  }

  const n = netto(), m = mwst();
  el("app").innerHTML = '<main><div style="max-width:720px;margin:0 auto">' +
    '<section class="abschnitt"><div class="karte karte-pad">' +
    '<div class="hinweis info" style="margin-bottom:14px"><div><b>Ihre Offerte</b>' +
    "Sie sehen und bearbeiten ausschliesslich diese eine Offerte.</div></div>" +
    '<div class="feld-paar">' +
    '<label class="feld"><span>Ihre Firma</span><input data-feld="lieferant" value="' + esc(offerte.lieferant || "") + '"></label>' +
    '<label class="feld"><span>Offertnummer</span><input data-feld="nummer" value="' + esc(offerte.nummer || "") + '"></label></div>' +
    '<div class="feld-paar">' +
    '<label class="feld"><span>Datum</span><input type="date" data-feld="datum" value="' + esc(offerte.datum || heuteISO()) + '"></label>' +
    '<label class="feld"><span>MWST-Satz %</span><input inputmode="decimal" data-feld="mwst_satz" value="' + (offerte.mwst_satz == null ? "" : esc(offerte.mwst_satz)) + '" placeholder="8.1 – leer = ohne MWST"></label></div>' +
    '<label class="feld"><span>Bemerkung</span><textarea data-feld="bemerkung">' + esc(offerte.bemerkung || "") + "</textarea></label>" +
    "</div></section>" +

    '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Positionen</h2></div>' +
    '<button class="btn zweit klein" type="button" data-aktion="pos-neu">+ Position</button></div>' +
    '<div class="karte karte-pad"><div class="pos-liste" id="positionen">' +
    (offerte.offert_positionen || []).map(positionHtml).join("") + "</div>" +
    '<div class="summe-box">' +
    '<div class="summe-zeile"><span>Zwischentotal (netto)</span><b class="zahl">' + chf(n) + "</b></div>" +
    '<div class="summe-zeile"><span>MWST</span><b class="zahl">' + chf(m) + "</b></div>" +
    '<div class="summe-zeile total"><span>Total</span><b class="zahl">' + chf(n + m) + "</b></div></div></div></section>" +

    '<section class="abschnitt"><div class="karte karte-pad"><h3>Offerte als Datei</h3>' +
    (offerte.datei_pfad
      ? '<p style="font-size:.85rem">Hinterlegt: ' + esc(offerte.datei_name || "") + ' <button class="btn zweit klein" type="button" data-aktion="datei-oeffnen">Öffnen</button></p>'
      : '<p style="font-size:.85rem;color:var(--grau)">Noch keine Datei hinterlegt.</p>') +
    '<div class="datei-feld" style="margin-top:10px"><p>PDF, JPG oder PNG (max. 25 MB)</p>' +
    '<input type="file" id="h-datei" accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"></div></div></section>' +

    '<div class="btn-reihe" style="margin-bottom:30px"><button class="btn breit" type="button" data-aktion="speichern">Offerte speichern</button></div>' +
    "</div></main>" +
    '<datalist id="einheit-liste">' + EINHEITEN.map((e) => '<option value="' + e + '">').join("") + "</datalist>";
}

function positionHtml(p, i) {
  return '<div class="pos-zeile"><div class="pos-grid"><div class="pos-mini">' +
    '<label class="feld"><span>Nr.</span><input class="p-nr" data-pos="' + i + '" data-feld="nr" value="' + esc(p.nr || "") + '"></label>' +
    '<label class="feld" style="grid-column:span 2"><span>Beschreibung</span>' +
    '<input data-pos="' + i + '" data-feld="beschreibung" value="' + esc(p.beschreibung || "") + '"></label></div>' +
    '<label class="feld"><span>Menge</span><input inputmode="decimal" data-pos="' + i + '" data-feld="menge" value="' + esc(p.menge) + '"></label>' +
    '<label class="feld"><span>Einheit</span><input list="einheit-liste" data-pos="' + i + '" data-feld="einheit" value="' + esc(p.einheit || "") + '"></label>' +
    '<label class="feld"><span>Einzelpreis CHF</span><input inputmode="decimal" data-pos="' + i + '" data-feld="einzelpreis" value="' + esc(p.einzelpreis) + '"></label>' +
    '<label class="feld"><span>Entfernen</span><button class="btn gefahr klein" type="button" data-aktion="pos-weg" data-pos="' + i + '">✕</button></label>' +
    '</div><div class="pos-fuss"><span style="color:var(--grau)">Zeilentotal</span>' +
    '<b class="zahl">' + chf(zahl(p.menge) * zahl(p.einzelpreis)) + "</b></div></div>";
}

async function offerteLaden() {
  try {
    offerte = await eigeneHandwerkerOfferte(offerteId);
    if (!offerte.offert_positionen || !offerte.offert_positionen.length) offerte.offert_positionen = [neuePosition()];
  } catch (e) {
    offerte = null;
    el("app").innerHTML = '<main><div class="karte karte-pad" style="margin:20px auto;max-width:520px">' +
      '<div class="hinweis fehler"><div><b>Offerte nicht zugänglich</b>' +
      "Diese Offerte ist Ihrem Konto nicht zugewiesen, oder der Link ist falsch.</div></div></div></main>";
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
      positionen: offerte.offert_positionen.filter((p) => (p.beschreibung || "").trim() || zahl(p.einzelpreis) !== 0),
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
    try { await anmelden(el("h-email").value.trim(), el("h-passwort").value); }
    catch (err) {
      meldung(/abort|timeout/i.test(err.message)
        ? "Der Server hat nicht geantwortet (Zeitüberschreitung)."
        : /Invalid login/i.test(err.message) ? "E-Mail oder Passwort ist falsch." : err.message, true);
    }
    return;
  }
  if (a === "abmelden") return abmelden();
  if (a === "speichern") return speichern(knopf);
  if (a === "pos-neu") { offerte.offert_positionen.push(neuePosition()); zeichnen(); return; }
  if (a === "pos-weg") {
    offerte.offert_positionen.splice(+knopf.dataset.pos, 1);
    if (!offerte.offert_positionen.length) offerte.offert_positionen.push(neuePosition());
    zeichnen();
    return;
  }
  if (a === "datei-oeffnen") {
    try { const url = await signierterLink(offerte.datei_pfad); if (url) window.open(url, "_blank"); }
    catch (err) { meldung(err.message, true); }
  }
});

document.addEventListener("input", (e) => {
  const feld = e.target.closest("[data-feld]");
  if (!feld || !offerte) return;
  if (feld.dataset.pos !== undefined) {
    const p = offerte.offert_positionen[+feld.dataset.pos];
    if (p) p[feld.dataset.feld] = feld.value;
    return;
  }
  offerte[feld.dataset.feld] = feld.value;
});

aufAuthAchten(async (ereignis, neueSitzung) => {
  sitzung = neueSitzung;
  if (!sitzung) { offerte = null; zeichnen(); return; }
  zeichnen();
  if (offerteId) await offerteLaden();
});

(async function start() {
  sitzung = await aktuelleSitzung();
  zeichnen();
  if (sitzung && offerteId) await offerteLaden();
})();
