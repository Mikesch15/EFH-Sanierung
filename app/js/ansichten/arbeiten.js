// Die Baustelle: Zeitplan der Arbeiten und die Pendenzen- und Mängelliste.
//
// Beides liegt in derselben Tabelle (Migration 0014) und unterscheidet sich nur
// in der Art: Eine Arbeit hat einen Zeitraum, eine Pendenz eine Frist und meist
// ein Foto. Getrennt gezeigt werden sie trotzdem – es sind zwei Fragen:
// «Was läuft wann?» und «Was ist noch offen?».
import { esc, datumCH, heuteISO, meldung, bestaetigen } from "../format.js";
import { leerZustand, kategorieOptionen, kategorieName } from "./gemeinsam.js";
import { arbeitAnlegen, arbeitAktualisieren, arbeitLoeschen } from "../daten.js";
import { hochladen, signierterLink, loeschen as dateiLoeschen } from "../dateien.js";
import { istAnzeigbar, bildMarkierung, nachladenBald } from "../vorschau.js";
import { modalOeffnen, neuLaden, kannBearbeiten } from "../app.js";
import { ARBEIT_STATUS } from "../konfig.js";

let entwurf = null;
let dateiWartend = null;

/* ------------------------------------------------------------- Hilfsmittel */

export function istOffen(a) { return a.status !== "Erledigt"; }

/** Termin verstrichen und noch nicht erledigt. */
export function istUeberfaellig(a) {
  if (!istOffen(a)) return false;
  const ende = a.bis || a.von;
  return !!ende && ende < heuteISO();
}

/** Läuft in den nächsten sieben Tagen oder gerade jetzt. */
export function istDieseWoche(a) {
  if (!istOffen(a)) return false;
  const heute = heuteISO();
  const inSieben = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const start = a.von || a.bis;
  const ende = a.bis || a.von;
  if (!start && !ende) return false;
  return (start || "") <= inSieben && (ende || "9999-12-31") >= heute;
}

function statusBadge(a) {
  const farbe = { "Offen": "", "In Arbeit": "blau", "Erledigt": "gruen" };
  return '<span class="badge ' + (farbe[a.status] || "") + '">' + esc(a.status) + "</span>" +
    (istUeberfaellig(a) ? ' <span class="badge rot">überfällig</span>' : "");
}

function zeitraum(a) {
  if (a.von && a.bis) return a.von === a.bis ? datumCH(a.von) : datumCH(a.von) + " – " + datumCH(a.bis);
  if (a.von) return "ab " + datumCH(a.von);
  if (a.bis) return "bis " + datumCH(a.bis);
  return "ohne Termin";
}

/** Reihenfolge: offene zuerst, nach Termin; ohne Termin ans Ende; Erledigtes zuletzt. */
function sortiert(liste) {
  return liste.slice().sort((a, b) => {
    if (istOffen(a) !== istOffen(b)) return istOffen(a) ? -1 : 1;
    const ta = a.von || a.bis || "9999-12-31";
    const tb = b.von || b.bis || "9999-12-31";
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}

/** Nächster sinnvoller Knopf: Offen → In Arbeit → Erledigt → wieder öffnen. */
function naechsterStand(a) {
  if (a.status === "Erledigt") return { status: "Offen", text: "Wieder öffnen" };
  if (a.art === "pendenz") return { status: "Erledigt", text: "Erledigt" };
  return a.status === "Offen"
    ? { status: "In Arbeit", text: "Gestartet" }
    : { status: "Erledigt", text: "Fertig" };
}

/* ----------------------------------------------------------------- Ansicht */

export function render(Z) {
  const alle = Z.arbeiten || [];
  const arbeiten = sortiert(alle.filter((a) => a.art !== "pendenz"));
  const pendenzen = sortiert(alle.filter((a) => a.art === "pendenz"));

  let h = '<nav class="sprungleiste">' +
    '<a href="#abschnitt-zeitplan">Zeitplan</a>' +
    '<a href="#abschnitt-pendenzen">Pendenzen &amp; Mängel</a>' +
    "</nav>";

  h += zeitplanAbschnitt(Z, arbeiten) + pendenzAbschnitt(Z, pendenzen);
  nachladenBald();
  return h;
}

function zeitplanAbschnitt(Z, liste) {
  const bearbeitbar = kannBearbeiten();
  const laufend = liste.filter((a) => a.status === "In Arbeit").length;
  const ueberfaellig = liste.filter(istUeberfaellig).length;

  let h = '<section class="abschnitt" id="abschnitt-zeitplan"><div class="abschnitt-kopf"><div><h2>Zeitplan</h2>' +
    "<p>" + (liste.length
      ? liste.filter(istOffen).length + " offen · " + laufend + " in Arbeit" +
        (ueberfaellig ? " · " + ueberfaellig + " überfällig" : "")
      : "Wann kommt welcher Handwerker") + "</p></div>" +
    (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="arbeit-neu">+ Arbeit</button>' : "") +
    "</div>";

  if (!liste.length) {
    h += leerZustand("Noch keine Arbeiten geplant",
      "Halten Sie fest, wann welches Gewerk kommt: Rückbau, Elektro, Sanitär, Böden. " +
      "Danach steht auf der Übersicht, was diese Woche läuft.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="arbeit-neu">Erste Arbeit planen</button>' : "");
    return h + "</section>";
  }

  h += '<div class="karte"><div class="tab-scroll"><table><thead><tr>' +
    "<th>Arbeit</th><th>Termin</th><th>Stand</th><th>Gewerk</th><th>Firma</th><th></th>" +
    "</tr></thead><tbody>";
  liste.forEach((a) => {
    const weiter = naechsterStand(a);
    h += "<tr" + (istOffen(a) ? "" : ' class="spaeter"') + "><td><b>" + esc(a.titel || "Ohne Bezeichnung") + "</b>" +
      (a.ort ? '<div style="font-size:.76rem;color:var(--grau)">' + esc(a.ort) + "</div>" : "") +
      (a.beschreibung ? '<div style="font-size:.76rem;color:var(--grau);white-space:normal;max-width:260px">' + esc(a.beschreibung) + "</div>" : "") +
      "</td>" +
      "<td>" + esc(zeitraum(a)) + "</td>" +
      "<td>" + statusBadge(a) + "</td>" +
      "<td>" + esc(kategorieName(Z.budget, a.budgetposition_id)) + "</td>" +
      "<td>" + esc(a.firma || "–") + "</td>" +
      "<td>" + (bearbeitbar ? '<div class="zeile-aktion">' +
        '<button class="btn still klein" type="button" data-aktion="arbeit-stand" data-id="' + a.id + '">' + weiter.text + "</button>" +
        '<button class="btn still klein" type="button" data-aktion="arbeit-bearbeiten" data-id="' + a.id + '">Bearbeiten</button>' +
        '<button class="btn still klein" type="button" data-aktion="arbeit-loeschen" data-id="' + a.id + '">Löschen</button>' +
        "</div>" : "") + "</td></tr>";
  });
  return h + "</tbody></table></div></div></section>";
}

function pendenzAbschnitt(Z, liste) {
  const bearbeitbar = kannBearbeiten();
  const offen = liste.filter(istOffen);
  const ueberfaellig = offen.filter(istUeberfaellig).length;

  let h = '<section class="abschnitt" id="abschnitt-pendenzen"><div class="abschnitt-kopf"><div><h2>Pendenzen &amp; Mängel</h2>' +
    "<p>" + (liste.length
      ? offen.length + " offen" + (ueberfaellig ? " · " + ueberfaellig + " überfällig" : "") +
        " · " + (liste.length - offen.length) + " erledigt"
      : "Was noch fehlt oder nachgebessert werden muss") + "</p></div>" +
    (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="pendenz-neu">+ Pendenz</button>' : "") +
    "</div>";

  if (!liste.length) {
    h += leerZustand("Keine offenen Punkte",
      "Was bei einem Rundgang auffällt, gehört hierhin: mit Foto, Raum, zuständiger Firma und Frist. " +
      "Für den Baualltag und später für die Abnahme.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="pendenz-neu">Ersten Punkt erfassen</button>' : "");
    return h + "</section>";
  }

  h += '<div class="karte"><ul class="pendenz-liste">';
  liste.forEach((a) => {
    const weiter = naechsterStand(a);
    const bild = a.datei_pfad && istAnzeigbar(null, a.datei_name || a.datei_pfad);
    h += '<li class="pendenz' + (istOffen(a) ? "" : " erledigt") + '">' +
      (a.datei_pfad
        ? '<button class="pendenz-bild" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(a.datei_pfad) + '" title="Foto öffnen">' +
          (bild ? bildMarkierung(a.datei_pfad, a.titel) : '<span class="foto-ersatz">Datei</span>') + "</button>"
        : '<span class="pendenz-bild leer"></span>') +
      '<div class="pendenz-text"><b>' + esc(a.titel || "Ohne Bezeichnung") + "</b>" +
      (a.beschreibung ? "<div>" + esc(a.beschreibung) + "</div>" : "") +
      '<div class="pendenz-fuss">' +
      (a.ort ? esc(a.ort) + " · " : "") +
      esc(kategorieName(Z.budget, a.budgetposition_id)) +
      (a.firma ? " · " + esc(a.firma) : "") +
      (a.bis ? " · Frist " + datumCH(a.bis) : "") +
      (a.erledigt_am && !istOffen(a) ? " · erledigt " + datumCH(a.erledigt_am) : "") +
      " " + statusBadge(a) + "</div></div>" +
      (bearbeitbar
        ? '<div class="pendenz-aktion">' +
          '<button class="btn still klein" type="button" data-aktion="arbeit-stand" data-id="' + a.id + '">' + weiter.text + "</button>" +
          '<button class="btn still klein" type="button" data-aktion="arbeit-bearbeiten" data-id="' + a.id + '">Bearbeiten</button>' +
          '<button class="btn still klein" type="button" data-aktion="arbeit-loeschen" data-id="' + a.id + '">Löschen</button>' +
          "</div>"
        : "") +
      "</li>";
  });
  return h + "</ul></div></section>";
}

/* ---------------------------------------------------------------- Formular */

function formular(Z, a, art) {
  dateiWartend = null;
  entwurf = a ? JSON.parse(JSON.stringify(a)) : {
    id: null, art, titel: "", beschreibung: "", firma: "", ort: "", status: "Offen",
    budgetposition_id: null, von: art === "arbeit" ? heuteISO() : "", bis: "",
    erledigt_am: null, datei_pfad: null, datei_name: null,
  };
  modalOeffnen({
    titel: (entwurf.id ? "Bearbeiten: " : "Neu: ") + (entwurf.art === "pendenz" ? "Pendenz / Mangel" : "Arbeit"),
    koerper: koerper(Z),
    speichern: () => speichern(Z),
  });
}

function koerper(Z) {
  const a = entwurf;
  const pendenz = a.art === "pendenz";
  let h = '<label class="feld"><span>' + (pendenz ? "Was fehlt oder ist mangelhaft" : "Arbeit") + "</span>" +
    '<input data-feld="titel" value="' + esc(a.titel) + '" placeholder="' +
    (pendenz ? "z.B. Steckdose Küche fehlt" : "z.B. Elektroinstallation EG") + '"></label>' +
    '<div class="feld-paar">' +
    '<label class="feld"><span>Gewerk / Kategorie</span><select data-feld="budgetposition_id">' +
    kategorieOptionen(Z.budget, a.budgetposition_id) + "</select></label>" +
    '<label class="feld"><span>Raum / Ort</span><input data-feld="ort" value="' + esc(a.ort) + '" placeholder="z.B. Küche"></label>' +
    "</div>" +
    '<label class="feld"><span>Firma</span><input data-feld="firma" value="' + esc(a.firma) + '" placeholder="z.B. Meier Elektro AG"></label>';

  h += '<div class="feld-paar">' +
    (pendenz
      ? '<label class="feld"><span>Frist</span><input type="date" data-feld="bis" value="' + esc(a.bis || "") + '"></label>'
      : '<label class="feld"><span>Beginn</span><input type="date" data-feld="von" value="' + esc(a.von || "") + '"></label>' +
        '<label class="feld"><span>Ende</span><input type="date" data-feld="bis" value="' + esc(a.bis || "") + '"></label>') +
    '<label class="feld"><span>Stand</span><select data-feld="status">' +
    ARBEIT_STATUS.map((s) => "<option" + (s === a.status ? " selected" : "") + ">" + s + "</option>").join("") +
    "</select></label></div>";

  h += '<label class="feld"><span>Bemerkung</span><textarea data-feld="beschreibung" placeholder="optional">' +
    esc(a.beschreibung || "") + "</textarea></label>";

  if (pendenz) h += fotoBlock();
  return h;
}

function fotoBlock() {
  const a = entwurf;
  if (a.datei_pfad) {
    return '<div class="hinweis info" style="margin-bottom:14px"><div style="flex:1"><b>Foto: ' + esc(a.datei_name || "") + "</b>" +
      '<div class="btn-reihe" style="margin-top:9px">' +
      '<button class="btn zweit klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(a.datei_pfad) + '">Foto öffnen</button>' +
      '<button class="btn still klein" type="button" data-aktion="pendenz-foto-weg">Foto entfernen</button>' +
      "</div></div></div>";
  }
  return '<div class="datei-feld" style="margin-bottom:14px"><p>Foto aufnehmen oder wählen (optional)</p>' +
    '<input type="file" id="p-foto" accept="image/*" capture="environment"></div>';
}

async function speichern(Z) {
  const a = entwurf;
  if (!a.titel.trim()) { meldung("Bitte eine Bezeichnung angeben.", true); return false; }

  const daten = {
    art: a.art,
    titel: a.titel.trim(),
    beschreibung: (a.beschreibung || "").trim(),
    firma: (a.firma || "").trim(),
    ort: (a.ort || "").trim(),
    status: a.status,
    budgetposition_id: a.budgetposition_id || null,
    von: a.von || null,
    bis: a.bis || null,
    // Beim Erledigen das Datum festhalten, beim Wiederöffnen entfernen.
    erledigt_am: a.status === "Erledigt" ? (a.erledigt_am || heuteISO()) : null,
    datei_pfad: a.datei_pfad,
    datei_name: a.datei_name,
  };

  const feld = document.getElementById("p-foto");
  if (!dateiWartend && feld && feld.files && feld.files[0]) dateiWartend = feld.files[0];

  try {
    if (dateiWartend) {
      const info = await hochladen(dateiWartend, Z.projektId, "arbeiten");
      daten.datei_pfad = info.datei_pfad;
      daten.datei_name = info.datei_name;
    }
    if (a.id) await arbeitAktualisieren(a.id, daten, a.geaendert_am);
    else await arbeitAnlegen(Z.projektId, daten);
    meldung(a.id ? "Gespeichert." : (a.art === "pendenz" ? "Pendenz erfasst." : "Arbeit geplant."));
    dateiWartend = null;
    await neuLaden(["arbeiten"]);
    return true;
  } catch (err) { meldung(err.message, true); return false; }
}

export function eingabe(e) {
  if (!document.querySelector(".modal") || !entwurf) return;
  const feld = e.target.closest("[data-feld]");
  if (!feld) return;
  const name = feld.dataset.feld;
  if (name === "budgetposition_id") { entwurf.budgetposition_id = feld.value || null; return; }
  entwurf[name] = feld.value;
}

/* ---------------------------------------------------------------- Aktionen */

export function aktion(a, knopf, Z) {
  if (a === "arbeit-neu") return formular(Z, null, "arbeit");
  if (a === "pendenz-neu") return formular(Z, null, "pendenz");
  if (a === "arbeit-bearbeiten") {
    const eintrag = (Z.arbeiten || []).find((x) => x.id === knopf.dataset.id);
    return formular(Z, eintrag, eintrag ? eintrag.art : "arbeit");
  }
  if (a === "arbeit-stand") {
    const eintrag = (Z.arbeiten || []).find((x) => x.id === knopf.dataset.id);
    if (!eintrag) return;
    const weiter = naechsterStand(eintrag);
    knopf.disabled = true;
    arbeitAktualisieren(eintrag.id, {
      status: weiter.status,
      erledigt_am: weiter.status === "Erledigt" ? heuteISO() : null,
    }, eintrag.geaendert_am)
      .then(() => neuLaden(["arbeiten"]))
      .catch((err) => { knopf.disabled = false; meldung(err.message, true); });
    return;
  }
  if (a === "arbeit-loeschen") {
    const eintrag = (Z.arbeiten || []).find((x) => x.id === knopf.dataset.id);
    if (eintrag && bestaetigen('"' + (eintrag.titel || "") + '" löschen?')) {
      (async () => {
        try {
          if (eintrag.datei_pfad) await dateiLoeschen(eintrag.datei_pfad);
          await arbeitLoeschen(eintrag.id);
          meldung("Gelöscht.");
          await neuLaden(["arbeiten"]);
        } catch (err) { meldung(err.message, true); }
      })();
    }
    return;
  }
  if (a === "pendenz-foto-weg") {
    if (entwurf.datei_pfad) dateiLoeschen(entwurf.datei_pfad).catch(() => {});
    entwurf.datei_pfad = null; entwurf.datei_name = null; dateiWartend = null;
    const koerperEl = document.querySelector(".modal-koerper");
    if (koerperEl) koerperEl.innerHTML = koerper(Z);
    return;
  }
  if (a === "datei-oeffnen" && knopf.dataset.pfad) {
    signierterLink(knopf.dataset.pfad).then((url) => { if (url) window.open(url, "_blank"); }).catch((e) => meldung(e.message, true));
  }
}
