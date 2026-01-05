# DB contract

This document codifies the database surface the codebase expects Supabase Postgres to expose and the RLS posture required for browser vs. server usage.

## Tables
- `profiles` — auth callback upserts profile metadata for the signed-in user.
- `promises` — core record for promise lifecycle, invitation tokens, and status transitions.
- `user_reputation` — aggregate reputation per user (server writes only).
- `reputation_events` — append-only log of reputation adjustments per promise/user.

## Columns
- `profiles`
  - `id uuid primary key` (auth.users FK)
  - `email text`, `display_name text`, `handle text`, `avatar_url text`, `created_at timestamptz default now()`
- `promises`
  - `id uuid primary key default gen_random_uuid()`
  - `title text not null`, `details text`
  - `status text not null default 'active'` (values: `active`, `completed_by_promisor`, `confirmed`, `disputed`, `fulfilled`, `broken`)
  - `creator_id uuid not null` (auth.users FK), `promisor_id uuid`, `counterparty_id uuid`
  - `counterparty_contact text`, `due_at timestamptz`, `created_at timestamptz default now()`
  - `completed_at timestamptz`, `confirmed_at timestamptz`, `disputed_at timestamptz`
  - `disputed_code text` (values: `not_completed`, `partial`, `late`, `other`), `dispute_reason text`
  - `invite_token text`
- `user_reputation`
  - `user_id uuid primary key` (auth.users FK)
  - `score int default 50`, `confirmed_count int default 0`, `disputed_count int default 0`, `on_time_count int default 0`, `total_promises_completed int default 0`, `updated_at timestamptz default now()` — `total_promises_completed` counts confirmed (non-disputed) completions.
- `reputation_events`
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null` (auth.users FK), `promise_id uuid not null` (promises FK)
  - `kind text not null`, `delta int not null`, `meta jsonb not null default '{}'::jsonb`, `created_at timestamptz default now()`
  - unique `(user_id, promise_id, kind)`

## Required constraints
- Status and dispute code checks on `promises` (values above) plus PK/FK links to `auth.users`.
- Unique `invite_token` (non-null) to avoid collisions for landing pages.
- Unique `(user_id, promise_id, kind)` on `reputation_events` to keep scoring idempotent.
- Optional unique `profiles.handle` (nullable) to avoid duplicates when handles are present.

## Required indexes
- `promises(creator_id)`, `promises(counterparty_id)` for list queries.
- `promises(invite_token)` unique partial index for invite lookups.
- `promises(status)` for dashboard/status filters.
- `reputation_events(user_id)`, `reputation_events(promise_id)` for API lookups.

## Required RLS policies
- `profiles`: select/insert/update allowed when `auth.uid() = id` so the signed-in user can upsert their own profile during auth callback.
- `promises`:
  - select when `auth.uid()` matches `creator_id` or `counterparty_id` (client dashboards).
  - insert when `auth.uid() = creator_id` and `promisor_id` is null or matches the creator (client creation form writes directly).
  - update when `auth.uid()` matches `creator_id` or `counterparty_id` (client invite regeneration, status changes via client-side fallback). Service role bypasses these for server API routes.
- `user_reputation` and `reputation_events`: read policy only for matching `user_id`; server/service role performs inserts and updates.

## Client vs. server writes
- Client (anon key with user session): inserts into `promises`; updates `promises.invite_token`; upserts `profiles`. These require the policies above.
- Server (service role): invite acceptance sets `promises.counterparty_id`; completion/confirm/dispute set `status` and timestamps; reputation handlers insert into `reputation_events` and update `user_reputation`.

## Drift list (contract vs. legacy docs SQL)
- Missing base tables in `docs/*`: no `promises` or `profiles` definitions; no defaults/checks/indexes documented.
- Missing constraints: status/dispute code checks; unique invite token; FKs for creator/promisor/counterparty.
- Missing indexes in docs: creator/counterparty/invite_token/status indexes for `promises`.
- Missing RLS: policies for `promises` and `profiles` were not present in docs.
- Reputation docs lacked explicit client/server access split (write with service role only); contract clarifies read-only RLS and server writes.

## Verification steps
1. **Schema presence**
   - `select column_name, data_type from information_schema.columns where table_name = 'promises';`
   - `select conname, pg_get_constraintdef(c.oid) from pg_constraint c join pg_class t on c.conrelid = t.oid where t.relname = 'promises';`
   - `select indexname, indexdef from pg_indexes where tablename in ('promises','reputation_events');`
2. **RLS checks** (as authenticated user vs. service role)
   - Authenticated user should `select`/`insert`/`update` own `promises` rows; `delete` should fail (no policy).
   - Authenticated user should `select` their `user_reputation` and `reputation_events`; inserts should fail without service role.
3. **Lifecycle smoke flow**
   - Create promise with invite (client insert).
   - Accept invite (server writes `counterparty_id`).
   - Mark complete → confirm or dispute (server writes status, timestamps, dispute fields).
   - Reputation read via `/api/reputation/me` should return updated aggregates and recent events.
