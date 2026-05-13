CREATE OR REPLACE FUNCTION public_get_public_agreement(p_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  details text,
  condition_text text,
  is_important boolean,
  status text,
  invite_status text,
  created_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  confirmed_at timestamptz,
  disputed_at timestamptz,
  accepted_at timestamptz,
  counterparty_accepted_at timestamptz,
  declined_at timestamptz,
  ignored_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  creator_display_name text,
  creator_handle text,
  counterparty_display_name text,
  counterparty_handle text,
  counterparty_contact text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.title,
    p.details,
    p.condition_text,
    p.is_important,
    p.status,
    p.invite_status,
    p.created_at,
    p.due_at,
    p.completed_at,
    p.confirmed_at,
    p.disputed_at,
    p.accepted_at,
    p.counterparty_accepted_at,
    p.declined_at,
    p.ignored_at,
    p.expires_at,
    p.cancelled_at,
    creator.display_name AS creator_display_name,
    creator.handle AS creator_handle,
    counterparty.display_name AS counterparty_display_name,
    counterparty.handle AS counterparty_handle,
    CASE
      WHEN counterparty.id IS NULL
        AND p.counterparty_contact IS NOT NULL
        AND p.counterparty_contact !~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
      THEN p.counterparty_contact
      ELSE NULL
    END AS counterparty_contact
  FROM promises AS p
  LEFT JOIN profiles AS creator ON creator.id = p.creator_id
  LEFT JOIN profiles AS counterparty
    ON counterparty.id = public.resolve_promise_counterparty_id(
      p.promisor_id,
      p.promisee_id,
      p.counterparty_id,
      p.creator_id
    )
  WHERE p.id = p_id
    AND p.visibility = 'public'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public_get_public_agreement(uuid) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS promises_public_agreement_lookup_idx
  ON promises(id)
  WHERE visibility = 'public';
