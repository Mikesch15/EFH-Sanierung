// Grundrisse: der Originalplan als Bild – und die App erkennt die Wände darin.
//
// Der Weg dahin war lang: erst mitwachsende Bänder, dann feste Rechtecke, dann
// von Hand eingetippte Wandlängen. Alle drei waren Handarbeit oder sahen dem
// Haus nicht ähnlich. Jetzt macht es die App: Sie liest die dunklen Linien im
// Planbild als Wände, und ein Tipp in einen Raum füllt ihn bis an seine Wände
// aus – egal ob rechteckig, L-förmig oder schräg.
//
// Gemessen wird mit dem Laser genau eine Wand je Plan. Daraus kennt die App den
// Massstab, und alle übrigen Räume sind gerechnet. Jede weitere Messung ist
// Kontrolle: Plan und Laser stehen nebeneinander.
import { esc, zahl } from "../format.js";
import { leerZustand } from "./gemeinsam.js";
import { istAnzeigbar, bildMarkierung, nachladenBald } from "../vorschau.js";
import { kannBearbeiten } from "../app.js";

// Was der nächste Tipp auf den Plan bedeutet: { art: "raum" | "massstab", planId }
let modus = null;
// Zuletzt gemessene Wand (relativ), damit man sieht, was ausgemessen wurde.
let letzteWand = null;

export function planModus() { return modus; }
export function planModusSetzen(art, planId) {
  modus = art ? { art, planId } : null;
  if (!art) letzteWand = null;
}
export function wandZeigen(strecke) { letzteWand = strecke; }

export function istGemessen(r) { return zahl(r.flaeche) > 0; }
export function hatMassstab(plan) { return Number(plan.px_pro_meter) > 0; }

function flaeche(r) { return zahl(r.flaeche); }

/**
 * Kurzform für die Marke. Auf dem Plan steht die Fläche, der Name steht in der
 * Liste darunter – sonst verdecken die Marken genau das, was man sehen will.
 */
function markenText(r) {
  return istGemessen(r) ? flaeche(r).toFixed(2) + " m²" : (r.name || "?");
}

/** Die erkannten Umrisse als Überzug über dem Bild. */
function ueberzug(plan, raeume) {
  let h = '<svg class="plan-ueberzug" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">';
  raeume.forEach((r) => {
    const p = r.umriss || [];
    if (p.length < 3) return;
    h += '<polygon class="raum-flaeche' + (istGemessen(r) ? " gemessen" : "") + '" points="' +
      p.map((q) => q[0].toFixed(5) + "," + q[1].toFixed(5)).join(" ") + '"/>';
  });
  if (letzteWand && letzteWand.length === 2) {
    h += '<line class="wand-mass" x1="' + letzteWand[0][0].toFixed(5) + '" y1="' + letzteWand[0][1].toFixed(5) +
      '" x2="' + letzteWand[1][0].toFixed(5) + '" y2="' + letzteWand[1][1].toFixed(5) + '"/>';
  }
  return h + "</svg>";
}

function planZeichnen(plan, raeume) {
  const marken = raeume.filter((r) => r.marke_x !== null && r.marke_x !== undefined);
  const aktiv = modus && modus.planId === plan.id;

  let h = '<div class="plan-bild' + (aktiv ? " zeigt-finger" : "") + '"' +
    ' data-aktion="plan-tippen" data-plan="' + plan.id + '">';
  h += istAnzeigbar(null, plan.datei_name || plan.datei_pfad)
    ? bildMarkierung(plan.datei_pfad, plan.titel || plan.datei_name, true)
    : '<div class="foto-ersatz" style="height:160px">Dieses Format lässt sich nicht anzeigen – ' +
      "bitte als JPG oder PNG hochladen.</div>";
  h += ueberzug(plan, raeume);

  marken.forEach((r, i) => {
    h += '<span class="plan-marke' + (istGemessen(r) ? " gemessen" : "") + '"' +
      ' style="left:' + (zahl(r.marke_x) * 100).toFixed(2) + "%;top:" + (zahl(r.marke_y) * 100).toFixed(2) + '%">' +
      '<span class="nr">' + (i + 1) + "</span>" +
      '<span class="wert">' + esc(markenText(r)) + "</span></span>";
  });
  h += "</div>";
  return h;
}

function anleitung(plan) {
  if (!modus || modus.planId !== plan.id) return "";
  const text = modus.art === "massstab"
    ? "<b>Massstab setzen</b>Tippen Sie auf eine Wand, deren Länge Sie mit dem Laser gemessen " +
      "haben – am besten eine lange Aussenwand. Danach geben Sie das Mass ein."
    : "<b>Raum ausmessen</b>Tippen Sie mitten in den Raum. Die App füllt ihn bis an seine Wände " +
      "aus und rechnet Fläche und Wandlängen.";
  return '<div class="hinweis warn" style="margin:0 14px 12px"><div>' + text +
    '<div class="btn-reihe" style="margin-top:9px">' +
    '<button class="btn still klein" type="button" data-aktion="plan-modus-aus">Abbrechen</button>' +
    "</div></div></div>";
}

function werkzeuge(plan, bearbeitbar) {
  if (!bearbeitbar || (modus && modus.planId === plan.id)) return "";
  const massstab = hatMassstab(plan);
  return '<div class="karte-pad" style="padding-top:0"><div class="btn-reihe">' +
    (massstab
      ? '<button class="btn zweit klein" type="button" data-aktion="plan-raum-messen" data-plan="' + plan.id + '">+ Raum ausmessen</button>'
      : '<button class="btn klein" type="button" data-aktion="plan-massstab" data-plan="' + plan.id + '">Massstab setzen</button>') +
    (massstab
      ? '<button class="btn still klein" type="button" data-aktion="plan-massstab" data-plan="' + plan.id + '">Massstab ändern</button>'
      : "") +
    '<button class="btn still klein" type="button" data-aktion="plan-einstellen" data-id="' + plan.id + '">Erkennung</button>' +
    '<button class="btn still klein" type="button" data-aktion="plan-umbenennen" data-id="' + plan.id + '">Umbenennen</button>' +
    '<button class="btn still klein" type="button" data-aktion="plan-loeschen" data-id="' + plan.id + '">Plan entfernen</button>' +
    "</div></div>";
}

export function grundrissAbschnitt(Z) {
  const plaene = Z.plaene || [];
  const raeume = Z.raeume || [];
  const bearbeitbar = kannBearbeiten();

  let h = '<section class="abschnitt" id="abschnitt-grundriss"><div class="abschnitt-kopf"><div><h2>Grundrisse</h2>' +
    "<p>" + (plaene.length
      ? plaene.length + (plaene.length === 1 ? " Plan" : " Pläne") +
        " · Räume durch Antippen ausmessen"
      : "Plan hochladen, eine Wand messen, Räume antippen") + "</p></div>" +
    (bearbeitbar && plaene.length
      ? '<button class="btn klein" type="button" data-aktion="plan-neu">+ Plan</button>'
      : "") + "</div>";

  if (!plaene.length) {
    h += leerZustand("Noch kein Grundriss",
      "Laden Sie die Geschosspläne als Bild hoch – Foto, Screenshot oder Ausschnitt aus den " +
      "Verkaufsunterlagen. Die App erkennt die Wände darin: Sie messen mit dem Laser eine " +
      "einzige Wand, tippen dann in jeden Raum, und Fläche, Umfang und Wandlängen stehen da.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="plan-neu">Plan hochladen</button>' : "");
    return h + "</section>";
  }

  plaene.forEach((plan) => {
    const eigene = raeume.filter((r) => r.plan_id === plan.id);
    const gemessen = eigene.filter(istGemessen);
    const summe = gemessen.reduce((s, r) => s + flaeche(r), 0);

    h += '<div class="karte abschnitt" style="margin-bottom:12px">' +
      '<div class="karte-pad" style="padding-bottom:8px"><div class="abschnitt-kopf" style="margin:0">' +
      "<div><h3>" + esc(plan.titel || plan.datei_name || "Plan") + "</h3><p>" +
      (hatMassstab(plan)
        ? (eigene.length ? eigene.length + (eigene.length === 1 ? " Raum" : " Räume") : "noch kein Raum") +
          (summe ? " · " + summe.toFixed(2) + " m²" : "") +
          " · Massstab steht"
        : "Massstab fehlt – zuerst eine Wand messen") + "</p></div></div></div>" +
      planZeichnen(plan, eigene) +
      anleitung(plan) +
      werkzeuge(plan, bearbeitbar);

    if (eigene.length) {
      h += '<div class="karte-pad" style="border-top:1px solid var(--linie);padding-top:10px">' +
        '<div class="plan-liste">' +
        eigene.map((r, i) =>
          '<button class="plan-chip' + (istGemessen(r) ? " gemessen" : "") + '" type="button" ' +
          'data-aktion="plan-marke" data-id="' + r.id + '"><b>' + (i + 1) + "</b> " + esc(r.name) +
          "<span>" + (istGemessen(r)
            ? flaeche(r).toFixed(2) + " m²" + (zahl(r.umfang) ? " · " + zahl(r.umfang).toFixed(2) + " m" : "")
            : "nicht gerechnet") + "</span></button>"
        ).join("") +
        "</div></div>";
    }
    h += "</div>";
  });

  h += '<div class="karte karte-pad" style="font-size:.8rem;color:var(--grau)">' +
    "Der Plan wird gezeigt, wie er hochgeladen wurde – nichts wird nachgezeichnet. Erkannt " +
    "werden nur die Wände: Alles Dunkle gilt als Wand, alles dazwischen als Raum. Das Bild " +
    "bleibt dabei auf dem Gerät. Passt die Erkennung nicht, lässt sie sich unter " +
    "«Erkennung» nachstellen.</div>";
  nachladenBald();
  return h + "</section>";
}
