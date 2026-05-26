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
      'reminder_overdue',
      'reminder_manual',
      'due_soon',
      'overdue',
      'completion_waiting',
      'completion_followup',
      'dispute',
      'public_agreement_accepted',
      'public_agreement_completed',
      'public_agreement_fulfilled',
      'public_agreement_disputed',
      'public_agreement_updated',
      'public_agreement_deadline',
      'agreement_updated'
    )
  );
