import { esc, chf, chfKurz, datumCH, zahl, meldung, bestaetigen, heuteISO } from "../format.js";
import { kpi, statusBadge, listenKarte, summen, offerteTotal, belegBrutto, kategorieName, budgetZaehlt } from "./gemeinsam.js";
import {
  projektAnlegen, projektAktualisieren, projekteLaden, mitgliederLaden,
  mitgliedRolleAendern, mitgliedEntfernen,
  einladungenLaden, einladungAnlegen, einladungZuruecknehmen,
  nebenkostenAnlegen, nebenkostenAktualisieren, nebenkostenLoeschen,
} from "../daten.js";
import { ROLLEN, NEBENKOSTEN_ARTEN } from "../konfig.js";
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
    '<p style="margin:-4px 0 12px;font-size:.78rem;color:var(--grau)">' +
    "Kaufnebenkosten (Notariat, Handänderungssteuer, Grundbuch …) erfassen Sie danach " +
    "einzeln in der Übersicht.</p>" +
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
    '<div class="zusatz">Sanierungsrahmen ' + chfKurz(s.rahmen) + " abzüglich Rechnungen und beauftragter Offerten" +
    (s.foerderGesichert ? ", zuzüglich gesicherter Fördergelder " + chfKurz(s.foerderGesichert) : "") + "</div></div>" +
    kpi("Gesamtbudget", chfKurz(s.gesamtbudget), "inkl. Kaufpreis und Nebenkosten", "") +
    kpi("Kaufpreis", chfKurz(s.kaufpreis),
      s.kaufnebenkosten ? "zzgl. Nebenkosten " + chfKurz(s.kaufnebenkosten) : "ohne Nebenkosten", "") +
    kpi("Kaufnebenkosten", chfKurz(s.kaufnebenkosten),
      (Z.nebenkosten || []).length + " Positionen, siehe unten", "") +
    kpi("Sanierungsrahmen", chfKurz(s.rahmen), "Gesamtbudget − Kaufpreis − Nebenkosten", "rand-blau") +
    kpi("Offertsumme", chfKurz(s.offerten), Z.offerten.length + " Offerten, ohne abgelehnte", "rand-blau") +
    kpi("Rechnungssumme", chfKurz(s.rechnungen), Z.belege.length + " Belege, inkl. MWST", "rand-amber") +
    kpi("Bezahlt", chfKurz(s.bezahlt), "offen: " + chfKurz(s.offen), "rand-gruen") +
    (s.foerderGesichert || s.foerderErwartet
      ? kpi("Fördergelder gesichert", chfKurz(s.foerderGesichert),
          s.foerderErwartet ? "erwartet: " + chfKurz(s.foerderErwartet) : "zugesichert oder ausbezahlt", "rand-gruen")
      : "") +
    (s.anschaffungenSumme
      ? kpi("Anschaffungen", chfKurz(s.anschaffungenSumme),
          s.kreditVerwendet
            ? "ausserhalb des Budgets · Kredit " + chfKurz(s.kreditVerwendet)
            : "ausserhalb des Sanierungsbudgets", "")
      : "") +
    (s.spaeter
      ? kpi("Später vorgesehen", chfKurz(s.spaeter),
          s.spaeterAnzahl + (s.spaeterAnzahl === 1 ? " Position zählt" : " Positionen zählen") + " noch nicht mit", "")
      : "") +
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
        (budgetZaehlt(k) ? "" : ' <span class="badge">später</span>') +
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

  h += nebenkostenAbschnitt(Z);
  h += mitgliederAbschnitt(Z);
  h += datenAbschnitt(Z);
  h += kontoAbschnitt(Z);
  return h;
}

function nebenkostenAbschnitt(Z) {
  const liste = Z.nebenkosten || [];
  const summe = liste.reduce((a, n) => a + zahl(n.betrag), 0);
  const bezahlt = liste.filter((n) => n.bezahlt).reduce((a, n) => a + zahl(n.betrag), 0);
  const bearbeitbar = Z.meineRolle === "eigentuemer" || Z.meineRolle === "bearbeiter";

  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><div><h2>Kaufnebenkosten</h2>' +
    "<p>" + (liste.length ? chf(summe) + " · davon bezahlt " + chf(bezahlt) : "Notariat, Steuern, Grundbuch, Schätzung …") + "</p></div>" +
    (bearbeitbar ? '<button class="btn klein" type="button" data-aktion="neben-neu">+ Position</button>' : "") +
    '</div><div class="karte">';

  if (!liste.length) {
    h += '<div class="leer" style="padding:16px">Noch keine Nebenkosten erfasst.' +
      (bearbeitbar ? '<div style="margin-top:12px"><button class="btn zweit klein" type="button" data-aktion="neben-neu">Erste Position erfassen</button></div>' : "") +
      "</div>";
    return h + "</div></section>";
  }

  h += '<div class="tab-scroll"><table><thead><tr><th>Position</th><th>Datum</th>' +
    '<th class="num">Betrag</th><th>Status</th><th></th></tr></thead><tbody>';
  liste.forEach((n) => {
    h += "<tr><td><b>" + esc(n.bezeichnung || "ohne Bezeichnung") + "</b>" +
      (n.bemerkung ? '<div style="font-size:.76rem;color:var(--grau);white-space:normal;max-width:240px">' + esc(n.bemerkung) + "</div>" : "") +
      "</td><td>" + datumCH(n.datum) + "</td>" +
      '<td class="num">' + chf(n.betrag) + "</td>" +
      "<td>" + (n.bezahlt ? '<span class="badge gruen">bezahlt</span>' : '<span class="badge amber">offen</span>') + "</td>" +
      '<td><div class="zeile-aktion">' +
      (bearbeitbar
        ? '<button class="btn still klein" type="button" data-aktion="neben-bearbeiten" data-id="' + n.id + '">Bearbeiten</button>' +
          '<button class="btn still klein" type="button" data-aktion="neben-loeschen" data-id="' + n.id + '">Löschen</button>'
        : "") + "</div></td></tr>";
  });
  h += '</tbody><tfoot><tr><td>Total</td><td></td><td class="num">' + chf(summe) + "</td><td colspan=\"2\"></td></tr></tfoot></table></div>";
  return h + "</div></section>";
}

function nebenkostenFormular(Z, n) {
  modalOeffnen({
    titel: n ? "Nebenkosten bearbeiten" : "Kaufnebenkosten erfassen",
    koerper:
      '<label class="feld"><span>Position</span>' +
      '<input id="n-bezeichnung" list="neben-arten" value="' + esc(n ? n.bezeichnung : "") + '" placeholder="z.B. Notariat">' +
      '<datalist id="neben-arten">' + NEBENKOSTEN_ARTEN.map((a) => '<option value="' + esc(a) + '">').join("") + "</datalist></label>" +
      '<div class="feld-paar">' +
      '<label class="feld"><span>Betrag (CHF)</span><input id="n-betrag" inputmode="decimal" value="' + (n ? zahl(n.betrag) : "") + '"></label>' +
      '<label class="feld"><span>Datum</span><input type="date" id="n-datum" value="' + esc(n && n.datum ? n.datum : "") + '"></label></div>' +
      '<label class="check"><input type="checkbox" id="n-bezahlt"' + (n && n.bezahlt ? " checked" : "") + "> bereits bezahlt</label>" +
      '<label class="feld"><span>Bemerkung</span><textarea id="n-bemerkung" placeholder="optional">' + esc(n ? n.bemerkung : "") + "</textarea></label>",
    speichern: async () => {
      const bezeichnung = document.getElementById("n-bezeichnung").value.trim();
      const betrag = zahl(document.getElementById("n-betrag").value);
      if (!bezeichnung) { meldung("Bitte die Position benennen.", true); return false; }
      const daten = {
        bezeichnung, betrag,
        datum: document.getElementById("n-datum").value || null,
        bezahlt: document.getElementById("n-bezahlt").checked,
        bemerkung: document.getElementById("n-bemerkung").value.trim(),
      };
      try {
        if (n) await nebenkostenAktualisieren(n.id, daten, n.geaendert_am);
        else await nebenkostenAnlegen(Z.projektId, daten);
        meldung(n ? "Position aktualisiert." : "Position erfasst.");
        await neuLaden(["nebenkosten"]);
        return true;
      } catch (err) { meldung(err.message, true); return false; }
    },
  });
}

function kontoAbschnitt(Z) {
  const projektWahl = Z.projekte.length > 1
    ? '<label class="feld" style="margin-top:12px"><span>Projekt wechseln</span><select id="projekt-wahl">' +
      Z.projekte.map((p) => '<option value="' + p.id + '"' + (p.id === Z.projektId ? " selected" : "") + ">" + esc(p.name || "Projekt") + "</option>").join("") +
      "</select></label>"
    : "";
  return '<section class="abschnitt"><div class="karte karte-pad">' +
    "<h3>Konto</h3>" +
    '<p style="margin:5px 0 12px;font-size:.84rem;color:var(--grau)">Angemeldet als ' + esc(Z.benutzer ? Z.benutzer.email : "") +
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
    const ichSelbst = !!Z.benutzer && m.benutzer_id === Z.benutzer.id;
    return '<div class="mitglied-zeile"><div class="haupt"><b>' + esc(m.email || m.benutzer_id) +
      (ichSelbst ? " (Sie)" : "") + "</b><span style=\"font-size:.78rem;color:var(--grau)\">" + ROLLEN[m.rolle] + "</span></div>" +
      (istEigentuemer && !ichSelbst
        ? '<select data-aenderung="mitglied-rolle" data-id="' + m.benutzer_id + '">' +
          Object.keys(ROLLEN).map((r) => '<option value="' + r + '"' + (r === m.rolle ? " selected" : "") + '>' + ROLLEN[r] + "</option>").join("") +
          '</select><button class="btn still klein" type="button" data-aktion="mitglied-entfernen" data-id="' + m.benutzer_id + '">Entfernen</button>'
        : "") + "</div>";
  }).join("");
  h += einladungenListe(Z);
  h += "</div></section>";
  return h;
}

/** Offene Einladungen mit Link zum Weiterschicken. */
function einladungenListe(Z) {
  if (Z.meineRolle !== "eigentuemer") return "";
  const offen = (Z.einladungen || []).filter((e) => !e.eingeloest_am);
  if (!offen.length) return "";
  return '<div style="margin-top:14px;border-top:1px solid var(--linie);padding-top:12px">' +
    '<div style="font-size:.78rem;font-weight:600;color:var(--text-2);margin-bottom:8px">Offene Einladungen</div>' +
    offen.map((e) =>
      '<div class="mitglied-zeile"><div class="haupt">' +
      "<b>" + esc(e.email || "ohne E-Mail") + "</b>" +
      '<span style="font-size:.78rem;color:var(--grau)">' + (ROLLEN[e.rolle] || e.rolle) +
      " · gültig bis " + datumCH((e.gueltig_bis || "").slice(0, 10)) + "</span></div>" +
      '<button class="btn zweit klein" type="button" data-aktion="einladung-teilen" data-token="' + esc(e.token) + '">Link</button>' +
      '<button class="btn still klein" type="button" data-aktion="einladung-zuruecknehmen" data-id="' + e.id + '">Zurückziehen</button>' +
      "</div>"
    ).join("") + "</div>";
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
      .catch((err) => { meldung(err.message, true); neuZeichnen(); });
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
        kaufpreis: zahl(el("p-kauf").value),
        gesamtbudget: zahl(el("p-gesamt").value),
      });
      ZUstand.projekte.push(projekt);
      await projektWechseln(projekt.id);
      meldung("Projekt angelegt.");
    } catch (err) {
      // Nach einer Zeitüberschreitung kann das Projekt trotzdem angelegt worden
      // sein. Nachsehen, statt den Knopf freizugeben und ein zweites zu erzeugen.
      try {
        const vorhanden = (await projekteLaden()).find((p) => p.name === name);
        if (vorhanden) {
          ZUstand.projekte = await projekteLaden();
          await projektWechseln(vorhanden.id);
          meldung("Projekt war bereits angelegt.");
          return;
        }
      } catch (e2) { /* dann eben die Fehlermeldung unten */ }
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
        '<p style="margin:-4px 0 12px;font-size:.78rem;color:var(--grau)">' +
        "Die Kaufnebenkosten stehen als eigene Liste in der Übersicht.</p>" +
        '<label class="feld"><span>Gesamtbudget (CHF)</span><input id="e-gesamt" inputmode="decimal" value="' + (zahl(p.gesamtbudget) || "") + '"></label>' +
        '<div class="hinweis info"><div>Sanierungsrahmen = Gesamtbudget − Kaufpreis − Kaufnebenkosten.</div></div>',
      speichern: async () => {
        try {
          const neu = await projektAktualisieren(p.id, {
            name: el("e-name").value.trim(), adresse: el("e-adresse").value.trim(),
            kaufpreis: zahl(el("e-kauf").value),
            gesamtbudget: zahl(el("e-gesamt").value),
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

  if (a === "neben-neu") return nebenkostenFormular(Z, null);
  if (a === "neben-bearbeiten") return nebenkostenFormular(Z, (Z.nebenkosten || []).find((n) => n.id === knopf.dataset.id));
  if (a === "neben-loeschen") {
    const n = (Z.nebenkosten || []).find((x) => x.id === knopf.dataset.id);
    if (n && bestaetigen('Position "' + (n.bezeichnung || "") + '" löschen?')) {
      try {
        await nebenkostenLoeschen(n.id);
        meldung("Position gelöscht.");
        await neuLaden(["nebenkosten"]);
      } catch (err) { meldung(err.message, true); }
    }
    return;
  }

  if (a === "mitglied-neu") {
    modalOeffnen({
      titel: "Person einladen",
      koerper:
        '<div class="hinweis info" style="margin-bottom:14px"><div>' +
        "Sie erhalten einen Einladungslink zum Weiterschicken. Die Person braucht noch kein Konto – " +
        "sie legt es beim Öffnen des Links an und ist danach automatisch dabei.</div></div>" +
        '<label class="feld"><span>E-Mail-Adresse (nur als Merkhilfe, optional)</span>' +
        '<input id="m-email" type="email" placeholder="partnerin@beispiel.ch"></label>' +
        '<label class="feld"><span>Rolle</span><select id="m-rolle">' +
        '<option value="bearbeiter" selected>Bearbeiter – lesen und schreiben</option>' +
        '<option value="leser">Leser – nur lesen</option>' +
        '<option value="handwerker">Handwerker – nur die zugewiesene Offerte</option></select></label>',
      knopfText: "Link erzeugen",
      speichern: async () => {
        try {
          const einladung = await einladungAnlegen(Z.projektId, el("m-email").value, el("m-rolle").value);
          ZUstand.einladungen = await einladungenLaden(Z.projektId);
          neuZeichnen();
          linkAnzeigen(einladung.token, einladung.rolle);
          return false;   // Modal bleibt offen und zeigt den Link
        } catch (err) { meldung(err.message, true); return false; }
      },
    });
    return;
  }

  if (a === "einladung-teilen") {
    const e = (Z.einladungen || []).find((x) => x.token === knopf.dataset.token);
    linkAnzeigen(knopf.dataset.token, e ? e.rolle : "");
    return;
  }

  if (a === "einladung-zuruecknehmen") {
    if (!bestaetigen("Diese Einladung zurückziehen? Der Link funktioniert danach nicht mehr.")) return;
    try {
      await einladungZuruecknehmen(knopf.dataset.id);
      ZUstand.einladungen = await einladungenLaden(Z.projektId);
      meldung("Einladung zurückgezogen.");
      neuZeichnen();
    } catch (err) { meldung(err.message, true); }
    return;
  }

  if (a === "einladung-kopieren") {
    const adresse = document.getElementById("einladung-link").value;
    try {
      await navigator.clipboard.writeText(adresse);
      meldung("Link kopiert.");
    } catch (e) {
      const feld = document.getElementById("einladung-link");
      feld.select();
      meldung("Bitte den markierten Link von Hand kopieren.", true);
    }
    return;
  }

  if (a === "einladung-versenden") {
    const adresse = document.getElementById("einladung-link").value;
    const text = "Einladung zur Sanierungsverwaltung " + (Z.projekt ? Z.projekt.name : "") + ": " + adresse;
    if (navigator.share) {
      try { await navigator.share({ title: "Einladung", text }); return; } catch (e) { /* abgebrochen */ }
    }
    window.location.href = "mailto:?subject=" + encodeURIComponent("Einladung zur Sanierungsverwaltung") +
      "&body=" + encodeURIComponent(text);
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

/** Zeigt den fertigen Einladungslink mit Knöpfen zum Teilen und Kopieren. */
function linkAnzeigen(token, rolle) {
  const adresse = new URL("index.html?einladung=" + token, window.location.href).href;
  modalOeffnen({
    titel: "Einladung verschicken",
    koerper:
      '<div class="hinweis info" style="margin-bottom:14px"><div><b>Link ist bereit</b>' +
      "Schicken Sie ihn der Person" + (rolle ? " (Rolle: " + esc(ROLLEN[rolle] || rolle) + ")" : "") + ". " +
      "Beim Öffnen kann sie sich ein Konto anlegen und ist danach automatisch im Projekt. " +
      "Der Link gilt 30 Tage und nur einmal.</div></div>" +
      '<label class="feld"><span>Einladungslink</span>' +
      '<input id="einladung-link" readonly value="' + esc(adresse) + '" style="font-size:14px"></label>' +
      '<div class="btn-reihe">' +
      '<button class="btn" type="button" data-aktion="einladung-versenden">Link verschicken</button>' +
      '<button class="btn zweit" type="button" data-aktion="einladung-kopieren">Kopieren</button></div>',
    knopfText: "Fertig",
    speichern: () => true,
  });
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
