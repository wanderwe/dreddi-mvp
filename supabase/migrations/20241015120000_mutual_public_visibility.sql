-- Mutual public visibility for confirmed deals only + profile-level visibility

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_public_profile boolean NOT NULL DEFAULT false;

ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS public_by_creator boolean NOT NULL DEFAULT false;

ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS public_by_counterparty boolean NOT NULL DEFAULT false;

DROP VIEW IF EXISTS public_profile_stats;

CREATE OR REPLACE VIEW public_profile_stats AS
SELECT
  profiles.id AS profile_id,
  profiles.handle,
  profiles.display_name,
  profiles.avatar_url,
  COALESCE(stats.confirmed_count, 0) AS confirmed_count,
  0 AS disputed_count,
  0 AS active_count,
  0 AS pending_acceptance_count,
  0 AS overdue_count,
  stats.last_activity_at
FROM profiles
LEFT JOIN (
  SELECT
    creator_id,
    COUNT(*) AS confirmed_count,
    MAX(COALESCE(confirmed_at, created_at)) AS last_activity_at
  FROM promises
  WHERE status = 'confirmed'
    AND public_by_creator = true
    AND public_by_counterparty = true
  GROUP BY creator_id
) stats ON stats.creator_id = profiles.id
WHERE profiles.handle IS NOT NULL
  AND profiles.is_public_profile = true;

GRANT SELECT ON public_profile_stats TO anon, authenticated;

DROP FUNCTION IF EXISTS public_get_profile_public_promises(text, integer);

CREATE OR REPLACE FUNCTION public_get_profile_public_promises(
  p_handle text,
  p_limit integer DEFAULT 200
)
RETURNS TABLE (
  title text,
  status text,
  created_at timestamptz,
  due_at timestamptz,
  confirmed_at timestamptz,
  disputed_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    promises.title,
    promises.status,
    promises.created_at,
    promises.due_at,
    promises.confirmed_at,
    promises.disputed_at
  FROM promises
  JOIN profiles ON profiles.id = promises.creator_id
  WHERE profiles.handle = public_get_profile_public_promises.p_handle
    AND profiles.is_public_profile = true
    AND promises.status = 'confirmed'
    AND promises.public_by_creator = true
    AND promises.public_by_counterparty = true
  ORDER BY promises.created_at DESC
  LIMIT LEAST(GREATEST(public_get_profile_public_promises.p_limit, 1), 500);
$$;

GRANT EXECUTE ON FUNCTION public_get_profile_public_promises(text, integer) TO anon, authenticated;
