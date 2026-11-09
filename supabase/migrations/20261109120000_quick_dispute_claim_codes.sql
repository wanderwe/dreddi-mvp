-- «Хто правий?»: a one-time code that lets a side save their dispute after signing in, even when the
-- sign-in finishes in another browser (a magic link opened in a mail app) that lacks the anonymous
-- cookie. Only the hash is stored, valid for 30 minutes.
alter table public.quick_dispute_parties
  add column if not exists claim_code_hash text,
  add column if not exists claim_code_expires_at timestamptz;

create index if not exists quick_dispute_parties_claim_code_idx
  on public.quick_dispute_parties (claim_code_hash)
  where claim_code_hash is not null;
