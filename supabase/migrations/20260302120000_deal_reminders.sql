CREATE TABLE IF NOT EXISTS deal_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES promises(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deal_reminders_sender_receiver_diff CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS deal_reminders_deal_idx ON deal_reminders(deal_id, created_at DESC);

ALTER TABLE deal_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deal_reminders_participant_select ON deal_reminders;
CREATE POLICY deal_reminders_participant_select
  ON deal_reminders
  FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR EXISTS (
      SELECT 1
      FROM promises p
      WHERE p.id = deal_reminders.deal_id
        AND (p.creator_id = auth.uid() OR p.counterparty_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS deal_reminders_participant_insert ON deal_reminders;
CREATE POLICY deal_reminders_participant_insert
  ON deal_reminders
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM promises p
      WHERE p.id = deal_reminders.deal_id
        AND (
          (p.creator_id = sender_id AND p.counterparty_id = receiver_id)
          OR (p.counterparty_id = sender_id AND p.creator_id = receiver_id)
        )
    )
  );
