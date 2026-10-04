// Prüft die Umrissrechnung an Fällen, die man von Hand nachrechnen kann.
// Aufruf: npm run geometrie
import { umrissRechnen, schliesst } from "../app/js/raumgeometrie.js";

const faelle = [
  {
    name: "Rechteck 4.20 × 3.60",
    waende: [4.2, 3.6, 4.2, 3.6].map((laenge) => ({ laenge, winkel: 90 })),
    flaeche: 15.12, umfang: 15.6, zu: true,
  },
  {
    name: "L-Raum 5.00 × 4.00 mit Nische 3.00 × 1.50",
    waende: [
      { laenge: 5, winkel: 90 }, { laenge: 4, winkel: 90 }, { laenge: 2, winkel: 90 },
      { laenge: 1.5, winkel: 270 }, { laenge: 3, winkel: 90 }, { laenge: 2.5, winkel: 90 },
    ],
    flaeche: 15.5, umfang: 18, zu: true,
  },
  {
    name: "Raum mit Schräge: 4.00 / 3.00 / Schräge / 3.00",
    // Rechteck 4.00 × 3.00, eine Ecke auf 1.00 × 1.00 abgeschrägt:
    // 12.00 − 0.50 = 11.50 m²
    waende: [
      { laenge: 4, winkel: 90 }, { laenge: 3, winkel: 90 }, { laenge: 3, winkel: 135 },
      { laenge: Math.SQRT2, winkel: 135 }, { laenge: 2, winkel: 90 },
    ],
    flaeche: 11.5, umfang: 13.41, zu: true,
  },
  {
    name: "Falsch gemessen: Umriss geht nicht auf",
    waende: [3, 2, 2.6, 2].map((laenge) => ({ laenge, winkel: 90 })),
    luecke: 0.4, zu: false,
  },
  {
    name: "Zwei Wände ergeben noch keine Fläche",
    waende: [{ laenge: 3, winkel: 90 }, { laenge: 2, winkel: 90 }],
    vollstaendig: false,
  },
];

let fehler = 0;
const pruefe = (name, ist, soll) => {
  if (soll === undefined) return;
  if (Math.abs(ist - soll) > 0.011 && ist !== soll) {
    console.log("FEHLER " + name + ": " + ist + " statt " + soll);
    fehler++;
  }
};

faelle.forEach((f) => {
  const u = umrissRechnen(f.waende);
  pruefe(f.name + " – Fläche", u.flaeche, f.flaeche);
  pruefe(f.name + " – Umfang", u.umfang, f.umfang);
  pruefe(f.name + " – Lücke", u.luecke, f.luecke);
  if (f.zu !== undefined && schliesst(u) !== f.zu) {
    console.log("FEHLER " + f.name + ": geschlossen = " + schliesst(u) + " statt " + f.zu);
    fehler++;
  }
  if (f.vollstaendig !== undefined && u.vollstaendig !== f.vollstaendig) {
    console.log("FEHLER " + f.name + ": vollständig = " + u.vollstaendig);
    fehler++;
  }
  if (!fehler) console.log("  ok  " + f.name);
});

if (fehler) { console.log("\n" + fehler + " Abweichung(en)."); process.exit(1); }
console.log("\nUmrissrechnung in Ordnung.");
