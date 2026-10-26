-- Keep email addresses off public surfaces (leak found 2026-10-25).
--
-- 1. The first version of ensureProfile stored display_name = email, so early
--    profiles show their address as their public name. Clear those names; the
--    UI falls back to @handle.
-- 2. anon/authenticated could read profiles.email through the REST API
--    (e.g. GET /rest/v1/profiles?select=email). Revoke table-level SELECT and
--    re-grant every column except email. Service-role and SECURITY DEFINER
--    functions (admin panel, notifications) are not affected.
--    NOTE: columns added to profiles later must be granted explicitly:
--      GRANT SELECT (new_column) ON public.profiles TO anon, authenticated;
-- 3. Stop new email-shaped display names from being saved.

UPDATE public.profiles
SET display_name = NULL
WHERE display_name ~ '\S+@\S+\.\S+'
   OR lower(btrim(display_name)) = lower(btrim(email));

DO $$
DECLARE
  readable_columns text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
  INTO readable_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name <> 'email';

  REVOKE SELECT ON public.profiles FROM anon, authenticated;
  EXECUTE format(
    'GRANT SELECT (%s) ON public.profiles TO anon, authenticated',
    readable_columns
  );
END $$;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_display_name_not_email;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_not_email
  CHECK (display_name IS NULL OR display_name !~ '\S+@\S+\.\S+');
