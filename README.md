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
| Web-App mit Login und Synchronisation | offen |
| Echte Dokumentenanalyse (Gemini) | offen |

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
└─ projekt_mitglieder    wer darf was (eigentuemer / bearbeiter / leser)
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

## Zugriffsregeln

Jede Tabelle hat Row Level Security. Sichtbar ist nur, wer in `projekt_mitglieder` steht:

- `eigentuemer` – alles, inklusive Mitglieder verwalten und Projekt löschen
- `bearbeiter` – lesen und schreiben
- `leser` – nur lesen

Wer ein Projekt anlegt, wird per Trigger automatisch Eigentümer.

## Migrationen anwenden

Die Migrationen sind im Supabase-Projekt bereits eingespielt. Für eine zweite Umgebung
oder nach Änderungen:

```bash
supabase link --project-ref evozevkzwcvpbnvcmmfp
supabase db push
```

## Repo auf GitHub anlegen

Auf github.com ein neues, **privates** Repo anlegen (z.B. `tulpenweg-sanierung`), ohne
README, dann lokal:

```bash
cd tulpenweg-sanierung
git init
git add .
git commit -m "Prototyp und Supabase-Schema"
git branch -M main
git remote add origin https://github.com/<benutzername>/tulpenweg-sanierung.git
git push -u origin main
```

Ohne Git geht es auch über die GitHub-Weboberfläche: *Add file → Upload files*, dann den
entpackten Ordner hineinziehen.

## Nächste Schritte

1. Web-App `app/index.html` mit Login (E-Mail und Passwort) und Lesen/Schreiben gegen Supabase
2. Partner:in als zweites Mitglied mit Rolle `bearbeiter` eintragen
3. Daten aus dem Prototyp einmalig importieren (JSON-Export aus `prototyp/index.html`)
4. Datei-Upload in den Bucket `projektdateien`
5. Echte Dokumentenanalyse als Edge Function – der API-Key bleibt serverseitig
