-- Limit public profile directory to explicitly public profiles

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
        AND invite_status = 'awaiting_acceptance'
    )::bigint AS pending_acceptance_count,
    COUNT(*) FILTER (
      WHERE (due_at IS NULL OR due_at >= NOW())
        AND invite_status = 'accepted'
        AND status IN ('active', 'completed_by_promisor')
    )::bigint AS active_count,
    MAX(COALESCE(confirmed_at, disputed_at, created_at)) AS last_activity_at
  FROM promises
  WHERE is_public = true
  GROUP BY creator_id
) stats ON stats.creator_id = profiles.id
WHERE profiles.handle IS NOT NULL
  AND profiles.is_public_profile = true;

GRANT SELECT ON public_profile_stats TO anon, authenticated;
