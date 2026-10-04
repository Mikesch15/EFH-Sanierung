// Grundrisse: der Originalplan als Bild, mit Messpunkten darauf.
//
// Zwei Versuche, den Plan nachzuzeichnen, waren unbrauchbar – erst mitwachsende
// Bänder, dann feste Rechtecke. Beide scheitern am selben Punkt: Echte Räume sind
// nicht rechtwinklig. Schräge Wände, Versätze und Erker lassen sich mit Rechtecken
// nicht abbilden, und in einem Plan, in dem man die Räume nicht wiedererkennt,
// will niemand messen.
//
// Jetzt andersherum: Der Plan wird als Bild hochgeladen und unverändert gezeigt.
// Ein Tipp auf den Raum setzt einen Messpunkt, dort stehen danach die Masse. Der
// Plan sieht aus wie der Plan, weil er der Plan ist.
import { esc, zahl } from "../format.js";
import { leerZustand } from "./gemeinsam.js";
import { istAnzeigbar, bildMarkierung, nachladenBald } from "../vorschau.js";
import { kannBearbeiten } from "../app.js";

// Wartet auf den Tipp, der den nächsten Messpunkt setzt (plan-Id oder null).
let setzenAuf = null;

export function setzModus() { return setzenAuf; }
export function setzModusSetzen(planId) { setzenAuf = planId; }

export function istGemessen(r) { return zahl(r.flaeche) > 0; }
function flaeche(r) { return zahl(r.flaeche); }

/** Kurzform für die Marke: Name, dazu die Fläche, sobald gemessen. */
function markenText(r) {
  const name = r.name || "?";
  return istGemessen(r) ? name + " · " + flaeche(r).toFixed(2) + " m²" : name;
}

function planZeichnen(plan, raeume, bearbeitbar) {
  const marken = raeume.filter((r) => r.plan_id === plan.id && r.marke_x !== null && r.marke_x !== undefined);
  const setzt = setzenAuf === plan.id;

  let h = '<div class="plan-bild' + (setzt ? " setzt" : "") + '"' +
    (setzt ? ' data-aktion="plan-tippen" data-plan="' + plan.id + '"' : "") + ">";
  h += istAnzeigbar(null, plan.datei_name || plan.datei_pfad)
    ? bildMarkierung(plan.datei_pfad, plan.titel || plan.datei_name)
    : '<div class="foto-ersatz" style="height:160px">Dieses Format lässt sich nicht anzeigen – ' +
      "bitte als JPG oder PNG hochladen.</div>";

  marken.forEach((r, i) => {
    h += '<button class="plan-marke' + (istGemessen(r) ? " gemessen" : "") + '" type="button"' +
      ' data-aktion="plan-marke" data-id="' + r.id + '"' +
      ' style="left:' + (zahl(r.marke_x) * 100).toFixed(2) + "%;top:" + (zahl(r.marke_y) * 100).toFixed(2) + '%"' +
      ' title="' + esc(r.name) + '">' +
      '<span class="nr">' + (i + 1) + "</span>" +
      '<span class="wert">' + esc(markenText(r)) + "</span></button>";
  });
  h += "</div>";

  if (setzt) {
    h += '<div class="hinweis warn" style="margin:0 14px 12px"><div>' +
      "<b>Messpunkt setzen</b>Tippen Sie im Plan auf den Raum. Danach öffnet sich das Formular " +
      "für Namen und Masse." +
      '<div class="btn-reihe" style="margin-top:9px">' +
      '<button class="btn still klein" type="button" data-aktion="plan-setzen-aus">Abbrechen</button>' +
      "</div></div></div>";
  } else if (bearbeitbar) {
    h += '<div class="karte-pad" style="padding-top:0"><div class="btn-reihe">' +
      '<button class="btn zweit klein" type="button" data-aktion="plan-setzen" data-plan="' + plan.id + '">+ Messpunkt</button>' +
      '<button class="btn still klein" type="button" data-aktion="plan-umbenennen" data-id="' + plan.id + '">Umbenennen</button>' +
      '<button class="btn still klein" type="button" data-aktion="plan-loeschen" data-id="' + plan.id + '">Plan entfernen</button>' +
      "</div></div>";
  }
  return { html: h, marken };
}

export function grundrissAbschnitt(Z) {
  const plaene = Z.plaene || [];
  const raeume = Z.raeume || [];
  const bearbeitbar = kannBearbeiten();
  const mitMarke = raeume.filter((r) => r.plan_id && r.marke_x !== null && r.marke_x !== undefined);

  let h = '<section class="abschnitt" id="abschnitt-grundriss"><div class="abschnitt-kopf"><div><h2>Grundrisse</h2>' +
    "<p>" + (plaene.length
      ? plaene.length + (plaene.length === 1 ? " Plan · " : " Pläne · ") +
        mitMarke.filter(istGemessen).length + " von " + mitMarke.length + " Messpunkten erfasst"
      : "Originalplan hochladen und darauf messen") + "</p></div>" +
    (bearbeitbar && plaene.length
      ? '<button class="btn klein" type="button" data-aktion="plan-neu">+ Plan</button>'
      : "") + "</div>";

  if (!plaene.length) {
    h += leerZustand("Noch kein Grundriss",
      "Laden Sie die Geschosspläne als Bild hoch – Foto, Screenshot oder Ausschnitt aus den " +
      "Verkaufsunterlagen. Der Plan wird unverändert angezeigt; beim Besuch tippen Sie auf " +
      "einen Raum, setzen einen Messpunkt und tragen die Lasermasse ein.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="plan-neu">Plan hochladen</button>' : "");
    return h + "</section>";
  }

  plaene.forEach((plan) => {
    const { html, marken } = planZeichnen(plan, raeume, bearbeitbar);
    const gemessen = marken.filter(istGemessen);
    const summe = gemessen.reduce((s, r) => s + flaeche(r), 0);

    h += '<div class="karte abschnitt" style="margin-bottom:12px">' +
      '<div class="karte-pad" style="padding-bottom:8px"><div class="abschnitt-kopf" style="margin:0">' +
      "<div><h3>" + esc(plan.titel || plan.datei_name || "Plan") + "</h3><p>" +
      (marken.length
        ? gemessen.length + " von " + marken.length + " gemessen" + (summe ? " · " + summe.toFixed(2) + " m²" : "")
        : "noch keine Messpunkte") + "</p></div></div></div>" +
      html;

    if (marken.length) {
      h += '<div class="karte-pad" style="border-top:1px solid var(--linie);padding-top:10px">' +
        '<div class="plan-liste">' +
        marken.map((r, i) =>
          '<button class="plan-chip' + (istGemessen(r) ? " gemessen" : "") + '" type="button" ' +
          'data-aktion="plan-marke" data-id="' + r.id + '"><b>' + (i + 1) + "</b> " + esc(r.name) +
          "<span>" + (istGemessen(r)
            ? zahl(r.breite).toFixed(2) + " × " + zahl(r.laenge).toFixed(2) + " m"
            : "messen") + "</span></button>"
        ).join("") +
        "</div></div>";
    }
    h += "</div>";
  });

  h += '<div class="karte karte-pad" style="font-size:.8rem;color:var(--grau)">' +
    "Die Pläne werden so angezeigt, wie sie hochgeladen wurden – nichts wird nachgezeichnet. " +
    "Ein Messpunkt gehört zu einem Raum im Messblatt: Was Sie hier eintragen, steht auch dort, " +
    "und umgekehrt.</div>";
  nachladenBald();
  return h + "</section>";
}
