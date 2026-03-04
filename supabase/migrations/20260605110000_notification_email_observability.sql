ALTER TABLE notification_email_sends
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'resend',
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS to_email text;

CREATE INDEX IF NOT EXISTS notification_email_sends_status_created_idx
  ON notification_email_sends (status, created_at DESC);
