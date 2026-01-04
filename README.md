# Dreddi Knows (MVP)

Dreddi is a trust & promise tracking app.
It allows people to fix intentions, invite counterparties,
and track fulfillment or breach over time.

## MVP features
- Email magic link auth (Supabase)
- Create promises
- Invite second party via link
- Accept promises
- Track status (active / fulfilled / broken)

## Confirm / dispute flow (MVP)
- A promisor can mark a promise as completed, moving it to a pending state.
- The counterparty reviews the completion and either confirms or files a dispute.

### Supabase migration for the flow
- Run `docs/migrations_confirm_dispute.sql` in the Supabase SQL editor to add the confirm/dispute timestamps and extend the `status` enum (or text column) with `completed_by_promisor`, `confirmed`, and `disputed`.

### How to test
1) Create a promise with a counterparty assigned.
2) As the promisor, open `/promises` ("I promised" tab) and click **Mark as completed**.
3) As the counterparty, open the "Promised to me" tab and click **Review & confirm**.
4) Confirm or dispute in the review screen. Reputation updates will be recorded for the promisor and counterparty.

## Reputation model (MVP)
- Tables: `user_reputation` (aggregate) and `reputation_events` (append-only). Default score is 50.
- Run `docs/migrations_reputation.sql` to create the tables, indexes, and simple RLS policies.
- Reputation updates on final outcomes: confirm/dispute routes call `applyReputationForPromiseFinalization` to append unique events and adjust aggregates. The function:
  - Calculates whether a promise was completed on time (`completed_at <= due_at`).
  - Generates reputation events for the creator and counterparty depending on the final status, but only once per (user, promise, event kind) pair to keep the log idempotent.
  - Ensures `user_reputation` rows exist for every user being updated (via upsert) before inserting events.
  - Aggregates all new events per user and updates score + counters in a single write, clamping scores to the `[0, 100]` range.

### Reputation rules
- Confirmed: creator +3 (+1 if completed_at <= due_at); counterparty +1.
- Disputed: creator -6 (-1 extra if late); counterparty +1.
- Scores are clamped to [0,100]; counts include confirmed, disputed, on-time, and total completions.

### Event and aggregate semantics
- `reputation_events` is append-only and stores the raw deltas plus metadata about the promise (title, timestamps, lateness, role). This enables auditing and UI feeds.
- `user_reputation` keeps the current score and counters (`confirmed_count`, `disputed_count`, `on_time_count`, `total_promises_completed`).
- Events for confirmed promises increase `confirmed_count` and `total_promises_completed`; on-time confirmations also increase `on_time_count`.
- Events for disputed promises increase `disputed_count` and `total_promises_completed`.
- Any time a new event batch is written, the corresponding aggregate row is recalculated by adding the batch deltas to the existing values. Missing rows start from the default score of 50 with zero counts.

### How to test reputation locally
1) Apply `docs/migrations_reputation.sql` in Supabase.
2) Create and accept a promise, mark it completed, then confirm it. Check `/api/reputation/me` (with bearer token) for score/counters/events.
3) Repeat with a disputed promise to see the negative delta and idempotent event handling.
4) The landing page shows the live score, counts, and recent reputation events when signed in.

## Tech stack
- Next.js (App Router)
- Supabase (Auth + DB + RLS)
- Tailwind CSS

## Status
Early MVP / in active development.
