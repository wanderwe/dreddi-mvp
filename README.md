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
4) Confirm or dispute in the review screen. Reputation updates are stubbed for now.

## Tech stack
- Next.js (App Router)
- Supabase (Auth + DB + RLS)
- Tailwind CSS

## Status
Early MVP / in active development.
