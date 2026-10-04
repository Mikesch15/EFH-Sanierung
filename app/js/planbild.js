// Die Brücke zwischen dem angezeigten Planbild und der Erkennung.
//
// Hier wird das Bild einmal in ein Rechenraster gelegt (Canvas → Wandmaske) und
// gemerkt, solange der Plan offen ist. Jeder Tipp fragt nur noch die Maske ab:
// Raum füllen, Wand suchen. Alles bleibt auf dem Gerät – das Bild wird nirgends
// hingeschickt.
import {
  maskeBauen, lueckenSchliessen, raumFuellen, umrissBestimmen, wandSuchen, umfangPixel,
} from "./planerkennung.js";

// Grösser rechnet sich nicht besser, nur langsamer: 1400 Punkte Kantenlänge
// reichen für einen Geschossplan, auch auf einem älteren Handy.
const MAX_KANTE = 1400;

const gemerkt = new Map();   // planId → { roh, maske, b, h, schwelle, luecken }

export function vergessen(planId) {
  if (planId) gemerkt.delete(planId); else gemerkt.clear();
}

/** Liest das angezeigte Bild aus und baut die Wandmaske (oder nimmt die gemerkte). */
export function maskeHolen(plan, bildEl) {
  const schwelle = plan.schwelle ?? 150;
  const luecken = plan.luecken ?? 18;
  const alt = gemerkt.get(plan.id);
  if (alt && alt.schwelle === schwelle && alt.luecken === luecken) return alt;

  const bb = bildEl.naturalWidth, bh = bildEl.naturalHeight;
  if (!bb || !bh) return null;
  const faktor = Math.min(1, MAX_KANTE / Math.max(bb, bh));
  const b = Math.max(1, Math.round(bb * faktor)), h = Math.max(1, Math.round(bh * faktor));

  const leinwand = document.createElement("canvas");
  leinwand.width = b; leinwand.height = h;
  const stift = leinwand.getContext("2d", { willReadFrequently: true });
  stift.drawImage(bildEl, 0, 0, b, h);
  let bilddaten;
  try {
    bilddaten = stift.getImageData(0, 0, b, h);
  } catch (e) {
    // Fremde Herkunft ohne CORS – dann lässt sich das Bild nicht auslesen.
    return { fehler: "Dieses Bild lässt sich nicht auslesen. Bitte den Plan neu hochladen." };
  }

  const roh = maskeBauen(bilddaten, schwelle);
  const maske = lueckenSchliessen(roh, b, h, luecken);
  const stand = { roh, maske, b, h, schwelle, luecken };
  gemerkt.set(plan.id, stand);
  return stand;
}

/** Anteil der Bildpunkte, die als Wand gelten – zur Beurteilung der Schwelle. */
export function wandAnteil(stand) {
  let n = 0;
  for (let i = 0; i < stand.roh.length; i++) n += stand.roh[i];
  return n / stand.roh.length;
}

/**
 * Raum unter dem Finger ausmessen. `rx`/`ry` sind relativ zum Bild (0 bis 1).
 * Zurück kommt der Umriss (relativ), die Fläche in Bildpunkten und – wenn der
 * Massstab steht – in Quadratmetern.
 */
export function raumMessen(stand, plan, rx, ry) {
  let x = Math.round(rx * stand.b), y = Math.round(ry * stand.h);
  // Pläne sind voller Beschriftungen und Möbelsymbole. Wer eines davon trifft,
  // soll nicht abgewiesen werden – es wird daneben weitergesucht.
  if (stand.maske[y * stand.b + x]) {
    const frei = freiesDaneben(stand, x, y, 16);
    if (!frei) return { fehler: "Dort ist eine Wand. Bitte in die Raummitte tippen." };
    x = frei[0]; y = frei[1];
  }
  const fuellung = raumFuellen(stand.maske, stand.b, stand.h, x, y);
  if (fuellung.aufWand) return { fehler: "Dort ist eine Wand. Bitte in die Raummitte tippen." };
  if (fuellung.leck || fuellung.amRand) {
    return {
      fehler: "Der Raum ist nicht geschlossen – meist eine Türöffnung, die breiter ist als der " +
        "eingestellte Wert. Unter «Erkennung einstellen» den Regler «Türöffnungen» erhöhen.",
    };
  }
  const punkte = umrissBestimmen(fuellung, stand.b, stand.h, 3);
  if (punkte.length < 3) return { fehler: "Dort liess sich kein Raum erkennen." };

  const pxProM = Number(plan.px_pro_meter) || 0;
  const umriss = punkte.map((p) => [p[0] / stand.b, p[1] / stand.h]);
  return {
    umriss,
    punkte,
    pixel: fuellung.anzahl,
    flaeche: pxProM ? fuellung.anzahl / (pxProM * pxProM) : null,
    umfang: pxProM ? umfangPixel(punkte) / pxProM : null,
  };
}

/** Nächstgelegener Punkt, der keine Wand ist. */
function freiesDaneben(stand, x, y, umkreis) {
  for (let r = 1; r <= umkreis; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= stand.b || ny >= stand.h) continue;
        if (!stand.maske[ny * stand.b + nx]) return [nx, ny];
      }
    }
  }
  return null;
}

/** Wand unter dem Finger suchen – für den Massstab. Immer auf dem rohen Bild. */
export function wandMessen(stand, rx, ry) {
  const x = Math.round(rx * stand.b), y = Math.round(ry * stand.h);
  const wand = wandSuchen(stand.roh, stand.b, stand.h, x, y);
  if (!wand) return { fehler: "Dort ist keine Wand. Bitte genau auf eine Wandlinie tippen." };
  return {
    pixel: wand.laenge,
    strecke: [[wand.x1 / stand.b, wand.y1 / stand.h], [wand.x2 / stand.b, wand.y2 / stand.h]],
  };
}

/**
 * Die Wände eines gespeicherten Raums mit ihren Längen in Metern.
 * Der Umriss ist relativ gespeichert; die Bildgrösse, auf die sich der Massstab
 * bezieht, steht beim Plan (bild_breite / bild_hoehe).
 */
export function raumWaende(raum, plan) {
  const pxProM = Number(plan.px_pro_meter) || 0;
  const bildBreite = Number(plan.bild_breite) || 0;
  const bildHoehe = Number(plan.bild_hoehe) || 0;
  if (!bildBreite || !bildHoehe) return [];
  const punkte = (raum.umriss || []).map((p) => [p[0] * bildBreite, p[1] * bildHoehe]);
  const masse = raum.wand_masse || [];
  return punkte.map((a, i) => {
    const c = punkte[(i + 1) % punkte.length];
    const gemessen = masse.find((m) => m.kante === i);
    return {
      kante: i,
      plan: pxProM ? Math.hypot(c[0] - a[0], c[1] - a[1]) / pxProM : null,
      laser: gemessen ? Number(gemessen.laenge) : null,
      mitte: [((a[0] + c[0]) / 2) / bildBreite, ((a[1] + c[1]) / 2) / bildHoehe],
    };
  });
}
