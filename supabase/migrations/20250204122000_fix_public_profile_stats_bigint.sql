-- Ensure public_profile_stats keeps bigint counts to avoid type errors on replace.

CREATE OR REPLACE VIEW public_profile_stats AS
SELECT
  profiles.id AS profile_id,
  profiles.handle,
  profiles.display_name,
  profiles.avatar_url,
  COALESCE(stats.confirmed_count, 0::bigint) AS confirmed_count,
  0::bigint AS disputed_count,
  0::bigint AS active_count,
  0::bigint AS pending_acceptance_count,
  0::bigint AS overdue_count,
  stats.last_activity_at
FROM profiles
LEFT JOIN (
  SELECT
    promises.creator_id,
    COUNT(*)::bigint AS confirmed_count,
    MAX(COALESCE(promises.confirmed_at, promises.created_at)) AS last_activity_at
  FROM promises
  JOIN profiles creator ON creator.id = promises.creator_id
  JOIN profiles counterparty ON counterparty.id = promises.counterparty_id
  WHERE promises.status = 'confirmed'
    AND promises.is_public = true
    AND creator.is_public = true
    AND counterparty.is_public = true
  GROUP BY promises.creator_id
) stats ON stats.creator_id = profiles.id
WHERE profiles.handle IS NOT NULL
  AND profiles.is_public = true;

GRANT SELECT ON public_profile_stats TO anon, authenticated;
