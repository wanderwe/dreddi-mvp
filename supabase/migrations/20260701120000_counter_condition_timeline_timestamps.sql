-- Track when a counter-obligation was proposed and confirmed so the
-- agreement history timeline can show these events.
ALTER TABLE public.promises
  ADD COLUMN IF NOT EXISTS condition_proposed_at timestamptz,
  ADD COLUMN IF NOT EXISTS condition_confirmed_at timestamptz;
