ALTER TABLE notification_email_sends
  ADD COLUMN IF NOT EXISTS promise_id uuid REFERENCES promises(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS notification_email_sends_reminder_rate_idx
  ON notification_email_sends (user_id, promise_id, type, created_at DESC);

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_valid;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_valid
  CHECK (
    type IN (
      'accepted',
      'invite',
      'invite_followup',
      'invite_declined',
      'invite_ignored',
      'marked_completed',
      'confirmed',
      'disputed',
      'reminder_due_24h',
      'deadline_passed',
      'manual_reminder',
      'reminder_deadline',
      'reminder_manual',
      'reminder_overdue',
      'due_soon',
      'overdue',
      'completion_waiting',
      'completion_followup',
      'dispute'
    )
  );
