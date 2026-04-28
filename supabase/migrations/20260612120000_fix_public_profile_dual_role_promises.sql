DROP FUNCTION IF EXISTS public_get_profile_public_promises(text, integer);

CREATE OR REPLACE FUNCTION public_get_profile_public_promises(
  p_handle text,
  p_limit integer DEFAULT 200
)
RETURNS TABLE (
  id uuid,
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
  creator_id uuid,
  promisor_id uuid,
  promisee_id uuid,
  counterparty_id uuid,
  accepted_by_second_side boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH target_profile AS (
    SELECT id
    FROM profiles
    WHERE handle = p_handle
      AND is_public_profile IS TRUE
    LIMIT 1
  )
  SELECT
    p.id,
    p.title,
    p.status,
    p.invite_status,
    p.created_at,
    p.due_at,
    p.confirmed_at,
    p.disputed_at,
    p.declined_at,
    p.accepted_at,
    p.counterparty_accepted_at,
    p.ignored_at,
    p.expires_at,
    p.cancelled_at,
    p.creator_id,
    p.promisor_id,
    p.promisee_id,
    p.counterparty_id,
    (p.invite_status = 'accepted') AS accepted_by_second_side
  FROM promises AS p
  JOIN target_profile AS tp ON TRUE
  WHERE p.visibility = 'public'
    AND (
      public.resolve_promise_executor_id(p.promisor_id, p.promisee_id, p.counterparty_id, p.creator_id) = tp.id
      OR public.resolve_promise_counterparty_id(p.promisor_id, p.promisee_id, p.counterparty_id, p.creator_id) = tp.id
    )
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 500);
$$;

GRANT EXECUTE ON FUNCTION public_get_profile_public_promises(text, integer) TO anon, authenticated;
