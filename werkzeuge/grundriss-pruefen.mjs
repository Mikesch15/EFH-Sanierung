// Prüft die Geometrie des Grundrisses: keine Überlappung, nichts ausserhalb des
// Umrisses, und jede Rechteckfläche entspricht der ausgewiesenen.
//
// Aufruf: node werkzeuge/grundriss-pruefen.mjs
import { GESCHOSSE } from "../app/js/grundriss-vorlage.js";

let fehlerGesamt = 0;
for (const g of GESCHOSSE) {
  const fehler = [];
  let summe = 0, planSumme = 0;
  for (const r of g.raeume) {
    const ist = r.b * r.t;
    summe += ist;
    planSumme += r.flaeche;
    if (Math.abs(ist - r.flaeche) > 0.02) {
      fehler.push(r.name + ": gezeichnet " + ist.toFixed(2) + " m², ausgewiesen " + r.flaeche + " m²");
    }
    if (r.x < 0 || r.y < 0 || r.x + r.b > g.breite + 0.001 || r.y + r.t > g.tiefe + 0.001) {
      fehler.push(r.name + " ragt aus dem Umriss");
    }
  }
  for (let i = 0; i < g.raeume.length; i++) {
    for (let j = i + 1; j < g.raeume.length; j++) {
      const a = g.raeume[i], b = g.raeume[j];
      const ueberX = Math.min(a.x + a.b, b.x + b.b) - Math.max(a.x, b.x);
      const ueberY = Math.min(a.y + a.t, b.y + b.t) - Math.max(a.y, b.y);
      if (ueberX > 0.001 && ueberY > 0.001) fehler.push(a.name + " überlappt " + b.name);
    }
  }
  console.log(
    g.titel.padEnd(15) + g.breite.toFixed(2) + " × " + g.tiefe.toFixed(2) + " m · " +
    g.raeume.length + " Räume · " + summe.toFixed(2) + " m² (ausgewiesen " + planSumme.toFixed(2) + " m²) · " +
    (fehler.length ? "FEHLER" : "in Ordnung")
  );
  fehler.forEach((f) => console.log("   " + f));
  fehlerGesamt += fehler.length;
}
process.exit(fehlerGesamt ? 1 : 0);
