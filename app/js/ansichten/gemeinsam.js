// Gemeinsame Bausteine für die Ansichten: Berechnungen und kleine HTML-Helfer.
import { esc, chf, chfKurz, zahl } from "../format.js";

export function offerteNetto(o) {
  return (o.offert_positionen || []).reduce((s, p) => s + zahl(p.zeilentotal), 0);
}
export function offerteMwstSatz(o) { return o.mwst_satz == null ? 0 : zahl(o.mwst_satz); }
export function offerteMwst(o) { return offerteNetto(o) * (offerteMwstSatz(o) / 100); }
export function offerteTotal(o) { return offerteNetto(o) + offerteMwst(o); }
export function offerteZaehlt(o) { return o.status !== "Abgelehnt"; }
export function belegBrutto(b) { return zahl(b.brutto); }

export function summen(Z) {
  const gesamtbudget = zahl(Z.projekt?.gesamtbudget);
  const kaufpreis = zahl(Z.projekt?.kaufpreis);
  const rahmen = gesamtbudget - kaufpreis;
  const budgetiert = Z.budget.reduce((s, p) => s + zahl(p.betrag), 0);
  const offerten = Z.offerten.filter(offerteZaehlt).reduce((s, o) => s + offerteTotal(o), 0);
  const rechnungen = Z.belege.reduce((s, b) => s + belegBrutto(b), 0);
  const bezahlt = Z.belege.filter((b) => b.bezahlt).reduce((s, b) => s + belegBrutto(b), 0);
  let verpflichtet = 0;
  Z.offerten.filter((o) => o.status === "Beauftragt").forEach((o) => {
    const verrechnet = Z.belege.filter((b) => b.offerte_id === o.id).reduce((s, b) => s + belegBrutto(b), 0);
    verpflichtet += Math.max(0, offerteTotal(o) - verrechnet);
  });
  return {
    gesamtbudget, kaufpreis, rahmen, budgetiert, offerten, rechnungen, bezahlt, verpflichtet,
    offen: rechnungen - bezahlt,
    verfuegbar: rahmen - rechnungen - verpflichtet,
  };
}

export function kpi(label, wert, zusatz, klasse) {
  return '<div class="kpi ' + (klasse || "") + '"><div class="label">' + esc(label) + "</div>" +
    '<div class="wert zahl">' + wert + "</div>" +
    '<div class="zusatz">' + esc(zusatz) + "</div></div>";
}

export function statusBadge(status) {
  const farbe = { Entwurf: "", Erfasst: "blau", Verglichen: "blau", Beauftragt: "gruen", Abgelehnt: "rot" };
  return '<span class="badge ' + (farbe[status] || "") + '">' + esc(status || "Entwurf") + "</span>";
}

export function leerZustand(titel, text, knopf) {
  return '<div class="karte leer"><b>' + esc(titel) + "</b>" + esc(text) +
    (knopf ? '<div style="margin-top:14px">' + knopf + "</div>" : "") + "</div>";
}

export function listenKarte(titel, ansicht, eintraege) {
  let h = '<section class="abschnitt"><div class="abschnitt-kopf"><h2>' + esc(titel) + "</h2>" +
    '<button class="btn still klein" type="button" data-ansicht="' + ansicht + '">Alle</button></div>' +
    '<div class="karte karte-pad">';
  if (!eintraege.length) {
    h += '<div class="leer" style="padding:10px 0">Noch nichts erfasst.</div>';
  } else {
    h += '<ul class="liste">' + eintraege.map((e) =>
      '<li><div class="haupt"><div class="titel">' + esc(e.titel) + '</div>' +
      '<div class="unter">' + e.unter + " " + (e.badge || "") + "</div></div>" +
      (e.betrag ? '<div class="betrag">' + e.betrag + "</div>" : "") + "</li>"
    ).join("") + "</ul>";
  }
  return h + "</div></section>";
}

export function kategorieOptionen(budget, gewaehlt) {
  return '<option value=""' + (!gewaehlt ? " selected" : "") + '>Nicht zugeordnet</option>' +
    budget.map((p) => '<option value="' + p.id + '"' + (p.id === gewaehlt ? " selected" : "") + '>' + esc(p.kategorie) + "</option>").join("");
}

export function kategorieName(budget, id) {
  const p = budget.find((x) => x.id === id);
  return p ? p.kategorie : "Nicht zugeordnet";
}

export function ladeSchritte(schritte, aktiv) {
  return '<ul class="lade-schritte">' + schritte.map((t, i) =>
    '<li' + (i < aktiv ? ' class="fertig"' : "") + ">" + esc(t) + "</li>"
  ).join("") + "</ul>";
}
