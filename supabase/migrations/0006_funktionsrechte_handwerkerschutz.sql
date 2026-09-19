-- Nachtrag zu 0005: Die Trigger-Funktion muss – wie die übrigen
-- Trigger-Funktionen in 0004 – nicht über die API aufrufbar sein.
-- (Hinweis des Supabase-Linters, Regel 0028/0029.)
revoke all on function public.offerten_handwerker_schutz() from public, anon, authenticated;
