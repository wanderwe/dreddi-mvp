-- The AI judge only proposes criteria; the sides agree to them. An approval is a case log row written
-- by a side that points at the judge message holding the proposed criteria. Criteria are fixed once
-- every side of the promise has approved the latest proposal; a newer proposal needs approving again.

ALTER TABLE public.judge_messages
  ADD COLUMN IF NOT EXISTS approves_message_id uuid REFERENCES public.judge_messages(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS judge_messages_approves_idx
  ON public.judge_messages(approves_message_id)
  WHERE approves_message_id IS NOT NULL;

-- A verdict given after the other side's response window passed without them taking part.
ALTER TABLE public.judge_messages
  ADD COLUMN IF NOT EXISTS in_absentia boolean NOT NULL DEFAULT false;
