ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_valid;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_valid
  CHECK (
    type IN (
      'N1',
      'N2',
      'N3',
      'N4',
      'N5',
      'N6',
      'N7',
      'invite',
      'invite_followup',
      'due_soon',
      'overdue',
      'completion_waiting',
      'completion_followup',
      'dispute'
    )
  );
