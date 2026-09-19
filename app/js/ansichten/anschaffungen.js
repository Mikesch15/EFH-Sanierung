// Anschaffungen ausserhalb des Sanierungsbudgets: Umzug, Möbel, Haushaltgeräte,
// Maschinen und Werkzeug. Meist über einen eigenen Kredit finanziert.
//
// Diese Beträge fliessen bewusst in KEINE Budgetzahl ein – nicht in den
// Sanierungsrahmen, nicht in den verfügbaren Betrag, nicht in den
// Kostenvergleich. Sonst stimmt die Aussage «so viel bleibt für die Sanierung»
// nicht mehr. Sie stehen als eigene Liste mit eigener Summe da.
import { esc, chf, chfKurz, datumCH, zahl, heuteISO, meldung, bestaetigen } from "../format.js";
import { leerZustand, summen } from "./gemeinsam.js";
import { anschaffungAnlegen, anschaffungAktualisieren, anschaffungLoeschen } from "../daten.js";
import { modalOeffnen, neuLaden, kannBearbeiten } from "../app.js";
import { ANSCHAFFUNG_ARTEN, FINANZIERUNGEN } from "../konfig.js";

let entwurf = null;

export function render(Z) {
  const liste = Z.anschaffungen || [];
  const s = summen(Z);
  const bearbeitbar = kannBearbeiten();

  let h = '<section class="abschnitt" id="abschnitt-anschaffungen">' +
    '<div class="abschnitt-kopf"><div><h2>Anschaffungen</h2>' +
    "<p>Umzug, Einrichtung, Maschinen – ausserhalb des Sanierungsbudgets</p></div>" +
    (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="ansch-neu">+ Anschaffung</button>' : "") +
    "</div>";

  if (!liste.length) {
    h += leerZustand("Noch keine Anschaffungen erfasst",
      "Hier gehören Kosten hin, die nicht zur Sanierung zählen: Umzug, Möbel, Haushaltgeräte, " +
      "Maschinen und Werkzeug. Sie verändern den Sanierungsrahmen nicht.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="ansch-neu">Erste Anschaffung erfassen</button>' : "");
    return h + "</section>";
  }

  h += '<div class="karte"><div class="tab-scroll"><table><thead><tr>' +
    "<th>Anschaffung</th><th>Art</th><th>Datum</th><th>Finanzierung</th><th>Zahlung</th>" +
    '<th class="num">Betrag</th><th></th></tr></thead><tbody>';
  liste.forEach((a) => {
    h += "<tr><td><b>" + esc(a.bezeichnung || "Ohne Bezeichnung") + "</b>" +
      (a.bemerkung ? '<div style="font-size:.76rem;color:var(--grau);white-space:normal;max-width:260px">' + esc(a.bemerkung) + "</div>" : "") +
      "</td>" +
      "<td>" + esc(a.kategorie || "–") + "</td>" +
      "<td>" + (a.datum ? datumCH(a.datum) : "–") + "</td>" +
      "<td>" + (a.finanzierung === "Eigenmittel"
        ? '<span class="badge">Eigenmittel</span>'
        : '<span class="badge blau">Kredit</span>') + "</td>" +
      "<td>" + (a.bezahlt ? '<span class="badge gruen">bezahlt</span>' : '<span class="badge amber">offen</span>') + "</td>" +
      '<td class="num"><b>' + chf(a.betrag) + "</b></td>" +
      '<td><div class="zeile-aktion">' +
      '<button class="btn still klein" type="button" data-aktion="ansch-bearbeiten" data-id="' + a.id + '">' + (bearbeitbar ? "Bearbeiten" : "Ansehen") + "</button>" +
      (bearbeitbar ? '<button class="btn still klein" type="button" data-aktion="ansch-loeschen" data-id="' + a.id + '">Löschen</button>' : "") +
      "</div></td></tr>";
  });
  h += '</tbody><tfoot><tr><td colspan="5">Total Anschaffungen · davon bezahlt ' + chf(s.anschaffungenBezahlt) + "</td>" +
    '<td class="num">' + chf(s.anschaffungenSumme) + "</td><td></td></tr></tfoot></table></div>";

  // Kredit: nur zeigen, wenn er auch eine Rolle spielt.
  if (s.kreditRahmen || s.kreditVerwendet) {
    const anteil = s.kreditRahmen > 0 ? Math.max(0, Math.min(100, (s.kreditVerwendet / s.kreditRahmen) * 100)) : 0;
    h += '<div class="karte-pad" style="border-top:1px solid var(--linie)">' +
      '<div class="abschnitt-kopf" style="margin:0 0 9px"><div><h3>Kredit</h3>' +
      "<p>" + (s.kreditRahmen
        ? "über Kredit finanziert " + chfKurz(s.kreditVerwendet) + " von " + chfKurz(s.kreditRahmen)
        : "über Kredit finanziert " + chfKurz(s.kreditVerwendet) + " · kein Kreditrahmen erfasst") + "</p></div>" +
      (kannBearbeiten() ? '<button class="btn still klein" type="button" data-aktion="kredit-rahmen">Kreditrahmen</button>' : "") +
      "</div>" +
      (s.kreditRahmen
        ? '<div class="balken"><i class="b-bezahlt" style="width:' + anteil.toFixed(2) + '%"></i></div>' +
          '<div class="legende"><span><i class="punkt" style="background:var(--blau-700)"></i>verwendet ' +
          chfKurz(s.kreditVerwendet) + "</span>" +
          '<span><i class="punkt" style="background:#D3DFEA"></i>frei ' + chfKurz(s.kreditFrei) + "</span></div>" +
          (s.kreditFrei < 0
            ? '<div class="hinweis warn" style="margin-top:12px"><div>Die Anschaffungen übersteigen den Kreditrahmen um ' +
              chf(-s.kreditFrei) + ".</div></div>"
            : "")
        : "") +
      "</div>";
  } else if (kannBearbeiten()) {
    h += '<div class="karte-pad" style="border-top:1px solid var(--linie);font-size:.8rem;color:var(--grau)">' +
      "Wurde dafür ein Kredit aufgenommen? " +
      '<button class="btn still klein" type="button" data-aktion="kredit-rahmen">Kreditrahmen erfassen</button></div>';
  }

  h += '<div class="karte-pad" style="border-top:1px solid var(--linie);font-size:.8rem;color:var(--grau)">' +
    "Diese Beträge zählen nicht zum Sanierungsbudget: Sie verändern weder den Sanierungsrahmen " +
    "noch den verfügbaren Betrag noch den Kostenvergleich.</div></div>";

  return h + "</section>";
}

function formular(Z, a) {
  entwurf = a ? JSON.parse(JSON.stringify(a)) : {
    id: null, bezeichnung: "", kategorie: "", betrag: 0, datum: heuteISO(),
    bezahlt: false, finanzierung: "Kredit", bemerkung: "",
  };
  modalOeffnen({
    titel: entwurf.id ? "Anschaffung bearbeiten" : "Neue Anschaffung",
    koerper: koerper(),
    speichern: () => speichern(Z),
  });
}

function koerper() {
  const a = entwurf;
  return '<label class="feld"><span>Anschaffung</span>' +
    '<input data-feld="bezeichnung" value="' + esc(a.bezeichnung) + '" placeholder="z.B. Waschmaschine"></label>' +
    '<div class="feld-paar">' +
    '<label class="feld"><span>Art</span><input list="ansch-arten" data-feld="kategorie" value="' + esc(a.kategorie) + '" placeholder="z.B. Haushaltgeräte">' +
    '<datalist id="ansch-arten">' + ANSCHAFFUNG_ARTEN.map((x) => '<option value="' + esc(x) + '">').join("") + "</datalist></label>" +
    '<label class="feld"><span>Betrag (CHF)</span><input inputmode="decimal" data-feld="betrag" value="' + zahl(a.betrag) + '" placeholder="1200"></label>' +
    "</div>" +
    '<div class="feld-paar">' +
    '<label class="feld"><span>Datum</span><input type="date" data-feld="datum" value="' + esc(a.datum || "") + '"></label>' +
    '<label class="feld"><span>Finanzierung</span><select data-feld="finanzierung">' +
    FINANZIERUNGEN.map((x) => "<option" + (x === a.finanzierung ? " selected" : "") + ">" + x + "</option>").join("") +
    "</select></label></div>" +
    '<label class="check"><input type="checkbox" data-feld="bezahlt"' + (a.bezahlt ? " checked" : "") + "> Bereits bezahlt</label>" +
    '<label class="feld"><span>Bemerkung</span><textarea data-feld="bemerkung" placeholder="optional">' + esc(a.bemerkung || "") + "</textarea></label>" +
    '<div class="hinweis info"><div>Diese Kosten bleiben ausserhalb des Sanierungsbudgets und verändern ' +
    "den verfügbaren Betrag nicht.</div></div>";
}

async function speichern(Z) {
  const a = entwurf;
  if (!a.bezeichnung.trim()) { meldung("Bitte eine Bezeichnung angeben.", true); return false; }
  const daten = {
    bezeichnung: a.bezeichnung.trim(),
    kategorie: a.kategorie.trim(),
    betrag: zahl(a.betrag),
    datum: a.datum || null,
    bezahlt: !!a.bezahlt,
    finanzierung: a.finanzierung === "Eigenmittel" ? "Eigenmittel" : "Kredit",
    bemerkung: a.bemerkung.trim(),
  };
  try {
    if (a.id) await anschaffungAktualisieren(a.id, daten, a.geaendert_am);
    else await anschaffungAnlegen(Z.projektId, daten);
    meldung(a.id ? "Anschaffung aktualisiert." : "Anschaffung erfasst.");
    await neuLaden(["anschaffungen"]);
    return true;
  } catch (err) { meldung(err.message, true); return false; }
}

export function eingabe(e) {
  if (!document.querySelector(".modal") || !entwurf) return;
  const feld = e.target.closest("[data-feld]");
  if (!feld) return;
  entwurf[feld.dataset.feld] = feld.type === "checkbox" ? feld.checked : feld.value;
}

export function aktion(a, knopf, Z) {
  if (a === "ansch-neu") return formular(Z, null);
  if (a === "ansch-bearbeiten") return formular(Z, (Z.anschaffungen || []).find((x) => x.id === knopf.dataset.id));
  if (a === "ansch-loeschen") {
    const x = (Z.anschaffungen || []).find((y) => y.id === knopf.dataset.id);
    if (x && bestaetigen('Anschaffung "' + (x.bezeichnung || "") + '" löschen?')) {
      anschaffungLoeschen(x.id)
        .then(() => { meldung("Anschaffung gelöscht."); return neuLaden(["anschaffungen"]); })
        .catch((err) => meldung(err.message, true));
    }
    return;
  }
  if (a === "kredit-rahmen") return kreditFormular(Z);
}

/** Der Kreditrahmen steht beim Projekt – hier bearbeitbar, weil er nur hier eine Rolle spielt. */
function kreditFormular(Z) {
  const p = Z.projekt;
  modalOeffnen({
    titel: "Kredit für Anschaffungen",
    koerper:
      '<label class="feld"><span>Aufgenommener Kredit (CHF)</span>' +
      '<input id="k-rahmen" inputmode="decimal" value="' + (zahl(p.kredit_rahmen) || "") + '" placeholder="30000"></label>' +
      '<div class="hinweis info"><div>Der Kredit gehört nicht zum Gesamtbudget der Liegenschaft. ' +
      "Er dient nur dazu, den Anschaffungen einen Rahmen zu geben – 0 blendet ihn wieder aus.</div></div>",
    speichern: async () => {
      try {
        const { projektAktualisieren } = await import("../daten.js");
        const { Z: ZUstand, neuZeichnen } = await import("../app.js");
        const neu = await projektAktualisieren(p.id, { kredit_rahmen: zahl(document.getElementById("k-rahmen").value) }, p.geaendert_am);
        Object.assign(ZUstand.projekt, neu);
        const ix = ZUstand.projekte.findIndex((x) => x.id === neu.id);
        if (ix !== -1) ZUstand.projekte[ix] = neu;
        meldung("Kreditrahmen gespeichert.");
        neuZeichnen();
        return true;
      } catch (err) { meldung(err.message, true); return false; }
    },
  });
}
