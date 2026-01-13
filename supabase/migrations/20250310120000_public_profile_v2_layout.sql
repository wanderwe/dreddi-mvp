CREATE OR REPLACE VIEW public_profile_stats AS
SELECT
  profiles.id AS profile_id,
  profiles.handle,
  profiles.display_name,
  profiles.avatar_url,
  COALESCE(stats.reputation_score, 50) AS reputation_score,
  COALESCE(stats.confirmed_count, 0::bigint) AS confirmed_count,
  COALESCE(stats.disputed_count, 0::bigint) AS disputed_count,
  stats.last_activity_at
FROM profiles
LEFT JOIN (
  SELECT
    promises.creator_id,
    COUNT(*) FILTER (WHERE promises.status = 'confirmed')::bigint AS confirmed_count,
    COUNT(*) FILTER (WHERE promises.status = 'disputed')::bigint AS disputed_count,
    50 + COALESCE(
      SUM(
        CASE
          WHEN promises.status = 'confirmed' THEN
            CASE
              WHEN promises.due_at IS NOT NULL
                AND promises.completed_at IS NOT NULL
                AND promises.completed_at <= promises.due_at
                THEN 4
              ELSE 3
            END
          WHEN promises.status = 'disputed' THEN
            CASE
              WHEN promises.due_at IS NOT NULL
                AND promises.completed_at IS NOT NULL
                AND promises.completed_at > promises.due_at
                THEN -7
              ELSE -6
            END
          ELSE 0
        END
      ),
      0
    ) AS reputation_score,
    MAX(
      GREATEST(
        promises.created_at,
        COALESCE(promises.confirmed_at, promises.created_at),
        COALESCE(promises.disputed_at, promises.created_at),
        COALESCE(promises.completed_at, promises.created_at)
      )
    ) AS last_activity_at
  FROM promises
  JOIN profiles creator ON creator.id = promises.creator_id
  JOIN profiles counterparty ON counterparty.id = promises.counterparty_id
  WHERE promises.visibility = 'public'
    AND creator.is_public_profile = true
    AND counterparty.is_public_profile = true
  GROUP BY promises.creator_id
) stats ON stats.creator_id = profiles.id
WHERE profiles.handle IS NOT NULL
  AND profiles.is_public_profile = true;

GRANT SELECT ON public_profile_stats TO anon, authenticated;

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
  JOIN profiles counterparty ON counterparty.id = promises.counterparty_id
  WHERE profiles.handle = public_get_profile_public_promises.p_handle
    AND profiles.is_public_profile = true
    AND counterparty.is_public_profile = true
    AND promises.visibility = 'public'
  ORDER BY promises.created_at DESC
  LIMIT LEAST(GREATEST(public_get_profile_public_promises.p_limit, 1), 500);
$$;

GRANT EXECUTE ON FUNCTION public_get_profile_public_promises(text, integer) TO anon, authenticated;
