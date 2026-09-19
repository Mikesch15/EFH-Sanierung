// Formatierung und Parsing – aus dem Prototyp (prototyp/index.html) übernommen,
// damit Zahlen, Beträge und Daten überall gleich aussehen.

export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Zahl als Schweizer Franken, z.B. CHF 18'450.00 */
export function chf(n, mitWaehrung = true) {
  const z = Number.isFinite(+n) ? +n : 0;
  const neg = z < 0;
  const t = Math.abs(z).toFixed(2).split(".");
  t[0] = t[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return (neg ? "−" : "") + (mitWaehrung ? "CHF " : "") + t[0] + "." + t[1];
}

/** kompakt fürs Dashboard, z.B. CHF 18'450.– */
export function chfKurz(n) {
  const z = Number.isFinite(+n) ? +n : 0;
  const neg = z < 0;
  let t = Math.round(Math.abs(z)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return (neg ? "−" : "") + "CHF " + t + ".–";
}

/** "2026-09-19" -> "19.09.2026" */
export function datumCH(iso) {
  if (!iso) return "–";
  const t = String(iso).split("-");
  if (t.length !== 3) return iso;
  return t[2] + "." + t[1] + "." + t[0];
}

export function heuteISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

/** akzeptiert "1'500.50", "1500,50", "1 500" */
export function zahl(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v == null || v === "") return 0;
  const s = String(v).replace(/['\s’]/g, "").replace(",", ".").replace(/[^0-9.\-]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** wie zahl(), gibt aber null statt 0 zurück, wenn nichts eingegeben wurde
 *  (für Felder, bei denen "keine Angabe" etwas anderes bedeutet als "0"). */
export function zahlOderNull(v) {
  if (v == null || String(v).trim() === "") return null;
  return zahl(v);
}

export function dateigroesse(bytes) {
  if (!Number.isFinite(+bytes)) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return Math.round(kb) + " KB";
  return (kb / 1024).toFixed(1) + " MB";
}

export function meldung(text, fehler) {
  const box = document.getElementById("meldung");
  if (!box) return;
  const d = document.createElement("div");
  d.className = "toast" + (fehler ? " fehler" : "");
  d.textContent = text;
  box.appendChild(d);
  setTimeout(() => d.remove(), fehler ? 6000 : 3200);
}

export function bestaetigen(text) {
  return window.confirm(text);
}
