// Service Worker – bewusst ohne eigenen Zwischenspeicher.
//
// Die App ist eine Online-App: Daten kommen immer frisch von Supabase. Ein
// zwischengespeicherter Programmstand hat in der Vergangenheit nur dafür gesorgt,
// dass nach einer Aktualisierung weiterhin die alte (defekte) Fassung startete.
// Deshalb gibt dieser Service Worker jede Anfrage unverändert ans Netz weiter und
// löscht beim Aktivieren alle früher angelegten Zwischenspeicher.
//
// Er bleibt trotzdem nötig: Ohne Service Worker mit fetch-Behandlung bietet
// Android Chrome die Installation auf dem Startbildschirm nicht an.
const VERSION = "tulpenweg-v3-ohne-cache";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", () => {
  // Nichts abfangen: Der Browser holt alles direkt, wie ohne Service Worker.
});
