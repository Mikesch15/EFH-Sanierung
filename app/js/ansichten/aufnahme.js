// Bestandsaufnahme bei der Besichtigung: Checkliste und Raum-Messblatt.
//
// Gedacht für die Hand auf der Baustelle: Punkt antippen = abgehakt, daneben ein
// Feld für das Mass oder die Feststellung. Gespeichert wird sofort, ohne Formular
// und ohne Speichern-Knopf – wer mit dem Meterstab in der anderen Hand dasteht,
// soll nicht zweimal tippen müssen.
//
// Die Gruppen sind zugeklappt und zeigen ihren Stand (3/8). So bleiben 88 Punkte
// auf einem Handy überschaubar.
import { esc, zahl, meldung, bestaetigen, heuteISO } from "../format.js";
import { leerZustand } from "./gemeinsam.js";
import {
  checklisteAnlegen, checklistePunktAktualisieren, checklistePunktLoeschen,
  raumAnlegen, raumAktualisieren, raumLoeschen,
  planAnlegen, planAktualisieren, planLoeschen,
} from "../daten.js";
import { hochladen, loeschen as dateiLoeschen, dateiPruefen } from "../dateien.js";
import { modalOeffnen, neuLaden, neuZeichnen, kannBearbeiten } from "../app.js";
import { vorlagePunkte, FOTO_REGEL, CHECKLISTE_HINWEIS } from "../checkliste-vorlage.js";
import { setzModus, setzModusSetzen } from "./grundriss.js";
import { umrissRechnen, skizzeSvg, schliesst, gemesseneWaende, STANDARD_WINKEL } from "../raumgeometrie.js";
export { grundrissAbschnitt } from "./grundriss.js";

let entwurf = null;                  // Raum im Formular
const offeneGruppen = new Set();     // welche Abschnitte aufgeklappt sind
let vorlageLaeuft = false;

/* -------------------------------------------------------------- Checkliste */

function nachGruppen(liste) {
  const gruppen = [];
  liste.forEach((p) => {
    let g = gruppen.find((x) => x.name === p.gruppe);
    if (!g) { g = { name: p.gruppe, punkte: [] }; gruppen.push(g); }
    g.punkte.push(p);
  });
  return gruppen;
}

export function checklisteAbschnitt(Z) {
  const liste = Z.checkliste || [];
  const bearbeitbar = kannBearbeiten();
  const erledigt = liste.filter((p) => p.erledigt).length;

  let h = '<section class="abschnitt" id="abschnitt-checkliste"><div class="abschnitt-kopf"><div><h2>Checkliste</h2>' +
    "<p>" + (liste.length
      ? erledigt + " von " + liste.length + " erledigt"
      : "Besichtigung und Bestandsaufnahme") + "</p></div>" +
    (bearbeitbar && liste.length ? '<button class="btn klein" type="button" data-aktion="chk-neu">+ Punkt</button>' : "") +
    "</div>";

  if (!liste.length) {
    h += leerZustand("Noch keine Checkliste",
      "Die Vorlage aus der Besichtigungs-Checkliste umfasst 12 Gruppen mit 88 Punkten – " +
      "von Grundmassen über Keller und Heizung bis zu den Unterlagen des Verkäufers. " +
      "Danach lässt sich jeder Punkt ändern, löschen oder ergänzen.",
      bearbeitbar
        ? '<button class="btn" type="button" data-aktion="chk-vorlage">Checkliste aus Vorlage anlegen</button>' +
          ' <button class="btn zweit" type="button" data-aktion="chk-neu">Eigenen Punkt erfassen</button>'
        : "");
    return h + "</section>";
  }

  const anteil = liste.length ? Math.round((erledigt / liste.length) * 100) : 0;
  h += '<div class="karte karte-pad abschnitt" style="margin-bottom:12px">' +
    '<div class="balken"><i class="b-bezahlt" style="width:' + anteil + '%"></i></div>' +
    '<div class="legende"><span>' + anteil + " % aufgenommen</span></div></div>";

  nachGruppen(liste).forEach((g) => {
    const fertig = g.punkte.filter((p) => p.erledigt).length;
    const offen = offeneGruppen.has(g.name);
    h += '<div class="karte abschnitt" style="margin-bottom:10px">' +
      '<button class="gruppe-kopf" type="button" data-aktion="chk-gruppe" data-gruppe="' + esc(g.name) + '">' +
      "<b>" + esc(g.name) + "</b>" +
      '<span class="badge' + (fertig === g.punkte.length ? " gruen" : "") + '">' + fertig + "/" + g.punkte.length + "</span>" +
      '<span class="pfeil">' + (offen ? "▾" : "▸") + "</span></button>";
    if (offen) {
      h += '<ul class="chk-liste">';
      g.punkte.forEach((p) => {
        h += '<li class="chk' + (p.erledigt ? " fertig" : "") + '">' +
          '<button class="chk-haken" type="button" data-aktion="chk-haken" data-id="' + p.id + '"' +
          ' aria-pressed="' + (p.erledigt ? "true" : "false") + '" title="Abhaken">' +
          (p.erledigt ? "✓" : "") + "</button>" +
          '<div class="chk-text"><span>' + esc(p.titel) + "</span>" +
          (p.eigen ? ' <span class="badge">eigener Punkt</span>' : "") +
          (bearbeitbar
            ? '<input class="chk-wert" data-chk-wert="' + p.id + '" value="' + esc(p.wert || "") +
              '" placeholder="Mass oder Feststellung">'
            : (p.wert ? '<div class="chk-wert-fest">' + esc(p.wert) + "</div>" : "")) +
          "</div>" +
          (bearbeitbar
            ? '<button class="btn still klein" type="button" data-aktion="chk-loeschen" data-id="' + p.id + '">✕</button>'
            : "") +
          "</li>";
      });
      h += "</ul>";
    }
    h += "</div>";
  });

  h += '<div class="karte karte-pad" style="font-size:.8rem;color:var(--grau)">' +
    "<b style=\"display:block;color:var(--text-2)\">Foto-Regel</b>" + esc(FOTO_REGEL) +
    '<div style="margin-top:8px">' + esc(CHECKLISTE_HINWEIS) + "</div></div>";
  return h + "</section>";
}

/* ---------------------------------------------------------- Raum-Messblatt */

function mass(wert, einheit) {
  return wert === null || wert === undefined || wert === "" ? "–" : zahl(wert).toFixed(2) + " " + einheit;
}

/** Was im Messblatt über den Umriss steht: Zahl der Wände, offen oder geschlossen. */
function umrissStand(r) {
  const u = umrissRechnen(r.waende);
  if (!u.vollstaendig) return '<span style="color:var(--grau)">offen</span>';
  const n = u.punkte.length;
  return n + " Wände" + (schliesst(u)
    ? ""
    : ' <span class="badge rot" title="Umriss geht nicht auf">Lücke ' + (u.luecke * 100).toFixed(0) + " cm</span>");
}

export function raumAbschnitt(Z) {
  const liste = Z.raeume || [];
  const bearbeitbar = kannBearbeiten();
  const gesamt = liste.reduce((s, r) => s + zahl(r.flaeche), 0);

  let h = '<section class="abschnitt" id="abschnitt-raeume"><div class="abschnitt-kopf"><div><h2>Raum-Messblatt</h2>' +
    "<p>" + (liste.length
      ? liste.length + (liste.length === 1 ? " Raum" : " Räume") + (gesamt ? " · " + gesamt.toFixed(1) + " m² erfasst" : "")
      : "Wände rundum, Höhe, Boden je Raum") + "</p></div>" +
    (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="raum-neu">+ Raum</button>' : "") +
    "</div>";

  if (!liste.length) {
    h += leerZustand("Noch keine Räume vermessen",
      "Je Raum die Wände rundum – Länge und Winkel zur nächsten Wand. Daraus rechnet die App " +
      "Fläche und Umfang, auch bei L-Räumen und Schrägen. Dazu Höhe, Wandstärke, Fenster, " +
      "Türen, Boden und Bemerkungen.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="raum-neu">Ersten Raum erfassen</button>' : "");
    return h + "</section>";
  }

  h += '<div class="karte"><div class="tab-scroll"><table><thead><tr>' +
    "<th>Raum</th><th class=\"num\">Fläche</th><th class=\"num\">Umfang</th><th>Umriss</th>" +
    "<th class=\"num\">Höhe</th><th class=\"num\">Wand</th><th>Fenster</th><th>Türen</th><th>Boden</th><th></th>" +
    "</tr></thead><tbody>";
  liste.forEach((r) => {
    h += "<tr><td><b>" + esc(r.name || "Ohne Namen") + "</b>" +
      (r.geschoss ? '<div style="font-size:.76rem;color:var(--grau)">' + esc(r.geschoss) + "</div>" : "") +
      (r.bemerkung ? '<div style="font-size:.76rem;color:var(--grau);white-space:normal;max-width:220px">' + esc(r.bemerkung) + "</div>" : "") +
      "</td>" +
      '<td class="num"><b>' + (zahl(r.flaeche) ? zahl(r.flaeche).toFixed(2) + " m²" : "–") + "</b></td>" +
      '<td class="num">' + mass(r.umfang, "m") + "</td>" +
      "<td>" + umrissStand(r) + "</td>" +
      '<td class="num">' + mass(r.hoehe, "m") + "</td>" +
      '<td class="num">' + (r.wandstaerke == null || r.wandstaerke === "" ? "–" : zahl(r.wandstaerke) + " cm") + "</td>" +
      "<td>" + esc(r.fenster || "–") + "</td>" +
      "<td>" + esc(r.tueren || "–") + "</td>" +
      "<td>" + esc(r.boden || "–") + "</td>" +
      "<td>" + (bearbeitbar ? '<div class="zeile-aktion">' +
        '<button class="btn still klein" type="button" data-aktion="raum-bearbeiten" data-id="' + r.id + '">Bearbeiten</button>' +
        '<button class="btn still klein" type="button" data-aktion="raum-loeschen" data-id="' + r.id + '">Löschen</button>' +
        "</div>" : "") + "</td></tr>";
  });
  h += '</tbody><tfoot><tr><td>Total Bodenfläche</td><td class="num">' +
    (gesamt ? gesamt.toFixed(2) + " m²" : "–") + '</td><td colspan="8"></td></tr></tfoot>';
  return h + "</table></div></div></section>";
}

/* ---------------------------------------------------------------- Formular */

function neueWand(winkel) { return { laenge: "", winkel: winkel === undefined ? STANDARD_WINKEL : winkel, bezeichnung: "" }; }

/**
 * Eine Wandzeile: Länge und der Innenwinkel zur nächsten Wand – eine Zeile pro
 * Wand, ohne Beschriftung je Feld. Auf dem Handy stehen sonst bei sechs Wänden
 * drei Bildschirme voller Formular, und man sieht das Ergebnis nicht mehr.
 */
function wandZeile(w, i) {
  return '<div class="wand-zeile"><span class="wand-nr">' + (i + 1) + "</span>" +
    '<input inputmode="decimal" aria-label="Länge Wand ' + (i + 1) + '" data-wand="' + i +
    '" data-wfeld="laenge" value="' + esc(w.laenge ?? "") + '" placeholder="4.20">' +
    '<input inputmode="decimal" aria-label="Ecke nach Wand ' + (i + 1) + '" list="winkel-liste" data-wand="' + i +
    '" data-wfeld="winkel" value="' + esc(w.winkel ?? STANDARD_WINKEL) + '">' +
    '<button class="btn still klein" type="button" data-aktion="raum-wand-weg" data-wand="' + i +
    '" aria-label="Wand ' + (i + 1) + ' entfernen">✕</button></div>';
}

/** Fläche, Umfang, Kontrolle und Skizze – rechnet bei jeder Eingabe neu. */
function geometrieHtml() {
  const u = umrissRechnen(entwurf.waende);
  if (!u.vollstaendig) {
    return '<div class="hinweis info"><div>Mindestens drei Wände mit Mass eintragen, dann rechnet ' +
      "die App Fläche und Umfang.</div></div>";
  }
  const zu = schliesst(u);
  return '<div class="geo-werte"><div><span>Fläche</span><b>' + u.flaeche.toFixed(2) + " m²</b></div>" +
    "<div><span>Umfang</span><b>" + u.umfang.toFixed(2) + " m</b></div>" +
    '<div><span>Kontrolle</span><b class="' + (zu ? "gut" : "schlecht") + '">' +
    (zu ? "Umriss geht auf" : "Lücke " + (u.luecke * 100).toFixed(0) + " cm") + "</b></div></div>" +
    skizzeSvg(entwurf.waende) +
    (zu ? "" : '<div class="hinweis warn"><div>Der Umriss schliesst nicht. Meist stimmt eine ' +
      "Wandlänge nicht oder eine Ecke ist keine 90° – z.B. 270° bei einer einspringenden Ecke, " +
      "135° bei einer Schräge. Die Fläche wird trotzdem gerechnet, der Umriss dafür geschlossen.</div></div>");
}

function geometrieAktualisieren() {
  const kasten = document.getElementById("raum-geo");
  if (kasten) kasten.innerHTML = geometrieHtml();
}

function waendeAktualisieren() {
  const liste = document.getElementById("raum-waende");
  if (liste) liste.innerHTML = entwurf.waende.map(wandZeile).join("");
  geometrieAktualisieren();
}

function raumFormular(Z, r, vorgabe) {
  entwurf = r ? JSON.parse(JSON.stringify(r)) : Object.assign({
    id: null, name: "", geschoss: "", hoehe: "",
    wandstaerke: "", fenster: "", tueren: "", boden: "", bemerkung: "",
  }, vorgabe || {});
  // Ein neuer Raum beginnt mit vier rechten Winkeln – der häufigste Fall. Wer
  // einen L-Raum oder eine Schräge hat, ergänzt Wände und ändert die Winkel.
  if (!Array.isArray(entwurf.waende) || !entwurf.waende.length) {
    entwurf.waende = [neueWand(), neueWand(), neueWand(), neueWand()];
  }
  modalOeffnen({
    titel: entwurf.id ? "Raum bearbeiten" : "Neuer Raum",
    koerper:
      '<div class="feld-paar">' +
      '<label class="feld"><span>Raum</span><input data-feld="name" value="' + esc(entwurf.name) + '" placeholder="z.B. Wohnzimmer"></label>' +
      '<label class="feld"><span>Geschoss</span><input list="geschoss-liste" data-feld="geschoss" value="' + esc(entwurf.geschoss) + '" placeholder="EG">' +
      '<datalist id="geschoss-liste"><option value="Keller"><option value="EG"><option value="OG"><option value="Dachstock"><option value="Aussen"></datalist></label>' +
      "</div>" +

      '<div class="abschnitt-kopf" style="margin:16px 2px 8px"><div><h3>Wände rundum</h3>' +
      "<p>Der Reihe nach messen: Länge der Wand, dann der Winkel zur nächsten</p></div>" +
      '<button class="btn zweit klein" type="button" data-aktion="raum-wand-neu">+ Wand</button></div>' +
      '<datalist id="winkel-liste"><option value="90" label="rechtwinklig"><option value="270" label="einspringende Ecke">' +
      '<option value="135"><option value="225"><option value="45"><option value="315"></datalist>' +
      '<div class="geo-box" id="raum-geo">' + geometrieHtml() + "</div>" +
      '<div class="wand-kopf"><span></span><span>Länge (m)</span><span>Ecke danach (°)</span><span></span></div>' +
      '<div class="wand-liste" id="raum-waende">' + entwurf.waende.map(wandZeile).join("") + "</div>" +
      '<p class="wand-hinweis">90° = rechtwinklig · 270° = einspringende Ecke (L-Raum) · 135°/225° = Schräge</p>' +

      '<div class="feld-paar" style="margin-top:14px">' +
      '<label class="feld"><span>Raumhöhe (m)</span><input inputmode="decimal" data-feld="hoehe" value="' + esc(entwurf.hoehe ?? "") + '" placeholder="2.40"></label>' +
      '<label class="feld"><span>Wandstärke (cm)</span><input inputmode="decimal" data-feld="wandstaerke" value="' + esc(entwurf.wandstaerke ?? "") + '" placeholder="24"></label>' +
      "</div>" +
      '<div class="feld-paar">' +
      '<label class="feld"><span>Fenster</span><input data-feld="fenster" value="' + esc(entwurf.fenster) + '" placeholder="2 × 120/140, Brüstung 85"></label>' +
      '<label class="feld"><span>Türen</span><input data-feld="tueren" value="' + esc(entwurf.tueren) + '" placeholder="1 × 80/200"></label>' +
      "</div>" +
      '<label class="feld"><span>Boden</span><input data-feld="boden" value="' + esc(entwurf.boden) + '" placeholder="Parkett auf Blindboden"></label>' +
      '<label class="feld"><span>Bemerkungen</span><textarea data-feld="bemerkung" placeholder="Balkenrichtung, Auffälligkeiten …">' + esc(entwurf.bemerkung || "") + "</textarea></label>" +
      (entwurf.plan_id
        ? '<div class="hinweis info"><div>Dieser Raum hängt an einem Messpunkt im Grundriss. ' +
          "Sobald der Umriss steht, zeigt der Punkt im Plan die Fläche.</div></div>"
        : ""),
    speichern: () => raumSpeichern(Z),
  });
}

async function raumSpeichern(Z) {
  const r = entwurf;
  if (!r.name.trim()) { meldung("Bitte einen Raumnamen angeben.", true); return false; }
  // Nur Wände mit Mass werden gespeichert; leere Zeilen sind Eingabehilfe, keine Daten.
  const waende = gemesseneWaende(r.waende).map((w) => ({
    laenge: zahl(w.laenge),
    winkel: zahl(w.winkel) > 0 ? zahl(w.winkel) : STANDARD_WINKEL,
    bezeichnung: (w.bezeichnung || "").trim(),
  }));
  const u = umrissRechnen(waende);
  const daten = {
    name: r.name.trim(), geschoss: (r.geschoss || "").trim(),
    waende,
    flaeche: u.vollstaendig ? u.flaeche : "",
    umfang: waende.length ? u.umfang : "",
    hoehe: r.hoehe === "" ? "" : zahl(r.hoehe),
    wandstaerke: r.wandstaerke === "" ? "" : zahl(r.wandstaerke),
    fenster: (r.fenster || "").trim(), tueren: (r.tueren || "").trim(),
    boden: (r.boden || "").trim(), bemerkung: (r.bemerkung || "").trim(),
    plan_id: r.plan_id || null,
    marke_x: r.marke_x === null || r.marke_x === undefined ? "" : zahl(r.marke_x),
    marke_y: r.marke_y === null || r.marke_y === undefined ? "" : zahl(r.marke_y),
  };
  try {
    if (r.id) await raumAktualisieren(r.id, daten, r.geaendert_am);
    else await raumAnlegen(Z.projektId, daten);
    meldung(r.id ? "Raum aktualisiert." : "Raum erfasst.");
    await neuLaden(["raeume"]);
    return true;
  } catch (err) { meldung(err.message, true); return false; }
}

function punktFormular(Z) {
  const gruppen = [...new Set((Z.checkliste || []).map((p) => p.gruppe))];
  entwurf = null;
  modalOeffnen({
    titel: "Eigener Punkt",
    koerper:
      '<label class="feld"><span>Punkt</span><input id="chk-titel" placeholder="z.B. Wasserdruck im OG messen"></label>' +
      '<label class="feld"><span>Gruppe</span><input id="chk-gruppe" list="chk-gruppen" value="' +
      esc(gruppen[0] || "Eigene Punkte") + '" placeholder="Eigene Punkte">' +
      '<datalist id="chk-gruppen">' + gruppen.map((g) => '<option value="' + esc(g) + '">').join("") +
      '<option value="Eigene Punkte"></datalist></label>',
    speichern: async () => {
      const titel = document.getElementById("chk-titel").value.trim();
      if (!titel) { meldung("Bitte den Punkt benennen.", true); return false; }
      const gruppe = document.getElementById("chk-gruppe").value.trim() || "Eigene Punkte";
      try {
        await checklisteAnlegen(Z.projektId, [{
          gruppe, titel, eigen: true, sortierung: (Z.checkliste || []).length + 1000,
        }]);
        offeneGruppen.add(gruppe);
        meldung("Punkt hinzugefügt.");
        await neuLaden(["checkliste"]);
        return true;
      } catch (err) { meldung(err.message, true); return false; }
    },
  });
}

/* ------------------------------------------------------------- Plan-Upload */

function planFormular(Z) {
  entwurf = null;
  modalOeffnen({
    titel: "Grundriss hochladen",
    koerper:
      '<div class="datei-feld" style="margin-bottom:14px"><p>Plan als Bild – Foto, Screenshot oder ' +
      "Ausschnitt aus den Verkaufsunterlagen (JPG, PNG, WEBP, max. 25 MB)</p>" +
      '<input type="file" id="p-datei" accept=".jpg,.jpeg,.png,.webp"></div>' +
      '<label class="feld"><span>Bezeichnung</span><input id="p-titel" placeholder="z.B. Erdgeschoss"></label>',
    knopfText: "Hochladen",
    speichern: async () => {
      const feld = document.getElementById("p-datei");
      const datei = feld && feld.files && feld.files[0];
      if (!datei) { meldung("Bitte eine Datei auswählen.", true); return false; }
      const fehler = dateiPruefen(datei);
      if (fehler) { meldung(fehler, true); return false; }
      const titel = document.getElementById("p-titel").value.trim() || datei.name;
      let pfad = null;
      try {
        const info = await hochladen(datei, Z.projektId, "plaene");
        pfad = info.datei_pfad;
        await planAnlegen(Z.projektId, {
          titel, datei_pfad: pfad, datei_name: datei.name,
          sortierung: (Z.plaene || []).length + 1,
        });
        meldung("Plan gespeichert.");
        await neuLaden(["plaene"]);
        return true;
      } catch (err) {
        if (pfad) await dateiLoeschen(pfad).catch(() => {});
        meldung(err.message, true);
        return false;
      }
    },
  });
}

function planUmbenennen(Z, plan) {
  entwurf = null;
  modalOeffnen({
    titel: "Plan umbenennen",
    koerper: '<label class="feld"><span>Bezeichnung</span><input id="p-titel" value="' +
      esc(plan.titel || "") + '"></label>',
    speichern: async () => {
      const titel = document.getElementById("p-titel").value.trim();
      if (!titel) { meldung("Bitte eine Bezeichnung angeben.", true); return false; }
      try {
        await planAktualisieren(plan.id, { titel });
        await neuLaden(["plaene"]);
        return true;
      } catch (err) { meldung(err.message, true); return false; }
    },
  });
}

/**
 * Rechnet den Tipp im Plan in eine Lage von 0 bis 1 um. Gespeichert wird relativ,
 * damit die Marke auf jeder Bildschirmbreite am selben Punkt im Plan sitzt.
 */
function markeAusTipp(e, flaeche) {
  const r = flaeche.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const punkt = e.touches && e.touches[0] ? e.touches[0] : e;
  const x = (punkt.clientX - r.left) / r.width;
  const y = (punkt.clientY - r.top) / r.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { marke_x: Math.round(x * 10000) / 10000, marke_y: Math.round(y * 10000) / 10000 };
}

/* ---------------------------------------------------------------- Aktionen */

export function eingabe(e) {
  // Mass-Felder speichern sich selbst, sobald man weiterklickt (change), nicht
  // bei jedem Tastendruck – sonst schreibt man pro Zahl zehnmal in die Datenbank.
  if (!document.querySelector(".modal") || !entwurf) return;
  const wand = e.target.closest("[data-wand][data-wfeld]");
  if (wand) {
    // Die Zeilen bleiben stehen (sonst verlöre das Feld den Fokus), nur die
    // Rechnung und die Skizze werden neu gezeichnet.
    entwurf.waende[+wand.dataset.wand][wand.dataset.wfeld] = wand.value;
    geometrieAktualisieren();
    return;
  }
  const feld = e.target.closest("[data-feld]");
  if (!feld) return;
  entwurf[feld.dataset.feld] = feld.value;
}

export function aenderung(e, Z) {
  const feld = e.target.closest("[data-chk-wert]");
  if (!feld) return;
  const id = feld.dataset.chkWert;
  const punkt = (Z.checkliste || []).find((p) => p.id === id);
  if (!punkt || punkt.wert === feld.value) return;
  const wert = feld.value;
  punkt.wert = wert;                                  // sofort sichtbar behalten
  checklistePunktAktualisieren(id, { wert })
    .catch((err) => meldung(err.message, true));
}

export function aktion(a, knopf, Z, ereignis) {
  if (a === "chk-gruppe") {
    const name = knopf.dataset.gruppe;
    if (offeneGruppen.has(name)) offeneGruppen.delete(name);
    else offeneGruppen.add(name);
    return neuZeichnen();   // nur zeichnen, die Daten sind ja da
  }
  if (a === "chk-vorlage") {
    if (vorlageLaeuft) return;
    vorlageLaeuft = true;
    knopf.disabled = true;
    checklisteAnlegen(Z.projektId, vorlagePunkte())
      .then(() => { meldung("Checkliste angelegt."); return neuLaden(["checkliste"]); })
      .catch((err) => meldung(err.message, true))
      .finally(() => { vorlageLaeuft = false; });
    return;
  }
  if (a === "chk-neu") return punktFormular(Z);
  if (a === "chk-haken") {
    const punkt = (Z.checkliste || []).find((p) => p.id === knopf.dataset.id);
    if (!punkt) return;
    const erledigt = !punkt.erledigt;
    punkt.erledigt = erledigt;                        // ohne Warten umschalten
    knopf.setAttribute("aria-pressed", erledigt ? "true" : "false");
    knopf.textContent = erledigt ? "✓" : "";
    knopf.closest(".chk").classList.toggle("fertig", erledigt);
    checklistePunktAktualisieren(punkt.id, { erledigt, erledigt_am: erledigt ? heuteISO() : null })
      .then(() => neuLaden(["checkliste"]))
      .catch((err) => meldung(err.message, true));
    return;
  }
  if (a === "chk-loeschen") {
    const punkt = (Z.checkliste || []).find((p) => p.id === knopf.dataset.id);
    if (punkt && bestaetigen('Punkt "' + punkt.titel + '" löschen?')) {
      checklistePunktLoeschen(punkt.id)
        .then(() => neuLaden(["checkliste"]))
        .catch((err) => meldung(err.message, true));
    }
    return;
  }
  if (a === "plan-neu") return planFormular(Z);
  if (a === "plan-umbenennen") {
    const plan = (Z.plaene || []).find((p) => p.id === knopf.dataset.id);
    return plan ? planUmbenennen(Z, plan) : undefined;
  }
  if (a === "plan-loeschen") {
    const plan = (Z.plaene || []).find((p) => p.id === knopf.dataset.id);
    if (!plan) return;
    const marken = (Z.raeume || []).filter((r) => r.plan_id === plan.id).length;
    if (!bestaetigen('Plan "' + (plan.titel || "") + '" entfernen?' +
      (marken ? " Die " + marken + " Messpunkte verlieren ihre Lage, die Räume bleiben im Messblatt." : ""))) return;
    if (setzModus() === plan.id) setzModusSetzen(null);
    planLoeschen(plan.id)
      .then(() => dateiLoeschen(plan.datei_pfad).catch(() => {}))
      .then(() => { meldung("Plan entfernt."); return neuLaden(["plaene", "raeume"]); })
      .catch((err) => meldung(err.message, true));
    return;
  }
  if (a === "plan-setzen") { setzModusSetzen(knopf.dataset.plan); return neuZeichnen(); }
  if (a === "plan-setzen-aus") { setzModusSetzen(null); return neuZeichnen(); }
  if (a === "plan-tippen") {
    const planId = knopf.dataset.plan;
    if (setzModus() !== planId) return;
    const lage = markeAusTipp(ereignis, knopf);
    if (!lage) return;
    setzModusSetzen(null);
    neuZeichnen();
    return raumFormular(Z, null, Object.assign({ plan_id: planId }, lage));
  }
  if (a === "plan-marke") return raumFormular(Z, (Z.raeume || []).find((r) => r.id === knopf.dataset.id));
  if (a === "raum-wand-neu") {
    const letzte = entwurf.waende[entwurf.waende.length - 1];
    entwurf.waende.push(neueWand(letzte ? letzte.winkel : undefined));
    return waendeAktualisieren();
  }
  if (a === "raum-wand-weg") {
    entwurf.waende.splice(+knopf.dataset.wand, 1);
    if (!entwurf.waende.length) entwurf.waende.push(neueWand());
    return waendeAktualisieren();
  }
  if (a === "raum-neu") return raumFormular(Z, null);
  if (a === "raum-bearbeiten") return raumFormular(Z, (Z.raeume || []).find((r) => r.id === knopf.dataset.id));
  if (a === "raum-loeschen") {
    const r = (Z.raeume || []).find((x) => x.id === knopf.dataset.id);
    if (r && bestaetigen('Raum "' + (r.name || "") + '" löschen?')) {
      raumLoeschen(r.id)
        .then(() => { meldung("Raum gelöscht."); return neuLaden(["raeume"]); })
        .catch((err) => meldung(err.message, true));
    }
  }
}
