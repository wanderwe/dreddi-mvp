-- profiles has column-level SELECT grants since 20261026120000_hide_profile_emails, and the account
-- deletion columns were added without one. Signed-in people need to read their own deleted_at so the
-- site can send them to the restore screen; rows stay limited by the existing RLS policies.
GRANT SELECT (deleted_at) ON public.profiles TO authenticated;
