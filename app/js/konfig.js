// Öffentliche Werte – dürfen im Browser stehen, der Schutz kommt aus den
// Row-Level-Security-Regeln der Datenbank, nicht aus der Geheimhaltung
// dieser beiden Werte. Niemals den service_role-Key hier eintragen.
export const SUPABASE_URL = "https://evozevkzwcvpbnvcmmfp.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_us-LmqO0xw7nYgraQ7KCNw_dukOK3K-";

export const STORAGE_BUCKET = "projektdateien";
export const DATEI_MAX_BYTES = 25 * 1024 * 1024;
export const DATEI_ERLAUBTE_TYPEN = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"];
export const DATEI_ERLAUBTE_ENDUNGEN = [".pdf", ".jpg", ".jpeg", ".png", ".heic", ".webp"];

export const MWST_SATZ_VORGABE = 8.1;
export const EINHEITEN = ["pauschal", "Stk", "m²", "m", "lfm", "h", "Tag", "kg", "Pos"];
export const STATUS_LISTE = ["Entwurf", "Erfasst", "Verglichen", "Beauftragt", "Abgelehnt"];
export const DOKUMENT_TYPEN = [
  "Kaufvertrag", "Reservationsvereinbarung", "Grundriss", "Plan", "Baubewilligung",
  "Handwerkerunterlagen", "Garantie", "Foto", "Versicherungsunterlagen", "Sonstiges",
];
export const STANDARD_KATEGORIEN = [
  "Rückbau / Entsorgung", "Elektro", "Wasser / Sanitär", "Maurerarbeiten / Wanddurchbrüche",
  "Wände / Decken", "Böden", "Küche", "Badezimmer EG", "Badezimmer OG", "Fassade",
  "Heizung", "Fenster", "Sonstiges", "Reserve",
];
export const NEBENKOSTEN_ARTEN = [
  "Notariat", "Handänderungssteuer", "Grundbuchgebühren", "Schätzung / Gutachten",
  "Bankspesen", "Gebäudeversicherung", "Umzug", "Sonstiges",
];

export const ROLLEN = {
  eigentuemer: "Eigentümer",
  bearbeiter: "Bearbeiter",
  leser: "Leser",
  handwerker: "Handwerker",
};

// Signierte Links für Dateivorschau/-download laufen nach dieser Zeit ab.
export const SIGNIERTER_LINK_SEKUNDEN = 120;
