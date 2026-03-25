ALTER TABLE public.promise_notification_state
  ADD COLUMN IF NOT EXISTS invite_ignored_at timestamptz;
