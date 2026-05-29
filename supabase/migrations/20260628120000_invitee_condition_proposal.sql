-- Invitee can propose a counter-condition on the invite page.
-- Adds condition_proposed_by and condition_responsible_id columns,
-- and extends invite_status with awaiting_creator_confirmation.

ALTER TABLE public.promises
  ADD COLUMN IF NOT EXISTS condition_proposed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS condition_responsible_id uuid REFERENCES auth.users(id);

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
        'awaiting_creator_confirmation',
        'accepted',
        'declined',
        'expired',
        'cancelled_by_creator'
      )
    );
END $$;
