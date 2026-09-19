// Supabase-Client und Auth-Helfer.
// @supabase/supabase-js v2, per ESM-Import von jsdelivr, Version fest gepinnt.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./konfig.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export async function registrieren(email, passwort) {
  const { data, error } = await supabase.auth.signUp({ email, password: passwort });
  if (error) throw error;
  return data;
}

export async function anmelden(email, passwort) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: passwort });
  if (error) throw error;
  return data;
}

export async function abmelden() {
  const { error } = await supabase.auth.signOut();
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
