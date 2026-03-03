DROP FUNCTION IF EXISTS public_get_profile_public_promises(text, integer);

CREATE OR REPLACE FUNCTION public_get_profile_public_promises(
  p_handle text,
  p_limit integer DEFAULT 200
)
RETURNS TABLE (
  title text,
  status text,
  invite_status text,
  created_at timestamptz,
  due_at timestamptz,
  confirmed_at timestamptz,
  disputed_at timestamptz,
  declined_at timestamptz,
  accepted_at timestamptz,
  counterparty_accepted_at timestamptz,
  ignored_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  accepted_by_second_side boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    promises.title,
    promises.status,
    promises.invite_status,
    promises.created_at,
    promises.due_at,
    promises.confirmed_at,
    promises.disputed_at,
    promises.declined_at,
    promises.accepted_at,
    promises.counterparty_accepted_at,
    promises.ignored_at,
    promises.expires_at,
    promises.cancelled_at,
    (promises.invite_status = 'accepted') AS accepted_by_second_side
  FROM promises
  JOIN profiles ON profiles.id = promises.creator_id
  WHERE profiles.handle = public_get_profile_public_promises.p_handle
    AND promises.is_public = true
    AND (
      promises.status <> 'active'
      OR promises.invite_status IS NULL
      OR promises.invite_status NOT IN ('created', 'expired', 'cancelled_by_creator')
    )
  ORDER BY promises.created_at DESC
  LIMIT LEAST(GREATEST(public_get_profile_public_promises.p_limit, 1), 500);
$$;

GRANT EXECUTE ON FUNCTION public_get_profile_public_promises(text, integer) TO anon, authenticated;
