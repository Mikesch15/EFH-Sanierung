// Grundriss der drei Geschosse, massstäblich nach den Verkaufsunterlagen.
//
// Die Zeichnung steht fest. Ein erster Versuch liess die Räume mit den gemessenen
// Massen wachsen – das Ergebnis war unbrauchbar, weil man die Räume nicht mehr
// wiedererkannte. Ein Plan nützt nur, wenn er aussieht wie das Haus.
//
// Gemessene Werte erscheinen deshalb IM Raum (Breite × Länge und Fläche), der Raum
// wird grün, und je Geschoss steht die Abweichung zur Planfläche. Was sich ändert,
// ist die Beschriftung – nicht die Form.
import { esc, zahl } from "../format.js";
import { leerZustand } from "./gemeinsam.js";
import { kannBearbeiten } from "../app.js";
import { GESCHOSSE, PLAN_HINWEIS } from "../grundriss-vorlage.js";

const RAND = 14;              // Rand um die Zeichnung, in Bildpunkten
const PIXEL_JE_METER = 52;

export function istGemessen(r) { return !!(zahl(r.breite) && zahl(r.laenge)); }
function gemesseneFlaeche(r) { return zahl(r.breite) * zahl(r.laenge); }

/** Fläche, die für diesen Raum gilt: gemessen, sonst aus dem Verkaufsplan. */
function flaeche(r) {
  return istGemessen(r) ? gemesseneFlaeche(r) : zahl(r.flaeche_plan);
}

function geschossZeichnen(geschoss, raeume) {
  const b = geschoss.breite * PIXEL_JE_METER + RAND * 2;
  const h = geschoss.tiefe * PIXEL_JE_METER + RAND * 2 + 16;   // Platz für den Massstab
  const mx = (wert) => (RAND + wert * PIXEL_JE_METER).toFixed(1);

  let svg = '<svg class="plan" viewBox="0 0 ' + b.toFixed(0) + " " + h.toFixed(0) + '" ' +
    'role="img" aria-label="Grundriss ' + esc(geschoss.titel) + '">' +
    // Umriss des Geschosses
    '<rect class="plan-umriss" x="' + mx(0) + '" y="' + mx(0) + '" width="' +
    (geschoss.breite * PIXEL_JE_METER).toFixed(1) + '" height="' +
    (geschoss.tiefe * PIXEL_JE_METER).toFixed(1) + '"></rect>';

  geschoss.raeume.forEach((vorlage) => {
    const r = raeume.find((x) => x.name === vorlage.name) || { name: vorlage.name, flaeche_plan: vorlage.flaeche };
    const gemessen = istGemessen(r);
    const bx = vorlage.b * PIXEL_JE_METER, by = vorlage.t * PIXEL_JE_METER;
    const mitte = { x: RAND + (vorlage.x + vorlage.b / 2) * PIXEL_JE_METER,
                    y: RAND + (vorlage.y + vorlage.t / 2) * PIXEL_JE_METER };

    svg += '<g class="plan-raum' + (gemessen ? " gemessen" : "") + '"' +
      (r.id ? ' data-aktion="plan-raum" data-id="' + r.id + '" tabindex="0" role="button"' : "") +
      ' aria-label="' + esc(vorlage.name) + '">' +
      '<rect x="' + mx(vorlage.x) + '" y="' + mx(vorlage.y) + '" width="' + bx.toFixed(1) +
      '" height="' + by.toFixed(1) + '" rx="1"></rect>';

    // Beschriftung nur, wo sie hineinpasst. Enge Räume (Bad, Gang, Treppe)
    // bekommen nur die Fläche; der Name steht in der Liste unter dem Plan.
    const platzFuerNamen = bx > 62 && by > 34;
    const zeilen = [];
    if (platzFuerNamen) zeilen.push({ text: kurz(vorlage.name, Math.floor(bx / 5.6)), klasse: "plan-name" });
    zeilen.push({ text: flaeche(r).toFixed(2) + " m²", klasse: "plan-mass" });
    if (gemessen && by > 58) {
      zeilen.push({ text: zahl(r.breite).toFixed(2) + " × " + zahl(r.laenge).toFixed(2) + " m", klasse: "plan-mass" });
    }
    const start = mitte.y - ((zeilen.length - 1) * 12) / 2 + 4;
    zeilen.forEach((z, i) => {
      svg += '<text class="' + z.klasse + '" x="' + mitte.x.toFixed(1) + '" y="' + (start + i * 12).toFixed(1) +
        '">' + esc(z.text) + "</text>";
    });
    svg += "</g>";
  });

  // Massstabsbalken: ohne ihn ist eine massstäbliche Zeichnung nur ein Bild.
  const strich = 2 * PIXEL_JE_METER;
  svg += '<g class="plan-massstab"><line x1="' + RAND + '" y1="' + (h - 6) + '" x2="' + (RAND + strich) +
    '" y2="' + (h - 6) + '"></line><text x="' + (RAND + strich / 2) + '" y="' + (h - 10) + '">2 m</text></g>';
  return svg + "</svg>";
}

function kurz(text, zeichen) {
  return text.length > zeichen ? text.slice(0, Math.max(3, zeichen - 1)) + "…" : text;
}

export function grundrissAbschnitt(Z) {
  const raeume = Z.raeume || [];
  const imPlan = raeume.filter((r) => r.plan_x !== null && r.plan_x !== undefined);
  const bearbeitbar = kannBearbeiten();

  let h = '<section class="abschnitt" id="abschnitt-grundriss"><div class="abschnitt-kopf"><div><h2>Grundriss</h2>' +
    "<p>" + (imPlan.length
      ? imPlan.filter(istGemessen).length + " von " + imPlan.length + " Räumen gemessen"
      : "Die drei Geschosse aus den Verkaufsunterlagen") + "</p></div></div>";

  if (!imPlan.length) {
    h += leerZustand("Noch kein Grundriss",
      "Unter-, Erd- und Obergeschoss massstäblich nach den Verkaufsunterlagen. Beim Besuch " +
      "tippen Sie den Raum im Plan an und tragen die Lasermasse ein – der Raum wird grün, " +
      "und je Geschoss steht die Abweichung zur Planfläche.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="plan-vorlage">Grundriss aus Unterlagen anlegen</button>' : "");
    return h + "</section>";
  }

  GESCHOSSE.forEach((geschoss) => {
    const eigene = geschoss.raeume
      .map((v) => raeume.find((r) => r.name === v.name && r.geschoss === geschoss.name))
      .filter(Boolean);
    if (!eigene.length) return;
    const gemessen = eigene.filter(istGemessen);
    const istFlaeche = eigene.reduce((s, r) => s + flaeche(r), 0);
    const planFlaeche = geschoss.raeume.reduce((s, v) => s + v.flaeche, 0);
    const abweichung = istFlaeche - planFlaeche;

    h += '<div class="karte abschnitt" style="margin-bottom:12px">' +
      '<div class="karte-pad" style="padding-bottom:4px"><div class="abschnitt-kopf" style="margin:0">' +
      "<div><h3>" + esc(geschoss.titel) + "</h3><p>" +
      gemessen.length + " von " + eigene.length + " gemessen · " + istFlaeche.toFixed(2) + " m²" +
      " (Plan " + planFlaeche.toFixed(2) + " m²" +
      (gemessen.length && Math.abs(abweichung) >= 0.05
        ? ", " + (abweichung > 0 ? "+" : "−") + Math.abs(abweichung).toFixed(2)
        : "") + ")</p></div></div></div>" +
      '<div class="plan-huelle">' + geschossZeichnen(geschoss, eigene) + "</div>" +
      '<div class="karte-pad" style="border-top:1px solid var(--linie);padding-top:10px">' +
      '<div class="plan-liste">' +
      eigene.map((r) =>
        '<button class="plan-chip' + (istGemessen(r) ? " gemessen" : "") + '" type="button" ' +
        'data-aktion="plan-raum" data-id="' + r.id + '">' + esc(r.name) +
        "<span>" + (istGemessen(r)
          ? zahl(r.breite).toFixed(2) + " × " + zahl(r.laenge).toFixed(2) + " m"
          : "messen") + "</span></button>"
      ).join("") +
      "</div></div></div>";
  });

  h += '<div class="karte karte-pad" style="font-size:.8rem;color:var(--grau)">' + esc(PLAN_HINWEIS) + "</div>";
  return h + "</section>";
}
