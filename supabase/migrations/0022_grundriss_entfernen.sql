-- Grundriss-Thematik vollständig entfernen.
--
-- Vier Anläufe, den Grundriss in die App zu holen – nachgezeichnete Bänder,
-- feste Rechtecke, eingetippte Wandlängen und zuletzt Wanderkennung im
-- hochgeladenen Planbild – waren auf der Baustelle umständlicher als das, was
-- dort tatsächlich funktioniert: den Plan ausdrucken und die Masse von Hand
-- hineinschreiben.
--
-- ACHTUNG: Diese Migration ist im Supabase-Projekt noch NICHT eingespielt –
-- die Freigabe wurde abgebrochen. Sie löscht Daten (einen Planeintrag und vier
-- Wandmasse) und ist deshalb erst auszuführen, wenn das ausdrücklich gewollt
-- ist. Danach diesen Hinweis entfernen.
--
-- Die App liest und schreibt davon seit dem Entfernen nichts mehr. Hier fallen
-- nun auch Tabellen, Spalten und Daten weg, damit kein Gerippe stehen bleibt,
-- das niemand mehr versteht. Die Migrationen 0016 bis 0021 bleiben als
-- Herkunft im Verzeichnis: Wer die Datenbank neu aufbaut, legt diese Tabellen
-- an und entfernt sie hier wieder – das ist die ehrliche Geschichte.

drop table if exists public.wandmasse;

-- raeume.plan_id verweist auf plaene; die Spalte fällt mit.
alter table public.raeume
  drop column if exists plan_id,
  drop column if exists marke_x,
  drop column if exists marke_y,
  drop column if exists umriss,
  drop column if exists wand_masse,
  drop column if exists waende,
  drop column if exists plan_x,
  drop column if exists plan_y,
  drop column if exists plan_w,
  drop column if exists plan_h,
  drop column if exists plan_band,
  drop column if exists plan_sort,
  drop column if exists soll_breite,
  drop column if exists soll_tiefe,
  drop column if exists flaeche_plan;

drop table if exists public.plaene;

-- Im Raum-Messblatt bleiben: name, geschoss, laenge, breite, hoehe,
-- wandstaerke, fenster, tueren, boden, bemerkung, flaeche, umfang.
-- laenge und breite stammen aus der ersten Fassung des Messblatts (0015) und
-- bleiben für die von Hand erfassten Räume stehen.
