# Dreddi Knows (MVP)

Dreddi is a trust & promise tracking app.
It allows people to fix intentions, invite counterparties,
and track fulfillment or breach over time.

## MVP features
- Email magic link auth (Supabase)
- Google SSO (Supabase OAuth) with magic link fallback
- Create promises
- Invite second party via link
- Accept promises
- Track status (active / fulfilled / broken)

## Supabase Google OAuth setup
1) Enable the Google provider in **Supabase → Authentication → Providers**.
2) Add redirect URLs in **Supabase → Authentication → URL Configuration**:
   - `https://dreddi.com/auth/callback`
   - `http://localhost:3000/auth/callback`
3) In **Google Cloud Console**:
   - Create an OAuth client (type: Web application).
   - Copy the client ID + client secret into Supabase’s Google provider settings.
   - Add the authorized redirect URI pointing to Supabase’s callback endpoint:  
     `https://<your-project-ref>.supabase.co/auth/v1/callback`

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
- Reputation updates on final outcomes: confirm/dispute routes call `applyReputationForPromiseFinalization` to append unique events and adjust aggregates.

### Reputation rules
- Confirmed: creator +3 (+1 if completed_at <= due_at); counterparty +1.
- Disputed: creator -6 (-1 extra if late); counterparty +1.
- Scores are clamped to [0,100]; counts include confirmed, disputed, on-time, and total completions.

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
