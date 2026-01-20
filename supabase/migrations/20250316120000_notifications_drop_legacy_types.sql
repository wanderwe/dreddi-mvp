ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_valid;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_valid
  CHECK (
    type IN (
      'invite',
      'invite_followup',
      'invite_declined',
      'invite_ignored',
      'due_soon',
      'overdue',
      'completion_waiting',
      'completion_followup',
      'dispute'
    )
  );
