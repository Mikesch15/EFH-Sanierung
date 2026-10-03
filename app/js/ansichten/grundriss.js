// Schema-Grundriss: die drei Geschosse als massstäbliche Skizze.
//
// Der Plan zeichnet jeden Raum mit seinen GEMESSENEN Massen, solange welche da
// sind, sonst mit den Sollmassen aus den Verkaufsunterlagen. Beim Vermessen wächst
// die Skizze dadurch in die tatsächliche Form – und Abweichungen zum Verkaufsplan
// werden sichtbar, statt unbemerkt zu bleiben.
//
// Warum Bänder statt echter Geometrie: Ein Architektenplan müsste Wände, Ecken und
// Versätze kennen; schon eine einzige abweichende Messung bringt ihn zum Kippen.
// Waagrechte Bänder gehen immer sauber auf, bleiben massstäblich und lassen sich
// mit dem Daumen bedienen. Das ist ehrlicher als eine Zeichnung, die Genauigkeit
// vortäuscht, die sie nicht hat.
import { esc, zahl } from "../format.js";
import { leerZustand } from "./gemeinsam.js";
import { kannBearbeiten } from "../app.js";
import { GESCHOSSE, PLAN_HINWEIS } from "../grundriss-vorlage.js";

const RAND = 10;          // Zeichnungsrand in Bildpunkten
const WAND = 3;           // Strichstärke der Wände
const PIXEL_JE_METER = 46;

/** Gemessene Masse haben Vorrang, sonst die Angaben aus dem Verkaufsplan. */
export function raumBreite(r) { return zahl(r.breite) || zahl(r.soll_breite) || 0; }
export function raumTiefe(r) { return zahl(r.laenge) || zahl(r.soll_tiefe) || 0; }
export function istGemessen(r) { return !!(zahl(r.breite) && zahl(r.laenge)); }

function flaeche(r) { return raumBreite(r) * raumTiefe(r); }

/** Räume eines Geschosses, nach Band und Platz im Band geordnet. */
function baenderVon(raeume, geschoss) {
  const eigene = raeume.filter((r) => r.geschoss === geschoss && r.plan_band);
  const baender = [];
  eigene.forEach((r) => {
    const nr = r.plan_band;
    let band = baender.find((b) => b.nr === nr);
    if (!band) { band = { nr, raeume: [] }; baender.push(band); }
    band.raeume.push(r);
  });
  baender.sort((a, b) => a.nr - b.nr);
  baender.forEach((b) => b.raeume.sort((x, y) => (x.plan_sort || 0) - (y.plan_sort || 0)));
  return baender;
}

function geschossZeichnen(geschoss, baender) {
  const breiteM = Math.max(...baender.map((b) => b.raeume.reduce((s, r) => s + raumBreite(r), 0)), 1);
  const hoeheM = baender.reduce((s, b) => s + Math.max(...b.raeume.map(raumTiefe), 0.5), 0);
  const b = breiteM * PIXEL_JE_METER + RAND * 2;
  const h = hoeheM * PIXEL_JE_METER + RAND * 2;

  let svg = '<svg class="plan" viewBox="0 0 ' + b.toFixed(0) + " " + h.toFixed(0) + '" ' +
    'role="img" aria-label="Schema-Grundriss ' + esc(geschoss.titel) + '">';
  let y = RAND;
  baender.forEach((band) => {
    const bandTiefe = Math.max(...band.raeume.map(raumTiefe), 0.5);
    let x = RAND;
    band.raeume.forEach((r) => {
      const rb = raumBreite(r) * PIXEL_JE_METER;
      const rh = raumTiefe(r) * PIXEL_JE_METER;
      const gemessen = istGemessen(r);
      svg += '<g class="plan-raum' + (gemessen ? " gemessen" : "") + '" data-aktion="plan-raum" data-id="' + r.id + '"' +
        ' tabindex="0" role="button" aria-label="' + esc(r.name) + " bearbeiten\">" +
        '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + rb.toFixed(1) +
        '" height="' + rh.toFixed(1) + '" rx="2"></rect>';
      // Beschriftung nur, wenn sie auch hineinpasst – sonst bleibt der Raum leer
      // und der Name steht in der Liste darunter.
      if (rb > 54 && rh > 30) {
        const mx = x + rb / 2, my = y + rh / 2;
        svg += '<text class="plan-name" x="' + mx.toFixed(1) + '" y="' + (my - 3).toFixed(1) + '">' +
          esc(kurz(r.name, Math.floor(rb / 6))) + "</text>" +
          '<text class="plan-mass" x="' + mx.toFixed(1) + '" y="' + (my + 11).toFixed(1) + '">' +
          flaeche(r).toFixed(2) + " m²</text>";
        if (rh > 54) {
          svg += '<text class="plan-mass" x="' + mx.toFixed(1) + '" y="' + (my + 24).toFixed(1) + '">' +
            raumBreite(r).toFixed(2) + " × " + raumTiefe(r).toFixed(2) + "</text>";
        }
      }
      svg += "</g>";
      x += rb;
    });
    y += bandTiefe * PIXEL_JE_METER;
  });
  // Massstab: ohne ihn ist eine massstäbliche Zeichnung nur ein Bild.
  const strich = 2 * PIXEL_JE_METER;
  svg += '<g class="plan-massstab"><line x1="' + RAND + '" y1="' + (h - 4) + '" x2="' + (RAND + strich) +
    '" y2="' + (h - 4) + '"></line><text x="' + (RAND + strich / 2) + '" y="' + (h - 8) + '">2 m</text></g>';
  return svg + "</svg>";
}

function kurz(text, zeichen) {
  return text.length > zeichen ? text.slice(0, Math.max(3, zeichen - 1)) + "…" : text;
}

export function grundrissAbschnitt(Z) {
  const raeume = Z.raeume || [];
  const imPlan = raeume.filter((r) => r.plan_band);
  const bearbeitbar = kannBearbeiten();

  let h = '<section class="abschnitt" id="abschnitt-grundriss"><div class="abschnitt-kopf"><div><h2>Grundriss</h2>' +
    "<p>" + (imPlan.length
      ? imPlan.filter(istGemessen).length + " von " + imPlan.length + " Räumen gemessen"
      : "Schema aus den Verkaufsunterlagen") + "</p></div></div>";

  if (!imPlan.length) {
    h += leerZustand("Noch kein Grundriss",
      "Die drei Geschosse aus den Verkaufsunterlagen (Unter-, Erd- und Obergeschoss) als " +
      "massstäbliche Skizze. Beim Vermessen tragen Sie die Lasermasse direkt im Plan ein, " +
      "und die Skizze nimmt die gemessene Form an.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="plan-vorlage">Grundriss aus Unterlagen anlegen</button>' : "");
    return h + "</section>";
  }

  GESCHOSSE.forEach((geschoss) => {
    const baender = baenderVon(raeume, geschoss.name);
    if (!baender.length) return;
    const alle = baender.flatMap((b) => b.raeume);
    const gemessen = alle.filter(istGemessen);
    const istFlaeche = alle.reduce((s, r) => s + flaeche(r), 0);
    const planFlaeche = alle.reduce((s, r) => s + zahl(r.flaeche_plan), 0);
    const abweichung = planFlaeche ? istFlaeche - planFlaeche : 0;

    h += '<div class="karte abschnitt" style="margin-bottom:12px">' +
      '<div class="karte-pad" style="padding-bottom:6px"><div class="abschnitt-kopf" style="margin:0">' +
      "<div><h3>" + esc(geschoss.titel) + "</h3><p>" +
      gemessen.length + " von " + alle.length + " gemessen · " + istFlaeche.toFixed(2) + " m²" +
      (planFlaeche
        ? " (Plan " + planFlaeche.toFixed(2) + " m²" +
          (gemessen.length && Math.abs(abweichung) >= 0.05
            ? ", " + (abweichung > 0 ? "+" : "−") + Math.abs(abweichung).toFixed(2) + " m²"
            : "") + ")"
        : "") +
      "</p></div></div></div>" +
      '<div class="plan-huelle">' + geschossZeichnen(geschoss, baender) + "</div>" +
      '<div class="karte-pad" style="border-top:1px solid var(--linie);padding-top:10px">' +
      '<div class="plan-liste">' +
      alle.map((r) =>
        '<button class="plan-chip' + (istGemessen(r) ? " gemessen" : "") + '" type="button" ' +
        'data-aktion="plan-raum" data-id="' + r.id + '">' + esc(r.name) +
        '<span>' + (istGemessen(r)
          ? raumBreite(r).toFixed(2) + " × " + raumTiefe(r).toFixed(2) + " m"
          : "messen") + "</span></button>"
      ).join("") +
      "</div></div></div>";
  });

  h += '<div class="karte karte-pad" style="font-size:.8rem;color:var(--grau)">' + esc(PLAN_HINWEIS) + "</div>";
  return h + "</section>";
}
