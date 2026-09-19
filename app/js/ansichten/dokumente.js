import { esc, datumCH, heuteISO, meldung, bestaetigen, dateigroesse } from "../format.js";
import { leerZustand, kategorieOptionen, kategorieName } from "./gemeinsam.js";
import { dokumenteAnlegen, dokumentAktualisieren, dokumentLoeschen } from "../daten.js";
import { hochladen, signierterLink, vorschauLinks, loeschen as dateiLoeschen, dateiPruefen } from "../dateien.js";
import { modalOeffnen, neuLaden, kannBearbeiten } from "../app.js";
import { DOKUMENT_TYPEN } from "../konfig.js";

// Was der Browser als Bild anzeigen kann. HEIC gehört bewusst nicht dazu: Es zählt
// als Foto, lässt sich aber ausserhalb von Safari nicht darstellen – dafür gibt es
// unten eine Ersatzkachel statt eines kaputten Bildes.
const BILD_ENDUNG = /\.(jpe?g|png|webp|gif|heic|heif)$/i;
const ANZEIGBAR = /^image\/(jpeg|png|webp|gif)$/i;

function istFoto(d) {
  if (d.mime_typ) return d.mime_typ.startsWith("image/");
  return BILD_ENDUNG.test(d.dateiname || "");
}
function istAnzeigbar(d) {
  if (d.mime_typ) return ANZEIGBAR.test(d.mime_typ);
  return /\.(jpe?g|png|webp|gif)$/i.test(d.dateiname || "");
}

// Einmal geholte Vorschau-Adressen halten: Ohne diesen Puffer würde jede
// Aktualisierung (auch die von anderen Geräten) alle Bilder neu anfragen.
const vorschauSpeicher = new Map();   // Pfad → { url, zeit }
const VORSCHAU_GUELTIG_MS = 8 * 60 * 1000;
let vorschauLaeuft = false;

function vorschauAusSpeicher(pfad) {
  const eintrag = vorschauSpeicher.get(pfad);
  if (!eintrag || Date.now() - eintrag.zeit > VORSCHAU_GUELTIG_MS) return null;
  return eintrag.url;
}

/** Holt die fehlenden Vorschau-Adressen und setzt sie in die schon gezeichneten Kacheln. */
async function vorschauenNachladen() {
  if (vorschauLaeuft) return;
  // Lädt eine Adresse nicht (abgelaufen, gelöscht), zeigt die Kachel Text statt
  // eines kaputten Bildsymbols.
  document.querySelectorAll("img[data-vorschau]").forEach((bild) => {
    if (bild.dataset.wacht) return;
    bild.dataset.wacht = "1";
    bild.addEventListener("error", () => kachelOhneBild(bild, "Vorschau nicht geladen"));
  });
  const offen = Array.from(document.querySelectorAll("img[data-vorschau]"))
    .filter((bild) => !bild.getAttribute("src"));
  const pfade = [...new Set(offen.map((bild) => bild.dataset.vorschau))];
  if (!pfade.length) return;
  vorschauLaeuft = true;
  try {
    const karte = await vorschauLinks(pfade);
    Object.entries(karte).forEach(([pfad, url]) => vorschauSpeicher.set(pfad, { url, zeit: Date.now() }));
    offen.forEach((bild) => {
      const url = karte[bild.dataset.vorschau];
      if (url) bild.setAttribute("src", url);
      else kachelOhneBild(bild, "kein Zugriff");
    });
  } catch (e) {
    offen.forEach((bild) => kachelOhneBild(bild, "Vorschau nicht geladen"));
  } finally {
    vorschauLaeuft = false;
  }
}

/** Ersatz für ein Bild, das nicht angezeigt werden kann – nie ein kaputtes Symbol. */
function kachelOhneBild(bild, text) {
  const halter = bild.parentElement;
  if (!halter) return;
  bild.remove();
  halter.innerHTML = '<span class="foto-ersatz">' + esc(text) + "</span>";
}

export function render(Z) {
  const bearbeitbar = kannBearbeiten();
  const fotos = Z.dokumente.filter(istFoto).slice().reverse();
  const uebrige = Z.dokumente.filter((d) => !istFoto(d)).slice().reverse();

  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Dokumente</h2>' +
    "<p>" + uebrige.length + (uebrige.length === 1 ? " Dokument" : " Dokumente") +
    (fotos.length ? " · " + fotos.length + (fotos.length === 1 ? " Foto" : " Fotos") : "") +
    "</p></div>" +
    (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="dokument-neu">+ Dateien</button>' : "") + "</div>";

  if (!Z.dokumente.length) {
    h += leerZustand("Die Ablage ist leer",
      "Mehrere Dateien auf einmal hochladen und anschliessend Typ, Datum und Kategorie ergänzen.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="dokument-neu">Dateien hochladen</button>' : "");
    return h + "</section>";
  }

  if (!uebrige.length) {
    h += '<div class="karte karte-pad"><div class="leer" style="padding:8px 0">' +
      "Nur Fotos abgelegt – Verträge, Pläne und Bewilligungen erscheinen hier.</div></div>";
  } else {
  h += '<div class="karte"><div class="tab-scroll"><table><thead><tr>' +
    "<th>Dateiname</th><th>Dokumenttyp</th><th>Datum</th><th>Kategorie</th><th>Bemerkung</th><th></th></tr></thead><tbody>";
  uebrige.forEach((d) => {
    h += "<tr><td><b>" + esc(d.dateiname) + "</b>" +
      (d.groesse ? ' <span class="badge">' + dateigroesse(d.groesse) + "</span>" : "") + "</td>" +
      "<td>" + esc(d.typ || "Sonstiges") + "</td>" +
      "<td>" + datumCH(d.datum) + "</td>" +
      "<td>" + esc(kategorieName(Z.budget, d.budgetposition_id)) + "</td>" +
      '<td style="white-space:normal;max-width:260px">' + esc(d.bemerkung || "") + "</td>" +
      '<td><div class="zeile-aktion">' +
      (d.datei_pfad ? '<button class="btn still klein" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(d.datei_pfad) + '">Öffnen</button>' : "") +
      '<button class="btn still klein" type="button" data-aktion="dokument-bearbeiten" data-id="' + d.id + '">' + (bearbeitbar ? "Bearbeiten" : "Ansehen") + "</button>" +
      (bearbeitbar ? '<button class="btn still klein" type="button" data-aktion="dokument-loeschen" data-id="' + d.id + '">Löschen</button>' : "") +
      "</div></td></tr>";
  });
  h += "</tbody></table></div></div>";
  }
  h += "</section>";

  if (fotos.length) h += fotoAbschnitt(Z, fotos, bearbeitbar);
  return h;
}

/** Fotos als Galerie: Ein Bild erkennt man schneller, als man einen Dateinamen liest. */
function fotoAbschnitt(Z, fotos, bearbeitbar) {
  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Fotos</h2>' +
    "<p>" + fotos.length + " Bilder · zum Vergrössern antippen</p></div></div>" +
    '<div class="foto-raster">';

  fotos.forEach((d) => {
    const gespeichert = d.datei_pfad ? vorschauAusSpeicher(d.datei_pfad) : null;
    h += '<figure class="foto-kachel">' +
      '<button class="foto-bild" type="button" data-aktion="datei-oeffnen" data-pfad="' + esc(d.datei_pfad || "") + '"' +
      ' title="' + esc(d.dateiname) + '">' +
      (d.datei_pfad && istAnzeigbar(d)
        ? '<img alt="' + esc(d.dateiname) + '" loading="lazy" data-vorschau="' + esc(d.datei_pfad) + '"' +
          (gespeichert ? ' src="' + esc(gespeichert) + '"' : "") + ">"
        : '<span class="foto-ersatz">' + (d.datei_pfad ? "Format ohne Vorschau" : "keine Datei") + "</span>") +
      "</button>" +
      '<figcaption><b title="' + esc(d.dateiname) + '">' + esc(d.dateiname) + "</b>" +
      "<span>" + (d.datum ? datumCH(d.datum) : "ohne Datum") +
      (d.budgetposition_id ? " · " + esc(kategorieName(Z.budget, d.budgetposition_id)) : "") + "</span>" +
      (d.bemerkung ? '<span class="bemerkung">' + esc(d.bemerkung) + "</span>" : "") +
      '<span class="foto-aktionen">' +
      '<button class="btn still klein" type="button" data-aktion="dokument-bearbeiten" data-id="' + d.id + '">' +
      (bearbeitbar ? "Bearbeiten" : "Ansehen") + "</button>" +
      (bearbeitbar ? '<button class="btn still klein" type="button" data-aktion="dokument-loeschen" data-id="' + d.id + '">Löschen</button>' : "") +
      "</span></figcaption></figure>";
  });

  // Die Adressen sind signiert und laufen ab – sie werden erst geholt, wenn die
  // Kacheln stehen, und nur für die, die noch keine haben.
  setTimeout(vorschauenNachladen, 0);
  return h + "</div></section>";
}

function hochladenFormular(Z) {
  modalOeffnen({
    titel: "Dokumente hochladen",
    koerper:
      '<div class="datei-feld" style="margin-bottom:14px"><p>Mehrere Dateien auswählen (PDF, JPG, PNG, HEIC, WEBP – je max. 25 MB)</p>' +
      '<input type="file" id="d-dateien" multiple accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"></div>' +
      '<div class="feld-paar">' +
      '<label class="feld"><span>Dokumenttyp</span><select id="d-typ">' + DOKUMENT_TYPEN.map((t) => "<option>" + t + "</option>").join("") + "</select></label>" +
      '<label class="feld"><span>Datum</span><input type="date" id="d-datum" value="' + heuteISO() + '"></label></div>' +
      '<label class="feld"><span>Kategorie</span><select id="d-kategorie">' + kategorieOptionen(Z.budget, null) + "</select></label>" +
      '<label class="feld"><span>Bemerkung</span><textarea id="d-bemerkung" placeholder="gilt für alle gewählten Dateien"></textarea></label>' +
      '<div id="d-fortschritt"></div>',
    knopfText: "Hochladen",
    speichern: async () => {
      const feld = document.getElementById("d-dateien");
      const dateien = feld && feld.files ? Array.from(feld.files) : [];
      if (!dateien.length) { meldung("Bitte mindestens eine Datei auswählen.", true); return false; }

      for (const datei of dateien) {
        const fehler = dateiPruefen(datei);
        if (fehler) { meldung(datei.name + ": " + fehler, true); return false; }
      }

      const typ = document.getElementById("d-typ").value;
      const datum = document.getElementById("d-datum").value || null;
      const budgetposition_id = document.getElementById("d-kategorie").value || null;
      const bemerkung = document.getElementById("d-bemerkung").value.trim();
      const fortschritt = document.getElementById("d-fortschritt");

      const zeilen = [];
      try {
        for (let i = 0; i < dateien.length; i++) {
          fortschritt.innerHTML = '<div class="hinweis info"><div>Lade Datei ' + (i + 1) + " von " + dateien.length + " hoch …</div></div>";
          const info = await hochladen(dateien[i], Z.projektId, "dokumente");
          zeilen.push({
            budgetposition_id, dateiname: dateien[i].name, typ, datum, bemerkung,
            datei_pfad: info.datei_pfad, mime_typ: dateien[i].type || null, groesse: dateien[i].size,
          });
        }
        await dokumenteAnlegen(Z.projektId, zeilen);
        meldung(zeilen.length + " Dokument(e) gespeichert.");
        await neuLaden(["dokumente"]);
        return true;
      } catch (err) {
        await Promise.allSettled(zeilen.map((z) => dateiLoeschen(z.datei_pfad)));
        meldung(err.message, true);
        return false;
      }
    },
  });
}

function bearbeitenFormular(Z, d) {
  modalOeffnen({
    titel: "Dokument bearbeiten",
    koerper:
      '<label class="feld"><span>Dateiname / Bezeichnung</span><input id="d-name" value="' + esc(d.dateiname) + '"></label>' +
      '<div class="feld-paar">' +
      '<label class="feld"><span>Dokumenttyp</span><select id="d-typ">' +
      DOKUMENT_TYPEN.map((t) => "<option" + (t === d.typ ? " selected" : "") + ">" + t + "</option>").join("") +
      (!DOKUMENT_TYPEN.includes(d.typ) && d.typ ? "<option selected>" + esc(d.typ) + "</option>" : "") +
      "</select></label>" +
      '<label class="feld"><span>Datum</span><input type="date" id="d-datum" value="' + esc(d.datum || "") + '"></label></div>' +
      '<label class="feld"><span>Kategorie</span><select id="d-kategorie">' + kategorieOptionen(Z.budget, d.budgetposition_id) + "</select></label>" +
      '<label class="feld"><span>Bemerkung</span><textarea id="d-bemerkung">' + esc(d.bemerkung || "") + "</textarea></label>",
    speichern: async () => {
      try {
        await dokumentAktualisieren(d.id, {
          dateiname: document.getElementById("d-name").value.trim() || d.dateiname,
          typ: document.getElementById("d-typ").value,
          datum: document.getElementById("d-datum").value || null,
          budgetposition_id: document.getElementById("d-kategorie").value || null,
          bemerkung: document.getElementById("d-bemerkung").value.trim(),
        }, d.geaendert_am);
        meldung("Dokument aktualisiert.");
        await neuLaden(["dokumente"]);
        return true;
      } catch (err) { meldung(err.message, true); return false; }
    },
  });
}

export function aktion(a, knopf, Z) {
  if (a === "dokument-neu") return hochladenFormular(Z);
  if (a === "dokument-bearbeiten") return bearbeitenFormular(Z, Z.dokumente.find((d) => d.id === knopf.dataset.id));
  if (a === "dokument-loeschen") {
    const d = Z.dokumente.find((x) => x.id === knopf.dataset.id);
    if (d && bestaetigen('Dokument "' + d.dateiname + '" löschen?')) {
      (async () => {
        try {
          if (d.datei_pfad) await dateiLoeschen(d.datei_pfad);
          await dokumentLoeschen(d.id);
          meldung("Dokument gelöscht.");
          await neuLaden(["dokumente"]);
        } catch (err) { meldung(err.message, true); }
      })();
    }
    return;
  }
  if (a === "datei-oeffnen") {
    signierterLink(knopf.dataset.pfad).then((url) => { if (url) window.open(url, "_blank"); }).catch((e) => meldung(e.message, true));
  }
}
