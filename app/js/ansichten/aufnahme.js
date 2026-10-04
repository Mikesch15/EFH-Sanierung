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
  wandmassAnlegen, wandmassAktualisieren, wandmassLoeschen,
} from "../daten.js";
import { hochladen, loeschen as dateiLoeschen, dateiPruefen } from "../dateien.js";
import { modalOeffnen, modalSchliessen, neuLaden, neuZeichnen, kannBearbeiten } from "../app.js";
import { vorlagePunkte, FOTO_REGEL, CHECKLISTE_HINWEIS } from "../checkliste-vorlage.js";
import { planModus, planModusSetzen, wandZeigen, hatMassstab } from "./grundriss.js";
import { maskeHolen, raumMessen, wandMessen, raumWaende, vergessen } from "../planbild.js";
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

/** Was im Messblatt über die Herkunft steht: aus dem Plan erkannt oder von Hand. */
function umrissStand(r) {
  const ecken = (r.umriss || []).length;
  if (!ecken) return '<span style="color:var(--grau)">von Hand</span>';
  const gemessen = (r.wand_masse || []).length;
  return ecken + " Wände" + (gemessen
    ? ' <span class="badge gruen">' + gemessen + " mit Laser</span>"
    : "");
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

/** Eine Wandzeile im Raumformular: was der Plan sagt, daneben das Lasermass. */
function wandZeile(w) {
  const plan = w.plan === null ? null : w.plan;
  const laser = w.laser;
  const abw = plan && laser ? laser - plan : null;
  return '<div class="wand-zeile"><span class="wand-nr">' + (w.kante + 1) + "</span>" +
    '<span class="wand-plan">' + (plan ? plan.toFixed(2) + " m" : "–") + "</span>" +
    '<input inputmode="decimal" aria-label="Lasermass Wand ' + (w.kante + 1) + '" data-wand="' + w.kante +
    '" value="' + (laser ? esc(laser) : "") + '" placeholder="Laser">' +
    '<span class="wand-abw' + (abw === null ? "" : Math.abs(abw) <= 0.03 ? " gut" : " schlecht") + '">' +
    (abw === null ? "" : (abw >= 0 ? "+" : "−") + Math.abs(abw).toFixed(2)) + "</span></div>";
}

/** Der Block «aus dem Plan»: Fläche, Umfang und die Wände zum Nachmessen. */
function planBlock(Z) {
  if (!entwurf.umriss || entwurf.umriss.length < 3) {
    return '<label class="feld"><span>Fläche (m²)</span><input inputmode="decimal" data-feld="flaeche" value="' +
      esc(entwurf.flaeche ?? "") + '" placeholder="z.B. 15.40"></label>' +
      '<div class="hinweis info"><div>Dieser Raum stammt nicht aus einem Plan. Mit einem ' +
      "hochgeladenen Grundriss misst die App Fläche und Wände selbst – Sie tippen nur in den Raum.</div></div>";
  }
  const plan = (Z.plaene || []).find((p) => p.id === entwurf.plan_id) || {};
  const waende = raumWaende(entwurf, plan);
  return '<div class="geo-box">' +
    '<div class="geo-werte"><div><span>Fläche</span><b>' +
    (zahl(entwurf.flaeche) ? zahl(entwurf.flaeche).toFixed(2) + " m²" : "–") + "</b></div>" +
    "<div><span>Umfang</span><b>" + (zahl(entwurf.umfang) ? zahl(entwurf.umfang).toFixed(2) + " m" : "–") + "</b></div>" +
    "<div><span>Wände</span><b>" + entwurf.umriss.length + "</b></div></div>" +
    '<p class="wand-hinweis">Aus dem Plan gerechnet. Wer eine Wand nachmisst, trägt sie rechts ein – ' +
    "die Abweichung zeigt, wie gut der Plan stimmt.</p></div>" +
    (waende.length
      ? '<div class="wand-kopf"><span></span><span>Plan</span><span>Laser (m)</span><span>±</span></div>' +
        '<div class="wand-liste" id="raum-waende">' + waende.map(wandZeile).join("") + "</div>"
      : "");
}

function raumFormular(Z, r, vorgabe) {
  entwurf = r ? JSON.parse(JSON.stringify(r)) : Object.assign({
    id: null, name: "", geschoss: "", hoehe: "", wandstaerke: "", fenster: "", tueren: "",
    boden: "", bemerkung: "", umriss: [], wand_masse: [], flaeche: "", umfang: "",
  }, vorgabe || {});
  if (!Array.isArray(entwurf.wand_masse)) entwurf.wand_masse = [];
  modalOeffnen({
    titel: entwurf.id ? "Raum bearbeiten" : "Neuer Raum",
    koerper:
      '<div class="feld-paar">' +
      '<label class="feld"><span>Raum</span><input data-feld="name" value="' + esc(entwurf.name) + '" placeholder="z.B. Wohnzimmer"></label>' +
      '<label class="feld"><span>Geschoss</span><input list="geschoss-liste" data-feld="geschoss" value="' + esc(entwurf.geschoss) + '" placeholder="EG">' +
      '<datalist id="geschoss-liste"><option value="Keller"><option value="EG"><option value="OG"><option value="Dachstock"><option value="Aussen"></datalist></label>' +
      "</div>" +
      planBlock(Z) +
      '<div class="feld-paar" style="margin-top:14px">' +
      '<label class="feld"><span>Raumhöhe (m)</span><input inputmode="decimal" data-feld="hoehe" value="' + esc(entwurf.hoehe ?? "") + '" placeholder="2.40"></label>' +
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
    umriss: r.umriss || [],
    wand_masse: (r.wand_masse || []).filter((m) => zahl(m.laenge) > 0),
    flaeche: r.flaeche === "" || r.flaeche === null ? "" : zahl(r.flaeche),
    umfang: r.umfang === "" || r.umfang === null ? "" : zahl(r.umfang),
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
/**
 * Rechnet den Tipp in eine Lage im Bild um (0 bis 1). Bezug ist das Bild selbst,
 * nicht der Kasten darum – sonst stimmt die Stelle nicht, sobald das Bild
 * schmaler ist als sein Platz.
 */
function tippLage(e, bild) {
  const r = bild.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const punkt = e.touches && e.touches[0] ? e.touches[0] : e;
  const x = (punkt.clientX - r.left) / r.width;
  const y = (punkt.clientY - r.top) / r.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x: Math.round(x * 100000) / 100000, y: Math.round(y * 100000) / 100000 };
}

/** Liegt der Punkt im Umriss? (Strahlverfahren) */
function imUmriss(punkte, x, y) {
  let drin = false;
  for (let i = 0, j = punkte.length - 1; i < punkte.length; j = i++) {
    const [xi, yi] = punkte[i], [xj, yj] = punkte[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) drin = !drin;
  }
  return drin;
}

/** Fragt nach dem Lasermass der angetippten Wand und setzt daraus den Massstab. */
function massstabFormular(Z, plan, messung) {
  entwurf = null;
  const alt = Number(plan.px_pro_meter) || 0;
  modalOeffnen({
    titel: "Massstab setzen",
    koerper:
      '<div class="hinweis info"><div>Die angetippte Wand ist im Plan <b>' + Math.round(messung.pixel) +
      " Bildpunkte</b> lang (im Plan blau markiert). Wie lang ist sie in Wirklichkeit?</div></div>" +
      '<label class="feld"><span>Gemessene Länge (m)</span><input id="ms-laenge" inputmode="decimal" ' +
      'placeholder="z.B. 9.85"' + (alt ? ' value="' + (messung.pixel / alt).toFixed(2) + '"' : "") + "></label>" +
      (alt
        ? '<div class="hinweis warn"><div>Der Massstab ist schon gesetzt. Wird er geändert, werden ' +
          "alle bereits gemessenen Räume dieses Plans mitgerechnet.</div></div>"
        : ""),
    speichern: async () => {
      const meter = zahl(document.getElementById("ms-laenge").value);
      if (!(meter > 0)) { meldung("Bitte die gemessene Länge eingeben.", true); return false; }
      const neu = messung.pixel / meter;
      try {
        await planAktualisieren(plan.id, {
          px_pro_meter: neu, bild_breite: messung.bildBreite, bild_hoehe: messung.bildHoehe,
        });
        // Schon gemessene Räume mitziehen: Fläche geht quadratisch mit dem Massstab.
        if (alt && Math.abs(alt - neu) > 0.0001) {
          const faktor = alt / neu;
          for (const r of (Z.raeume || []).filter((x) => x.plan_id === plan.id && zahl(x.flaeche))) {
            await raumAktualisieren(r.id, Object.assign({}, r, {
              flaeche: zahl(r.flaeche) * faktor * faktor,
              umfang: zahl(r.umfang) * faktor,
            }), r.geaendert_am);
          }
        }
        meldung("Massstab gesetzt: 1 m = " + neu.toFixed(1) + " Bildpunkte.");
        await neuLaden(["plaene", "raeume"]);
        return true;
      } catch (err) { meldung(err.message, true); return false; }
    },
  });
}

/** Regler für die Erkennung – falls ein Plan heller, dunkler oder grober ist. */
function erkennungFormular(Z, plan) {
  entwurf = null;
  modalOeffnen({
    titel: "Erkennung einstellen",
    koerper:
      '<div class="hinweis info"><div>Die App hält alles Dunkle im Plan für eine Wand. ' +
      "Stimmt das nicht, lässt es sich hier nachstellen.</div></div>" +
      '<label class="feld"><span>Wandschwelle: wie dunkel eine Wand sein muss</span>' +
      '<input type="range" id="ek-schwelle" min="60" max="230" step="5" value="' + (plan.schwelle ?? 150) + '">' +
      '<span style="font-size:.74rem;color:var(--grau)">Höher = auch helle Linien gelten als Wand.</span></label>' +
      '<label class="feld"><span>Türöffnungen überbrücken (Bildpunkte)</span>' +
      '<input type="range" id="ek-luecken" min="0" max="40" step="2" value="' + (plan.luecken ?? 18) + '">' +
      '<span style="font-size:.74rem;color:var(--grau)">Höher, wenn die Füllung durch eine Türöffnung ' +
      "ausläuft; tiefer, wenn schmale Räume zuwachsen.</span></label>",
    speichern: async () => {
      try {
        await planAktualisieren(plan.id, {
          schwelle: Number(document.getElementById("ek-schwelle").value),
          luecken: Number(document.getElementById("ek-luecken").value),
        });
        vergessen(plan.id);
        meldung("Erkennung angepasst.");
        await neuLaden(["plaene"]);
        return true;
      } catch (err) { meldung(err.message, true); return false; }
    },
  });
}

/**
 * Mass für eine angetippte Wand. Steht beim Plan noch kein Massstab, wird er
 * aus dieser Messung gesetzt: Die Wand ist im Bild so und so viele Punkte lang,
 * in Wirklichkeit so und so viele Meter – mehr braucht es nicht.
 */
function wandmassFormular(Z, plan, vorgabe, bestehend) {
  entwurf = null;
  const raumNamen = [...new Set((Z.raeume || []).map((r) => r.name).filter(Boolean))];
  const pxProM = Number(plan.px_pro_meter) || 0;
  const ausPlan = pxProM && vorgabe && vorgabe.pixel ? vorgabe.pixel / pxProM : null;
  modalOeffnen({
    titel: bestehend ? "Wandmass bearbeiten" : "Wand vermassen",
    koerper:
      (ausPlan
        ? '<div class="hinweis info"><div>Nach dem Plan ist diese Wand <b>' + ausPlan.toFixed(2) +
          " m</b> lang. Tragen Sie ein, was der Laser zeigt.</div></div>"
        : !pxProM
          ? '<div class="hinweis info"><div>Dies ist das erste Mass auf diesem Plan – daraus ergibt ' +
            "sich zugleich der Massstab für alles Weitere.</div></div>"
          : "") +
      '<div class="feld-paar">' +
      '<label class="feld"><span>Länge (m)</span><input id="wm-laenge" inputmode="decimal" value="' +
      esc(bestehend && bestehend.laenge !== null ? bestehend.laenge : "") + '" placeholder="4.21"></label>' +
      '<label class="feld"><span>Höhe (m), optional</span><input id="wm-hoehe" inputmode="decimal" value="' +
      esc(bestehend && bestehend.hoehe !== null ? bestehend.hoehe : "") + '" placeholder="2.44"></label>' +
      "</div>" +
      '<div class="feld-paar">' +
      '<label class="feld"><span>Bezeichnung</span><input id="wm-bez" list="wm-raeume" value="' +
      esc(bestehend ? bestehend.bezeichnung : "") + '" placeholder="z.B. Küche Nordwand">' +
      '<datalist id="wm-raeume">' + raumNamen.map((n) => '<option value="' + esc(n) + '">').join("") + "</datalist></label>" +
      '<label class="feld"><span>Art</span><input id="wm-art" list="wm-arten" value="' +
      esc(bestehend ? bestehend.art : "Wand") + '">' +
      '<datalist id="wm-arten"><option value="Wand"><option value="Fenster"><option value="Tür">' +
      '<option value="Nische"><option value="Durchgang"></datalist></label>' +
      "</div>" +
      '<label class="feld"><span>Bemerkung</span><input id="wm-bem" value="' +
      esc(bestehend ? bestehend.bemerkung : "") + '" placeholder="z.B. Brüstung 85, Leitung in der Wand"></label>' +
      (bestehend
        ? '<div class="btn-reihe" style="margin-top:12px">' +
          '<button class="btn gefahr klein" type="button" data-aktion="wandmass-loeschen" data-id="' +
          bestehend.id + '">Mass löschen</button></div>'
        : ""),
    speichern: async () => {
      const laenge = zahl(document.getElementById("wm-laenge").value);
      if (!(laenge > 0)) { meldung("Bitte die gemessene Länge eingeben.", true); return false; }
      const daten = {
        plan_id: plan.id,
        laenge,
        hoehe: document.getElementById("wm-hoehe").value.trim() ? zahl(document.getElementById("wm-hoehe").value) : "",
        bezeichnung: document.getElementById("wm-bez").value.trim(),
        art: document.getElementById("wm-art").value.trim() || "Wand",
        bemerkung: document.getElementById("wm-bem").value.trim(),
      };
      try {
        if (bestehend) {
          await wandmassAktualisieren(bestehend.id, Object.assign({}, bestehend, daten), bestehend.geaendert_am);
        } else {
          const [a, c] = vorgabe.strecke;
          await wandmassAnlegen(Z.projektId, Object.assign(daten, {
            x1: a[0], y1: a[1], x2: c[0], y2: c[1],
          }));
          // Erstes Mass auf diesem Plan: Massstab daraus setzen.
          if (!pxProM && vorgabe.pixel) {
            await planAktualisieren(plan.id, {
              px_pro_meter: vorgabe.pixel / laenge,
              bild_breite: vorgabe.bildBreite, bild_hoehe: vorgabe.bildHoehe,
            });
          }
        }
        wandZeigen(null);
        meldung("Mass gespeichert.");
        await neuLaden(["wandmasse", "plaene"]);
        return true;
      } catch (err) { meldung(err.message, true); return false; }
    },
  });
}

/** Ein Tipp auf den Plan – je nach Modus Massstab, Raum ausmessen oder öffnen. */
function planTipp(Z, knopf, ereignis) {
  const plan = (Z.plaene || []).find((p) => p.id === knopf.dataset.plan);
  const bild = knopf.querySelector("img");
  if (!plan || !bild) return;
  const lage = tippLage(ereignis, bild);
  if (!lage) return;
  const art = planModus() && planModus().planId === plan.id ? planModus().art : null;

  if (!art) {
    // Ohne Modus: den angetippten Raum öffnen.
    const treffer = (Z.raeume || []).find(
      (r) => r.plan_id === plan.id && (r.umriss || []).length > 2 && imUmriss(r.umriss, lage.x, lage.y));
    if (treffer) return raumFormular(Z, treffer);
    return;
  }

  const stand = maskeHolen(plan, bild);
  if (!stand) { meldung("Der Plan ist noch nicht geladen. Einen Moment warten.", true); return; }
  if (stand.fehler) { meldung(stand.fehler, true); return; }

  if (art === "wand") {
    const messung = wandMessen(stand, lage.x, lage.y);
    if (messung.fehler) { meldung(messung.fehler, true); return; }
    wandZeigen(messung.strecke);
    planModusSetzen(null);
    neuZeichnen();
    return wandmassFormular(Z, plan,
      Object.assign({ bildBreite: stand.b, bildHoehe: stand.h }, messung), null);
  }

  if (art === "massstab") {
    const messung = wandMessen(stand, lage.x, lage.y);
    if (messung.fehler) { meldung(messung.fehler, true); return; }
    wandZeigen(messung.strecke);
    planModusSetzen(null);
    neuZeichnen();
    return massstabFormular(Z, plan,
      Object.assign({ bildBreite: stand.b, bildHoehe: stand.h }, messung));
  }

  const raum = raumMessen(stand, plan, lage.x, lage.y);
  if (raum.fehler) { meldung(raum.fehler, true); return; }
  planModusSetzen(null);
  neuZeichnen();
  return raumFormular(Z, null, {
    plan_id: plan.id, marke_x: lage.x, marke_y: lage.y,
    umriss: raum.umriss,
    flaeche: raum.flaeche === null ? "" : Math.round(raum.flaeche * 100) / 100,
    umfang: raum.umfang === null ? "" : Math.round(raum.umfang * 100) / 100,
  });
}

/** Zeigt neben dem Lasermass, wie weit der Plan daneben liegt. */
function abweichungZeigen(Z, feld, kante) {
  const zelle = feld.parentElement && feld.parentElement.querySelector(".wand-abw");
  const plan = (Z.plaene || []).find((p) => p.id === entwurf.plan_id);
  if (!zelle || !plan) return;
  const wand = raumWaende(entwurf, plan)[kante];
  const laser = zahl(feld.value);
  if (!wand || !wand.plan || !laser) { zelle.textContent = ""; zelle.className = "wand-abw"; return; }
  const abw = laser - wand.plan;
  zelle.textContent = (abw >= 0 ? "+" : "−") + Math.abs(abw).toFixed(2);
  zelle.className = "wand-abw " + (Math.abs(abw) <= 0.03 ? "gut" : "schlecht");
}

/* ---------------------------------------------------------------- Aktionen */

export function eingabe(e, Z) {
  // Mass-Felder speichern sich selbst, sobald man weiterklickt (change), nicht
  // bei jedem Tastendruck – sonst schreibt man pro Zahl zehnmal in die Datenbank.
  if (!document.querySelector(".modal") || !entwurf) return;
  const wand = e.target.closest("[data-wand]");
  if (wand) {
    // Lasermass je Wand. Die Zeile bleibt stehen (sonst verlöre das Feld den
    // Fokus); nur die Abweichung daneben wird nachgeführt.
    const kante = +wand.dataset.wand;
    const masse = entwurf.wand_masse || (entwurf.wand_masse = []);
    const alt = masse.findIndex((m) => m.kante === kante);
    if (alt >= 0) masse.splice(alt, 1);
    if (wand.value.trim()) masse.push({ kante, laenge: zahl(wand.value) });
    abweichungZeigen(Z, wand, kante);
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
      (marken ? " Die " + marken + " gemessenen Räume verlieren ihre Lage, bleiben aber im Messblatt." : ""))) return;
    if (planModus() && planModus().planId === plan.id) planModusSetzen(null);
    vergessen(plan.id);
    planLoeschen(plan.id)
      .then(() => dateiLoeschen(plan.datei_pfad).catch(() => {}))
      .then(() => { meldung("Plan entfernt."); return neuLaden(["plaene", "raeume"]); })
      .catch((err) => meldung(err.message, true));
    return;
  }
  if (a === "plan-massstab") { planModusSetzen("massstab", knopf.dataset.plan); return neuZeichnen(); }
  if (a === "plan-wand-messen") { planModusSetzen("wand", knopf.dataset.plan); return neuZeichnen(); }
  if (a === "wandmass-bearbeiten") {
    const m = (Z.wandmasse || []).find((x) => x.id === knopf.dataset.id);
    if (!m) return;
    const plan = (Z.plaene || []).find((p) => p.id === m.plan_id);
    if (!plan) return;
    const pxProM = Number(plan.px_pro_meter) || 0;
    const bb = Number(plan.bild_breite) || 0, bh = Number(plan.bild_hoehe) || 0;
    const pixel = bb && bh
      ? Math.hypot((zahl(m.x2) - zahl(m.x1)) * bb, (zahl(m.y2) - zahl(m.y1)) * bh)
      : 0;
    wandZeigen([[zahl(m.x1), zahl(m.y1)], [zahl(m.x2), zahl(m.y2)]]);
    neuZeichnen();
    return wandmassFormular(Z, plan, { pixel, strecke: null }, m);
  }
  if (a === "wandmass-loeschen") {
    const m = (Z.wandmasse || []).find((x) => x.id === knopf.dataset.id);
    if (!m || !bestaetigen("Dieses Wandmass löschen?")) return;
    wandmassLoeschen(m.id)
      .then(() => { modalSchliessen(); wandZeigen(null); meldung("Mass gelöscht."); return neuLaden(["wandmasse"]); })
      .catch((err) => meldung(err.message, true));
    return;
  }
  if (a === "plan-raum-messen") {
    const plan = (Z.plaene || []).find((p) => p.id === knopf.dataset.plan);
    if (plan && !hatMassstab(plan)) {
      meldung("Zuerst den Massstab setzen: eine gemessene Wand antippen.", true);
      planModusSetzen("massstab", knopf.dataset.plan);
    } else {
      planModusSetzen("raum", knopf.dataset.plan);
    }
    return neuZeichnen();
  }
  if (a === "plan-modus-aus") { planModusSetzen(null); return neuZeichnen(); }
  if (a === "plan-einstellen") {
    const plan = (Z.plaene || []).find((p) => p.id === knopf.dataset.id);
    return plan ? erkennungFormular(Z, plan) : undefined;
  }
  if (a === "plan-tippen") return planTipp(Z, knopf, ereignis);
  if (a === "plan-marke") return raumFormular(Z, (Z.raeume || []).find((r) => r.id === knopf.dataset.id));
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
