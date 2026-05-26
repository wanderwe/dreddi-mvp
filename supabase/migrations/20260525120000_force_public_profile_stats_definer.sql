-- Keep public profile metrics viewer-independent.
-- If security_invoker is enabled, RLS on public.promises makes aggregates depend on auth.uid(),
-- which can surface as counters intermittently dropping to zero for anon/other viewers.
ALTER VIEW public.public_profile_stats
  SET (security_invoker = false);
