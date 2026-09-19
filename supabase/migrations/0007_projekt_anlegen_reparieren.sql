-- Fehler beim Anlegen eines Projekts: "new row violates row-level security policy
-- for table projekte".
--
-- Ursache: Die App legt das Projekt mit "insert ... returning" an (sie braucht die
-- neue ID). Bei returning prüft PostgreSQL zusätzlich die SELECT-Regel für die neue
-- Zeile. Die SELECT-Regel aus 0002 verlangt ist_mitglied(id) – die Mitgliedschaft
-- entsteht aber erst durch den AFTER-INSERT-Trigger, also NACH dieser Prüfung.
-- Ergebnis: Das Anlegen schlug immer fehl, es wurde kein Projekt erstellt.
--
-- Lösung: Wer ein Projekt angelegt hat, darf es lesen – unabhängig davon, ob der
-- Trigger seine Mitgliedszeile schon geschrieben hat. erstellt_von wird beim Insert
-- bereits geprüft (Regel projekte_anlegen: erstellt_von = auth.uid()), die Regel
-- öffnet also nichts Zusätzliches.
create policy projekte_lesen_ersteller on public.projekte
  for select to authenticated using (erstellt_von = auth.uid());
