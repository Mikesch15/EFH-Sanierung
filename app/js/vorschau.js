// Vorschaubilder für Dateien aus dem privaten Speicher.
//
// Die Adressen sind signiert und laufen ab. Sie werden für alle sichtbaren Bilder
// in EINER Anfrage geholt und zwischengespeichert – sonst würde jedes Neuzeichnen
// (auch das durch eine Änderung auf dem anderen Gerät) alle Bilder neu anfragen.
import { esc } from "./format.js";
import { vorschauLinks } from "./dateien.js";

// Was der Browser als Bild anzeigen kann. HEIC zählt als Foto, lässt sich aber
// ausserhalb von Safari nicht darstellen – dafür gibt es die Ersatzkachel.
const BILD_ENDUNG = /\.(jpe?g|png|webp|gif|heic|heif)$/i;
const ANZEIGBAR_TYP = /^image\/(jpeg|png|webp|gif)$/i;
const ANZEIGBAR_ENDUNG = /\.(jpe?g|png|webp|gif)$/i;

/** Ist das überhaupt ein Bild? (mime_typ, ersatzweise die Endung) */
export function istBild(mimeTyp, dateiname) {
  if (mimeTyp) return mimeTyp.startsWith("image/");
  return BILD_ENDUNG.test(dateiname || "");
}

/** Kann der Browser es darstellen? */
export function istAnzeigbar(mimeTyp, dateiname) {
  if (mimeTyp) return ANZEIGBAR_TYP.test(mimeTyp);
  return ANZEIGBAR_ENDUNG.test(dateiname || "");
}

const speicher = new Map();   // Pfad → { url, zeit }
const GUELTIG_MS = 8 * 60 * 1000;
let laeuft = false;

export function ausSpeicher(pfad) {
  const eintrag = speicher.get(pfad);
  if (!eintrag || Date.now() - eintrag.zeit > GUELTIG_MS) return null;
  return eintrag.url;
}

/** <img>-Markierung mit Platzhalter; die Adresse kommt über nachladen(). */
export function bildMarkierung(pfad, name) {
  const gespeichert = ausSpeicher(pfad);
  return '<img alt="' + esc(name || "") + '" loading="lazy" data-vorschau="' + esc(pfad) + '"' +
    (gespeichert ? ' src="' + esc(gespeichert) + '"' : "") + ">";
}

/** Ersatz für ein Bild, das nicht angezeigt werden kann – nie ein kaputtes Symbol. */
function ersatz(bild, text) {
  const halter = bild.parentElement;
  if (!halter) return;
  bild.remove();
  halter.innerHTML = '<span class="foto-ersatz">' + esc(text) + "</span>";
}

/** Holt die fehlenden Adressen und setzt sie in die schon gezeichneten Kacheln. */
export async function nachladen() {
  if (laeuft) return;
  document.querySelectorAll("img[data-vorschau]").forEach((bild) => {
    if (bild.dataset.wacht) return;
    bild.dataset.wacht = "1";
    bild.addEventListener("error", () => ersatz(bild, "Vorschau nicht geladen"));
  });
  const offen = Array.from(document.querySelectorAll("img[data-vorschau]"))
    .filter((bild) => !bild.getAttribute("src"));
  const pfade = [...new Set(offen.map((bild) => bild.dataset.vorschau))];
  if (!pfade.length) return;
  laeuft = true;
  try {
    const karte = await vorschauLinks(pfade);
    Object.entries(karte).forEach(([pfad, url]) => speicher.set(pfad, { url, zeit: Date.now() }));
    offen.forEach((bild) => {
      const url = karte[bild.dataset.vorschau];
      if (url) bild.setAttribute("src", url);
      else ersatz(bild, "kein Zugriff");
    });
  } catch (e) {
    offen.forEach((bild) => ersatz(bild, "Vorschau nicht geladen"));
  } finally {
    laeuft = false;
  }
}

/** Nach dem Zeichnen aufrufen: lädt, sobald die Kacheln stehen. */
export function nachladenBald() {
  setTimeout(nachladen, 0);
}
