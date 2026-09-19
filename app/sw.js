// Service Worker: speichert nur die App-Hülle (HTML, CSS, JS, Icons), damit die
// App auf dem Handy installierbar ist und schnell startet.
// Daten und Dateien werden NIE zwischengespeichert – sie kommen immer frisch
// von Supabase. Die App bleibt damit eine reine Online-App (Phase 2).
const VERSION = "tulpenweg-v1";
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
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(HUELLE)).then(() => self.skipWaiting()));
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

  // Supabase (Daten, Auth, Dateien) immer direkt aus dem Netz.
  if (url.hostname.endsWith("supabase.co")) return;

  // Bibliothek vom CDN: aus dem Cache, sonst holen und merken.
  if (url.hostname === "cdn.jsdelivr.net") {
    e.respondWith(
      caches.match(anfrage).then((treffer) => treffer || fetch(anfrage).then((antwort) => {
        const kopie = antwort.clone();
        caches.open(VERSION).then((c) => c.put(anfrage, kopie));
        return antwort;
      }))
    );
    return;
  }

  // Eigene Dateien: erst Netz (damit Änderungen ankommen), sonst Cache.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(anfrage)
        .then((antwort) => {
          const kopie = antwort.clone();
          caches.open(VERSION).then((c) => c.put(anfrage, kopie));
          return antwort;
        })
        .catch(() => caches.match(anfrage).then((treffer) => treffer || caches.match("./index.html")))
    );
  }
});
