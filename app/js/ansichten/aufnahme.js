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
} from "../daten.js";
import { modalOeffnen, neuLaden, neuZeichnen, kannBearbeiten } from "../app.js";
import { vorlagePunkte, FOTO_REGEL, CHECKLISTE_HINWEIS } from "../checkliste-vorlage.js";

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

function flaeche(r) {
  const l = zahl(r.laenge), b = zahl(r.breite);
  return l && b ? (l * b).toFixed(2).replace(".", ".") + " m²" : "–";
}
function mass(wert, einheit) {
  return wert === null || wert === undefined || wert === "" ? "–" : zahl(wert).toFixed(2) + " " + einheit;
}

export function raumAbschnitt(Z) {
  const liste = Z.raeume || [];
  const bearbeitbar = kannBearbeiten();
  const gesamt = liste.reduce((s, r) => s + zahl(r.laenge) * zahl(r.breite), 0);

  let h = '<section class="abschnitt" id="abschnitt-raeume"><div class="abschnitt-kopf"><div><h2>Raum-Messblatt</h2>' +
    "<p>" + (liste.length
      ? liste.length + (liste.length === 1 ? " Raum" : " Räume") + (gesamt ? " · " + gesamt.toFixed(1) + " m² erfasst" : "")
      : "Länge, Breite, Höhe je Raum") + "</p></div>" +
    (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="raum-neu">+ Raum</button>' : "") +
    "</div>";

  if (!liste.length) {
    h += leerZustand("Noch keine Räume vermessen",
      "Je Raum eine Zeile: Länge, Breite, Höhe, Wandstärke, Fenster, Türen, Boden und Bemerkungen.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="raum-neu">Ersten Raum erfassen</button>' : "");
    return h + "</section>";
  }

  h += '<div class="karte"><div class="tab-scroll"><table><thead><tr>' +
    "<th>Raum</th><th class=\"num\">Länge</th><th class=\"num\">Breite</th><th class=\"num\">Fläche</th>" +
    "<th class=\"num\">Höhe</th><th class=\"num\">Wand</th><th>Fenster</th><th>Türen</th><th>Boden</th><th></th>" +
    "</tr></thead><tbody>";
  liste.forEach((r) => {
    h += "<tr><td><b>" + esc(r.name || "Ohne Namen") + "</b>" +
      (r.geschoss ? '<div style="font-size:.76rem;color:var(--grau)">' + esc(r.geschoss) + "</div>" : "") +
      (r.bemerkung ? '<div style="font-size:.76rem;color:var(--grau);white-space:normal;max-width:220px">' + esc(r.bemerkung) + "</div>" : "") +
      "</td>" +
      '<td class="num">' + mass(r.laenge, "m") + "</td>" +
      '<td class="num">' + mass(r.breite, "m") + "</td>" +
      '<td class="num"><b>' + flaeche(r) + "</b></td>" +
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
  h += '</tbody><tfoot><tr><td colspan="3">Total Bodenfläche</td><td class="num">' +
    (gesamt ? gesamt.toFixed(2) + " m²" : "–") + '</td><td colspan="6"></td></tr></tfoot>';
  return h + "</table></div></div></section>";
}

/* ---------------------------------------------------------------- Formular */

function raumFormular(Z, r) {
  entwurf = r ? JSON.parse(JSON.stringify(r)) : {
    id: null, name: "", geschoss: "", laenge: "", breite: "", hoehe: "",
    wandstaerke: "", fenster: "", tueren: "", boden: "", bemerkung: "",
  };
  modalOeffnen({
    titel: entwurf.id ? "Raum bearbeiten" : "Neuer Raum",
    koerper:
      '<div class="feld-paar">' +
      '<label class="feld"><span>Raum</span><input data-feld="name" value="' + esc(entwurf.name) + '" placeholder="z.B. Wohnzimmer"></label>' +
      '<label class="feld"><span>Geschoss</span><input list="geschoss-liste" data-feld="geschoss" value="' + esc(entwurf.geschoss) + '" placeholder="EG">' +
      '<datalist id="geschoss-liste"><option value="Keller"><option value="EG"><option value="OG"><option value="Dachstock"><option value="Aussen"></datalist></label>' +
      "</div>" +
      '<div class="feld-paar">' +
      '<label class="feld"><span>Länge (m)</span><input inputmode="decimal" data-feld="laenge" value="' + esc(entwurf.laenge ?? "") + '" placeholder="4.20"></label>' +
      '<label class="feld"><span>Breite (m)</span><input inputmode="decimal" data-feld="breite" value="' + esc(entwurf.breite ?? "") + '" placeholder="3.60"></label>' +
      "</div>" +
      '<div class="feld-paar">' +
      '<label class="feld"><span>Höhe (m)</span><input inputmode="decimal" data-feld="hoehe" value="' + esc(entwurf.hoehe ?? "") + '" placeholder="2.40"></label>' +
      '<label class="feld"><span>Wandstärke (cm)</span><input inputmode="decimal" data-feld="wandstaerke" value="' + esc(entwurf.wandstaerke ?? "") + '" placeholder="24"></label>' +
      "</div>" +
      '<div class="feld-paar">' +
      '<label class="feld"><span>Fenster</span><input data-feld="fenster" value="' + esc(entwurf.fenster) + '" placeholder="2 × 120/140, Brüstung 85"></label>' +
      '<label class="feld"><span>Türen</span><input data-feld="tueren" value="' + esc(entwurf.tueren) + '" placeholder="1 × 80/200"></label>' +
      "</div>" +
      '<label class="feld"><span>Boden</span><input data-feld="boden" value="' + esc(entwurf.boden) + '" placeholder="Parkett auf Blindboden"></label>' +
      '<label class="feld"><span>Bemerkungen</span><textarea data-feld="bemerkung" placeholder="Balkenrichtung, Auffälligkeiten …">' + esc(entwurf.bemerkung || "") + "</textarea></label>",
    speichern: () => raumSpeichern(Z),
  });
}

async function raumSpeichern(Z) {
  const r = entwurf;
  if (!r.name.trim()) { meldung("Bitte einen Raumnamen angeben.", true); return false; }
  const daten = {
    name: r.name.trim(), geschoss: (r.geschoss || "").trim(),
    laenge: r.laenge === "" ? "" : zahl(r.laenge),
    breite: r.breite === "" ? "" : zahl(r.breite),
    hoehe: r.hoehe === "" ? "" : zahl(r.hoehe),
    wandstaerke: r.wandstaerke === "" ? "" : zahl(r.wandstaerke),
    fenster: (r.fenster || "").trim(), tueren: (r.tueren || "").trim(),
    boden: (r.boden || "").trim(), bemerkung: (r.bemerkung || "").trim(),
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

/* ---------------------------------------------------------------- Aktionen */

export function eingabe(e) {
  // Mass-Felder speichern sich selbst, sobald man weiterklickt (change), nicht
  // bei jedem Tastendruck – sonst schreibt man pro Zahl zehnmal in die Datenbank.
  if (!document.querySelector(".modal") || !entwurf) return;
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

export function aktion(a, knopf, Z) {
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
