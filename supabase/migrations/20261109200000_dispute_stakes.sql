-- «Хто правий?»: an optional stake («whoever loses buys coffee»). Once the verdict is final, either side
-- may record it as a promise from the loser to the winner; the two link to each other.

ALTER TABLE public.quick_disputes
  ADD COLUMN IF NOT EXISTS stake text,
  ADD COLUMN IF NOT EXISTS stake_promise_id uuid REFERENCES public.promises(id) ON DELETE SET NULL;

ALTER TABLE public.promises
  ADD COLUMN IF NOT EXISTS source_dispute_id uuid REFERENCES public.quick_disputes(id) ON DELETE SET NULL;
