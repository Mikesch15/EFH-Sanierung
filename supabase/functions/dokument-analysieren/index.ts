// Liest eine hochgeladene Offerte oder einen Beleg mit Google Gemini aus.
//
// Warum als Edge Function und nicht im Browser: Der API-Schlüssel darf das
// Gerät nie erreichen. Er liegt als Secret GEMINI_API_KEY beim Projekt.
//
// Zugriffsschutz: Die Funktion lädt die Datei mit dem Token der aufrufenden
// Person aus dem Speicher. Damit gelten dieselben Row-Level-Security-Regeln wie
// überall sonst – wer eine Datei nicht sehen darf, kann sie auch nicht
// analysieren lassen.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 15 * 1024 * 1024;          // grössere Dateien lehnt Gemini ab

// Modellnamen ändern sich und sind nicht für jeden Schlüssel freigeschaltet. Fest
// verdrahtete Namen führen deshalb zu "nicht verfügbar", obwohl alles eingerichtet
// ist. Darum: beim Dienst nachfragen, welche Modelle dieser Schlüssel verwenden darf.
const BASIS = "https://generativelanguage.googleapis.com/v1beta";
// Nicht jedes Modell wird unter beiden Schnittstellen-Versionen ausgeliefert.
// Antwortet v1beta mit 404, ist derselbe Name unter v1 oft erreichbar.
const BASIS_V1 = "https://generativelanguage.googleapis.com/v1";

/**
 * Je höher, desto lieber: aktuell zuerst, dann schnell.
 *
 * Die Versionsnummer wird gelesen, nicht aufgezählt. Fest eingetragene Nummern
 * ("2.5 ist das neueste") veralten und lassen genau die Modelle zuletzt
 * versuchen, die als einzige noch bedient werden.
 */
function modellRang(name: string): number {
  let rang = 0;
  const version = /(\d+)\.(\d+)/.exec(name);
  if (version) rang += Number(version[1]) * 20 + Number(version[2]);
  if (name.includes("flash")) rang += 8;        // schnell und günstig
  if (name.includes("pro")) rang += 3;
  if (name.includes("latest")) rang += 2;
  if (name.includes("lite")) rang -= 3;
  if (name.includes("preview") || name.includes("exp")) rang -= 5;
  if (/\d{3,}/.test(name)) rang -= 1;          // datierte Vorabversionen
  return rang;
}

// "gemini-2.5-flash-image" erzeugt Bilder, statt sie zu lesen – solche Namen
// kosten nur einen Versuch. Deshalb alles mit "image" aussortieren.
const UNGEEIGNET = /embedding|aqa|imagen|image|tts|audio|live|veo|learnlm|gemma/;

// Modelle, die dieser Schlüssel laut Liste dürfte, die beim Aufruf aber 404
// antworten. Das ändert sich nicht innerhalb einer Minute – also merken und
// keinen weiteren Versuch daran verschwenden.
const untauglich = new Set<string>();
// Was zuletzt funktioniert hat, wird zuerst wieder gefragt.
let bewaehrt = "";

/**
 * Familie eines Modells: "gemini-2.5-flash-preview-09-2025" und
 * "gemini-2.5-flash-latest" sind Namen für dieselbe Maschine. Ist die überlastet,
 * hilft es nichts, den nächsten Namen derselben Familie zu versuchen – man muss
 * auf eine andere ausweichen.
 */
function familie(name: string): string {
  return name
    .replace(/-(latest|preview|exp|experimental)(-.*)?$/, "")
    .replace(/-\d{3,}.*$/, "")
    .replace(/-\d{2}-\d{4}$/, "");
}

/** Beste Modelle, aber je Familie nur eines – damit ein Ausweichen auch eines ist. */
function breitStreuen(alle: string[], anzahl: number): string[] {
  const namen = alle.filter((n) => !untauglich.has(n));
  if (bewaehrt && namen.includes(bewaehrt)) {
    namen.splice(namen.indexOf(bewaehrt), 1);
    namen.unshift(bewaehrt);
  }
  const gesehen = new Set<string>();
  const auswahl: string[] = [];
  for (const name of namen) {
    const f = familie(name);
    if (gesehen.has(f)) continue;
    gesehen.add(f);
    auswahl.push(name);
    if (auswahl.length >= anzahl) break;
  }
  // Reicht die Vielfalt nicht, mit dem Rest auffüllen.
  for (const name of namen) {
    if (auswahl.length >= anzahl) break;
    if (!auswahl.includes(name)) auswahl.push(name);
  }
  return auswahl;
}

let zwischenspeicher: { modelle: string[]; zeit: number } | null = null;

/** Modelle, die dieser Schlüssel für generateContent nutzen darf – beste zuerst. */
async function modelleErmitteln(schluessel: string): Promise<{ modelle: string[]; fehler?: string }> {
  if (zwischenspeicher && Date.now() - zwischenspeicher.zeit < 10 * 60 * 1000) {
    return { modelle: zwischenspeicher.modelle };
  }
  let listenAntwort: Response;
  try {
    listenAntwort = await fetch(BASIS + "/models?pageSize=200", {
      headers: { "x-goog-api-key": schluessel },
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return { modelle: [], fehler: "Der KI-Dienst war nicht erreichbar: " + (e as Error).message };
  }
  if (!listenAntwort.ok) {
    const text = await listenAntwort.text();
    return { modelle: [], fehler: "Modellliste (" + listenAntwort.status + "): " + text.slice(0, 300) };
  }
  const daten = await listenAntwort.json();
  const namen: string[] = (daten.models ?? [])
    .filter((m: { supportedGenerationMethods?: string[] }) =>
      (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m: { name: string }) => m.name.replace(/^models\//, ""))
    .filter((n: string) => !UNGEEIGNET.test(n))
    .sort((a: string, b: string) => modellRang(b) - modellRang(a));

  const wunsch = Deno.env.get("GEMINI_MODELL");
  const liste = wunsch ? [wunsch, ...namen.filter((n) => n !== wunsch)] : namen;
  if (liste.length) zwischenspeicher = { modelle: liste, zeit: Date.now() };
  return { modelle: liste };
}

/** Die Begründung des Dienstes, ohne das Drumherum. */
function kurzeBegruendung(text: string): string {
  try {
    return String(JSON.parse(text)?.error?.message ?? "").slice(0, 200);
  } catch {
    return text.slice(0, 200);
  }
}

/** Aus einer 429-Antwort das Wesentliche ziehen: welches Kontingent, wie lange warten. */
function kontingentDetail(text: string): string {
  try {
    const daten = JSON.parse(text);
    const details = daten?.error?.details ?? [];
    // deno-lint-ignore no-explicit-any
    const quota = details.find((d: any) => String(d["@type"]).includes("QuotaFailure"))?.violations?.[0];
    // deno-lint-ignore no-explicit-any
    const warten = details.find((d: any) => String(d["@type"]).includes("RetryInfo"))?.retryDelay;
    const teile: string[] = [];
    if (quota?.quotaId || quota?.quotaMetric) teile.push(String(quota.quotaId ?? quota.quotaMetric));
    if (warten) teile.push("Wartezeit " + warten);
    return teile.join(", ") || String(daten?.error?.message ?? "").slice(0, 140);
  } catch {
    return text.slice(0, 140);
  }
}

function antwort(daten: unknown, status = 200) {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

const OFFERT_SCHEMA = {
  type: "object",
  properties: {
    lieferant: { type: "string" },
    nummer: { type: "string" },
    datum: { type: "string", description: "ISO-Datum JJJJ-MM-TT, leer wenn nicht erkennbar" },
    mwst_satz: { type: "number", nullable: true, description: "Prozentsatz, z.B. 8.1; null wenn keine MWST ausgewiesen" },
    positionen: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nr: { type: "string" },
          beschreibung: { type: "string" },
          menge: { type: "number" },
          einheit: { type: "string" },
          einzelpreis: { type: "number", description: "Preis je Einheit, ohne MWST" },
        },
        required: ["beschreibung", "menge", "einheit", "einzelpreis"],
      },
    },
    bemerkung: { type: "string" },
    hinweis: { type: "string", description: "Was unklar war, in einem kurzen Satz auf Deutsch" },
  },
  required: ["lieferant", "nummer", "datum", "positionen"],
};

const BELEG_SCHEMA = {
  type: "object",
  properties: {
    lieferant: { type: "string" },
    nummer: { type: "string" },
    datum: { type: "string", description: "ISO-Datum JJJJ-MM-TT" },
    netto: { type: "number", description: "Betrag ohne MWST" },
    mwst: { type: "number", nullable: true, description: "MWST-Betrag; null wenn nicht ausgewiesen" },
    brutto: { type: "number", description: "Rechnungsbetrag inklusive MWST" },
    bezahlt: { type: "boolean" },
    zahlungsdatum: { type: "string" },
    hinweis: { type: "string" },
  },
  required: ["lieferant", "nummer", "datum", "brutto"],
};

const ANWEISUNG_GEMEINSAM = `Du liest Schweizer Bau- und Handwerkerdokumente aus.
Beträge sind in Schweizer Franken; im Schweizer Format trennt ein Apostroph die Tausender
(1'250.50). Gib Zahlen als reine Zahlen zurück, ohne Währungszeichen und ohne Apostroph.
Der übliche MWST-Satz ist 8.1 Prozent, es kommen aber auch 2.6 und 3.8 Prozent vor.
Datumsangaben im Format JJJJ-MM-TT. Erfinde nichts: Was nicht im Dokument steht, bleibt leer
beziehungsweise null. Antworte ausschliesslich mit JSON nach dem vorgegebenen Schema.`;

const ANWEISUNG_OFFERTE = `${ANWEISUNG_GEMEINSAM}
Dies ist eine Offerte oder ein Kostenvoranschlag. Erfasse alle Leistungspositionen einzeln
mit Nummer, Beschreibung, Menge, Einheit (z.B. Stk, m2, lfm, h, pauschal) und Einzelpreis
ohne MWST. Rabatte und Pauschalabzüge gehören als eigene Position mit negativem Einzelpreis
dazu. Übernimm keine Zwischentotale und keine Endsummen als Position.`;

const ANWEISUNG_BELEG = `${ANWEISUNG_GEMEINSAM}
Dies ist eine Rechnung oder eine Quittung. Erfasse den Gesamtbetrag (brutto), den Betrag
ohne MWST (netto) und den MWST-Betrag. Ist nur ein Betrag ausgewiesen, trage ihn als brutto
ein und lasse die anderen Felder leer. Steht auf dem Beleg ein Zahlungsvermerk, setze
bezahlt auf true.`;

Deno.serve(async (anfrage) => {
  if (anfrage.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (anfrage.method !== "POST") return antwort({ fehler: "Nur POST" }, 405);

  const schluessel = Deno.env.get("GEMINI_API_KEY");
  if (!schluessel) {
    return antwort({
      code: "kein_schluessel",
      fehler: "Die KI-Analyse ist noch nicht eingerichtet: Es fehlt der Schlüssel GEMINI_API_KEY.",
    }, 503);
  }

  const autorisierung = anfrage.headers.get("Authorization");
  if (!autorisierung) return antwort({ fehler: "Nicht angemeldet" }, 401);

  let pfad: string, art: string;
  try {
    const koerper = await anfrage.json();
    pfad = String(koerper.pfad || "");
    art = koerper.art === "beleg" ? "beleg" : "offerte";
  } catch {
    return antwort({ fehler: "Ungültige Anfrage" }, 400);
  }
  if (!pfad) return antwort({ fehler: "Kein Dateipfad angegeben" }, 400);

  // Mit dem Token der aufrufenden Person: Es gelten deren Zugriffsrechte.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: autorisierung } } },
  );

  const { data: datei, error: dateiFehler } = await supabase.storage.from("projektdateien").download(pfad);
  if (dateiFehler || !datei) {
    return antwort({ fehler: "Datei nicht gefunden oder kein Zugriff: " + (dateiFehler?.message ?? "") }, 404);
  }
  if (datei.size > MAX_BYTES) {
    return antwort({ fehler: "Die Datei ist zu gross für die Analyse (max. 15 MB)." }, 413);
  }

  const bytes = new Uint8Array(await datei.arrayBuffer());
  let binaer = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binaer += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  const base64 = btoa(binaer);
  const mimeTyp = datei.type || (pfad.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");

  // Zwei Einstellungen, die den Unterschied zwischen "läuft" und "Zeitüberschreitung"
  // ausmachen:
  //
  // thinkingLevel "LOW": Modelle der 3er-Generation denken immer mit und lassen sich
  // nicht abschalten. Voreingestellt ist MEDIUM – das dauert bei einem dichten
  // Dokument deutlich länger, als jemand vor dem Bildschirm warten mag. Das Auslesen
  // einer Positionstabelle ist mechanisches Ablesen, kein mehrstufiges Überlegen;
  // Google empfiehlt LOW genau dafür.
  //
  // maxOutputTokens 65536: Eine Offerte mit vielen Positionen ergibt viel JSON. Ist
  // der Rahmen zu klein, bricht die Antwort mitten im Satz ab und ist unlesbar.
  //
  // Ältere Modelle kennen thinkingConfig nicht und lehnen die Anfrage ab – dann wird
  // sie unten ohne diese Einstellung wiederholt.
  function nutzlastBauen(mitDenken: boolean, mitSchema: boolean) {
    const einstellungen: Record<string, unknown> = {
      temperature: 0,
      maxOutputTokens: 65536,
      responseMimeType: "application/json",
    };
    if (mitSchema) einstellungen.responseSchema = art === "beleg" ? BELEG_SCHEMA : OFFERT_SCHEMA;
    if (mitDenken) einstellungen.thinkingConfig = { thinkingLevel: "LOW" };
    return {
      systemInstruction: { parts: [{ text: art === "beleg" ? ANWEISUNG_BELEG : ANWEISUNG_OFFERTE }] },
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: mimeTyp, data: base64 } },
          { text: art === "beleg" ? "Lies diesen Beleg aus." : "Lies diese Offerte aus." },
        ],
      }],
      generationConfig: einstellungen,
    };
  }
  let mitDenken = true;
  let mitSchema = true;

  const { modelle, fehler: listenFehler } = await modelleErmitteln(schluessel);
  if (!modelle.length) {
    return antwort({
      code: "kein_modell",
      fehler: listenFehler
        ? "Der KI-Dienst gibt kein nutzbares Modell frei. " + listenFehler
        : "Der hinterlegte Zugang gibt kein Modell frei, das Dokumente auslesen kann.",
    }, 502);
  }

  let letzterFehler = "";
  let ersteAblehnung = "";
  let kontingentDetails = "";
  let ueberlastet = false;
  // Jedes Modell bis zu zweimal: Ein "gerade überlastet" ist oft nach ein paar
  // Sekunden vorbei. Danach das nächste Modell – höchstens vier, sonst dauert es
  // länger, als jemand vor dem Bildschirm warten mag.
  // Fünf statt vier: Erfahrungsgemäss sind ein, zwei Namen aus der Liste beim
  // Aufruf doch nicht nutzbar – die sollen nicht die echten Versuche auffressen.
  const kandidaten = breitStreuen(modelle, 5);
  const versuche: { modell: string; basis: string }[] = [];
  for (const modell of kandidaten) versuche.push({ modell, basis: BASIS }, { modell, basis: BASIS });
  const protokoll: string[] = [];

  // Die App wartet höchstens 160 Sekunden. Danach nützt ein weiterer Versuch
  // niemandem mehr – lieber mit einer brauchbaren Meldung aufhören.
  const schluss = Date.now() + 125000;

  for (let i = 0; i < versuche.length; i++) {
    const { modell, basis } = versuche[i];
    if (Date.now() > schluss) { protokoll.push("Zeit abgelaufen"); break; }
    const zweiterAnlauf = i > 0 && versuche[i - 1].modell === modell && versuche[i - 1].basis === basis;
    if (zweiterAnlauf) await new Promise((weiter) => setTimeout(weiter, 2500));
    // Der erste Versuch bekommt Zeit zum Lesen; Wiederholungen sollen nur zeigen,
    // ob die Überlastung vorbei ist.
    const grenze = Math.max(20000, Math.min(zweiterAnlauf ? 45000 : 90000, schluss - Date.now()));

    let gemini: Response;
    try {
      gemini = await fetch(
        `${basis}/models/${modell}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": schluessel },
          body: JSON.stringify(nutzlastBauen(mitDenken, mitSchema)),
          signal: AbortSignal.timeout(grenze),
        },
      );
    } catch (e) {
      protokoll.push(modell + ": nicht erreichbar");
      letzterFehler = "Der KI-Dienst war nicht erreichbar: " + (e as Error).message;
      continue;
    }

    if (gemini.status === 404) {
      const text = await gemini.text();
      protokoll.push(modell + ": 404" + (basis === BASIS_V1 ? " (v1)" : ""));
      if (!ersteAblehnung) ersteAblehnung = kurzeBegruendung(text);
      letzterFehler = "Modell " + modell + " abgelehnt: " + text.slice(0, 200);
      i++;                                 // Wiederholen ändert an einem 404 nichts
      if (basis === BASIS) {
        // Vielleicht gibt es den Namen unter der anderen Version – einmal probieren.
        versuche.splice(i + 1, 0, { modell, basis: BASIS_V1 });
      } else {
        untauglich.add(modell);            // unter beiden Versionen nicht da
        zwischenspeicher = null;           // Liste war veraltet, beim nächsten Mal neu holen
      }
      continue;
    }
    if (!gemini.ok) {
      const text = await gemini.text();
      if (gemini.status === 401 || gemini.status === 403) {
        return antwort({ code: "schluessel_ungueltig", fehler: "Der hinterlegte API-Schlüssel wird abgelehnt." }, 502);
      }
      if (gemini.status === 429) {
        // Kontingente gelten je Modell: Das nächste kann durchaus noch frei sein.
        if (!kontingentDetails) kontingentDetails = kontingentDetail(text);
        protokoll.push(modell + ": 429");
        letzterFehler = "Modell " + modell + ": Kontingent erschöpft";
        i++;                               // Warten hilft beim Kontingent nicht
        continue;
      }
      if (gemini.status === 400) {
        // Das Modell kennt eine Einstellung nicht: ohne sie nochmals, statt aufzugeben.
        const grund = kurzeBegruendung(text).toLowerCase();
        if (mitDenken && grund.includes("thinking")) {
          mitDenken = false;
          protokoll.push(modell + ": ohne Denkstufe erneut");
          versuche.splice(i + 1, 0, { modell, basis });
          continue;
        }
        if (mitSchema && (grund.includes("schema") || grund.includes("response_schema"))) {
          mitSchema = false;
          protokoll.push(modell + ": ohne Antwortschema erneut");
          versuche.splice(i + 1, 0, { modell, basis });
          continue;
        }
        return antwort({ fehler: "Der KI-Dienst lehnt die Anfrage ab: " + kurzeBegruendung(text) }, 502);
      }
      if (gemini.status === 500 || gemini.status === 503) {
        // "high demand" – vorübergehend. Gleich nochmals, dann das nächste Modell.
        ueberlastet = true;
        protokoll.push(modell + ": " + gemini.status + (basis === BASIS_V1 ? " (v1)" : ""));
        letzterFehler = "Modell " + modell + ": überlastet (" + gemini.status + ")";
        continue;
      }
      return antwort({ fehler: "Der KI-Dienst meldet einen Fehler (" + gemini.status + "): " + text.slice(0, 300) }, 502);
    }

    const ergebnis = await gemini.json();
    const text = ergebnis?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ?? "";
    if (!text) {
      const grund = ergebnis?.candidates?.[0]?.finishReason ?? "unbekannt";
      if (grund === "MAX_TOKENS") {
        return antwort({
          fehler: "Das Dokument enthält zu viele Positionen für eine Erkennung am Stück – " +
            "die Antwort wurde abgeschnitten. Bitte die Offerte seitenweise hochladen oder " +
            "die Positionen von Hand erfassen.",
        }, 502);
      }
      return antwort({ fehler: "Das Dokument konnte nicht ausgelesen werden (" + grund + ")." }, 502);
    }
    let werte: Record<string, unknown>;
    try {
      werte = JSON.parse(text);
    } catch {
      return antwort({ fehler: "Die Antwort des KI-Dienstes war unlesbar." }, 502);
    }

    bewaehrt = modell;                     // beim nächsten Mal zuerst dieses fragen
    return antwort({ art, modell, werte });
  }

  console.error("Analyse gescheitert:", protokoll.join(" · "), "| Liste:", modelle.slice(0, 8).join(", "));

  if (ueberlastet) {
    return antwort({
      code: "ueberlastet",
      fehler: "Der KI-Dienst weist gerade ab (Überlastung). Versucht: " + protokoll.join(", ") +
        ". Das ist vorübergehend – in ein paar Minuten nochmals auslesen. Die Datei ist gespeichert, " +
        "die Offerte lässt sich inzwischen von Hand erfassen.",
    }, 502);
  }
  if (kontingentDetails) {
    return antwort({
      code: "kontingent",
      fehler: "Das Kontingent des KI-Dienstes ist für alle verfügbaren Modelle erschöpft (" +
        kontingentDetails + "). Bei einem kostenlosen Zugang gilt meist ein Minuten- UND ein " +
        "Tageslimit: In einer Minute nochmals versuchen; hilft das nicht, ist das Tageslimit " +
        "erreicht. Versucht: " + protokoll.join(", "),
    }, 502);
  }
  return antwort({
    fehler: (letzterFehler || "Kein passendes Modell verfügbar.") +
      " Versucht: " + protokoll.join(", ") +
      (ersteAblehnung ? ". Begründung des Dienstes: " + ersteAblehnung : ""),
  }, 502);
});
