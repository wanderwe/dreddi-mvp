-- Extend invite expiry from 72 hours to 7 days for pending invites.

UPDATE public.promises
SET expires_at = COALESCE(invited_at, created_at) + interval '7 days'
WHERE invite_status = 'awaiting_acceptance'
  AND (
    expires_at IS NULL
    OR expires_at <= COALESCE(invited_at, created_at) + interval '72 hours'
  );

UPDATE public.deal_invites di
SET expires_at = COALESCE(p.invited_at, p.created_at) + interval '7 days'
FROM public.promises p
WHERE di.deal_id = p.id
  AND di.status = 'created'
  AND (
    di.expires_at IS NULL
    OR di.expires_at <= COALESCE(p.invited_at, p.created_at) + interval '72 hours'
  );
