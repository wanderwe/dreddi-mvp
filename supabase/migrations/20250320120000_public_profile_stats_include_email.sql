-- Include public profile email for directory searching.

DROP VIEW IF EXISTS public_profile_stats;

CREATE VIEW public_profile_stats AS
SELECT
  profiles.id AS profile_id,
  profiles.handle,
  profiles.email,
  profiles.display_name,
  profiles.avatar_url,
  COALESCE(user_reputation.score, 50) AS reputation_score,
  COALESCE(stats.confirmed_count, 0::bigint) AS confirmed_count,
  COALESCE(stats.completed_count, 0::bigint) AS completed_count,
  COALESCE(stats.disputed_count, 0::bigint) AS disputed_count,
  COALESCE(stats.active_count, 0::bigint) AS active_count,
  COALESCE(stats.pending_acceptance_count, 0::bigint) AS pending_acceptance_count,
  COALESCE(stats.overdue_count, 0::bigint) AS overdue_count,
  stats.last_activity_at
FROM profiles
LEFT JOIN user_reputation ON user_reputation.user_id = profiles.id
LEFT JOIN (
  SELECT
    COALESCE(
      public.resolve_promise_executor_id(
        promisor_id,
        promisee_id,
        counterparty_id,
        creator_id
      ),
      creator_id
    ) AS executor_id,
    COUNT(*) FILTER (WHERE status = 'confirmed')::bigint AS confirmed_count,
    COUNT(*) FILTER (WHERE status = 'completed_by_promisor')::bigint AS completed_count,
    COUNT(*) FILTER (WHERE status = 'disputed')::bigint AS disputed_count,
    COUNT(*) FILTER (
      WHERE status IN ('active', 'completed_by_promisor')
        AND due_at IS NOT NULL
        AND due_at < NOW()
    )::bigint AS overdue_count,
    COUNT(*) FILTER (
      WHERE status = 'active'
        AND invite_status = 'awaiting_acceptance'
    )::bigint AS pending_acceptance_count,
    COUNT(*) FILTER (
      WHERE (due_at IS NULL OR due_at >= NOW())
        AND invite_status = 'accepted'
        AND status IN ('active', 'completed_by_promisor')
    )::bigint AS active_count,
    MAX(COALESCE(confirmed_at, disputed_at, completed_at, created_at)) AS last_activity_at
  FROM promises
  GROUP BY executor_id
) stats ON stats.executor_id = profiles.id
WHERE profiles.handle IS NOT NULL
  AND profiles.is_public_profile IS TRUE;

GRANT SELECT ON public_profile_stats TO anon, authenticated;
