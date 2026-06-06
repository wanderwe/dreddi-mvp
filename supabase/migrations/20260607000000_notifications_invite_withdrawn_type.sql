ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_valid;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_valid
  CHECK (
    type IN (
      'accepted',
      'agreement_updated',
      'confirmed',
      'deadline_passed',
      'disputed',
      'invite',
      'invite_followup',
      'invite_declined',
      'invite_ignored',
      'invite_withdrawn',
      'marked_completed',
      'public_agreement_accepted',
      'public_agreement_completed',
      'public_agreement_fulfilled',
      'public_agreement_disputed',
      'public_agreement_updated',
      'public_agreement_deadline',
      'manual_reminder',
      'reminder_deadline',
      'reminder_due_24h',
      'reminder_manual',
      'reminder_overdue',
      'due_soon',
      'overdue',
      'completion_waiting',
      'completion_followup',
      'dispute',
      'counter_condition_proposed',
      'counter_condition_confirmed',
      'counter_condition_rejected'
    )
  );
