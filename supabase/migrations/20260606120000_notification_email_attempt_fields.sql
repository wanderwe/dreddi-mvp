ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS last_email_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_email_attempt_status text,
  ADD COLUMN IF NOT EXISTS last_email_attempt_error text;

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
      'reminder_overdue',
      'reminder_manual',
      'due_soon',
      'overdue',
      'completion_waiting',
      'completion_followup',
      'dispute'
    )
  );
