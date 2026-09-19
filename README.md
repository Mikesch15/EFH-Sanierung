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
projekte                 Objekt, Adresse, Kaufpreis, Gesamtbudget
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
  manifest.webmanifest  macht die App auf dem Handy installierbar
  sw.js                 Service Worker – speichert nur die App-Hülle, nie Daten
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
`@supabase/supabase-js` v2 wird als ESM-Modul von jsdelivr geladen (Version fest gepinnt).
Keine Ansicht greift direkt auf Supabase zu – alles läuft über `daten.js`, und dort
gehen alle Schreibvorgänge durch eine einzige Stelle (`schreiben()`), die später um
eine Warteschlange für Offline-Betrieb ergänzt werden kann.

**Die App ist eine Online-App.** Ohne Verbindung erscheint ein roter Balken
«Keine Verbindung zum Server»; es wird nichts halb gespeichert. Der Service Worker
speichert ausschliesslich die App-Hülle (HTML, CSS, JS, Icons), nie Projektdaten.

### Lokal starten

Wegen der ES-Module braucht es einen kleinen Webserver (Doppelklick auf die Datei
genügt nicht):

```bash
cd app
python3 -m http.server 8000
# dann http://localhost:8000/index.html öffnen
```

### Veröffentlichen (GitHub Pages)

`.github/workflows/pages.yml` veröffentlicht den Ordner `app/` bei jedem Push auf
`main`. Einmalig in den Repo-Einstellungen unter *Settings → Pages* als Quelle
**GitHub Actions** auswählen. Die App liegt danach unter
`https://<benutzername>.github.io/EFH-Sanierung/`.

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
| Konto A sieht sein Projekt, wird per Trigger Eigentümer | OK |
| Konto B (kein Mitglied) sieht Projekte, Budget, Offerten, Offertpositionen, Belege, Dokumente, Mitgliederliste und Kostenvergleich von A | 0 Zeilen, also nichts |
| Handwerker sieht nur die ihm zugewiesene Offerte und deren Positionen | OK (1 von 2 Offerten) |
| Handwerker sieht Projekt, Budget, Belege, Kostenvergleich, Mitgliederliste | 0 Zeilen |
| Handwerker darf seine Offerte inhaltlich bearbeiten | OK |
| Handwerker ändert Budgetkategorie oder Zuweisung | wird vom Trigger zurückgesetzt |
| Handwerker ändert eine fremde Offerte | 0 Zeilen betroffen |
| Beleg ohne MWST (`null`) und Kostenvergleich inkl. MWST | OK |

Dateien sind über dieselben Regeln geschützt: Der Bucket ist privat, Zugriff nur über
signierte Links, und die Storage-Regeln prüfen die Projekt-Zugehörigkeit anhand des Pfads.

## Nächste Schritte

1. Echte Dokumentenanalyse als Edge Function – der API-Key bleibt serverseitig.
   In der App muss dafür nur `analysiereDokument()` in `app/js/ki.js` ersetzt werden.
2. Offline-Betrieb: Warteschlange in `daten.js` (`schreiben()`) ergänzen.
3. Beträge ohne Budgetkategorie erscheinen in den Kennzahlen, aber nicht im
   Kostenvergleich – dieser geht von den Budgetpositionen aus. Bei Bedarf als
   Zeile «Nicht zugeordnet» in einer neuen Migration ergänzen.
