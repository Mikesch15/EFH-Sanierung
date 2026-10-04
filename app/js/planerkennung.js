// Wände im Planbild erkennen – und Räume durch Antippen ausmessen.
//
// Der Weg über eingetippte Wandlängen war Handarbeit. Hier macht es die App:
// Das hochgeladene Planbild besteht aus dunklen Linien auf hellem Grund. Alles
// Dunkle gilt als Wand; was dazwischen liegt, ist Raum. Ein Tipp in einen Raum
// füllt ihn bis an seine Wände aus – wie ein Farbeimer. Daraus kommen Fläche,
// Umriss und Wandlängen, und zwar für jede Form: L-Raum, Erker, Schräge.
//
// Gemessen wird trotzdem mit dem Laser: Eine einzige Wand genügt, um den
// Massstab zu setzen (Pixel pro Meter). Ab da sind alle anderen Räume des Plans
// ausgerechnet, und jede weitere Lasermessung ist Kontrolle oder Korrektur.
//
// Alles rechnet im Browser auf dem Gerät – es wird kein Bild irgendwohin
// geschickt.

/* ------------------------------------------------------------------ Maske */

/**
 * Macht aus den Bilddaten eine Wandmaske: 1 = dunkel (Wand), 0 = hell (Raum).
 * `schwelle` ist die Helligkeit, ab der etwas als Wand gilt (0–255).
 */
export function maskeBauen(bilddaten, schwelle = 150) {
  const { data, width, height } = bilddaten;
  const maske = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < maske.length; i++, p += 4) {
    // Durchsichtige Stellen (z.B. PNG mit Alpha) zählen als hell.
    const alpha = data[p + 3];
    const hell = alpha < 32 ? 255 : (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
    maske[i] = hell < schwelle ? 1 : 0;
  }
  return maske;
}

// Dilatation und Erosion laufen über ein gleitendes Fenster: je Zeile bzw.
// Spalte wird die Summe fortgeschrieben, statt für jedes Pixel neu zu zählen –
// sonst dauert es auf einem Handy zu lange.
// Dilatation: 1, sobald irgendein Pixel im Fenster 1 ist.
// Erosion: 1, nur wenn alle Pixel im Fenster 1 sind. Ausserhalb des Bildes
// wird 1 angenommen, damit der Bildrand nicht angefressen wird.
function fensterX(quelle, ziel, b, h, r, erodieren) {
  for (let y = 0; y < h; y++) {
    const z = y * b;
    let summe = 0;
    for (let x = 0; x <= r && x < b; x++) summe += quelle[z + x];
    for (let x = 0; x < b; x++) {
      if (x > 0) {
        const rechts = x + r, links = x - r - 1;
        if (rechts < b) summe += quelle[z + rechts];
        if (links >= 0) summe -= quelle[z + links];
      }
      const imBild = Math.min(x + r, b - 1) - Math.max(x - r, 0) + 1;
      ziel[z + x] = erodieren ? (summe >= imBild ? 1 : 0) : (summe > 0 ? 1 : 0);
    }
  }
}

function fensterY(quelle, ziel, b, h, r, erodieren) {
  for (let x = 0; x < b; x++) {
    let summe = 0;
    for (let y = 0; y <= r && y < h; y++) summe += quelle[y * b + x];
    for (let y = 0; y < h; y++) {
      if (y > 0) {
        const unten = y + r, oben = y - r - 1;
        if (unten < h) summe += quelle[unten * b + x];
        if (oben >= 0) summe -= quelle[oben * b + x];
      }
      const imBild = Math.min(y + r, h - 1) - Math.max(y - r, 0) + 1;
      ziel[y * b + x] = erodieren ? (summe >= imBild ? 1 : 0) : (summe > 0 ? 1 : 0);
    }
  }
}

/**
 * Schliesst Lücken in den Wänden – vor allem Türöffnungen.
 *
 * Geschlossen wird richtungsweise: einmal nur waagrecht, einmal nur senkrecht,
 * danach beides zusammengenommen. Eine Türöffnung in einer senkrechten Wand ist
 * eine senkrechte Lücke und wird senkrecht überbrückt, ohne dass die Wand quer
 * dazu dicker wird. Ein Schliessen in alle Richtungen auf einmal müsste so breit
 * sein, dass die Wände die Räume auffressen.
 *
 * `radius` in Pixeln: Öffnungen bis etwa 2 × radius werden überbrückt.
 */
export function lueckenSchliessen(maske, b, h, radius) {
  if (!radius) return maske;
  const hilf = new Uint8Array(maske.length);
  const waag = new Uint8Array(maske.length);
  const senk = new Uint8Array(maske.length);
  fensterX(maske, hilf, b, h, radius, false);
  fensterX(hilf, waag, b, h, radius, true);
  fensterY(maske, hilf, b, h, radius, false);
  fensterY(hilf, senk, b, h, radius, true);
  for (let i = 0; i < maske.length; i++) waag[i] = waag[i] || senk[i] ? 1 : 0;
  return waag;
}

/* ------------------------------------------------------------- Raum füllen */

/**
 * Füllt von einem Punkt aus alles, was nicht Wand ist – bis an die Wände.
 * Läuft die Füllung aus (offene Tür, Loch im Plan), bricht sie ab und meldet
 * das: lieber ehrlich «Raum nicht geschlossen» als eine erfundene Fläche.
 */
export function raumFuellen(maske, b, h, startX, startY, grenzAnteil = 0.45) {
  const start = startY * b + startX;
  if (startX < 0 || startY < 0 || startX >= b || startY >= h) return { leer: true };
  if (maske[start]) return { aufWand: true };

  const gefuellt = new Uint8Array(maske.length);
  const grenze = Math.floor(maske.length * grenzAnteil);
  const stapel = new Int32Array(maske.length);
  let spitze = 0, anzahl = 0;
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  stapel[spitze++] = start;
  gefuellt[start] = 1;

  while (spitze > 0) {
    const i = stapel[--spitze];
    const x = i % b, y = (i - x) / b;
    anzahl++;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (anzahl > grenze) return { leck: true, anzahl };

    if (x > 0 && !maske[i - 1] && !gefuellt[i - 1]) { gefuellt[i - 1] = 1; stapel[spitze++] = i - 1; }
    if (x < b - 1 && !maske[i + 1] && !gefuellt[i + 1]) { gefuellt[i + 1] = 1; stapel[spitze++] = i + 1; }
    if (y > 0 && !maske[i - b] && !gefuellt[i - b]) { gefuellt[i - b] = 1; stapel[spitze++] = i - b; }
    if (y < h - 1 && !maske[i + b] && !gefuellt[i + b]) { gefuellt[i + b] = 1; stapel[spitze++] = i + b; }
  }
  // Berührt die Füllung den Bildrand, war der Raum nicht geschlossen.
  const amRand = minX === 0 || minY === 0 || maxX === b - 1 || maxY === h - 1;
  return { gefuellt, anzahl, minX, maxX, minY, maxY, amRand };
}

/* ------------------------------------------------------------------ Umriss */

/** Randverfolgung (Moore-Nachbarschaft) um die gefüllte Fläche herum. */
function randVerfolgen(gefuellt, b, h, startX, startY) {
  const drin = (x, y) => x >= 0 && y >= 0 && x < b && y < h && gefuellt[y * b + x] === 1;
  const nachbarn = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const punkte = [[startX, startY]];
  let x = startX, y = startY, richtung = 6;        // zuletzt von oben gekommen
  const maximal = 4 * (b + h) * 4;

  for (let schritt = 0; schritt < maximal; schritt++) {
    let gefunden = false;
    for (let k = 0; k < 8; k++) {
      const r = (richtung + 5 + k) % 8;            // links vom Rückweg beginnen
      const nx = x + nachbarn[r][0], ny = y + nachbarn[r][1];
      if (drin(nx, ny)) {
        richtung = r; x = nx; y = ny; gefunden = true;
        break;
      }
    }
    if (!gefunden) break;                           // einzelner Punkt
    if (x === startX && y === startY) break;
    punkte.push([x, y]);
  }
  return punkte;
}

/** Vereinfacht einen Linienzug (Douglas-Peucker). */
function vereinfachen(punkte, toleranz) {
  if (punkte.length < 3) return punkte;
  const abstand = (p, a, c) => {
    const dx = c[0] - a[0], dy = c[1] - a[1];
    const l = Math.hypot(dx, dy);
    if (!l) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    return Math.abs(dy * p[0] - dx * p[1] + c[0] * a[1] - c[1] * a[0]) / l;
  };
  const behalten = new Uint8Array(punkte.length);
  behalten[0] = behalten[punkte.length - 1] = 1;
  const stapel = [[0, punkte.length - 1]];
  while (stapel.length) {
    const [a, c] = stapel.pop();
    let weitester = -1, weit = toleranz;
    for (let i = a + 1; i < c; i++) {
      const d = abstand(punkte[i], punkte[a], punkte[c]);
      if (d > weit) { weit = d; weitester = i; }
    }
    if (weitester > 0) {
      behalten[weitester] = 1;
      stapel.push([a, weitester], [weitester, c]);
    }
  }
  return punkte.filter((_, i) => behalten[i]);
}

/**
 * Umriss der gefüllten Fläche als Polygon (Pixel). Erst dem Rand entlang,
 * dann vereinfachen: aus Tausenden Treppenstufen werden die paar Ecken, die
 * der Raum wirklich hat.
 */
export function umrissBestimmen(fuellung, b, h, toleranz = 3) {
  const { gefuellt, minY, minX } = fuellung;
  let startX = -1, startY = -1;
  for (let y = minY; y <= fuellung.maxY && startX < 0; y++) {
    for (let x = minX; x <= fuellung.maxX; x++) {
      if (gefuellt[y * b + x]) { startX = x; startY = y; break; }
    }
  }
  if (startX < 0) return [];
  const roh = randVerfolgen(gefuellt, b, h, startX, startY);
  const einfach = vereinfachen(roh, toleranz);
  // Erster und letzter Punkt sind praktisch derselbe – einen weglassen.
  if (einfach.length > 2) {
    const a = einfach[0], z = einfach[einfach.length - 1];
    if (Math.hypot(a[0] - z[0], a[1] - z[1]) < toleranz * 2) einfach.pop();
  }
  return einfach;
}

/* --------------------------------------------------------- Wand antippen */

/**
 * Sucht die Wand unter dem Finger und misst, wie weit sie geradeaus läuft.
 * Damit lässt sich eine einzelne Wand antippen und mit dem Laser vermassen –
 * daraus ergibt sich der Massstab für den ganzen Plan.
 */
export function wandSuchen(maske, b, h, x, y, umkreis = 14) {
  let beste = -1, bx = -1, by = -1;
  for (let dy = -umkreis; dy <= umkreis; dy++) {
    for (let dx = -umkreis; dx <= umkreis; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= b || ny >= h || !maske[ny * b + nx]) continue;
      const d = dx * dx + dy * dy;
      if (beste < 0 || d < beste) { beste = d; bx = nx; by = ny; }
    }
  }
  if (beste < 0) return null;

  const laufen = (sx, sy, sr) => {
    // Einer Wand folgen. Kleine Versätze quer dazu sind erlaubt, damit eine
    // leicht schiefe oder unsaubere Linie nicht sofort abbricht – aber nur
    // insgesamt ein paar Pixel weit. Ohne diese Grenze wandert die Verfolgung
    // über Masslinien und Beschriftungen davon und misst etwas ganz anderes.
    const abweichungMax = 6;
    let px = sx, py = sy;
    const quer = sr[0] === 0 ? [1, 0] : [0, 1];
    for (let schritte = 0; schritte < 5000; schritte++) {
      let weiter = false;
      for (const v of [0, 1, -1, 2, -2]) {
        const nx = px + sr[0] + quer[0] * v, ny = py + sr[1] + quer[1] * v;
        if (nx < 0 || ny < 0 || nx >= b || ny >= h || !maske[ny * b + nx]) continue;
        if (Math.abs((nx - sx) * quer[0] + (ny - sy) * quer[1]) > abweichungMax) continue;
        px = nx; py = ny; weiter = true; break;
      }
      if (!weiter) break;
    }
    return [px, py];
  };

  // Waagrecht und senkrecht ausmessen, die längere Richtung gewinnt.
  const waag = [laufen(bx, by, [-1, 0]), laufen(bx, by, [1, 0])];
  const senk = [laufen(bx, by, [0, -1]), laufen(bx, by, [0, 1])];
  const laengeW = Math.hypot(waag[1][0] - waag[0][0], waag[1][1] - waag[0][1]);
  const laengeS = Math.hypot(senk[1][0] - senk[0][0], senk[1][1] - senk[0][1]);
  const [a, c] = laengeW >= laengeS ? waag : senk;
  const laenge = Math.max(laengeW, laengeS);
  if (laenge < 8) return null;
  return { x1: a[0], y1: a[1], x2: c[0], y2: c[1], laenge };
}

/* ------------------------------------------------------------- Rechnerisch */

/** Länge eines Polygonzugs (geschlossen) in Pixeln. */
export function umfangPixel(punkte) {
  let u = 0;
  for (let i = 0; i < punkte.length; i++) {
    const a = punkte[i], c = punkte[(i + 1) % punkte.length];
    u += Math.hypot(c[0] - a[0], c[1] - a[1]);
  }
  return u;
}

/** Die einzelnen Wände des Umrisses, mit Länge in Metern. */
export function wandLaengen(punkte, pxProMeter) {
  return punkte.map((a, i) => {
    const c = punkte[(i + 1) % punkte.length];
    return {
      von: i,
      laenge: Math.hypot(c[0] - a[0], c[1] - a[1]) / pxProMeter,
      mitte: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2],
    };
  });
}
