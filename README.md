# Tulpenweg-Sanierung

Verwaltung von Budget, Offerten, Belegen und Dokumenten für die Sanierung eines
Einfamilienhauses. Schweizer Franken, Schweizer Datumsformat, Oberfläche auf Deutsch.

Eigenständiges Projekt – hat nichts mit `Spengler---Digital-V1` zu tun und verändert
dieses auch nicht.

## Stand

| Teil | Status |
|---|---|
| Prototyp (eine HTML-Datei, nur lokal) | fertig, siehe `prototyp/index.html` |
| Supabase-Datenbank, Rechte, Dateiablage | eingerichtet, siehe `supabase/migrations` |
| Web-App mit Login und Synchronisation | fertig, siehe `app/` |
| Auf dem Handy installierbar (PWA) | fertig, siehe «Auf dem Handy installieren» |
| Handwerker-Zugang für einzelne Offerten | fertig, siehe `app/handwerker.html` |
| Echte Dokumentenanalyse (Gemini) | offen – im Prototyp und in der App simuliert |

## Supabase-Projekt

| | |
|---|---|
| Projekt | Tulpenweg-Sanierung |
| Referenz | `evozevkzwcvpbnvcmmfp` |
| Region | eu-central-1 (Frankfurt) |
| API-URL | `https://evozevkzwcvpbnvcmmfp.supabase.co` |
| Publishable Key | `sb_publishable_us-LmqO0xw7nYgraQ7KCNw_dukOK3K-` |

Der Publishable Key darf im Browser stehen. Der Schutz kommt aus den Row-Level-Security-Regeln,
nicht aus der Geheimhaltung des Schlüssels. **Niemals ins Repo:** service_role-Key,
Datenbank-Passwort, Gemini-API-Key.

## Datenmodell

```
projekte                 Objekt, Adresse, Kaufpreis, Kaufnebenkosten, Gesamtbudget
└─ projekt_mitglieder    wer darf was (eigentuemer / bearbeiter / leser / handwerker)
└─ budgetpositionen      Kategorie, Budgetbetrag
   ├─ offerten           Lieferant, Nummer, Status, MWST-Satz, Datei
   │  └─ offert_positionen   Nr., Beschreibung, Menge, Einheit, Einzelpreis
   ├─ belege             Netto, MWST, Brutto, bezahlt, Bezug zu Offerte und Datei
   └─ dokumente          Kaufvertrag, Pläne, Bewilligungen, Garantien
```

Auswertungen:

- `v_offerte_summen` – Netto, MWST und Total je Offerte
- `v_kostenvergleich` – Budget, Offerte, Rechnung, Bezahlt und Differenz je Budgetposition.
  Als Ist-Kosten gilt die Rechnungssumme; solange keine Rechnung erfasst ist, die Offertsumme.

Dateien liegen im privaten Bucket `projektdateien`, Pfad `<projekt_id>/<bereich>/<datei>`.
Bereich ist `offerten`, `belege`, `dokumente` – oder `handwerker/<offerte_id>` für
Dateien, die ein Handwerker selbst hochlädt.

Der Sanierungsrahmen ist `gesamtbudget − kaufpreis − kaufnebenkosten`. Kaufnebenkosten
sind die einmaligen Kosten des Erwerbs (Notariat, Handänderungssteuer, Grundbuch,
Schätzung) – sie gehören nicht zur Sanierung, binden aber Geld aus dem Gesamtbudget.

MWST ist optional: `offerten.mwst_satz` und `belege.mwst` dürfen `null` sein. `null`
heisst «keine MWST ausgewiesen» und ist etwas anderes als der Betrag 0.

## Zugriffsregeln

Jede Tabelle hat Row Level Security. Sichtbar ist nur, wer in `projekt_mitglieder` steht:

- `eigentuemer` – alles, inklusive Mitglieder verwalten und Projekt löschen
- `bearbeiter` – lesen und schreiben
- `leser` – nur lesen
- `handwerker` – **kein** Zugriff aufs Projekt, Budget, Belege oder Dokumente.
  Sichtbar ist nur die eine Offerte, in der `offerten.handwerker_id` auf sein Konto zeigt,
  samt deren Positionen und Dateien. Zuweisung, Budgetkategorie und Projekt kann er
  nicht ändern (Trigger `trg_offerten_handwerker_schutz`). Handwerker nutzen nicht
  `app/index.html`, sondern den eigenen Link `app/handwerker.html?offerte=<offerte_id>`.

Wer ein Projekt anlegt, wird per Trigger automatisch Eigentümer.

### Einladungen per Link (Migration 0009)

Niemand muss sich vorher registrieren. Der Eigentümer wählt *+ Mitglied*, gibt die Rolle
an und erhält einen Link zum Weiterschicken (WhatsApp, SMS, Mail – die App bietet
«Verschicken» über das Teilen-Menü des Geräts und «Kopieren» an):

```
…/app/index.html?einladung=<token>
```

Wer den Link öffnet, sieht Projektname und Rolle bereits **vor** der Anmeldung, legt ein
Konto an (oder meldet sich an) und wird beim ersten Start automatisch Mitglied.

Sicherheit: Das Geheimnis ist der Token (256 Bit, steht nur im Link). Die Tabelle
`einladungen` ist nur für den Eigentümer lesbar; die eingeladene Person arbeitet
ausschliesslich über zwei Funktionen – `einladung_info(token)` (zeigt nur Projektname,
Rolle und Gültigkeit, auch ohne Anmeldung) und `einladung_einloesen(token)` (nur für
Angemeldete, trägt sie als Mitglied ein). Jeder Link gilt 30 Tage und **einmal**; der
Eigentümer kann ihn jederzeit zurückziehen. Praktisch geprüft: Ein zweites Konto mit
demselben Link wird abgewiesen und sieht das Projekt nicht.

### Hilfsfunktionen mit `security definer` (Migration 0005)

- `benutzer_id_zu_email(text) → uuid` – sucht zu einer **exakten** E-Mail-Adresse die
  Benutzer-ID, damit ein Eigentümer eine bereits registrierte Person zum Projekt
  hinzufügen kann. Gibt ausser der ID nichts preis; Ausführungsrecht nur für
  `authenticated`, nicht für `anon`.
- `offerte_positionen_ersetzen(uuid, jsonb)` – ersetzt alle Positionen einer Offerte in
  einem Vorgang (keine verwaisten Zeilen). Bewusst `security invoker`, es gelten also
  die normalen RLS-Regeln der aufrufenden Person.
- `ist_handwerker_fuer_offerte(uuid)`, `ist_handwerker_offerte_datei(text)` – werden von
  den RLS-Regeln gebraucht.

Die Mitgliederliste zeigt E-Mail-Adressen aus der Spalte `projekt_mitglieder.email`.
Sie wird beim Hinzufügen mitgeschrieben und dient **nur der Anzeige**; Rechte hängen
ausschliesslich an `benutzer_id` und `rolle`.

## Die Web-App (`app/`)

```
app/
  index.html            Haupt-App (Eigentümer, Bearbeiter, Leser)
  handwerker.html       eigene, eng begrenzte Seite für Handwerker
  hilfe.html            Diagnose und Zurücksetzen, falls die App nicht startet
  manifest.webmanifest  macht die App auf dem Handy installierbar
  sw.js                 Service Worker – nur für die Installierbarkeit, ohne Zwischenspeicher
  icons/                App-Icons (192, 512, maskable, Apple)
  css/stil.css          Design aus dem Prototyp, unverändert übernommen
  js/konfig.js          Supabase-URL, Publishable Key, Listen und Vorgaben
  js/supabase.js        Client und Auth-Helfer
  js/daten.js           alle Datenbankzugriffe, eine Funktion pro Vorgang
  js/dateien.js         Upload, signierte Links, Löschen, Typ-/Grössenprüfung
  js/format.js          CHF, Datum, Zahlen-Parser (aus dem Prototyp)
  js/ki.js              simulierte Dokumentenanalyse (eine Funktion zum Austauschen)
  js/import.js          Übernahme der Prototyp-Sicherung
  js/app.js             Start, Navigation, Modal, Realtime
  js/ansichten/*.js     Anmeldung, Übersicht, Budget, Offerten, Belege, Dokumente
```

Vanilla JavaScript als ES-Module, kein Framework, kein Build-Schritt.
`@supabase/supabase-js` v2.45.4 liegt fertig gebündelt im Repo unter
`app/js/vendor/supabase-js.js` – bewusst **kein CDN**, damit die App auch in einem Netz
startet, das fremde Domains blockiert oder langsam ausliefert. Neu erzeugen, wenn die
Version steigen soll:

```bash
npm install @supabase/supabase-js@<version> esbuild
echo 'export { createClient } from "@supabase/supabase-js";' > einstieg.js
npx esbuild einstieg.js --bundle --format=esm --platform=browser --target=es2020 \
  --minify --legal-comments=none --outfile=app/js/vendor/supabase-js.js
```

**Die App zeichnet sofort**, ohne auf den Server zu warten: Liegt lokal ein Anmeldetoken,
erscheint direkt der Rahmen der App, sonst die Anmeldemaske. Die Anmeldung wird erst danach
im Hintergrund geprüft (`aufAuthAchten`). Vorher wartete der Start auf `getSession()` – bei
langsamer Verbindung blieb die Seite dadurch leer und ein Wächter schlug fälschlich Alarm.

Scheitert der Start wirklich (fehlende Datei, Laufzeitfehler), räumt die App einmal selbst
auf (Service Worker und Zwischenspeicher entfernen, neu laden mit Marker `?reparatur=1`,
der eine Endlosschleife verhindert).
Klappt es danach immer noch nicht, erscheint der echte Fehlertext samt Datei und Zeile,
plus ein Verweis auf `app/hilfe.html`.

`app/hilfe.html` ist eine Diagnoseseite ohne Module und ohne Abhängigkeiten: Sie zeigt
Browser, Websitedaten, Service Worker, Zwischenspeicher, welche Dateien in welcher Version
ankommen und ob Supabase erreichbar ist – und hat einen Knopf, der alles zurücksetzt. Vor dem Start steht «App wird geladen … Stand N» in der
Seite – daran ist auf einen Blick erkennbar, ob ein Gerät den aktuellen Stand geladen hat.

Der Service Worker speichert **nichts** zwischen: Er reicht jede Anfrage ans Netz weiter
und löscht beim Aktivieren alle früheren Zwischenspeicher. Er existiert nur, weil Android
Chrome sonst die Installation auf dem Startbildschirm nicht anbietet. Ein zwischen-
gespeicherter Programmstand hatte zuvor dafür gesorgt, dass nach einer Korrektur weiterhin
die alte Fassung startete.

Im Repo-Stammverzeichnis liegt `.nojekyll`: GitHub Pages veröffentlicht die Dateien damit
unverändert und schickt sie nicht durch Jekyll.

Keine Ansicht greift direkt auf Supabase zu – alles läuft über `daten.js`, und dort
gehen alle Schreibvorgänge durch eine einzige Stelle (`schreiben()`), die später um
eine Warteschlange für Offline-Betrieb ergänzt werden kann.

**Die App ist eine Online-App.** Ohne Verbindung erscheint ein roter Balken
«Keine Verbindung zum Server»; es wird nichts halb gespeichert.

Kein Aufruf darf unendlich warten – auf zwei Ebenen abgesichert: Alle Anfragen laufen über
ein eigenes `fetch` mit Zeitlimit (12 Sekunden, Uploads 120), und zusätzlich bekommt jeder
Vorgang in `daten.js` eine harte Obergrenze von 15 Sekunden (`mitZeitlimit`). Letzteres ist
nötig, weil ein Aufruf auch **innerhalb** von `supabase-js` hängen bleiben kann, bevor
überhaupt eine Anfrage ans Netz geht – genau das führte zum endlosen «Daten werden geladen».

Die Daten eines Projekts werden **gleichzeitig** geladen (`Promise.all`), nicht nacheinander:
Sonst addieren sich die Zeitlimits bei schlechter Verbindung auf Minuten. Während des Ladens
und bei Fehlern zeigt die App ein dauerhaftes Banner mit «Erneut versuchen» statt eines
flüchtigen Hinweises, und auf jedem Bildschirm gibt es einen Ausweg (Abmelden, Diagnose). Läuft es ab, erscheint
«Der Server hat nicht geantwortet» und die Oberfläche ist wieder bedienbar – statt
dauerhaft bei «wird angelegt …» stehen zu bleiben.

Die Auth-Sperre von `supabase-js` (Web Locks) ist bewusst abgeschaltet
(`auth.lock`). Sie serialisiert Auth-Vorgänge über alle Fenster derselben Adresse;
hängt ein Fenster (etwa eine alte, defekte Fassung im Hintergrund), warten sonst alle
weiteren Aufrufe endlos auf die Sperre.

### Lokal starten

Wegen der ES-Module braucht es einen kleinen Webserver (Doppelklick auf die Datei
genügt nicht):

```bash
cd app
python3 -m http.server 8000
# dann http://localhost:8000/index.html öffnen
```

### Veröffentlichen (GitHub Pages)

Aktuell steht *Settings → Pages* auf **Deploy from a branch**: GitHub veröffentlicht das
Repo selbst, die App liegt unter
`https://<benutzername>.github.io/EFH-Sanierung/app/index.html`. Dafür ist nichts weiter
zu tun, jeder Push wird automatisch veröffentlicht.

Wer die kürzere Adresse `https://<benutzername>.github.io/EFH-Sanierung/` möchte: unter
*Settings → Pages* als Source **GitHub Actions** wählen und danach den Workflow
`.github/workflows/pages.yml` einmal von Hand starten (Actions → Workflow →
*Run workflow*). Er lädt nur den Ordner `app/` hoch. Solange «Deploy from a branch»
eingestellt ist, darf dieser Workflow nicht automatisch laufen – er würde fehlschlagen,
deshalb startet er nur auf Knopfdruck.

Hinweis: Bei einem **privaten** Repo braucht GitHub Pages ein kostenpflichtiges Konto
(Pro/Team). Alternativen ohne Kosten: Netlify oder Vercel – beide brauchen nur den
Ordner `app/` und keinen Build-Schritt.

### Auf dem Handy installieren

Die App ist eine PWA und lässt sich wie eine App ablegen – die Seite muss dafür über
`https://` erreichbar sein (GitHub Pages, Netlify, Vercel), `localhost` geht auch.

- **iPhone (Safari):** Seite öffnen → Teilen-Symbol → *Zum Home-Bildschirm*.
- **Android (Chrome):** Seite öffnen → Menü ⋮ → *App installieren* bzw. der
  Installationshinweis unten am Bildschirm.

Danach startet sie im Vollbild mit eigenem Icon. Die Anmeldung bleibt erhalten.

## Migrationen anwenden

Die Migrationen sind im Supabase-Projekt bereits eingespielt. Für eine zweite Umgebung
oder nach Änderungen:

```bash
supabase link --project-ref evozevkzwcvpbnvcmmfp
supabase db push
```

## Testanleitung: die App mit zwei Konten durchspielen

Am besten auf zwei Geräten (oder einem normalen Fenster und einem privaten Fenster).

1. **Registrieren, abmelden, anmelden.** App öffnen → *Registrieren*, E-Mail und Passwort.
   Falls Supabase die E-Mail-Bestätigung verlangt, zuerst den Link im Postfach anklicken.
   Danach *Abmelden* (Übersicht ganz unten, Abschnitt «Konto») und wieder anmelden –
   die Sitzung übersteht auch ein Neuladen.
2. **Projekt anlegen.** Name, Adresse, Kaufpreis, Gesamtbudget erfassen. Alles startet bei
   null. Der Sanierungsrahmen ist Gesamtbudget minus Kaufpreis.
3. **Partnerin hinzufügen.** Sie registriert sich auf ihrem Gerät selbst. Danach auf Ihrem
   Gerät: Übersicht → *Mitglieder* → *+ Mitglied* → ihre E-Mail-Adresse, Rolle
   *Bearbeiter*. Sie lädt neu und sieht dasselbe Projekt.
4. **Budgetposition** anlegen, bearbeiten, löschen (Tab *Budget*).
5. **Offerte**: Tab *Offerten* → *+ Offerte* → PDF wählen → *Offerte analysieren*.
   Die Demo-Werte erscheinen mit violettem Abzeichen; Positionen korrigieren, speichern.
   Die Datei lässt sich später über *Datei* wieder öffnen (signierter Link, 2 Minuten gültig).
6. **Beleg** erfassen, einer Offerte zuordnen, *bezahlt* setzen (Zahlungsdatum wird
   automatisch auf heute gesetzt). Zwei der drei Beträge genügen, der dritte wird ergänzt.
   Für Belege ohne MWST-Ausweis: Haken *Ohne MWST*.
7. **Drei Dokumente auf einmal** hochladen (Tab *Dokumente* → *+ Dateien*, Mehrfachauswahl).
8. **Zahlen prüfen**: Übersicht und *Kostenvergleich* (Tab Budget) müssen zu den erfassten
   Werten passen. Der Kostenvergleich kommt aus der View `v_kostenvergleich`.
9. **Zweites Gerät**: Änderungen erscheinen dank Realtime ohne Neuladen; beim Zurückkehren
   in den Tab wird zusätzlich neu geladen.
10. **Prototyp-Sicherung importieren**: im Prototyp *Daten exportieren*, dann in der App
    Übersicht → *Sicherung importieren*. Der erste Klick auf *Importieren* zeigt nur, was
    eingefügt würde; erst der zweite führt den Import aus. Derselbe Export wird pro Projekt
    nur einmal importiert.

**Handwerker prüfen:** Person als Mitglied mit Rolle *Handwerker* hinzufügen, dann in einer
Offerte unter *Handwerker-Zugang* auswählen und speichern. Ihr diesen Link schicken:
`…/handwerker.html?offerte=<id der offerte>`. Sie sieht dort nur diese eine Offerte.

### Praktisch geprüfte Zugriffsregeln

Gegen die echte Datenbank geprüft (Testkonten in einer Transaktion, danach zurückgerollt –
es blieben keine Testdaten zurück):

| Prüfung | Ergebnis |
|---|---|
| Konto A legt ein Projekt an (`insert … returning`) und wird per Trigger Eigentümer | OK |
| Konto B (kein Mitglied) sieht Projekte, Budget, Offerten, Offertpositionen, Belege, Dokumente, Mitgliederliste und Kostenvergleich von A | 0 Zeilen, also nichts |
| Handwerker sieht nur die ihm zugewiesene Offerte und deren Positionen | OK (1 von 2 Offerten) |
| Handwerker sieht Projekt, Budget, Belege, Kostenvergleich, Mitgliederliste | 0 Zeilen |
| Handwerker darf seine Offerte inhaltlich bearbeiten | OK |
| Handwerker ändert Budgetkategorie oder Zuweisung | wird vom Trigger zurückgesetzt |
| Handwerker ändert eine fremde Offerte | 0 Zeilen betroffen |
| Beleg ohne MWST (`null`) und Kostenvergleich inkl. MWST | OK |

Migration 0007 war dafür nötig: Beim Anlegen prüft PostgreSQL wegen `returning` auch die
Leseregel, und die Mitgliedschaft entsteht erst danach im Trigger. Seither darf zusätzlich
lesen, wer das Projekt angelegt hat (`erstellt_von = auth.uid()`).

Dateien sind über dieselben Regeln geschützt: Der Bucket ist privat, Zugriff nur über
signierte Links, und die Storage-Regeln prüfen die Projekt-Zugehörigkeit anhand des Pfads.

## Nächste Schritte

1. Echte Dokumentenanalyse als Edge Function – der API-Key bleibt serverseitig.
   In der App muss dafür nur `analysiereDokument()` in `app/js/ki.js` ersetzt werden.
2. Offline-Betrieb: Warteschlange in `daten.js` (`schreiben()`) ergänzen.
3. Beträge ohne Budgetkategorie erscheinen in den Kennzahlen, aber nicht im
   Kostenvergleich – dieser geht von den Budgetpositionen aus. Bei Bedarf als
   Zeile «Nicht zugeordnet» in einer neuen Migration ergänzen.
