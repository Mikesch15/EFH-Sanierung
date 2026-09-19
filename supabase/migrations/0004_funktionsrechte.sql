-- Hinweise des Supabase-Linters abarbeiten

-- Trigger-Funktionen müssen nicht über die API aufrufbar sein
revoke all on function public.geaendert_am_setzen() from public, anon, authenticated;
revoke all on function public.projekt_eigentuemer_setzen() from public, anon, authenticated;

-- Prüffunktionen: nur angemeldete Benutzer (werden von den RLS-Regeln gebraucht)
revoke all on function public.ist_mitglied(uuid)     from public, anon;
revoke all on function public.kann_bearbeiten(uuid)  from public, anon;
revoke all on function public.ist_eigentuemer(uuid)  from public, anon;
grant execute on function public.ist_mitglied(uuid)    to authenticated;
grant execute on function public.kann_bearbeiten(uuid) to authenticated;
grant execute on function public.ist_eigentuemer(uuid) to authenticated;
