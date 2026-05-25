# Dreddi

> Promises tracked. Reputation earned.

Dreddi is a lightweight accountability and reputation layer for real agreements between people.

It exists between:
- verbal promises
- and formal contracts

Dreddi helps people:
- record agreements
- confirm outcomes
- resolve disputes
- build observable reputation through real execution history

---

# What Dreddi Is

Dreddi is not:
- a task manager
- a CRM
- a freelance marketplace
- a social network
- a legal contract platform

It is a system for making agreements:
- visible
- trackable
- reputation-aware

---

# Core Idea

Most agreements disappear.

People agree to:
- deadlines
- deliverables
- payments
- collaborations
- launches
- responsibilities

But later:
- nobody remembers the exact terms
- there is no confirmation
- there is no shared history
- reputation becomes subjective

Dreddi creates a structured agreement lifecycle:

1. Agreement created
2. Agreement accepted
3. Agreement active
4. Work marked completed
5. Final outcome confirmed or disputed

Only finalized outcomes affect reputation.

---

# Public Agreements

One of Dreddi’s core product directions is Public Agreements.

Some agreements deserve visibility.

Public agreements allow:
- public commitments
- observable accountability
- execution transparency
- follow/watch mechanics
- public execution history

People can:
- follow public agreements
- observe status changes
- track deadlines
- see fulfilled or disputed outcomes

Without:
- likes
- comments
- popularity systems
- social media mechanics

Public agreements are not posts.

They are commitments with visible outcomes.

---

# Reputation Philosophy

Dreddi reputation is based on:
- fulfilled agreements
- disputed agreements
- consistency over time
- observable outcomes

Not:
- likes
- followers
- popularity
- engagement

Reputation reflects:
> what people repeatedly do.

---

# Public Profiles

Each user has a public reputation profile.

Profiles may include:
- reputation score
- fulfilled agreements
- disputed agreements
- execution history
- accountability metrics
- public agreements

Private agreement details remain hidden.

But finalized outcomes may still affect reputation.

---

# Watchlist

Users can follow public agreements created by other people.

The watchlist system is designed for:
- observing commitments
- monitoring public execution
- tracking important initiatives

Watchers are not participants.

This is not a social feed.

It is lightweight public accountability monitoring.

---

# Embeddable Public Agreements

Dreddi public agreements can be embedded outside the platform.

Potential use cases:
- media articles
- startup public roadmaps
- NGO/public transparency pages
- public fundraising initiatives
- community commitments
- build-in-public workflows

Embeds are designed as:
- public trust objects
- live commitment snapshots
- canonical references for agreement status

---

# Product Principles

Dreddi should feel:
- calm
- premium
- objective
- structured
- transparent

Avoid:
- gamification
- outrage mechanics
- public shaming
- noisy social systems
- moralizing tone

---

# Tech Stack

Current stack:
- Next.js
- TypeScript
- Supabase
- PostgreSQL
- Vercel
- Resend

---

# Status

Dreddi is currently in beta.

The product is actively evolving around:
- agreement lifecycle UX
- public agreements
- reputation systems
- public accountability
- embeddable trust objects
- watchlist/following mechanics
- public profiles

---

# Philosophy

Words disappear.

Reputation remembers.

Dreddi exists to preserve:
- what people agreed to
- and what actually happened.

---

# Developer Setup & Operations

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

## Confirm / dispute flow (MVP foundation)
- A promisor can mark a promise as completed, moving it to a pending state.
- The counterparty reviews the completion and either confirms or files a dispute.

### Supabase migration for the flow
- Run `docs/migrations_confirm_dispute.sql` in the Supabase SQL editor to add the confirm/dispute timestamps and extend the `status` enum (or text column) with `completed_by_promisor`, `confirmed`, and `disputed`.

### How to test
1) Create a promise with a counterparty assigned.
2) As the promisor, open `/promises` ("I promised" tab) and click **Mark as completed**.
3) As the counterparty, open the "Promised to me" tab and click **Review & confirm**.
4) Confirm or dispute in the review screen. Reputation updates will be recorded for the promisor and counterparty.

## Reputation model
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

## Reputation evidence metrics (public profiles)
- **unique_counterparties_count**: Total distinct counterparties across confirmed/disputed deals.
- **deals_with_new_people_count**: Count of first-ever deals with each counterparty (one per counterparty).
- **repeat_counterparty_rate**: Percentage of completed deals that are repeats with known counterparties.
- **deals_with_due_date_count**: Completed deals that included a due date.
- **on_time_completion_count**: Confirmed deals completed on or before the due date.
- **on_time_completion_rate**: Percentage of due-dated deals completed on time.
- **disputed_count**: Completed deals that ended in dispute.
- **dispute_rate**: Percentage of completed deals that ended in dispute.
- **total_confirmed_deals**: Total confirmed deals (executor-only).
- **reputation_age_days**: Days since the first confirmed/disputed deal.
- **avg_deals_per_month**: Average completed deals per month since the first deal, normalized since the first deal date (without a minimum 30-day floor).

## Playwright UI tests (notifications)
1) Ensure the app is running locally (`npm run dev`).
2) Export required env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DREDDI_BASE_URL` (defaults to `http://localhost:3000` if omitted)
3) Install Playwright (first time only): `npm install -D @playwright/test` then `npx playwright install`.
4) Run UI tests: `npm run test:ui`.

## Manual reminder email diagnostics
- Use this when sender sees “Last reminder” but recipient says no email arrived.
- Requires env vars: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Command:
  - `node scripts/diagnose-reminder.mjs --deal=<deal_id> --receiver=<receiver_user_id>`
- The script prints:
  - recipient email settings (`email_notifications_enabled`)
  - auth email presence (actual target used for sending)
  - latest `deal_reminders`, `notifications`, and `notification_email_sends` rows
  - a `likelyReason` hint based on the observed data

## External Cron (cron-job.org)
- We no longer use Vercel Cron on Hobby, so external scheduling is used for notifications.
- Configure cron-job.org with:
  - URL: `https://www.dreddi.com/api/notifications/cron`
  - Method: `GET`
  - Header: `Authorization: Bearer <CRON_SECRET>`
  - Schedule: every 15 minutes (30 minutes is acceptable for MVP)
  - This single endpoint now handles both deadline reminders and invite auto-ignore expiry.
- Timezone: prefer UTC in cron-job.org to avoid daylight-saving drift.

### Smoke test
- Unauthorized check (expected `401` + `{"ok":false,"error":"unauthorized"}`):
  - `curl -i https://www.dreddi.com/api/notifications/cron`
- Authorized check (expected `200` + `{ "processed": <number>, "emailsSent": <number>, "errors": [] }`):
  - `curl -i -H "Authorization: Bearer <CRON_SECRET>" https://www.dreddi.com/api/notifications/cron`
- Optional short-timeout invite ignore dry run (for debugging):
  - `curl -i -H "Authorization: Bearer <CRON_SECRET>" "https://www.dreddi.com/api/notifications/cron?dryRun=1&inviteIgnoreMinutes=2"`
- Optional connectivity check endpoint:
  - `curl -i -H "Authorization: Bearer <CRON_SECRET>" https://www.dreddi.com/api/notifications/cron-smoke`

Before implementing new product features or UX flows, review `/docs/PRODUCT_SYSTEM.md`.
