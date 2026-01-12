-- Notifications v1
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deadline_reminders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiet_hours_start time NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end time NOT NULL DEFAULT '09:00';

ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS counterparty_accepted_at timestamptz;

UPDATE promises
  SET counterparty_accepted_at = created_at
  WHERE counterparty_id IS NOT NULL AND counterparty_accepted_at IS NULL;

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promise_id uuid REFERENCES promises(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  cta_label text,
  cta_url text,
  priority text NOT NULL DEFAULT 'normal',
  delivered_at timestamptz,
  read_at timestamptz,
  dedupe_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_valid
  CHECK (type in ('N1','N2','N3','N4','N5','N6','N7'));

ALTER TABLE notifications
  ADD CONSTRAINT notifications_priority_valid
  CHECK (priority in ('low','normal','high','critical'));

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_dedupe_key
  ON notifications(user_id, dedupe_key);

CREATE INDEX IF NOT EXISTS notifications_user_created_at
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread
  ON notifications(user_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS notifications_self_select
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS notifications_self_update
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS notifications_self_insert
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS promise_notification_state (
  promise_id uuid PRIMARY KEY REFERENCES promises(id) ON DELETE CASCADE,
  invite_notified_at timestamptz,
  invite_followup_notified_at timestamptz,
  due_soon_notified_at timestamptz,
  overdue_notified_at timestamptz,
  overdue_creator_notified_at timestamptz,
  completion_cycle_id integer NOT NULL DEFAULT 0,
  completion_cycle_started_at timestamptz,
  completion_notified_at timestamptz,
  completion_followups_count integer NOT NULL DEFAULT 0,
  completion_followup_last_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS promise_notification_state_updated_at
  ON promise_notification_state(updated_at DESC);

ALTER TABLE promise_notification_state ENABLE ROW LEVEL SECURITY;
