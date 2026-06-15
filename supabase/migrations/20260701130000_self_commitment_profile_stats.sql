-- RPC to fetch Personal Goals stats for a public profile by handle,
-- honoring the profile owner's goals_stats_scope preference.

CREATE OR REPLACE FUNCTION public.get_self_commitment_profile_stats(p_handle text)
RETURNS TABLE (
  total_goals int,
  completed_goals int,
  failed_goals int,
  completion_rate numeric,
  current_streak int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_scope text;
BEGIN
  SELECT id, goals_stats_scope INTO v_user_id, v_scope
  FROM public.profiles
  WHERE handle = p_handle AND is_public_profile IS TRUE;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0, NULL::numeric, 0;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT * FROM public.get_self_commitment_stats(v_user_id, v_scope IS DISTINCT FROM 'all');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_self_commitment_profile_stats(text) TO authenticated, anon;
