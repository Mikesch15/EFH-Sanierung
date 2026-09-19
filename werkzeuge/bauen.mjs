// Packt die App in je eine Datei mit Inhalts-Kennung im Namen.
//
// Warum: Der Browser speichert jede JavaScript-Datei einzeln zwischen. Nach einer
// Aktualisierung kann er deshalb alte und neue Dateien mischen – die passen nicht
// zusammen und die App startet nicht mehr. Mit einer einzigen Datei pro Seite,
// deren Name sich bei jeder Änderung mitändert, ist das ausgeschlossen: Entweder
// der Browser hat den alten Stand vollständig oder den neuen vollständig.
//
// Aufruf:  node werkzeuge/bauen.mjs
// Prüfen:  node werkzeuge/bauen.mjs --pruefen   (schreibt nichts, meldet Abweichung)

import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, writeFile, readdir, unlink, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const wurzel = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const appOrdner = path.join(wurzel, "app");
const paketOrdner = path.join(appOrdner, "js", "paket");
const nurPruefen = process.argv.includes("--pruefen");

const SEITEN = [
  { einstieg: "js/app.js", name: "app", html: "index.html" },
  { einstieg: "js/handwerker.js", name: "handwerker", html: "handwerker.html" },
];

function kennung(inhalt) {
  return createHash("sha256").update(inhalt).digest("hex").slice(0, 10);
}

async function paketBauen(einstieg) {
  const ergebnis = await build({
    entryPoints: [path.join(appOrdner, einstieg)],
    bundle: true,
    format: "esm",
    target: "es2020",
    platform: "browser",
    charset: "utf8",
    legalComments: "none",
    // Die Bibliothek bleibt eine eigene Datei: Sie ändert sich fast nie und
    // muss deshalb nicht bei jeder Codeänderung neu geladen werden.
    external: ["./vendor/supabase-js.js", "../vendor/supabase-js.js"],
    write: false,
  });
  // Das Paket liegt in js/paket/, die Bibliothek eine Ebene höher in js/vendor/.
  return ergebnis.outputFiles[0].text.replace(/(["'])\.\/vendor\/supabase-js\.js\1/g, '"../vendor/supabase-js.js"');
}

async function alteVersionenEntfernen(behalten) {
  if (!existsSync(paketOrdner)) return;
  for (const datei of await readdir(paketOrdner)) {
    if (!behalten.includes(datei)) await unlink(path.join(paketOrdner, datei));
  }
}

const abweichungen = [];
const behalten = [];
let htmlNeu = new Map();

for (const seite of SEITEN) {
  const code = await paketBauen(seite.einstieg);
  const dateiname = seite.name + "." + kennung(code) + ".js";
  behalten.push(dateiname);

  const htmlPfad = path.join(appOrdner, seite.html);
  const html = htmlNeu.get(htmlPfad) ?? (await readFile(htmlPfad, "utf8"));
  const gewuenscht = 'src="js/paket/' + dateiname + '"';
  const vorhanden = new RegExp('src="js/paket/' + seite.name + '\\.[0-9a-f]+\\.js"').exec(html);

  if (!vorhanden || vorhanden[0] !== gewuenscht) {
    abweichungen.push(seite.html + " → " + dateiname);
  }

  let neuesHtml = vorhanden
    ? html.replace(vorhanden[0], gewuenscht)
    : html.replace(/src="js\/(app|handwerker)\.js"/, gewuenscht);
  htmlNeu.set(htmlPfad, neuesHtml);

  if (!nurPruefen) {
    await mkdir(paketOrdner, { recursive: true });
    await writeFile(path.join(paketOrdner, dateiname), code, "utf8");
  }
}

// Stylesheet über die Adresse versionieren – dort genügt ein Anhängsel.
const stil = await readFile(path.join(appOrdner, "css", "stil.css"), "utf8");
const stilKennung = kennung(stil);
for (const [htmlPfad, html] of htmlNeu) {
  const ersetzt = html.replace(/href="css\/stil\.css(\?v=[0-9a-f]+)?"/, 'href="css/stil.css?v=' + stilKennung + '"');
  if (ersetzt !== html) abweichungen.push(path.basename(htmlPfad) + " → stil.css?v=" + stilKennung);
  htmlNeu.set(htmlPfad, ersetzt);
}

// Sichtbare Versionsmarke: zeigt auf dem Gerät, welcher Stand geladen wurde.
const marke = behalten[0].split(".")[1];
for (const [htmlPfad, html] of htmlNeu) {
  const ersetzt = html.replace(
    /(<b>App wird geladen …<\/b>)[^<]*/,
    '$1Stand ' + new Date().toISOString().slice(0, 10) + " · " + marke
  );
  htmlNeu.set(htmlPfad, ersetzt);
}

if (!nurPruefen) {
  for (const [htmlPfad, html] of htmlNeu) await writeFile(htmlPfad, html, "utf8");
  await alteVersionenEntfernen(behalten);
  console.log("Gebaut: " + behalten.join(", ") + " · stil.css?v=" + stilKennung);
} else if (abweichungen.length) {
  console.error("Pakete sind nicht aktuell:\n  " + abweichungen.join("\n  "));
  console.error("Bitte 'node werkzeuge/bauen.mjs' ausführen.");
  process.exit(1);
} else {
  console.log("Pakete sind aktuell.");
}
