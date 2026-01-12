-- Public deal request + mutual opt-in visibility

ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS public_opt_in_promisor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_opt_in_promisee boolean NOT NULL DEFAULT false;

-- Backfill from legacy mutual visibility flags
UPDATE promises
SET is_public = true
WHERE is_public = false
  AND (public_by_creator = true OR public_by_counterparty = true);

UPDATE promises
SET
  public_opt_in_promisor = CASE
    WHEN promisor_id IS NOT NULL AND promisor_id = creator_id THEN public_by_creator
    WHEN promisee_id IS NOT NULL AND promisee_id = creator_id THEN public_by_counterparty
    ELSE public_by_creator
  END,
  public_opt_in_promisee = CASE
    WHEN promisor_id IS NOT NULL AND promisor_id = creator_id THEN public_by_counterparty
    WHEN promisee_id IS NOT NULL AND promisee_id = creator_id THEN public_by_creator
    ELSE public_by_counterparty
  END
WHERE public_opt_in_promisor = false
  AND public_opt_in_promisee = false
  AND (public_by_creator = true OR public_by_counterparty = true);

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
    promises.creator_id,
    COUNT(*) AS confirmed_count,
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
    AND profiles.is_public = true
    AND counterparty.is_public = true
    AND promises.status = 'confirmed'
    AND promises.is_public = true
  ORDER BY promises.created_at DESC
  LIMIT LEAST(GREATEST(public_get_profile_public_promises.p_limit, 1), 500);
$$;

GRANT SELECT ON public_profile_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public_get_profile_public_promises(text, integer) TO anon, authenticated;
