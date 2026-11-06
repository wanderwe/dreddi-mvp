-- Whether a promise with a deadline was kept on time is settled by the side it was made to, not by
-- when the executor happened to press "done": people often mark it later than they did it.
-- NULL keeps the old rule (completed_at <= due_at) for promises closed before this column existed.
ALTER TABLE public.promises
  ADD COLUMN IF NOT EXISTS completed_on_time boolean;

-- Dreddi's own call on the deadline when it rules a promise kept: from the evidence, was it done by
-- the deadline. Applied to the promise when the ruling takes effect.
ALTER TABLE public.judge_messages
  ADD COLUMN IF NOT EXISTS on_time boolean;
