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

/** Umrisse und Masslinien als Überzug über dem Bild. */
function ueberzug(raeume, masse) {
  let h = '<svg class="plan-ueberzug" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">';
  raeume.forEach((r) => {
    const p = r.umriss || [];
    if (p.length < 3) return;
    h += '<polygon class="raum-flaeche' + (istGemessen(r) ? " gemessen" : "") + '" points="' +
      p.map((q) => q[0].toFixed(5) + "," + q[1].toFixed(5)).join(" ") + '"/>';
  });
  // Jede gemessene Wand bekommt ihre Masslinie – dort steht später die Zahl.
  masse.forEach((m) => {
    h += '<line class="mass-linie" x1="' + zahl(m.x1).toFixed(5) + '" y1="' + zahl(m.y1).toFixed(5) +
      '" x2="' + zahl(m.x2).toFixed(5) + '" y2="' + zahl(m.y2).toFixed(5) + '"/>';
  });
  if (letzteWand && letzteWand.length === 2) {
    h += '<line class="wand-mass" x1="' + letzteWand[0][0].toFixed(5) + '" y1="' + letzteWand[0][1].toFixed(5) +
      '" x2="' + letzteWand[1][0].toFixed(5) + '" y2="' + letzteWand[1][1].toFixed(5) + '"/>';
  }
  return h + "</svg>";
}

/**
 * Das Schild an der Wand: die gemessene Länge, dazu die Bezeichnung.
 * Es sitzt nicht auf der Wand, sondern leicht daneben – quer zur Wand und von
 * der Bildmitte weg. Sonst deckt das Schild die nächste Wand zu, die man als
 * Nächstes antippen will.
 */
function massSchild(m, i) {
  const mx = (zahl(m.x1) + zahl(m.x2)) / 2, my = (zahl(m.y1) + zahl(m.y2)) / 2;
  const dx = zahl(m.x2) - zahl(m.x1), dy = zahl(m.y2) - zahl(m.y1);
  const laenge = Math.hypot(dx, dy) || 1;
  let nx = -dy / laenge, ny = dx / laenge;
  if ((mx - 0.5) * nx + (my - 0.5) * ny < 0) { nx = -nx; ny = -ny; }
  // Normalerweise nach aussen. Läge das Schild dann aber ausserhalb des Bildes
  // (Aussenwand am Bildrand), kippt es nach innen statt angeschnitten zu werden.
  const rand = 0.1;
  let x = mx + nx * 0.035, y = my + ny * 0.035;
  if (x < rand || x > 1 - rand || y < rand || y > 1 - rand) {
    x = mx - nx * 0.035; y = my - ny * 0.035;
  }
  x = Math.min(1 - rand, Math.max(rand, x));
  y = Math.min(0.97, Math.max(0.03, y));
  const senkrecht = Math.abs(dy) > Math.abs(dx);
  // Auf dem Plan steht nur Nummer und Mass. Die Bezeichnung würde die Schilder so
  // breit machen, dass sie einander und die Wände zudecken; sie steht in der
  // Liste darunter und beim Antippen.
  return '<button class="plan-mass' + (senkrecht ? " senkrecht" : "") + '" type="button" ' +
    'data-aktion="wandmass-bearbeiten" data-id="' + m.id + '"' +
    ' title="' + esc(m.bezeichnung || m.art || "Wand") + '"' +
    ' style="left:' + (x * 100).toFixed(2) + "%;top:" + (y * 100).toFixed(2) + '%">' +
    '<span class="nr">' + (i + 1) + "</span>" +
    "<b>" + (zahl(m.laenge) ? zahl(m.laenge).toFixed(2) : "?") + "</b>" +
    "</button>";
}

function planZeichnen(plan, raeume, masse) {
  const marken = raeume.filter((r) => r.marke_x !== null && r.marke_x !== undefined);
  const aktiv = modus && modus.planId === plan.id;

  let h = '<div class="plan-bild' + (aktiv ? " zeigt-finger" : "") + '"' +
    ' data-aktion="plan-tippen" data-plan="' + plan.id + '">';
  h += istAnzeigbar(null, plan.datei_name || plan.datei_pfad)
    ? bildMarkierung(plan.datei_pfad, plan.titel || plan.datei_name, true)
    : '<div class="foto-ersatz" style="height:160px">Dieses Format lässt sich nicht anzeigen – ' +
      "bitte als JPG oder PNG hochladen.</div>";
  h += ueberzug(raeume, masse);

  marken.forEach((r, i) => {
    h += '<span class="plan-marke' + (istGemessen(r) ? " gemessen" : "") + '"' +
      ' style="left:' + (zahl(r.marke_x) * 100).toFixed(2) + "%;top:" + (zahl(r.marke_y) * 100).toFixed(2) + '%">' +
      '<span class="nr">' + (i + 1) + "</span>" +
      '<span class="wert">' + esc(markenText(r)) + "</span></span>";
  });
  masse.forEach((m, i) => { h += massSchild(m, i); });
  h += "</div>";
  return h;
}

function anleitung(plan) {
  if (!modus || modus.planId !== plan.id) return "";
  const text = modus.art === "massstab"
    ? "<b>Massstab setzen</b>Tippen Sie auf eine Wand, deren Länge Sie mit dem Laser gemessen " +
      "haben – am besten eine lange Aussenwand. Danach geben Sie das Mass ein."
    : modus.art === "wand"
      ? "<b>Wand vermassen</b>Tippen Sie auf die Wand, die Sie gerade gemessen haben. Die App " +
        "markiert sie und fragt nach dem Mass; danach steht die Zahl an dieser Wand im Plan."
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
    '<button class="btn klein" type="button" data-aktion="plan-wand-messen" data-plan="' + plan.id + '">+ Wand vermassen</button>' +
    '<button class="btn zweit klein" type="button" data-aktion="plan-raum-messen" data-plan="' + plan.id + '">+ Raum ausmessen</button>' +
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
  const alleMasse = Z.wandmasse || [];
  const bearbeitbar = kannBearbeiten();

  let h = '<section class="abschnitt" id="abschnitt-grundriss"><div class="abschnitt-kopf"><div><h2>Grundrisse</h2>' +
    "<p>" + (plaene.length
      ? plaene.length + (plaene.length === 1 ? " Plan" : " Pläne") + " · " +
        alleMasse.length + (alleMasse.length === 1 ? " Wandmass" : " Wandmasse")
      : "Plan hochladen, Wände antippen und vermassen") + "</p></div>" +
    (bearbeitbar && plaene.length
      ? '<button class="btn klein" type="button" data-aktion="plan-neu">+ Plan</button>'
      : "") + "</div>";

  if (!plaene.length) {
    h += leerZustand("Noch kein Grundriss",
      "Laden Sie die Geschosspläne als Bild hoch – Foto, Screenshot oder Ausschnitt aus den " +
      "Verkaufsunterlagen. Danach tippen Sie beim Besuch jede Wand an, die Sie messen: Die App " +
      "erkennt die Wand im Bild und schreibt Ihr Lasermass an genau diese Wand im Plan.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="plan-neu">Plan hochladen</button>' : "");
    return h + "</section>";
  }

  plaene.forEach((plan) => {
    const eigene = raeume.filter((r) => r.plan_id === plan.id);
    const masse = alleMasse.filter((m) => m.plan_id === plan.id);
    const gemessen = eigene.filter(istGemessen);
    const summe = gemessen.reduce((s, r) => s + flaeche(r), 0);

    h += '<div class="karte abschnitt" style="margin-bottom:12px">' +
      '<div class="karte-pad" style="padding-bottom:8px"><div class="abschnitt-kopf" style="margin:0">' +
      "<div><h3>" + esc(plan.titel || plan.datei_name || "Plan") + "</h3><p>" +
      (masse.length ? masse.length + (masse.length === 1 ? " Wand gemessen" : " Wände gemessen") : "noch nichts gemessen") +
      (eigene.length ? " · " + eigene.length + (eigene.length === 1 ? " Raum" : " Räume") : "") +
      (summe ? " · " + summe.toFixed(2) + " m²" : "") +
      "</p></div></div></div>" +
      planZeichnen(plan, eigene, masse) +
      anleitung(plan) +
      werkzeuge(plan, bearbeitbar);

    if (masse.length) {
      h += '<div class="karte-pad" style="border-top:1px solid var(--linie);padding-top:10px">' +
        '<div style="font-size:.76rem;color:var(--grau);margin-bottom:6px">Gemessene Wände</div>' +
        '<div class="plan-liste">' +
        masse.map((m, i) =>
          '<button class="plan-chip gemessen" type="button" data-aktion="wandmass-bearbeiten" data-id="' + m.id +
          '"><b>' + (i + 1) + "</b> " + esc(m.bezeichnung || m.art || "Wand") +
          "<span>" + (zahl(m.laenge) ? zahl(m.laenge).toFixed(2) + " m" : "ohne Mass") +
          (zahl(m.hoehe) ? " · H " + zahl(m.hoehe).toFixed(2) + " m" : "") + "</span></button>"
        ).join("") +
        "</div></div>";
    }

    if (eigene.length) {
      h += '<div class="karte-pad" style="border-top:1px solid var(--linie);padding-top:10px">' +
        '<div style="font-size:.76rem;color:var(--grau);margin-bottom:6px">Ausgemessene Räume</div>' +
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
    "Jedes Mass steht an der Wand, zu der es gehört – wie auf einem Bauplan. Der Plan selbst " +
    "wird gezeigt, wie er hochgeladen wurde; erkannt werden nur die Wandlinien darin, damit das " +
    "Mass an der richtigen Wand klebt. Das Bild bleibt dabei auf dem Gerät. Passt die Erkennung " +
    "nicht, lässt sie sich unter «Erkennung» nachstellen.</div>";
  nachladenBald();
  return h + "</section>";
}
