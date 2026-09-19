import { esc, datumCH, heuteISO, meldung, bestaetigen, dateigroesse } from "../format.js";
import { leerZustand, kategorieOptionen, kategorieName } from "./gemeinsam.js";
import { dokumenteAnlegen, dokumentAktualisieren, dokumentLoeschen } from "../daten.js";
import { hochladen, signierterLink, loeschen as dateiLoeschen, dateiPruefen } from "../dateien.js";
import { modalOeffnen, neuLaden, kannBearbeiten } from "../app.js";
import { DOKUMENT_TYPEN } from "../konfig.js";

export function render(Z) {
  const bearbeitbar = kannBearbeiten();
  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Dokumente</h2>' +
    "<p>" + Z.dokumente.length + " Ablagen · Kaufvertrag, Pläne, Bewilligungen, Garantien</p></div>" +
    (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="dokument-neu">+ Dateien</button>' : "") + "</div>";

  if (!Z.dokumente.length) {
    h += leerZustand("Die Ablage ist leer",
      "Mehrere Dateien auf einmal hochladen und anschliessend Typ, Datum und Kategorie ergänzen.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="dokument-neu">Dateien hochladen</button>' : "");
    return h + "</section>";
  }

  h += '<div class="karte"><div class="tab-scroll"><table><thead><tr>' +
    "<th>Dateiname</th><th>Dokumenttyp</th><th>Datum</th><th>Kategorie</th><th>Bemerkung</th><th></th></tr></thead><tbody>";
  Z.dokumente.slice().reverse().forEach((d) => {
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
  return h + "</tbody></table></div></div></section>";
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
