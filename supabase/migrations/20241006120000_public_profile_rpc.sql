-- Public profile stats view and scoped deals RPC

DROP VIEW IF EXISTS public_profile_deals;

CREATE OR REPLACE VIEW public_profile_stats AS
SELECT
  profiles.id AS profile_id,
  profiles.handle,
  profiles.display_name,
  profiles.avatar_url,
  user_reputation.score AS reputation_score,
  COALESCE(user_reputation.confirmed_count::bigint, 0::bigint) AS confirmed_count,
  COALESCE(user_reputation.disputed_count::bigint, 0::bigint) AS disputed_count,
  activity.last_activity_at
FROM profiles
LEFT JOIN user_reputation ON user_reputation.user_id = profiles.id
LEFT JOIN (
  SELECT
    creator_id,
    CASE
      WHEN max_confirmed_at IS NULL AND max_disputed_at IS NULL THEN max_created_at
      ELSE GREATEST(
        COALESCE(max_confirmed_at, max_disputed_at),
        COALESCE(max_disputed_at, max_confirmed_at)
      )
    END AS last_activity_at
  FROM (
    SELECT
      creator_id,
      MAX(confirmed_at) AS max_confirmed_at,
      MAX(disputed_at) AS max_disputed_at,
      MAX(created_at) AS max_created_at
    FROM promises
    GROUP BY creator_id
  ) activity_rollup
) activity ON activity.creator_id = profiles.id
WHERE profiles.handle IS NOT NULL;

GRANT SELECT ON public_profile_stats TO anon, authenticated;

CREATE OR REPLACE FUNCTION public_get_profile_deals(p_handle text, p_limit integer DEFAULT 5)
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
  WHERE profiles.handle = public_get_profile_deals.p_handle
    AND promises.status IN ('confirmed', 'disputed')
  ORDER BY COALESCE(promises.confirmed_at, promises.disputed_at, promises.created_at) DESC
  LIMIT LEAST(GREATEST(public_get_profile_deals.p_limit, 1), 20);
$$;

GRANT EXECUTE ON FUNCTION public_get_profile_deals(text, integer) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS promises_creator_status_idx ON promises(creator_id, status);
