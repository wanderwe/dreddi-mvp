-- Extend pending public agreement invitations to 180 days while keeping private
-- agreement invitations on the standard 7-day window.

UPDATE public.promises
SET expires_at = COALESCE(invited_at, created_at) + interval '180 days'
WHERE visibility = 'public'
  AND invite_status = 'awaiting_acceptance'
  AND (
    expires_at IS NULL
    OR expires_at < COALESCE(invited_at, created_at) + interval '180 days'
  );

UPDATE public.deal_invites di
SET expires_at = COALESCE(p.invited_at, p.created_at) + interval '180 days'
FROM public.promises p
WHERE di.deal_id = p.id
  AND p.visibility = 'public'
  AND di.status = 'created'
  AND (
    di.expires_at IS NULL
    OR di.expires_at < COALESCE(p.invited_at, p.created_at) + interval '180 days'
  );
