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

/** Je höher, desto lieber: schnell, aktuell, kann Dokumente lesen. */
function modellRang(name: string): number {
  let rang = 0;
  if (name.includes("flash")) rang += 10;
  if (name.includes("pro")) rang += 4;
  if (name.includes("2.5")) rang += 6;
  else if (name.includes("2.0")) rang += 3;
  if (name.includes("latest")) rang += 2;
  if (name.includes("lite")) rang -= 3;
  if (name.includes("preview") || name.includes("exp")) rang -= 5;
  if (/\d{3,}/.test(name)) rang -= 1;          // datierte Vorabversionen
  return rang;
}

const UNGEEIGNET = /embedding|aqa|imagen|image-generation|tts|audio|live|veo|learnlm|gemma/;

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

  const nutzlast = {
    systemInstruction: { parts: [{ text: art === "beleg" ? ANWEISUNG_BELEG : ANWEISUNG_OFFERTE }] },
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType: mimeTyp, data: base64 } },
        { text: art === "beleg" ? "Lies diesen Beleg aus." : "Lies diese Offerte aus." },
      ],
    }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: art === "beleg" ? BELEG_SCHEMA : OFFERT_SCHEMA,
    },
  };

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
  // Höchstens drei Versuche: Was der Dienst als verfügbar meldet, kann im Einzelfall
  // trotzdem abgelehnt werden – aber die ganze Liste durchzugehen dauert zu lange.
  for (const modell of modelle.slice(0, 3)) {
    let gemini: Response;
    try {
      gemini = await fetch(
        `${BASIS}/models/${modell}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": schluessel },
          body: JSON.stringify(nutzlast),
          signal: AbortSignal.timeout(90000),
        },
      );
    } catch (e) {
      letzterFehler = "Der KI-Dienst war nicht erreichbar: " + (e as Error).message;
      continue;
    }

    if (gemini.status === 404) {          // Modell doch nicht nutzbar – nächstes versuchen
      const text = await gemini.text();
      zwischenspeicher = null;             // Liste war veraltet, beim nächsten Mal neu holen
      letzterFehler = "Modell " + modell + " abgelehnt: " + text.slice(0, 200);
      continue;
    }
    if (!gemini.ok) {
      const text = await gemini.text();
      if (gemini.status === 401 || gemini.status === 403) {
        return antwort({ code: "schluessel_ungueltig", fehler: "Der hinterlegte API-Schlüssel wird abgelehnt." }, 502);
      }
      if (gemini.status === 429) {
        return antwort({ code: "kontingent", fehler: "Das Kontingent des KI-Dienstes ist erschöpft. Bitte später erneut versuchen." }, 502);
      }
      return antwort({ fehler: "Der KI-Dienst meldet einen Fehler (" + gemini.status + "): " + text.slice(0, 300) }, 502);
    }

    const ergebnis = await gemini.json();
    const text = ergebnis?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") ?? "";
    if (!text) {
      const grund = ergebnis?.candidates?.[0]?.finishReason ?? "unbekannt";
      return antwort({ fehler: "Das Dokument konnte nicht ausgelesen werden (" + grund + ")." }, 502);
    }
    let werte: Record<string, unknown>;
    try {
      werte = JSON.parse(text);
    } catch {
      return antwort({ fehler: "Die Antwort des KI-Dienstes war unlesbar." }, 502);
    }

    return antwort({ art, modell, werte });
  }

  return antwort({
    fehler: (letzterFehler || "Kein passendes Modell verfügbar.") +
      " Geprüft: " + modelle.slice(0, 3).join(", "),
  }, 502);
});
