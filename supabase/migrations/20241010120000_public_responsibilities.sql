-- Public responsibilities visibility + profile updates

ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

DROP VIEW IF EXISTS public_profile_stats;

CREATE OR REPLACE VIEW public_profile_stats AS
SELECT
  profiles.id AS profile_id,
  profiles.handle,
  profiles.display_name,
  profiles.avatar_url,
  COALESCE(stats.confirmed_count, 0::bigint) AS confirmed_count,
  COALESCE(stats.disputed_count, 0::bigint) AS disputed_count,
  COALESCE(stats.active_count, 0::bigint) AS active_count,
  COALESCE(stats.pending_acceptance_count, 0::bigint) AS pending_acceptance_count,
  COALESCE(stats.overdue_count, 0::bigint) AS overdue_count,
  stats.last_activity_at
FROM profiles
LEFT JOIN (
  SELECT
    creator_id,
    COUNT(*) FILTER (WHERE status = 'confirmed')::bigint AS confirmed_count,
    COUNT(*) FILTER (WHERE status = 'disputed')::bigint AS disputed_count,
    COUNT(*) FILTER (
      WHERE status IN ('active', 'completed_by_promisor')
        AND due_at IS NOT NULL
        AND due_at < NOW()
    )::bigint AS overdue_count,
    COUNT(*) FILTER (
      WHERE status = 'active'
        AND (due_at IS NULL OR due_at >= NOW())
        AND NOT (
          counterparty_id IS NOT NULL
          OR (promisor_id IS NOT NULL AND promisee_id IS NOT NULL)
        )
    )::bigint AS pending_acceptance_count,
    COUNT(*) FILTER (
      WHERE (due_at IS NULL OR due_at >= NOW())
        AND (
          status = 'completed_by_promisor'
          OR (
            status = 'active'
            AND (
              counterparty_id IS NOT NULL
              OR (promisor_id IS NOT NULL AND promisee_id IS NOT NULL)
            )
          )
        )
    )::bigint AS active_count,
    MAX(COALESCE(confirmed_at, disputed_at, created_at)) AS last_activity_at
  FROM promises
  WHERE is_public = true
  GROUP BY creator_id
) stats ON stats.creator_id = profiles.id
WHERE profiles.handle IS NOT NULL;

GRANT SELECT ON public_profile_stats TO anon, authenticated;

DROP FUNCTION IF EXISTS public_get_profile_deals(text, integer);

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
  disputed_at timestamptz,
  accepted_by_second_side boolean
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
    promises.disputed_at,
    (
      promises.counterparty_id IS NOT NULL
      OR (promises.promisor_id IS NOT NULL AND promises.promisee_id IS NOT NULL)
    ) AS accepted_by_second_side
  FROM promises
  JOIN profiles ON profiles.id = promises.creator_id
  WHERE profiles.handle = public_get_profile_public_promises.p_handle
    AND promises.is_public = true
  ORDER BY promises.created_at DESC
  LIMIT LEAST(GREATEST(public_get_profile_public_promises.p_limit, 1), 500);
$$;

GRANT EXECUTE ON FUNCTION public_get_profile_public_promises(text, integer) TO anon, authenticated;
