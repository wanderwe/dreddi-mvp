ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS notification_email_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL,
  provider_id text,
  dedupe_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_email_sends_dedupe_idx
  ON notification_email_sends (dedupe_key, user_id, type);

CREATE INDEX IF NOT EXISTS notification_email_sends_user_created_idx
  ON notification_email_sends (user_id, created_at DESC);

ALTER TABLE notification_email_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_email_sends_owner_select ON notification_email_sends;
CREATE POLICY notification_email_sends_owner_select
  ON notification_email_sends
  FOR SELECT
  USING (auth.uid() = user_id);

