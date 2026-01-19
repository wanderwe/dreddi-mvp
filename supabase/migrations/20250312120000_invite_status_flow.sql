-- Invite status lifecycle additions

ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS invite_status text,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS ignored_at timestamptz;

UPDATE promises
  SET invited_at = COALESCE(invited_at, created_at)
  WHERE invited_at IS NULL;

UPDATE promises
  SET accepted_at = COALESCE(accepted_at, counterparty_accepted_at)
  WHERE counterparty_accepted_at IS NOT NULL AND accepted_at IS NULL;

UPDATE promises
  SET invite_status = 'accepted'
  WHERE invite_status IS NULL
    AND (accepted_at IS NOT NULL OR counterparty_accepted_at IS NOT NULL);

UPDATE promises
  SET invite_status = 'awaiting_acceptance'
  WHERE invite_status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'promises_invite_status_valid'
  ) THEN
    ALTER TABLE promises
      ADD CONSTRAINT promises_invite_status_valid
      CHECK (invite_status IS NULL OR invite_status IN (
        'awaiting_acceptance',
        'accepted',
        'declined',
        'ignored'
      ));
  END IF;
END $$;

ALTER TABLE promises
  ALTER COLUMN invite_status SET DEFAULT 'awaiting_acceptance';

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
WHERE profiles.handle IS NOT NULL;

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
    (promises.invite_status = 'accepted') AS accepted_by_second_side
  FROM promises
  JOIN profiles ON profiles.id = promises.creator_id
  WHERE profiles.handle = public_get_profile_public_promises.p_handle
    AND promises.is_public = true
  ORDER BY promises.created_at DESC
  LIMIT LEAST(GREATEST(public_get_profile_public_promises.p_limit, 1), 500);
$$;

GRANT EXECUTE ON FUNCTION public_get_profile_public_promises(text, integer) TO anon, authenticated;
