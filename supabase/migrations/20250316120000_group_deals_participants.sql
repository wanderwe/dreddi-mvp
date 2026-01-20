-- Group deals: participants + acceptance modes

ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS acceptance_mode text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS acceptance_threshold integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'promises_acceptance_threshold_valid'
  ) THEN
    ALTER TABLE promises
      ADD CONSTRAINT promises_acceptance_threshold_valid
      CHECK (
        (acceptance_mode = 'all' AND acceptance_threshold IS NULL)
        OR
        (acceptance_mode = 'threshold' AND acceptance_threshold IS NOT NULL AND acceptance_threshold >= 1)
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS promise_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_id uuid NOT NULL REFERENCES promises(id) ON DELETE CASCADE,
  participant_id uuid NULL REFERENCES auth.users(id),
  participant_contact text NULL,
  role text NOT NULL DEFAULT 'participant',
  invite_status text NOT NULL DEFAULT 'awaiting_acceptance',
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz NULL,
  declined_at timestamptz NULL,
  ignored_at timestamptz NULL,
  expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'promise_participants_invite_status_valid'
  ) THEN
    ALTER TABLE promise_participants
      ADD CONSTRAINT promise_participants_invite_status_valid
      CHECK (invite_status IN (
        'awaiting_acceptance',
        'accepted',
        'declined',
        'ignored',
        'expired'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'promise_participants_identity_present'
  ) THEN
    ALTER TABLE promise_participants
      ADD CONSTRAINT promise_participants_identity_present
      CHECK (participant_id IS NOT NULL OR participant_contact IS NOT NULL);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS promise_participants_unique_id
  ON promise_participants(promise_id, participant_id)
  WHERE participant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS promise_participants_unique_contact
  ON promise_participants(promise_id, participant_contact)
  WHERE participant_contact IS NOT NULL;

CREATE INDEX IF NOT EXISTS promise_participants_promise_idx
  ON promise_participants(promise_id);

CREATE INDEX IF NOT EXISTS promise_participants_participant_idx
  ON promise_participants(participant_id);

CREATE TABLE IF NOT EXISTS promise_participant_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promise_participant_id uuid NOT NULL REFERENCES promise_participants(id) ON DELETE CASCADE,
  invite_token text NOT NULL DEFAULT gen_random_uuid()::text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS promise_participant_invites_token_key
  ON promise_participant_invites(invite_token);

CREATE UNIQUE INDEX IF NOT EXISTS promise_participant_invites_participant_key
  ON promise_participant_invites(promise_participant_id);

ALTER TABLE promise_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS promise_participants_creator_select
  ON promise_participants
  FOR SELECT
  USING (
    auth.uid() = (SELECT creator_id FROM promises WHERE promises.id = promise_participants.promise_id)
  );

CREATE POLICY IF NOT EXISTS promise_participants_self_select
  ON promise_participants
  FOR SELECT
  USING (participant_id = auth.uid());

CREATE POLICY IF NOT EXISTS promises_group_participant_select
  ON promises
  FOR SELECT
  USING (
    auth.uid() = creator_id
    OR auth.uid() = counterparty_id
    OR EXISTS (
      SELECT 1
      FROM promise_participants
      WHERE promise_participants.promise_id = promises.id
        AND promise_participants.participant_id = auth.uid()
    )
  );
