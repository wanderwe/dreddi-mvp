-- «Хто правий?» notifications for signed-in sides: a reworded question, the verdict, the other side's
-- reply and the review. They point at a quick dispute instead of a promise.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS dispute_id uuid REFERENCES public.quick_disputes(id) ON DELETE CASCADE;

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
      'invite_withdrawn',
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
      'agreement_updated',
      'counter_condition_proposed',
      'counter_condition_confirmed',
      'counter_condition_rejected',
      'admin_new_feedback',
      'completion_final_notice',
      'completion_auto_confirmed',
      'dispute_wording',
      'dispute_verdict',
      'dispute_reply',
      'dispute_reviewed'
    )
  );
