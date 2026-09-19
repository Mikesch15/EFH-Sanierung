import { esc, chf, chfKurz, datumCH, zahl, meldung, bestaetigen, heuteISO } from "../format.js";
import { kpi, statusBadge, listenKarte, summen, offerteTotal, belegBrutto, kategorieName } from "./gemeinsam.js";
import {
  projektAnlegen, projektAktualisieren, mitgliederLaden, mitgliedHinzufuegen,
  mitgliedRolleAendern, mitgliedEntfernen, DatenFehler,
} from "../daten.js";
import { ROLLEN } from "../konfig.js";
import * as ImportModul from "../import.js";
import { Z as ZUstand, modalOeffnen, neuLaden, neuZeichnen, projektWechseln } from "../app.js";

let importDaten = null; // {erstellt, daten} während der Vorschau im Import-Modal

export function renderProjektAnlegen() {
  return '<main><div style="max-width:480px;margin:40px auto;padding:0 14px">' +
    '<div class="karte karte-pad">' +
    "<h2>Projekt einrichten</h2>" +
    '<p style="margin:6px 0 16px;font-size:.87rem;color:var(--text-2)">' +
    "Objekt, Adresse, Kaufpreis und Gesamtbudget sind noch nicht erfasst.</p>" +
    '<label class="feld"><span>Objekt / Projektname</span><input id="p-name" placeholder="z.B. Einfamilienhaus Tulpenweg 37"></label>' +
    '<label class="feld"><span>Adresse</span><input id="p-adresse" placeholder="Strasse Nr., PLZ Ort"></label>' +
    '<label class="feld"><span>Kaufpreis (CHF)</span><input id="p-kauf" inputmode="decimal" placeholder="0"></label>' +
    '<label class="feld"><span>Gesamtbudget (CHF)</span><input id="p-gesamt" inputmode="decimal" placeholder="0"></label>' +
    '<div id="p-fehler"></div>' +
    '<button class="btn breit" type="button" data-aktion="projekt-anlegen">Projekt anlegen</button>' +
    "</div></div></main>";
}

export function render(Z) {
  const s = summen(Z);
  let h = "";

  const anteilRahmen = s.rahmen > 0 ? Math.min(100, (s.rechnungen / s.rahmen) * 100) : 0;
  h += '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Übersicht</h2>' +
    "<p>" + esc([Z.projekt.name, Z.projekt.adresse].filter(Boolean).join(" · ") || "Projekt ohne Namen") +
    " · Stand " + datumCH(heuteISO()) + "</p></div>" +
    '<button class="btn still klein" type="button" data-aktion="eckdaten">Eckdaten</button></div>' +
    '<div class="kpi-raster">' +
    '<div class="kpi gross"><div class="label">Verfügbar für die Sanierung</div>' +
    '<div class="wert zahl">' + chfKurz(s.verfuegbar) + "</div>" +
    '<div class="zusatz">Sanierungsrahmen ' + chfKurz(s.rahmen) + " abzüglich Rechnungen und beauftragter Offerten</div></div>" +
    kpi("Gesamtbudget", chfKurz(s.gesamtbudget), "inkl. Kaufpreis und Nebenkosten", "") +
    kpi("Kaufpreis", chfKurz(s.kaufpreis), "aktueller Stand", "") +
    kpi("Sanierungsrahmen", chfKurz(s.rahmen), "Gesamtbudget − Kaufpreis", "rand-blau") +
    kpi("Offertsumme", chfKurz(s.offerten), Z.offerten.length + " Offerten, ohne abgelehnte", "rand-blau") +
    kpi("Rechnungssumme", chfKurz(s.rechnungen), Z.belege.length + " Belege, inkl. MWST", "rand-amber") +
    kpi("Bezahlt", chfKurz(s.bezahlt), "offen: " + chfKurz(s.offen), "rand-gruen") +
    "</div></section>";

  const b1 = s.rahmen > 0 ? Math.max(0, Math.min(100, (s.bezahlt / s.rahmen) * 100)) : 0;
  const b2 = s.rahmen > 0 ? Math.max(0, Math.min(100 - b1, ((s.rechnungen - s.bezahlt) / s.rahmen) * 100)) : 0;
  const b3 = s.rahmen > 0 ? Math.max(0, Math.min(100 - b1 - b2, (s.verpflichtet / s.rahmen) * 100)) : 0;
  h += '<section class="abschnitt"><div class="karte karte-pad">' +
    '<div class="abschnitt-kopf" style="margin-left:0;margin-right:0"><div><h3>Sanierungsbudget</h3>' +
    "<p>" + Math.round(anteilRahmen) + " % des Rahmens sind verrechnet</p></div>" +
    '<div class="zahl" style="font-weight:650">' + chfKurz(s.rechnungen) + " / " + chfKurz(s.rahmen) + "</div></div>" +
    '<div class="balken">' +
    '<i class="b-bezahlt" style="width:' + b1.toFixed(2) + '%"></i>' +
    '<i class="b-offen" style="width:' + b2.toFixed(2) + '%"></i>' +
    '<i class="b-verpflichtet" style="width:' + b3.toFixed(2) + '%"></i>' +
    "</div>" +
    '<div class="legende">' +
    '<span><i class="punkt" style="background:var(--blau-700)"></i>bezahlt ' + chfKurz(s.bezahlt) + "</span>" +
    '<span><i class="punkt" style="background:#8FB6D4"></i>Rechnungen offen ' + chfKurz(s.offen) + "</span>" +
    '<span><i class="punkt" style="background:#D3DFEA"></i>beauftragt, noch ohne Rechnung ' + chfKurz(s.verpflichtet) + "</span>" +
    "</div>" +
    (s.budgetiert > s.rahmen
      ? '<div class="hinweis warn" style="margin-top:12px"><div>Die Budgetpositionen ergeben ' + chf(s.budgetiert) +
        " und liegen damit über dem Sanierungsrahmen von " + chf(s.rahmen) + ".</div></div>"
      : "") +
    "</div></section>";

  const kats = (Z.kostenvergleich || []).filter((k) => k.budget > 0 || k.ist > 0).slice(0, 8);
  h += '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Kosten nach Kategorien</h2>' +
    "<p>Ist-Kosten im Vergleich zum Budget</p></div>" +
    '<button class="btn still klein" type="button" data-ansicht="budget">Alle</button></div><div class="karte karte-pad">';
  if (!kats.length) {
    h += '<div class="leer" style="padding:8px 0">Noch keine Kosten erfasst.</div>';
  } else {
    kats.forEach((k) => {
      const basis = Math.max(k.budget, k.ist, 1);
      const breite = Math.min(100, (k.ist / basis) * 100);
      const ueber = k.budget > 0 && k.ist > k.budget;
      h += '<div class="kat-zeile"><div class="kat-kopf"><b>' + esc(k.kategorie) + "</b>" +
        '<span class="zahl">' + chfKurz(k.ist) + " / " + chfKurz(k.budget) + "</span></div>" +
        '<div class="mini"><i class="' + (ueber ? "ueber" : "") + '" style="width:' + breite.toFixed(1) + '%"></i></div></div>';
    });
  }
  h += "</div></section>";

  h += '<div class="zwei-spalten">';
  h += listenKarte("Letzte Offerten", "offerten", Z.offerten.slice().reverse().slice(0, 4).map((o) => ({
    titel: (o.lieferant || "Ohne Lieferant") + " · " + (o.nummer || "ohne Nummer"),
    unter: datumCH(o.datum) + " · " + esc(kategorieName(Z.budget, o.budgetposition_id)),
    betrag: chfKurz(offerteTotal(o)),
    badge: statusBadge(o.status),
  })));
  h += listenKarte("Letzte Belege", "belege", Z.belege.slice().reverse().slice(0, 4).map((b) => ({
    titel: (b.lieferant || "Ohne Lieferant") + " · " + (b.nummer || "ohne Nummer"),
    unter: datumCH(b.datum) + " · " + esc(kategorieName(Z.budget, b.budgetposition_id)),
    betrag: chfKurz(belegBrutto(b)),
    badge: b.bezahlt ? '<span class="badge gruen">bezahlt</span>' : '<span class="badge amber">offen</span>',
  })));
  h += "</div>";

  h += listenKarte("Letzte Dokumente", "dokumente", Z.dokumente.slice().reverse().slice(0, 5).map((d) => ({
    titel: d.dateiname || "Ohne Namen", unter: (d.typ || "Sonstiges") + " · " + datumCH(d.datum), betrag: "", badge: "",
  })));

  h += mitgliederAbschnitt(Z);
  h += datenAbschnitt(Z);
  h += kontoAbschnitt(Z);
  return h;
}

function kontoAbschnitt(Z) {
  const projektWahl = Z.projekte.length > 1
    ? '<label class="feld" style="margin-top:12px"><span>Projekt wechseln</span><select id="projekt-wahl">' +
      Z.projekte.map((p) => '<option value="' + p.id + '"' + (p.id === Z.projektId ? " selected" : "") + ">" + esc(p.name || "Projekt") + "</option>").join("") +
      "</select></label>"
    : "";
  return '<section class="abschnitt"><div class="karte karte-pad">' +
    "<h3>Konto</h3>" +
    '<p style="margin:5px 0 12px;font-size:.84rem;color:var(--grau)">Angemeldet als ' + esc(Z.benutzer.email) +
    " · " + (ROLLEN[Z.meineRolle] || "keine Rolle") + "</p>" +
    projektWahl +
    '<div class="btn-reihe"><button class="btn zweit" type="button" data-aktion="abmelden">Abmelden</button></div>' +
    "</div></section>";
}

function mitgliederAbschnitt(Z) {
  const istEigentuemer = Z.meineRolle === "eigentuemer";
  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Mitglieder</h2>' +
    "<p>Wer sieht und bearbeitet dieses Projekt</p></div>" +
    (istEigentuemer ? '<button class="btn klein" type="button" data-aktion="mitglied-neu">+ Mitglied</button>' : "") +
    "</div><div class=\"karte karte-pad\">";
  h += (Z.mitglieder || []).map((m) => {
    const ichSelbst = m.benutzer_id === Z.benutzer.id;
    return '<div class="mitglied-zeile"><div class="haupt"><b>' + esc(m.email || m.benutzer_id) +
      (ichSelbst ? " (Sie)" : "") + "</b><span style=\"font-size:.78rem;color:var(--grau)\">" + ROLLEN[m.rolle] + "</span></div>" +
      (istEigentuemer && !ichSelbst
        ? '<select data-aenderung="mitglied-rolle" data-id="' + m.benutzer_id + '">' +
          Object.keys(ROLLEN).map((r) => '<option value="' + r + '"' + (r === m.rolle ? " selected" : "") + '>' + ROLLEN[r] + "</option>").join("") +
          '</select><button class="btn still klein" type="button" data-aktion="mitglied-entfernen" data-id="' + m.benutzer_id + '">Entfernen</button>'
        : "") + "</div>";
  }).join("");
  h += "</div></section>";
  return h;
}

function datenAbschnitt() {
  return '<section class="abschnitt"><div class="karte karte-pad">' +
    "<h3>Prototyp-Sicherung übernehmen</h3>" +
    '<p style="margin:5px 0 12px;font-size:.84rem;color:var(--grau)">' +
    "JSON-Export aus dem lokalen Prototyp (prototyp/index.html) einmalig in dieses Projekt einlesen. " +
    "Hochgeladene Dateien sind darin nicht enthalten.</p>" +
    '<div class="btn-reihe"><button class="btn zweit" type="button" data-aktion="import">Sicherung importieren</button></div>' +
    "</div></section>";
}

/* ----------------------------------------------------------------- Aktionen */
export function aenderung(e, Z) {
  if (e.target.dataset.aenderung === "mitglied-rolle") {
    mitgliedRolleAendern(Z.projektId, e.target.dataset.id, e.target.value)
      .then(async () => { meldung("Rolle geändert."); Z.mitglieder = await mitgliederLaden(Z.projektId); neuZeichnen(); })
      .catch((err) => meldung(err.message, true));
  }
}

export async function aktion(a, knopf, Z) {
  const el = (id) => document.getElementById(id);

  if (a === "projekt-anlegen") {
    const fehlerFeld = el("p-fehler");
    const zeigeFehler = (text) => {
      if (fehlerFeld) {
        fehlerFeld.innerHTML = '<div class="hinweis fehler" style="margin-bottom:12px"><div><b>Anlegen fehlgeschlagen</b>' +
          esc(text) + ' <a href="hilfe.html">Diagnose öffnen</a></div></div>';
      }
      meldung(text, true);
    };
    const name = el("p-name").value.trim();
    if (!name) { zeigeFehler("Bitte einen Projektnamen angeben."); return; }
    if (fehlerFeld) fehlerFeld.innerHTML = "";
    knopf.disabled = true;
    knopf.textContent = "Projekt wird angelegt …";
    try {
      const projekt = await projektAnlegen({
        name, adresse: el("p-adresse").value.trim(),
        kaufpreis: zahl(el("p-kauf").value), gesamtbudget: zahl(el("p-gesamt").value),
      });
      ZUstand.projekte.push(projekt);
      await projektWechseln(projekt.id);
      meldung("Projekt angelegt.");
    } catch (err) {
      knopf.disabled = false;
      knopf.textContent = "Projekt anlegen";
      zeigeFehler(err.message);
    }
    return;
  }

  if (a === "eckdaten") {
    const p = Z.projekt;
    modalOeffnen({
      titel: "Eckdaten des Projekts",
      koerper:
        '<label class="feld"><span>Objekt / Projektname</span><input id="e-name" value="' + esc(p.name) + '"></label>' +
        '<label class="feld"><span>Adresse</span><input id="e-adresse" value="' + esc(p.adresse || "") + '"></label>' +
        '<label class="feld"><span>Kaufpreis (CHF)</span><input id="e-kauf" inputmode="decimal" value="' + (zahl(p.kaufpreis) || "") + '"></label>' +
        '<label class="feld"><span>Gesamtbudget (CHF)</span><input id="e-gesamt" inputmode="decimal" value="' + (zahl(p.gesamtbudget) || "") + '"></label>' +
        '<div class="hinweis info"><div>Der Sanierungsrahmen ergibt sich aus Gesamtbudget minus Kaufpreis.</div></div>',
      speichern: async () => {
        try {
          const neu = await projektAktualisieren(p.id, {
            name: el("e-name").value.trim(), adresse: el("e-adresse").value.trim(),
            kaufpreis: zahl(el("e-kauf").value), gesamtbudget: zahl(el("e-gesamt").value),
          }, p.geaendert_am);
          Object.assign(ZUstand.projekt, neu);
          const ix = ZUstand.projekte.findIndex((x) => x.id === neu.id);
          if (ix !== -1) ZUstand.projekte[ix] = neu;
          meldung("Eckdaten gespeichert.");
          neuZeichnen();
          return true;
        } catch (err) { meldung(err.message, true); return false; }
      },
    });
    return;
  }

  if (a === "mitglied-neu") {
    modalOeffnen({
      titel: "Mitglied hinzufügen",
      koerper:
        '<label class="feld"><span>E-Mail-Adresse</span><input id="m-email" type="email" placeholder="partnerin@beispiel.ch"></label>' +
        '<label class="feld"><span>Rolle</span><select id="m-rolle">' +
        '<option value="bearbeiter" selected>Bearbeiter – lesen und schreiben</option>' +
        '<option value="leser">Leser – nur lesen</option>' +
        '<option value="handwerker">Handwerker – nur die zugewiesene Offerte</option></select></label>' +
        '<div class="hinweis info"><div>Die Person muss sich vorher selbst registrieren (mit derselben E-Mail-Adresse).</div></div>',
      speichern: async () => {
        try {
          await mitgliedHinzufuegen(Z.projektId, el("m-email").value.trim(), el("m-rolle").value);
          Z.mitglieder = await mitgliederLaden(Z.projektId);
          meldung("Mitglied hinzugefügt.");
          neuZeichnen();
          return true;
        } catch (err) { meldung(err.message, true); return false; }
      },
    });
    return;
  }

  if (a === "mitglied-entfernen") {
    if (!bestaetigen("Dieses Mitglied wirklich entfernen?")) return;
    try {
      await mitgliedEntfernen(Z.projektId, knopf.dataset.id);
      Z.mitglieder = await mitgliederLaden(Z.projektId);
      meldung("Mitglied entfernt.");
      neuZeichnen();
    } catch (err) { meldung(err.message, true); }
    return;
  }

  if (a === "import") return importOeffnen(Z, modalOeffnen, neuLaden);
}

function importOeffnen(Z, modalOeffnen, neuLaden) {
  importDaten = null;
  modalOeffnen({
    titel: "Prototyp-Sicherung importieren",
    koerper:
      '<div class="hinweis warn" style="margin-bottom:14px"><div><b>Wird zum aktuellen Projekt hinzugefügt</b>' +
      "Bestehende Daten werden nicht gelöscht oder überschrieben.</div></div>" +
      '<div class="datei-feld"><p>Sicherungsdatei (.json) auswählen</p><input type="file" id="i-datei" accept=".json,application/json"></div>' +
      '<div id="i-vorschau"></div>',
    knopfText: "Importieren",
    speichern: async () => {
      const feld = document.getElementById("i-datei");
      const datei = feld && feld.files ? feld.files[0] : null;
      if (!importDaten) {
        if (!datei) { meldung("Bitte eine Sicherungsdatei auswählen.", true); return false; }
        try {
          const text = await datei.text();
          importDaten = ImportModul.paketAusDatei(text);
        } catch (err) { meldung(err.message, true); return false; }
        if (ImportModul.bereitsImportiert(Z.projektId, importDaten.erstellt)) {
          meldung("Diese Sicherung wurde für dieses Projekt bereits importiert.", true);
          return false;
        }
        const v = ImportModul.importVorschau(importDaten.daten);
        document.getElementById("i-vorschau").innerHTML =
          '<div class="hinweis info" style="margin-top:14px"><div><b>Wird eingefügt</b>' +
          v.budget + " Budgetpositionen (ggf. weniger, falls Kategorie schon existiert), " +
          v.offerten + " Offerten, " + v.belege + " Belege, " + v.dokumente + " Dokumente.</div></div>";
        meldung("Bitte prüfen und erneut auf Importieren klicken, um zu bestätigen.");
        return false;
      }
      try {
        const ergebnis = await ImportModul.importDurchfuehren(Z.projektId, importDaten.erstellt, importDaten.daten);
        importDaten = null;
        await neuLaden();
        meldung(
          "Importiert: " + ergebnis.budgetpositionen + " neue Budgetpositionen, " +
          ergebnis.offerten + " Offerten, " + ergebnis.belege + " Belege, " + ergebnis.dokumente + " Dokumente."
        );
        return true;
      } catch (err) { meldung(err.message, true); return false; }
    },
  });
}
