// Supabase-Client und Auth-Helfer.
// @supabase/supabase-js v2.45.4 liegt als fertiges ES-Modul im Repo
// (js/vendor/supabase-js.js). Bewusst kein CDN: die App soll auch in einem
// Netz starten, das fremde Domains blockiert oder langsam ausliefert.
// Neu erzeugen (siehe README): esbuild-Bundle aus dem npm-Paket.
import { createClient } from "./vendor/supabase-js.js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./konfig.js";

// Manche Browser (blockierte Websitedaten, strenger Datenschutzmodus) werfen schon
// beim blossen Zugriff auf localStorage eine Ausnahme. Ohne diesen Puffer bricht
// dann bereits der Start der App ab. Ersatzweise wird im Arbeitsspeicher gehalten –
// die Anmeldung überlebt dann kein Neuladen, aber die App läuft.
const merker = new Map();
function sichererSpeicher() {
  let echt = null;
  try {
    echt = window.localStorage;
    const probe = "tw-probe";
    echt.setItem(probe, "1");
    echt.removeItem(probe);
  } catch (e) {
    echt = null;
  }
  if (echt) {
    return {
      getItem: (k) => { try { return echt.getItem(k); } catch (e) { return merker.get(k) ?? null; } },
      setItem: (k, v) => { try { echt.setItem(k, v); } catch (e) { merker.set(k, v); } },
      removeItem: (k) => { try { echt.removeItem(k); } catch (e) { merker.delete(k); } },
    };
  }
  return {
    getItem: (k) => (merker.has(k) ? merker.get(k) : null),
    setItem: (k, v) => merker.set(k, v),
    removeItem: (k) => merker.delete(k),
  };
}

export const speicherIstFluechtig = (() => {
  try {
    window.localStorage.setItem("tw-probe", "1");
    window.localStorage.removeItem("tw-probe");
    return false;
  } catch (e) { return true; }
})();

// Kein Aufruf darf unendlich warten: Ohne Zeitlimit bleibt die Oberfläche bei
// einer stockenden Verbindung für immer bei "wird gespeichert …" stehen, ohne
// dass jemand erfährt, woran es liegt.
export const ZEITLIMIT_MS = 12000;
const ZEITLIMIT_UPLOAD_MS = 120000;
// Die KI-Analyse liest ein ganzes PDF – das dauert regelmässig länger als eine
// gewöhnliche Abfrage und darf nicht nach 12 Sekunden abgeschnitten werden.
const ZEITLIMIT_FUNKTION_MS = 150000;

function fetchMitZeitlimit(eingabe, optionen) {
  const adresse = typeof eingabe === "string" ? eingabe : (eingabe && eingabe.url) || "";
  const grenze = adresse.includes("/storage/v1/object")
    ? ZEITLIMIT_UPLOAD_MS
    : adresse.includes("/functions/v1/")
      ? ZEITLIMIT_FUNKTION_MS
      : ZEITLIMIT_MS;
  const abbruch = new AbortController();
  const uhr = setTimeout(() => abbruch.abort(), grenze);
  return fetch(eingabe, Object.assign({}, optionen, { signal: abbruch.signal }))
    .finally(() => clearTimeout(uhr));
}

const authSpeicher = sichererSpeicher();

// Warteschlange nur für dieses Fenster: Auth-Vorgänge laufen nacheinander (damit
// sich zwei Token-Erneuerungen nicht gegenseitig entwerten), aber niemand wartet
// auf ein anderes Fenster – und nach 10 Sekunden wird auf keinen Fall weiter
// blockiert, sondern der Vorgang trotzdem gestartet.
let sperrKette = Promise.resolve();
function eigeneSperre(name, dauer, fn) {
  const vorher = sperrKette;
  const ergebnis = (async () => {
    await Promise.race([vorher.catch(() => {}), new Promise((ok) => setTimeout(ok, 10000))]);
    return fn();
  })();
  sperrKette = ergebnis.then(() => undefined, () => undefined);
  return ergebnis;
}

/** Liegt lokal ein Anmeldetoken? Beantwortet sofort, ohne Netz – damit die App
 *  gleich das Richtige zeichnen kann, statt auf den Server zu warten. */
export function gespeicherteSitzungVorhanden() {
  try {
    const referenz = new URL(SUPABASE_URL).hostname.split(".")[0];
    return !!authSpeicher.getItem("sb-" + referenz + "-auth-token");
  } catch (e) {
    return false;
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: { fetch: fetchMitZeitlimit },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: authSpeicher,
    // supabase-js serialisiert Auth-Vorgänge normalerweise über die Web-Locks-
    // Schnittstelle. Die gilt fensterübergreifend: Hängt ein anderes Fenster
    // derselben Adresse, warten hier alle Aufrufe endlos.
    //
    // Ganz ohne Serialisierung ist es aber auch nicht richtig – zwei gleichzeitige
    // Token-Erneuerungen entwerten sich gegenseitig, und die Anmeldung geht
    // verloren. Deshalb eine eigene Warteschlange, die nur in diesem Fenster gilt
    // und zusätzlich nach 10 Sekunden weitermacht, statt zu blockieren.
    lock: eigeneSperre,
  },
});

export function istZeitueberschreitung(fehler) {
  if (!fehler) return false;
  const name = fehler.name || "";
  const text = String(fehler.message || fehler);
  return name === "AbortError" || /abort|timeout|Zeitüberschreitung/i.test(text);
}

export const MELDUNG_ZEITUEBERSCHREITUNG =
  "Der Server hat nicht geantwortet (Zeitüberschreitung). Bitte Verbindung prüfen und erneut versuchen.";

// Auch Auth-Aufrufe können innerhalb der Bibliothek hängen – harte Obergrenze.
const AUTH_ZEITLIMIT_MS = 15000;
function authMitZeitlimit(versprechen) {
  let uhr;
  const wecker = new Promise((_, ablehnen) => {
    uhr = setTimeout(() => ablehnen(new Error(MELDUNG_ZEITUEBERSCHREITUNG)), AUTH_ZEITLIMIT_MS);
  });
  return Promise.race([versprechen, wecker]).finally(() => clearTimeout(uhr));
}

export async function registrieren(email, passwort) {
  const { data, error } = await authMitZeitlimit(supabase.auth.signUp({ email, password: passwort }));
  if (error) throw error;
  return data;
}

export async function anmelden(email, passwort) {
  const { data, error } = await authMitZeitlimit(supabase.auth.signInWithPassword({ email, password: passwort }));
  if (error) throw error;
  return data;
}

export async function abmelden() {
  const { error } = await authMitZeitlimit(supabase.auth.signOut());
  if (error) throw error;
}

export async function passwortZuruecksetzen(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) throw error;
}

export async function neuesPasswortSetzen(passwort) {
  const { error } = await supabase.auth.updateUser({ password: passwort });
  if (error) throw error;
}

export async function aktuelleSitzung() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function aufAuthAchten(callback) {
  const { data } = supabase.auth.onAuthStateChange((ereignis, sitzung) => callback(ereignis, sitzung));
  return () => data.subscription.unsubscribe();
}

/** true, wenn eine echte Netzwerkverbindung zu Supabase besteht. */
export function istVerbindungsfehler(fehler) {
  if (!fehler) return false;
  const text = String(fehler.message || fehler);
  return /fetch|network|failed to fetch|NetworkError|Load failed/i.test(text);
}

export const MELDUNG_KEINE_VERBINDUNG = "Keine Verbindung zum Server. Bitte Internetverbindung prüfen und erneut versuchen.";
