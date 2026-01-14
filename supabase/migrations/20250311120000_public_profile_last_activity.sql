DROP VIEW IF EXISTS public_profile_stats;

CREATE VIEW public_profile_stats AS
SELECT
  profiles.id AS profile_id,
  profiles.handle,
  profiles.display_name,
  profiles.avatar_url,
  COALESCE(user_reputation.score, 50) AS reputation_score,
  COALESCE(user_reputation.confirmed_count::bigint, 0::bigint) AS confirmed_count,
  COALESCE(user_reputation.disputed_count::bigint, 0::bigint) AS disputed_count,
  COALESCE(stats.last_status_change_at, stats.last_created_at) AS last_activity_at
FROM profiles
LEFT JOIN user_reputation ON user_reputation.user_id = profiles.id
LEFT JOIN (
  SELECT
    participant_id,
    MAX(GREATEST(confirmed_at, disputed_at, completed_at)) AS last_status_change_at,
    MAX(created_at) AS last_created_at
  FROM (
    SELECT
      creator_id AS participant_id,
      confirmed_at,
      disputed_at,
      completed_at,
      created_at
    FROM promises
    UNION ALL
    SELECT
      counterparty_id AS participant_id,
      confirmed_at,
      disputed_at,
      completed_at,
      created_at
    FROM promises
  ) promise_participants
  GROUP BY participant_id
) stats ON stats.participant_id = profiles.id
WHERE profiles.handle IS NOT NULL
  AND profiles.is_public_profile = true;

GRANT SELECT ON public_profile_stats TO anon, authenticated;
