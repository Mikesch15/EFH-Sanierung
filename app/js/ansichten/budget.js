import { esc, chf, chfKurz, zahl, meldung, bestaetigen } from "../format.js";
import { leerZustand, summen, budgetZaehlt } from "./gemeinsam.js";
import { budgetAnlegen, budgetAktualisieren, budgetLoeschen } from "../daten.js";
import { modalOeffnen, neuLaden, kannBearbeiten } from "../app.js";
import { STANDARD_KATEGORIEN } from "../konfig.js";
import * as Foerder from "./foerdergelder.js";

export function render(Z) {
  const s = summen(Z);
  const budgetiert = s.budgetiert;
  const bearbeitbar = kannBearbeiten();

  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Budget</h2>' +
    "<p>Sanierungsrahmen " + chfKurz(s.rahmen) + " · verplant " + chfKurz(budgetiert) +
    (s.spaeter ? " · später " + chfKurz(s.spaeter) : "") + "</p></div>" +
    (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="budget-neu">+ Position</button>' : "") +
    "</div>";

  if (!Z.budget.length) {
    h += leerZustand("Noch keine Budgetpositionen",
      "Legen Sie Positionen wie Elektro, Küche oder Fassade an, um Offerten und Rechnungen zuzuordnen.",
      bearbeitbar ? '<button class="btn" type="button" data-aktion="budget-neu">Erste Position anlegen</button>' : "");
  } else {
    const kv = (id) => (Z.kostenvergleich || []).find((k) => k.budgetposition_id === id) || { offerte: 0, rechnung: 0, bezahlt: 0 };
    h += '<div class="karte"><div class="tab-scroll"><table><thead><tr>' +
      "<th>Kategorie</th><th class=\"num\">Budget</th><th class=\"num\">Offerten</th>" +
      "<th class=\"num\">Rechnungen</th><th class=\"num\">Bezahlt</th><th class=\"num\">Differenz</th><th></th>" +
      "</tr></thead><tbody>";
    Z.budget.forEach((p) => {
      const k = kv(p.id);
      const zaehlt = budgetZaehlt(p);
      const ist = k.rechnung > 0 ? k.rechnung : k.offerte;
      const diff = zahl(p.betrag) - ist;
      h += '<tr' + (zaehlt ? "" : ' class="spaeter"') + "><td><b>" + esc(p.kategorie) + "</b>" +
        (zaehlt ? "" : ' <span class="badge">später</span>') +
        (p.bemerkung ? '<div style="font-size:.76rem;color:var(--grau);white-space:normal;max-width:260px">' + esc(p.bemerkung) + "</div>" : "") +
        "</td>" +
        '<td class="num">' + chf(p.betrag) + "</td>" +
        '<td class="num">' + chf(k.offerte) + "</td>" +
        '<td class="num">' + chf(k.rechnung) + "</td>" +
        '<td class="num">' + chf(k.bezahlt) + "</td>" +
        '<td class="num ' + (diff < 0 ? "neg" : "pos") + '">' + (diff >= 0 ? "+" : "") + chf(diff) + "</td>" +
        "<td>" + (bearbeitbar ? '<div class="zeile-aktion">' +
          '<button class="btn still klein" type="button" data-aktion="budget-umschalten" data-id="' + p.id + '">' +
          (zaehlt ? "Später" : "Einrechnen") + "</button>" +
          '<button class="btn still klein" type="button" data-aktion="budget-bearbeiten" data-id="' + p.id + '">Bearbeiten</button>' +
          '<button class="btn still klein" type="button" data-aktion="budget-loeschen" data-id="' + p.id + '">Löschen</button>' +
          "</div>" : "") + "</td></tr>";
    });
    h += "</tbody><tfoot><tr><td>Total berücksichtigte Positionen</td>" +
      '<td class="num">' + chf(budgetiert) + '</td><td class="num">' + chf(Z.budget.reduce((a, p) => a + kv(p.id).offerte, 0)) +
      '</td><td class="num">' + chf(Z.budget.reduce((a, p) => a + kv(p.id).rechnung, 0)) +
      '</td><td class="num">' + chf(Z.budget.reduce((a, p) => a + kv(p.id).bezahlt, 0)) +
      '</td><td class="num"></td><td></td></tr>' +
      (s.spaeter
        ? '<tr class="spaeter"><td>Erst später (' + s.spaeterAnzahl + ")</td>" +
          '<td class="num">' + chf(s.spaeter) + '</td><td colspan="5"></td></tr>'
        : "") +
      "</tfoot></table></div>" +
      (s.spaeter
        ? '<div class="karte-pad" style="border-top:1px solid var(--linie);font-size:.8rem;color:var(--grau)">' +
          "Auf «später» gestellte Positionen zählen nicht in die Summen und nicht in den " +
          "Sanierungsrahmen. Offerten und Rechnungen, die einer solchen Kategorie zugeordnet " +
          "sind, zählen weiterhin – dieses Geld ist bereits gebunden.</div>"
        : "") +
      "</div>";
  }
  h += "</section>";

  const liste = (Z.kostenvergleich || []).filter((k) => k.budget > 0 || k.offerte > 0 || k.rechnung > 0);
  h += '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Kostenvergleich</h2>' +
    "<p>Budget gegen Offerten und Rechnungen, über alle Kategorien</p></div></div>";
  if (!liste.length) {
    h += leerZustand("Noch nichts zu vergleichen", "Sobald Budget, Offerten oder Rechnungen erfasst sind, erscheint hier die Gegenüberstellung.", "");
  } else {
    let tB = 0, tO = 0, tR = 0, tZ = 0, tD = 0;
    h += '<div class="karte"><div class="tab-scroll"><table><thead><tr>' +
      "<th>Kategorie</th><th class=\"num\">Budget</th><th class=\"num\">Offerte</th><th class=\"num\">Rechnung</th>" +
      "<th class=\"num\">Bezahlt</th><th class=\"num\">Differenz zum Budget</th></tr></thead><tbody>";
    liste.forEach((k) => {
      // Budget und Differenz einer "später"-Position bleiben aus den Totalen heraus,
      // die tatsächlichen Kosten zählen mit.
      const zaehlt = budgetZaehlt(k);
      if (zaehlt) { tB += k.budget; tD += k.differenz; }
      tO += k.offerte; tR += k.rechnung; tZ += k.bezahlt;
      h += '<tr' + (zaehlt ? "" : ' class="spaeter"') + "><td><b>" + esc(k.kategorie) + "</b>" +
        (zaehlt ? "" : ' <span class="badge">später</span>') + "</td>" +
        '<td class="num">' + chf(k.budget) + '</td><td class="num">' + chf(k.offerte) +
        '</td><td class="num">' + chf(k.rechnung) + '</td><td class="num">' + chf(k.bezahlt) +
        '</td><td class="num ' + (k.differenz < 0 ? "neg" : "pos") + '">' + (k.differenz >= 0 ? "+" : "") + chf(k.differenz) + "</td></tr>";
    });
    h += "</tbody><tfoot><tr><td>Total</td><td class=\"num\">" + chf(tB) + '</td><td class="num">' + chf(tO) +
      '</td><td class="num">' + chf(tR) + '</td><td class="num">' + chf(tZ) +
      '</td><td class="num ' + (tD < 0 ? "neg" : "pos") + '">' + (tD >= 0 ? "+" : "") + chf(tD) + "</td></tr></tfoot></table></div>" +
      '<div class="karte-pad" style="border-top:1px solid var(--linie);font-size:.8rem;color:var(--grau)">' +
      "Als Ist-Kosten gilt die Rechnungssumme. Solange keine Rechnung erfasst ist, wird die Offertsumme verwendet. " +
      "Alle Beträge inklusive MWST." +
      (tB !== liste.reduce((a, k) => a + k.budget, 0)
        ? " Positionen mit «später» sind im Total der Budgetspalte nicht enthalten."
        : "") + "</div></div>";
  }
  h += "</section>";

  // Fördergelder stehen im selben Tab: Es ist dieselbe Frage – was kostet die
  // Sanierung und was kommt herein.
  return h + Foerder.render(Z);
}

function formular(Z, p) {
  const optionen = STANDARD_KATEGORIEN.concat(Z.budget.map((x) => x.kategorie).filter((k) => !STANDARD_KATEGORIEN.includes(k)));
  const koerper =
    '<label class="feld"><span>Kategorie</span>' +
    '<input id="f-kategorie" list="kat-liste" value="' + esc(p ? p.kategorie : "") + '" placeholder="z.B. Elektro" required>' +
    '<datalist id="kat-liste">' + optionen.map((k) => '<option value="' + esc(k) + '">').join("") + "</datalist></label>" +
    '<label class="feld"><span>Budgetbetrag (CHF, inkl. MWST)</span>' +
    '<input id="f-betrag" inputmode="decimal" value="' + (p ? zahl(p.betrag) : "") + '" placeholder="18000"></label>' +
    '<label class="feld"><span>Bemerkung</span><textarea id="f-bemerkung" placeholder="optional">' + esc(p ? p.bemerkung : "") + "</textarea></label>" +
    '<div class="check"><input type="checkbox" id="f-spaeter"' + (p && p.beruecksichtigt === false ? " checked" : "") + ">" +
    '<label for="f-spaeter" style="margin:0">Erst später berücksichtigen</label></div>' +
    '<p style="margin:-6px 0 4px;font-size:.78rem;color:var(--grau)">' +
    "Angehakt zählt der Budgetbetrag nirgends mit – die Position bleibt aber erfasst und lässt sich " +
    "jederzeit wieder einrechnen. Bereits erfasste Offerten und Rechnungen dieser Kategorie zählen " +
    "weiterhin, denn dieses Geld ist ausgegeben.</p>";

  modalOeffnen({
    titel: p ? "Budgetposition bearbeiten" : "Neue Budgetposition",
    koerper,
    speichern: async () => {
      const kategorie = document.getElementById("f-kategorie").value.trim();
      if (!kategorie) { meldung("Bitte eine Kategorie angeben.", true); return false; }
      const daten = {
        kategorie,
        betrag: zahl(document.getElementById("f-betrag").value),
        bemerkung: document.getElementById("f-bemerkung").value.trim(),
        beruecksichtigt: !document.getElementById("f-spaeter").checked,
      };
      try {
        if (p) await budgetAktualisieren(p.id, daten, p.geaendert_am);
        else await budgetAnlegen(Z.projektId, daten);
        meldung(p ? "Budgetposition aktualisiert." : "Budgetposition angelegt.");
        await neuLaden(["budget"]);
        return true;
      } catch (err) { meldung(err.message, true); return false; }
    },
  });
}

// Das Modal der Fördergelder lebt im selben Tab – Eingaben dorthin weiterreichen.
export function eingabe(e, Z) { Foerder.eingabe(e, Z); }

export function aktion(a, knopf, Z) {
  if (a.startsWith("foerder-") || a === "datei-oeffnen") return Foerder.aktion(a, knopf, Z);
  if (a === "budget-neu") return formular(Z, null);
  if (a === "budget-bearbeiten") return formular(Z, Z.budget.find((p) => p.id === knopf.dataset.id));
  if (a === "budget-umschalten") {
    const p = Z.budget.find((x) => x.id === knopf.dataset.id);
    if (!p) return;
    const neu = !budgetZaehlt(p);
    knopf.disabled = true;
    budgetAktualisieren(p.id, { beruecksichtigt: neu }, p.geaendert_am)
      .then(() => {
        meldung(neu ? '"' + p.kategorie + '" zählt jetzt mit.' : '"' + p.kategorie + '" ist auf später gestellt.');
        return neuLaden(["budget"]);   // lädt den Kostenvergleich mit
      })
      .catch((e) => { knopf.disabled = false; meldung(e.message, true); });
    return;
  }
  if (a === "budget-loeschen") {
    const p = Z.budget.find((x) => x.id === knopf.dataset.id);
    if (p && bestaetigen('Budgetposition "' + p.kategorie + '" löschen?')) {
      budgetLoeschen(p.id).then(() => { meldung("Budgetposition gelöscht."); neuLaden(["budget"]); }).catch((e) => meldung(e.message, true));
    }
  }
}
