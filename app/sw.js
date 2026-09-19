// Service Worker: speichert nur die App-Hülle (HTML, CSS, JS, Icons), damit die
// App auf dem Handy installierbar ist und schnell startet.
// Daten und Dateien werden NIE zwischengespeichert – sie kommen immer frisch
// von Supabase. Die App bleibt damit eine reine Online-App (Phase 2).
const VERSION = "tulpenweg-v2";
const HUELLE = [
  "./",
  "./index.html",
  "./handwerker.html",
  "./manifest.webmanifest",
  "./css/stil.css",
  "./js/app.js",
  "./js/konfig.js",
  "./js/format.js",
  "./js/supabase.js",
  "./js/daten.js",
  "./js/dateien.js",
  "./js/ki.js",
  "./js/import.js",
  "./js/handwerker.js",
  "./js/vendor/supabase-js.js",
  "./js/ansichten/gemeinsam.js",
  "./js/ansichten/anmeldung.js",
  "./js/ansichten/uebersicht.js",
  "./js/ansichten/budget.js",
  "./js/ansichten/offerten.js",
  "./js/ansichten/belege.js",
  "./js/ansichten/dokumente.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  // Einzeln ablegen: eine fehlende Datei darf die Installation nicht scheitern lassen.
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(HUELLE.map((pfad) => c.add(pfad).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const anfrage = e.request;
  if (anfrage.method !== "GET") return;
  const url = new URL(anfrage.url);

  // Supabase (Daten, Auth, Dateien) und alles Fremde immer direkt aus dem Netz.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(anfrage)
      .then((antwort) => {
        if (antwort.ok) {
          const kopie = antwort.clone();
          caches.open(VERSION).then((c) => c.put(anfrage, kopie)).catch(() => {});
        }
        return antwort;
      })
      .catch(async () => {
        const treffer = await caches.match(anfrage);
        if (treffer) return treffer;
        // Nur beim Seitenaufruf auf die Startseite zurückfallen. Für Skripte und
        // Stylesheets wäre HTML als Antwort fatal – die App bliebe leer.
        if (anfrage.mode === "navigate") {
          const start = await caches.match("./index.html");
          if (start) return start;
        }
        return Response.error();
      })
  );
});
