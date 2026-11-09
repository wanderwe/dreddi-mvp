-- A promise marked done counts as kept when the other side never answers: a final reminder on day 10
-- names the date, and on that date (day 14, or a week later for a promise that hung long before) the
-- promise is confirmed at half reputation weight. confirmed_by tells who confirmed it; auto_confirm_at
-- is the date the final reminder promised, shown to both sides on the promise page.

ALTER TABLE promises
  ADD COLUMN IF NOT EXISTS confirmed_by text NOT NULL DEFAULT 'counterparty',
  ADD COLUMN IF NOT EXISTS auto_confirm_at timestamptz;

ALTER TABLE promises
  DROP CONSTRAINT IF EXISTS promises_confirmed_by_valid;

ALTER TABLE promises
  ADD CONSTRAINT promises_confirmed_by_valid CHECK (confirmed_by IN ('counterparty', 'silence', 'dreddi'));

ALTER TABLE promise_notification_state
  ADD COLUMN IF NOT EXISTS completion_final_notice_at timestamptz;

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
      'completion_auto_confirmed'
    )
  );
