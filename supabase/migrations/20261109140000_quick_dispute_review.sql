-- «Хто правий?»: the verdict comes right after both positions; then each side may reply once and
-- Dreddi reviews the verdict a single time. first_verdict keeps the verdict before the review, so the
-- page can say whether the replies changed it; verdict_reviewed_at makes sure the review happens once.
alter table public.quick_disputes
  add column if not exists first_verdict jsonb,
  add column if not exists verdict_reviewed_at timestamptz;
