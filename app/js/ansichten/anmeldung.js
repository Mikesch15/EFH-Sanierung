import { esc, meldung } from "../format.js";
import { anmelden, registrieren, passwortZuruecksetzen, speicherIstFluechtig } from "../supabase.js";
import { neuZeichnen } from "../app.js";

let modus = "anmelden"; // anmelden | registrieren | zuruecksetzen
let hinweis = "";

export function render() {
  const titel = { anmelden: "Anmelden", registrieren: "Konto erstellen", zuruecksetzen: "Passwort zurücksetzen" }[modus];
  return '<div class="anmelde-buehne"><div class="karte karte-pad anmelde-karte">' +
    '<div class="anmelde-kopf"><b>Tulpenweg 37</b><span>Sanierungs- und Dokumentenverwaltung</span></div>' +
    (hinweis ? '<div class="hinweis info" style="margin-bottom:14px"><div>' + esc(hinweis) + "</div></div>" : "") +
    (speicherIstFluechtig
      ? '<div class="hinweis warn" style="margin-bottom:14px"><div><b>Websitedaten sind blockiert</b>' +
        "Die Anmeldung gilt nur für diese Sitzung und geht beim Neuladen verloren. " +
        "In den Browser-Einstellungen für diese Seite Cookies und Websitedaten erlauben.</div></div>"
      : "") +
    '<form id="anmelde-formular">' +
    '<h2 style="margin-bottom:14px">' + titel + "</h2>" +
    '<label class="feld"><span>E-Mail</span><input type="email" id="a-email" required autocomplete="email"></label>' +
    (modus !== "zuruecksetzen"
      ? '<label class="feld"><span>Passwort</span><input type="password" id="a-passwort" required minlength="6" autocomplete="' +
        (modus === "registrieren" ? "new-password" : "current-password") + '"></label>'
      : "") +
    '<button class="btn breit" type="submit">' +
    { anmelden: "Anmelden", registrieren: "Konto erstellen", zuruecksetzen: "Link senden" }[modus] +
    "</button></form>" +
    '<div class="anmelde-wechsel">' + wechselLinks() + "</div>" +
    "</div></div>";
}

function wechselLinks() {
  if (modus === "anmelden") {
    return 'Noch kein Konto? <button type="button" data-aktion="modus-registrieren">Registrieren</button><br>' +
      '<button type="button" data-aktion="modus-zuruecksetzen">Passwort vergessen?</button>';
  }
  if (modus === "registrieren") {
    return 'Bereits ein Konto? <button type="button" data-aktion="modus-anmelden">Anmelden</button>';
  }
  return '<button type="button" data-aktion="modus-anmelden">Zurück zur Anmeldung</button>';
}

export function aktion(a) {
  if (a === "modus-anmelden") { modus = "anmelden"; hinweis = ""; }
  else if (a === "modus-registrieren") { modus = "registrieren"; hinweis = ""; }
  else if (a === "modus-zuruecksetzen") { modus = "zuruecksetzen"; hinweis = ""; }
  else return;
  neuZeichnen();
}

export async function formularAbschicken(form) {
  const knopf = form.querySelector("button[type=submit]");
  const email = form.querySelector("#a-email").value.trim();
  const passwortFeld = form.querySelector("#a-passwort");
  const passwort = passwortFeld ? passwortFeld.value : "";
  knopf.disabled = true;
  try {
    if (modus === "anmelden") {
      await anmelden(email, passwort);
    } else if (modus === "registrieren") {
      await registrieren(email, passwort);
      hinweis = "Konto erstellt. Falls eine Bestätigung nötig ist, prüfen Sie Ihr E-Mail-Postfach.";
      modus = "anmelden";
      neuZeichnen();
    } else if (modus === "zuruecksetzen") {
      await passwortZuruecksetzen(email);
      hinweis = "Falls diese E-Mail-Adresse registriert ist, wurde ein Link zum Zurücksetzen gesendet.";
      modus = "anmelden";
      neuZeichnen();
    }
  } catch (e) {
    meldung(uebersetzeFehler(e.message), true);
  } finally {
    knopf.disabled = false;
  }
}

function uebersetzeFehler(text) {
  if (/abort|timeout/i.test(text)) return "Der Server hat nicht geantwortet (Zeitüberschreitung). Bitte Verbindung prüfen.";
  if (/Invalid login credentials/i.test(text)) return "E-Mail oder Passwort ist falsch.";
  if (/already registered|already exists/i.test(text)) return "Für diese E-Mail-Adresse besteht bereits ein Konto.";
  if (/fetch|network/i.test(text)) return "Keine Verbindung zum Server. Bitte Internetverbindung prüfen.";
  return text;
}
