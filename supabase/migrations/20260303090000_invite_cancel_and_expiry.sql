-- Add explicit invite cancellation + expiry lifecycle fields.

ALTER TABLE public.promises
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

UPDATE public.promises
SET expires_at = COALESCE(expires_at, invited_at + interval '72 hours')
WHERE invite_status = 'awaiting_acceptance';

UPDATE public.promises
SET invite_status = 'expired'
WHERE invite_status = 'ignored';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'promises_invite_status_valid'
  ) THEN
    ALTER TABLE public.promises DROP CONSTRAINT promises_invite_status_valid;
  END IF;

  ALTER TABLE public.promises
    ADD CONSTRAINT promises_invite_status_valid
    CHECK (
      invite_status IS NULL OR invite_status IN (
        'awaiting_acceptance',
        'accepted',
        'declined',
        'expired',
        'cancelled_by_creator'
      )
    );
END $$;

ALTER TABLE public.deal_invites
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

UPDATE public.deal_invites
SET status = 'created'
WHERE status = 'pending';

ALTER TABLE public.deal_invites
  DROP CONSTRAINT IF EXISTS deal_invites_status_check;

ALTER TABLE public.deal_invites
  ADD CONSTRAINT deal_invites_status_check
  CHECK (status in ('created', 'accepted', 'declined', 'expired', 'cancelled_by_creator'));
