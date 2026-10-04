// Aus gemessenen Wänden einen Umriss rechnen.
//
// Gemessen wird rundum: Wand für Wand die Länge, dazu der Innenwinkel zur
// nächsten Wand. 90° ist die normale Ecke, 270° die einspringende (L-Raum),
// 135° und 225° sind Schrägen. Damit lässt sich jeder Raum beschreiben, auch
// der nicht rechtwinklige – ohne dass jemand Koordinaten eingeben müsste.
//
// Gelaufen wird im Uhrzeigersinn: Startrichtung nach rechts, an jeder Ecke um
// (180° − Innenwinkel) weiterdrehen. Bei vier rechten Winkeln kommt genau ein
// Rechteck heraus; stimmen Masse oder Winkel nicht, bleibt am Schluss eine
// Lücke – und die ist die beste Kontrolle, die man auf der Baustelle hat.

export const STANDARD_WINKEL = 90;

/** Nur die Wände, die wirklich ein Mass haben. */
export function gemesseneWaende(waende) {
  return (waende || []).filter((w) => Number(w.laenge) > 0);
}

/**
 * Rechnet den Umriss.
 * Gibt Eckpunkte (Meter, y nach unten), Fläche, Umfang und die Lücke zurück.
 * Die Fläche wird über die Gauss'sche Trapezformel bestimmt; der Umriss wird
 * dafür gedanklich geschlossen, damit auch bei einer kleinen Lücke eine
 * brauchbare Fläche herauskommt.
 */
export function umrissRechnen(waende) {
  const liste = gemesseneWaende(waende);
  const punkte = [];
  let x = 0, y = 0, richtung = 0, umfang = 0;

  liste.forEach((w) => {
    punkte.push([x, y]);
    const l = Number(w.laenge);
    const bogen = (richtung * Math.PI) / 180;
    x += l * Math.cos(bogen);
    y += l * Math.sin(bogen);
    umfang += l;
    const winkel = Number(w.winkel);
    richtung += 180 - (Number.isFinite(winkel) && winkel > 0 ? winkel : STANDARD_WINKEL);
  });

  // Abstand zwischen letztem Punkt und Anfang: so weit geht der Umriss nicht auf.
  const luecke = punkte.length ? Math.hypot(x - punkte[0][0], y - punkte[0][1]) : 0;

  let flaeche = 0;
  if (punkte.length >= 3) {
    for (let i = 0; i < punkte.length; i++) {
      const [ax, ay] = punkte[i];
      const [bx, by] = punkte[(i + 1) % punkte.length];
      flaeche += ax * by - bx * ay;
    }
    flaeche = Math.abs(flaeche) / 2;
  }

  return {
    punkte,
    flaeche: Math.round(flaeche * 100) / 100,
    umfang: Math.round(umfang * 100) / 100,
    luecke: Math.round(luecke * 1000) / 1000,
    vollstaendig: punkte.length >= 3,
  };
}

/** Ab hier gilt der Umriss als geschlossen: 5 cm ist auf dem Bau gut gemessen. */
export const LUECKE_GRENZE = 0.05;

export function schliesst(umriss) {
  return umriss.vollstaendig && umriss.luecke <= LUECKE_GRENZE;
}

/**
 * Zeichnet den gemessenen Umriss als Skizze – nicht als Plan, sondern als
 * Kontrolle: Wer sieht, dass die Form stimmt, weiss, dass er richtig gemessen
 * hat. Eine offene Stelle wird rot gestrichelt gezeigt.
 */
export function skizzeSvg(waende, breite = 300, hoehe = 200) {
  const umriss = umrissRechnen(waende);
  const liste = gemesseneWaende(waende);
  const p = umriss.punkte;
  if (p.length < 2) return "";
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 0.1), spanY = Math.max(maxY - minY, 0.1);
  const rand = 38;
  const faktor = Math.min((breite - 2 * rand) / spanX, (hoehe - 2 * rand) / spanY);
  const versatzX = (breite - spanX * faktor) / 2 - minX * faktor;
  const versatzY = (hoehe - spanY * faktor) / 2 - minY * faktor;
  const bild = (q) => [q[0] * faktor + versatzX, q[1] * faktor + versatzY];

  const ecken = p.map(bild);
  const offen = !schliesst(umriss);
  let h = '<svg class="raum-skizze" viewBox="0 0 ' + breite + " " + hoehe + '" role="img" aria-label="Skizze des gemessenen Raums">';
  h += '<polygon points="' + ecken.map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ") + '"/>';

  // Mitte der Zeichnung – daran entscheidet sich, auf welche Seite der Wand die
  // Beschriftung kommt: immer nach aussen, sonst liegt sie auf der Linie.
  const mitteX = ecken.reduce((s2, q) => s2 + q[0], 0) / ecken.length;
  const mitteY = ecken.reduce((s2, q) => s2 + q[1], 0) / ecken.length;

  ecken.forEach((a, i) => {
    const b = ecken[(i + 1) % ecken.length];
    const letzte = i === ecken.length - 1;
    h += '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) +
      '" y2="' + b[1].toFixed(1) + '" class="' + (letzte && offen ? "offen" : "wand") + '"/>';
    const wand = liste[i];
    const text = wand ? Number(wand.laenge).toFixed(2) : "";
    if (!text) return;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const laenge = Math.hypot(dx, dy) || 1;
    let nx = -dy / laenge, ny = dx / laenge;
    if ((mx - mitteX) * nx + (my - mitteY) * ny < 0) { nx = -nx; ny = -ny; }
    // Senkrechte Wände bekommen die Zahl daneben, waagrechte darüber oder darunter –
    // sonst liegt die Schrift auf der Linie.
    const senkrecht = Math.abs(nx) > Math.abs(ny);
    const anker = senkrecht ? (nx > 0 ? "start" : "end") : "middle";
    h += '<text x="' + (mx + nx * (senkrecht ? 10 : 2)).toFixed(1) + '" y="' + (my + ny * (senkrecht ? 2 : 11)).toFixed(1) +
      '" text-anchor="' + anker + '" dy="' + (senkrecht ? 3.5 : ny > 0 ? 7 : 0) + '">' + (i + 1) + ": " + text + "</text>";
  });
  return h + "</svg>";
}
